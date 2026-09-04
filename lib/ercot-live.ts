/**
 * ERCOT Public API client for the live decision cron.
 *
 * Auth mirrors `pipeline/src/flexuw/fetch/ercot_api.py`: Azure B2C ROPC password grant, real
 * (percent-encoded, never `+`) spaces in `scope`, an `Ocp-Apim-Subscription-Key` header plus a
 * bearer `id_token` on every call. The token is cached in module scope for the life of the
 * serverless instance and re-minted `TOKEN_SKEW_S` seconds before it actually expires.
 *
 * Endpoints were confirmed live against api.ercot.com on 2026-08-29 (see the route handler's
 * one-time shape log): a "rows" report endpoint, not the archive/zip endpoint the Python
 * pipeline uses for bulk backfill, since the cron only ever wants the latest few rows.
 *
 *   DAM settlement point price : GET /np4-190-cd/dam_stlmnt_pnt_prices
 *     params: settlementPoint, deliveryDateFrom, deliveryDateTo, size, page
 *     data row: [deliveryDate, hourEnding ("01:00".."24:00"), settlementPoint, settlementPointPrice, DSTFlag]
 *   RTM settlement point price : GET /np6-905-cd/spp_node_zone_hub
 *     params: settlementPoint, deliveryDateFrom, deliveryDateTo, size, page
 *     data row: [deliveryDate, deliveryHour (1-24), deliveryInterval (1-4), settlementPoint, settlementPointType, settlementPointPrice, DSTFlag]
 *   Actual system load by weather zone : GET /np6-345-cd/act_sys_load_by_wzn
 *     params: operatingDayFrom, operatingDayTo, size, page
 *     data row: [operatingDay, hourEnding, coast, east, farWest, north, northC, southern, southC, west, total, DSTFlag]
 *     `total` is ERCOT-system-wide actual load MW -- the same quantity as the pipeline's
 *     `load_wz` "ERCOT" column (see `features.py::load_stores`).
 *
 * `settlementPoint` does NOT accept a comma-separated list (verified live: returns 0 rows), so
 * one node = one request; a comma list silently matches nothing rather than erroring.
 *
 * The API rate-limits aggressively per subscription key (observed: 429s clearing roughly every
 * 10-30s during manual probing on 2026-08-29) -- `getJson` retries 429s with backoff, and
 * `fetchAllLive` spaces requests out and gives up on a source (marking it degraded) rather than
 * spinning past the function's time budget.
 */

const API_BASE = "https://api.ercot.com/api/public-reports";
const TOKEN_URL =
  "https://ercotb2c.b2clogin.com/ercotb2c.onmicrosoft.com/B2C_1_PUBAPI-ROPC-FLOW/oauth2/v2.0/token";
const CLIENT_ID = "fec253ea-0d06-4272-a5e6-b478baeecd70";
const SCOPE = `openid ${CLIENT_ID} offline_access`; // real spaces; percent-encoded below, never "+"
const TOKEN_SKEW_S = 120;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 4000;

export const MAX_RUN_BYTES = 8 * 1024 * 1024; // 8 MB hard stop for one cron run

// ---------------------------------------------------------------------------------------- token

type CachedToken = { token: string; expiresAtMs: number };
// Module-scope cache: persists across invocations on a warm serverless instance, gone on cold start.
let cachedToken: CachedToken | null = null;

