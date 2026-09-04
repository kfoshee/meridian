/**
 * America/Chicago wall-clock <-> UTC conversion, DST-correct, with no dependency.
 *
 * ERCOT posts everything (DAM/RTM delivery dates, hour-ending/delivery-hour, the 13:30 DAM
 * posting rule) on the Chicago wall clock, and the model's calendar features (hour/dow/month/
 * doy, the DAM posting-time gate) are all defined on that same local clock -- see
 * `pipeline/src/flexuw/decide/features.py::dam_post_utc` for the reference rule this mirrors.
 */

const TZ = "America/Chicago";

export type WallClock = { y: number; m: number; d: number; hh: number; mm: number; ss: number };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** The Chicago wall-clock reading of a UTC instant. */
export function toChicagoWall(date: Date): WallClock {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  let hh = get("hour");
  if (hh === 24) hh = 0; // some ICU builds emit "24" for midnight with hour12:false
  return { y: get("year"), m: get("month"), d: get("day"), hh, mm: get("minute"), ss: get("second") };
}

/**
 * The UTC instant whose Chicago wall clock reads `w`. Converges in <=2 iterations of a
 * fixed-point search (the same technique luxon/date-fns-tz use internally): guess UTC = the
 * wall clock taken literally as UTC, read back what that instant looks like in Chicago, and
 * correct by the difference.
 */
export function fromChicagoWall(w: WallClock): Date {
  let guessMs = Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm, w.ss);
  for (let i = 0; i < 2; i++) {
    const read = toChicagoWall(new Date(guessMs));
    const readAsUtc = Date.UTC(read.y, read.m - 1, read.d, read.hh, read.mm, read.ss);
    const wantAsUtc = Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm, w.ss);
    const diff = readAsUtc - wantAsUtc;
    if (diff === 0) break;
    guessMs -= diff;
  }
  return new Date(guessMs);
}

/** Chicago-local calendar fields for a UTC instant, matching `flexuw.decide.features.hourly_grid`. */
export type ChicagoCalendar = {
  year: number; month: number; day: number; hour: number;
  dow: number;   // 0=Monday .. 6=Sunday (matches polars weekday()-1 in features.py)
  doy: number;   // 1-based ordinal day of year
};

export function chicagoCalendar(date: Date): ChicagoCalendar {
  const w = toChicagoWall(date);
  const jsDow = new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay(); // 0=Sunday..6=Saturday, UTC-safe
  const dow = (jsDow + 6) % 7; // 0=Monday..6=Sunday
  const startOfYearMs = Date.UTC(w.y, 0, 1);
  const startOfDayMs = Date.UTC(w.y, w.m - 1, w.d);
  const doy = Math.round((startOfDayMs - startOfYearMs) / 86400000) + 1;
  return { year: w.y, month: w.m, day: w.d, hour: w.hh, dow, doy };
}

/** The Chicago calendar date (YYYY-MM-DD) `date` falls on, as a plain key for day-level grouping. */
export function chicagoDateKey(date: Date): string {
  const w = toChicagoWall(date);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}

/** UTC instant for the *start* of the local hour that begins at `hourBeginning` (0-23) on `dateKey`. */
export function chicagoHourStart(dateKey: string, hourBeginning: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  // hourBeginning can be 24 for a DST short-day rollover guard; Date.UTC normalizes overflow,
  // and fromChicagoWall's fixed-point search still converges because it only ever compares
  // wall-clock *readings*, never relies on hh staying in [0,23].
  return fromChicagoWall({ y, m, d, hh: hourBeginning, mm: 0, ss: 0 });
}

const NERC_FIXED = [[1, 1], [7, 4], [12, 25]] as const; // New Year, Independence, Christmas

function nthWeekday(year: number, month1: number, weekday0Sun: number, nth: "first" | "last"): number {
  // month1 is 1-12; weekday0Sun is JS getUTCDay() convention (0=Sunday).
  if (nth === "first") {
    for (let d = 1; d <= 7; d++) {
      if (new Date(Date.UTC(year, month1 - 1, d)).getUTCDay() === weekday0Sun) return d;
    }
  } else {
    const last = new Date(Date.UTC(year, month1, 0)).getUTCDate(); // last day of month1
    for (let d = last; d >= last - 6; d--) {
      if (new Date(Date.UTC(year, month1 - 1, d)).getUTCDay() === weekday0Sun) return d;
    }
  }
  throw new Error("unreachable");
}

/** `flexuw.decide.features.US_HOLIDAYS_RULE`: the NERC six. */
export function isNercHoliday(cal: ChicagoCalendar): boolean {
  if (NERC_FIXED.some(([m, d]) => m === cal.month && d === cal.day)) return true;
  const memorialDay = nthWeekday(cal.year, 5, 1, "last");   // last Monday in May
  if (cal.month === 5 && cal.day === memorialDay) return true;
  const laborDay = nthWeekday(cal.year, 9, 1, "first");     // first Monday in September
  if (cal.month === 9 && cal.day === laborDay) return true;
  const thanksgiving = nthWeekday(cal.year, 11, 4, "first") + 21; // 4th Thursday: 1st Thu + 21d
  if (cal.month === 11 && cal.day === thanksgiving) return true;
  return false;
}
