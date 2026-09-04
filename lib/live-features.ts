/**
 * Builds a live feature row for one (node, target hour) pair, mirroring
 * `pipeline/src/flexuw/decide/features.py::build_features` closely enough to feed
 * `lib/scorer.ts`, but adapted to what a stateless hourly cron can actually see.
 *
 * Two deliberate simplifications from the training-time definitions, both because a live run
 * only ever has data up to "now" and no persisted history:
 *
 * 1. Training defines `rt_mean_1h` etc. relative to the *target* hour t ("mean RT price over
 *    the W h ending t-lag h", lag = lead_h + 1). Live, we instead anchor every target hour's
 *    recent-price features to the same snapshot -- the most recently *complete* hour as of
 *    "now" -- rather than re-deriving a per-target anchor. For a target hour whose horizon
 *    exactly equals the model's lead (the common case) this is identical to the training
 *    definition; for a target further out than the lead being borrowed for it (see
 *    `chooseLead` in the route handler) it uses a few hours of *more* current data than the
 *    strict per-target rule would allow. That is a live-freshness choice, not a leakage risk --
 *    leakage is about seeing the future relative to the label, and "now" is never in the
 *    future relative to itself.
 * 2. `load_rank365` and the weather features need a year of persisted history this stateless
 *    cron does not keep; they are always null (native HGB missing-routing handles it -- see
 *    `lib/scorer.ts`). `netload_act_lag`/`netload_rank365` are training-only in every exported
 *    model anyway (`live: false` in `feature_rules`), so they are always null too.
 *
 * DAM gating (`dam_price_t`, `dam_known`, `dam_day_max`) uses the real posting rule from
 * `features.py::dam_post_utc` (13:30 CT on the day before the operating day) evaluated against
 * the actual current instant, not a nominal decision time -- see `damKnown` below.
 */

import { chicagoCalendar, chicagoHourStart, fromChicagoWall, isNercHoliday } from "./tz";

// ---------------------------------------------------------------------- regime (ex ante, slow)

/**
 * Static snapshot of `pipeline/curated/buildout.csv` (last row, 2026-08-01) and
 * `pipeline/curated/reserve_margin.csv` (2026, `protocol_prescribed_peak_load_hour`, the
 * December-2025 CDR -- first/headline row for that year) plus
 * `pipeline/src/flexuw/config.py::HCAP_SCHEDULE` (last era, effective 2025-12-05). These change
 * on a monthly-to-annual cadence, far slower than this cron's hourly cycle, so they are frozen
 * constants rather than fetched live. Update by re-reading those three sources.
 */
export const REGIME = {
  storageGw: 17.870, // buildout.csv storage_mw 2026-08-01 / 1000
  solarGw: 32.269,   // buildout.csv solar_mw 2026-08-01 / 1000
  windGw: 39.985,    // buildout.csv wind_mw 2026-08-01 / 1000
  dispatchGw: 86.139, // buildout.csv dispatchable_mw 2026-08-01 / 1000
  prmYear: 18.29,    // reserve_margin.csv 2026 protocol_prescribed_peak_load_hour (Dec-2025 CDR)
  hcap: 2000,        // HCAP_SCHEDULE: $2,000 RTSWCAP effective 2025-12-05 (RTC+B split)
} as const;

// -------------------------------------------------------------------------------- price series

export type HourSeries = Map<number, number>; // key: UTC ms of local hour start -> hourly max price/MW

/** Fold 15-min RTM rows into an hourly-max series keyed by UTC hour-start ms. */
export function rtmToHourSeries(rows: { deliveryDate: string; hourBeginning: number; price: number }[]): HourSeries {
  const out: HourSeries = new Map();
  for (const r of rows) {
    if (!Number.isFinite(r.price)) continue;
    const key = chicagoHourStart(r.deliveryDate, r.hourBeginning).getTime();
    const prev = out.get(key);
    out.set(key, prev === undefined ? r.price : Math.max(prev, r.price));
  }
  return out;
}

export function loadToHourSeries(rows: { operatingDay: string; hourBeginning: number; totalMw: number }[]): HourSeries {
  const out: HourSeries = new Map();
  for (const r of rows) {
    if (!Number.isFinite(r.totalMw)) continue;
    out.set(chicagoHourStart(r.operatingDay, r.hourBeginning).getTime(), r.totalMw);
  }
  return out;
}

export type DamByDate = Map<string, Map<number, number>>; // dateKey -> hourBeginning -> price

export function damToByDate(rows: { deliveryDate: string; hourBeginning: number; price: number }[]): DamByDate {
  const out: DamByDate = new Map();
  for (const r of rows) {
    if (!Number.isFinite(r.price)) continue;
    if (!out.has(r.deliveryDate)) out.set(r.deliveryDate, new Map());
    out.get(r.deliveryDate)!.set(r.hourBeginning, r.price);
  }
  return out;
}

function prevDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** `dam_post_utc`: 13:30 CT on the day before `dateKey`. */
function damPostInstant(dateKey: string): Date {
  const [y, m, d] = prevDateKey(dateKey).split("-").map(Number);
  return fromChicagoWall({ y, m, d, hh: 13, mm: 30, ss: 0 });
}

function damKnown(dateKey: string, nowMs: number): boolean {
  return damPostInstant(dateKey).getTime() <= nowMs;
}

// ----------------------------------------------------------------------------- rolling windows

function lastCompleteHourStart(nowMs: number): number {
  const hourMs = 3600_000;
  return Math.floor(nowMs / hourMs) * hourMs - hourMs;
}