function formEncode(fields: Record<string, string>): string {
  // encodeURIComponent (unlike URLSearchParams) percent-encodes spaces as %20, never "+" --
  // required: the B2C token endpoint has been observed to reject a literal "+" in `scope`.
  return Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function mintToken(): Promise<CachedToken> {
  const username = process.env.ERCOT_USERNAME;
  const password = process.env.ERCOT_PASSWORD;
  if (!username || !password) {
    throw new Error("ERCOT_USERNAME/ERCOT_PASSWORD not set");
  }
  const body = formEncode({
    username,
    password,
    grant_type: "password",
    response_type: "id_token",
    client_id: CLIENT_ID,
    scope: SCOPE,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token endpoint returned ${res.status}`);
  }
  const data = (await res.json()) as { id_token?: string; expires_in?: number };
  if (!data.id_token) {
    throw new Error("no id_token in token response");
  }
  const expiresIn = Number(data.expires_in ?? 3600);
  return { token: data.id_token, expiresAtMs: Date.now() + Math.max(expiresIn - TOKEN_SKEW_S, 60) * 1000 };
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs) return cachedToken.token;
  cachedToken = await mintToken();
  return cachedToken.token;
}

// -------------------------------------------------------------------------------------- fetch

export class ByteBudget {
  used = 0;
  constructor(private readonly max = MAX_RUN_BYTES) {}
  exceeded(): boolean {
    return this.used >= this.max;
  }
  add(n: number): void {
    this.used += n;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RowsResponse = { _meta?: { totalRecords?: number }; fields: { name: string }[]; data: unknown[][] };

/** One GET against a "rows" report endpoint, with 429/5xx retry and byte accounting. */
async function getRows(
  path: string,
  params: Record<string, string | number>,
  budget: ByteBudget
): Promise<RowsResponse> {
  const subscriptionKey = process.env.ERCOT_SUBSCRIPTION_KEY;
  if (!subscriptionKey) throw new Error("ERCOT_SUBSCRIPTION_KEY not set");

  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (budget.exceeded()) throw new Error("byte budget exceeded before request");
    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "Ocp-Apim-Subscription-Key": subscriptionKey },
        cache: "no-store",
      });
    } catch (e) {
      lastErr = e;
      await sleep(RETRY_BASE_MS * 2 ** attempt);
      continue;
    }
    const buf = await res.arrayBuffer();
    budget.add(buf.byteLength);
    if (res.status === 200) {
      return JSON.parse(new TextDecoder().decode(buf)) as RowsResponse;
    }
    if (res.status === 401 && attempt === 0) {
      cachedToken = null; // one re-mint, matching the Python client's never-loop-twice rule
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`${res.status} for ${path}`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : RETRY_BASE_MS * 2 ** attempt;
      await sleep(delay);
      continue;
    }
    throw new Error(`${res.status} for ${path}: ${new TextDecoder().decode(buf).slice(0, 300)}`);
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${path} failed after ${MAX_RETRIES} retries`);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------------------- typed fetchers

export type DamRow = { deliveryDate: string; hourBeginning: number; price: number };

export async function fetchDamSpp(
  node: string,
  fromDate: Date,
  toDate: Date,
  budget: ByteBudget
): Promise<DamRow[]> {
  const r = await getRows(
    "/np4-190-cd/dam_stlmnt_pnt_prices",
    { settlementPoint: node, deliveryDateFrom: ymd(fromDate), deliveryDateTo: ymd(toDate), size: 1000 },
    budget
  );
  return r.data.map((row) => {
    const [deliveryDate, hourEnding, , price] = row as [string, string, string, number, boolean];
    const hourEndingInt = Number(hourEnding.split(":")[0]);
    return { deliveryDate, hourBeginning: hourEndingInt - 1, price: Number(price) };
  });
}

export type RtmRow = { deliveryDate: string; hourBeginning: number; interval: number; price: number };

export async function fetchRtmSpp(
  node: string,
  fromDate: Date,
  toDate: Date,
  budget: ByteBudget
): Promise<RtmRow[]> {
  const r = await getRows(
    "/np6-905-cd/spp_node_zone_hub",
    { settlementPoint: node, deliveryDateFrom: ymd(fromDate), deliveryDateTo: ymd(toDate), size: 1000 },
    budget
  );
  return r.data.map((row) => {
    const [deliveryDate, deliveryHour, deliveryInterval, , , price] = row as
      [string, number, number, string, string, number, boolean];
    return { deliveryDate, hourBeginning: Number(deliveryHour) - 1, interval: Number(deliveryInterval), price: Number(price) };
  });
}

export type LoadRow = { operatingDay: string; hourBeginning: number; totalMw: number };

export async function fetchActualLoad(fromDate: Date, toDate: Date, budget: ByteBudget): Promise<LoadRow[]> {
  const r = await getRows(
    "/np6-345-cd/act_sys_load_by_wzn",
    { operatingDayFrom: ymd(fromDate), operatingDayTo: ymd(toDate), size: 1000 },
    budget
  );
  const totalIdx = r.fields.findIndex((f) => f.name === "total");
  const dayIdx = r.fields.findIndex((f) => f.name === "operatingDay");
  const hourIdx = r.fields.findIndex((f) => f.name === "hourEnding");
  return r.data.map((row) => {
    const hourEnding = String(row[hourIdx]);
    return {
      operatingDay: String(row[dayIdx]),
      hourBeginning: Number(hourEnding.split(":")[0]) - 1,
      totalMw: Number(row[totalIdx]),
    };
  });
}