function windowValues(series: HourSeries, endMs: number, hours: number): number[] {
  const out: number[] = [];
  for (let h = 0; h < hours; h++) {
    const v = series.get(endMs - h * 3600_000);
    if (v !== undefined) out.push(v);
  }
  return out;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function max(xs: number[]): number | null {
  return xs.length ? Math.max(...xs) : null;
}

// -------------------------------------------------------------------------------------- context

export type LiveContext = {
  nowMs: number;
  rt: HourSeries;     // node RTM, hourly max
  ref: HourSeries;    // HB_HUBAVG RTM, hourly max (basis reference)
  dam: DamByDate;
  load: HourSeries;
};

/** Compute one named feature for one target hour. `null` = missing (scored via missing_go_to_left). */
export function computeFeature(name: string, targetMs: number, ctx: LiveContext): number | null {
  const cal = chicagoCalendar(new Date(targetMs));
  const dateKey = `${cal.year}-${String(cal.month).padStart(2, "0")}-${String(cal.day).padStart(2, "0")}`;
  const lag1 = lastCompleteHourStart(ctx.nowMs);

  switch (name) {
    // --- DAM ---------------------------------------------------------------------------------
    case "dam_price_t": {
      if (!damKnown(dateKey, ctx.nowMs)) return null;
      return ctx.dam.get(dateKey)?.get(cal.hour) ?? null;
    }
    case "dam_known": {
      if (!damKnown(dateKey, ctx.nowMs)) return 0;
      return ctx.dam.get(dateKey)?.has(cal.hour) ? 1 : 0;
    }
    case "dam_day_max": {
      if (!damKnown(dateKey, ctx.nowMs)) return null;
      const day = ctx.dam.get(dateKey);
      if (!day || !day.has(cal.hour)) return null;
      return max([...day.values()]);
    }

    // --- realized RT price history (anchored to "now", see module docstring) ----------------
    case "rt_mean_1h":
      return ctx.rt.get(lag1) ?? null;
    case "rt_mean_4h":
      return mean(windowValues(ctx.rt, lag1, 4));
    case "rt_mean_24h":
      return mean(windowValues(ctx.rt, lag1, 24));
    case "rt_max_24h":
      return max(windowValues(ctx.rt, lag1, 24));
    case "rt_hours_ge500_24h":
      return windowValues(ctx.rt, lag1, 24).filter((v) => v >= 500).length;
    case "rt_hours_ge500_7d":
      return windowValues(ctx.rt, lag1, 168).filter((v) => v >= 500).length;
    case "basis_last": {
      const rt = ctx.rt.get(lag1);
      const ref = ctx.ref.get(lag1);
      return rt === undefined || ref === undefined ? null : rt - ref;
    }
    case "basis_mean_24h": {
      const diffs: number[] = [];
      for (let h = 0; h < 24; h++) {
        const t = lag1 - h * 3600_000;
        const rt = ctx.rt.get(t);
        const ref = ctx.ref.get(t);
        if (rt !== undefined && ref !== undefined) diffs.push(rt - ref);
      }
      return mean(diffs);
    }

    // --- load actuals ------------------------------------------------------------------------
    case "load_act_lag":
      return ctx.load.get(lag1) ?? null;
    case "load_rank365":
      return null; // needs a persisted year of history this stateless cron does not keep

    // --- training-only (live: false in every exported model's feature_rules) ----------------
    case "netload_act_lag":
    case "netload_rank365":
      return null;

    // --- weather: not fetched live (per spec) ------------------------------------------------
    case "temp_last":
    case "dew_last":
    case "wind_last":
    case "temp_max_last":
    case "temp_proxy_t":
      return null;

    // --- calendar (ex ante, from the target hour's own local clock) -------------------------
    case "hour":
      return cal.hour;
    case "dow":
      return cal.dow;
    case "month":
      return cal.month;
    case "doy_sin":
      return Math.sin((2 * Math.PI * cal.doy) / 365.25);
    case "doy_cos":
      return Math.cos((2 * Math.PI * cal.doy) / 365.25);
    case "hour_sin":
      return Math.sin((2 * Math.PI * cal.hour) / 24);
    case "hour_cos":
      return Math.cos((2 * Math.PI * cal.hour) / 24);
    case "is_weekend":
      return cal.dow >= 5 ? 1 : 0;
    case "is_holiday":
      return isNercHoliday(cal) ? 1 : 0;

    // --- regime (ex ante, slow) ---------------------------------------------------------------
    case "storage_gw":
      return REGIME.storageGw;
    case "solar_gw":
      return REGIME.solarGw;
    case "wind_gw":
      return REGIME.windGw;
    case "dispatch_gw":
      return REGIME.dispatchGw;
    case "prm_year":
      return REGIME.prmYear;
    case "hcap":
      return REGIME.hcap;

    // --- tier B posted forecasts: not needed by any node/lead this cron serves ---------------
    case "lf_load_t":
    case "lf_load_rank365":
    case "lf_err_mae24":
    case "lf_err_bias24":
    case "fc_wind_t":
    case "fc_solar_t":
    case "netload_fc_t":
    case "netload_fc_rank365":
      return null;

    default:
      return null; // unknown feature name: score as missing rather than throw
  }
}

/** Build the full named feature row a model's `features` list expects for one target hour. */
export function buildFeatureRow(
  featureNames: string[],
  targetMs: number,
  ctx: LiveContext
): Record<string, number | null> {
  const row: Record<string, number | null> = {};
  for (const name of featureNames) row[name] = computeFeature(name, targetMs, ctx);
  return row;
}
