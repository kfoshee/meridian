"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { loadPost4cp } from "@/lib/data";
import type { Post4cp, Post4cpByYearRow, Post4cpWindowRow, Post4cpFloorRow, Post4cpVariantRow, Post4cpAccessCurveRow, Post4cpClrRow } from "@/lib/types";
import { usd } from "@/lib/format";

const RULES = ["persistence", "oracle_day"] as const;
const RULE_LABEL: Record<string, string> = { persistence: "persistence", oracle_day: "oracle (day-ahead best case)" };

/** Two bars per CP year: 4CP hours (gold) vs 12CP-legacy hours (ember) needed to catch every peak. */
function YearPairBars({ rows }: { rows: Post4cpByYearRow[] }) {
  const W = 820, H = 200, m = { l: 46, r: 8, t: 10, b: 20 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(1, ...rows.map(r => Math.max(r.hours_4cp ?? 0, r.hours_12cp ?? 0)));
  const bw = iw / rows.length, barW = Math.max(2, bw / 3);
  const sy = (v: number) => ih - (v / max) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {rows.map((r, i) => {
        const x0 = m.l + i * bw;
        return (
          <g key={r.cp_year}>
            <rect className="bar" x={x0 + bw * 0.15} y={m.t + sy(r.hours_4cp ?? 0)} width={barW} height={ih - sy(r.hours_4cp ?? 0)} fill="var(--gold)" style={{ animationDelay: `${i * 20}ms` }} />
            <rect className="bar" x={x0 + bw * 0.15 + barW + 2} y={m.t + sy(r.hours_12cp ?? 0)} width={barW} height={ih - sy(r.hours_12cp ?? 0)} fill="var(--ember)" style={{ animationDelay: `${i * 20 + 10}ms` }} />
            <text x={x0 + bw / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--faint)" className="mono">{String(r.cp_year).slice(2)}</text>
          </g>
        );
      })}
      <text x={m.l - 4} y={m.t + 8} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{Math.round(max)} h</text>
    </svg>
  );
}

/** 12 months x 24 hours: gold cells mark the derived monthly CP window(s); winter mornings visible. */
function WindowStrip({ windows }: { windows: Post4cpWindowRow[] }) {
  const cell = 20, W = 12 * cell, H = 24 * cell;
  const inWindow = (w: Post4cpWindowRow, hour: number) =>
    (w.window_1_lo != null && w.window_1_hi != null && hour >= w.window_1_lo && hour <= w.window_1_hi) ||
    (w.window_2_lo != null && w.window_2_hi != null && hour >= w.window_2_lo && hour <= w.window_2_hi);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", maxWidth: 420 }}>
      {windows.map((w, mi) => Array.from({ length: 24 }, (_, hour) => {
        const on = inWindow(w, hour);
        return <rect key={hour} x={mi * cell} y={(23 - hour) * cell} width={cell - 1} height={cell - 1}
                     fill={on ? "var(--gold-hi)" : "var(--surface)"} opacity={on ? 1 : 0.6} />;
      }))}
    </svg>
  );
}

/** Avoided $/flexible-MW-yr vs peaks caught, one line per billing-floor case: three flat zero lines + one slope. */
function FloorLines({ rows }: { rows: Post4cpFloorRow[] }) {
  const cases = Array.from(new Set(rows.map(r => r.case)));
  const COLOR: Record<string, string> = {
    a_contracted_peak_equals_nameplate: "var(--faint)",
    b1_contracted_floor_grid_served_draws_nameplate: "var(--muted)",
    b2_contracted_floor_grid_import_capped_btm: "var(--gold-hi)",
    d_legacy_no_minimum_billing_demand: "var(--ember)",
  };
  const LABEL: Record<string, string> = {
    a_contracted_peak_equals_nameplate: "(a) contracted = nameplate",
    b1_contracted_floor_grid_served_draws_nameplate: "(b1) grid-served, draws nameplate",
    b2_contracted_floor_grid_import_capped_btm: "(b2) import capped at F, BTM",
    d_legacy_no_minimum_billing_demand: "(d) legacy, no MBD",
  };
  const W = 640, H = 220, m = { l: 60, r: 10, t: 10, b: 24 };
  const x = scaleLinear([0, 12], [m.l, W - m.r]);
  const max = Math.max(1, ...rows.map(r => r.avoided_usd_per_flexible_mw_yr));
  const y = scaleLinear([0, max], [H - m.b, m.t]);
  const mk = (c: string) => {
    const pts = rows.filter(r => r.case === c).sort((a, b) => a.peaks_caught - b.peaks_caught);
    return line<Post4cpFloorRow>().x(r => x(r.peaks_caught)).y(r => y(r.avoided_usd_per_flexible_mw_yr)).curve(curveMonotoneX)(pts) || "";
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, max / 2, max].map(v => <text key={v} x={m.l - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{usd(v)}</text>)}
        {cases.map(c => <path key={c} d={mk(c)} fill="none" stroke={COLOR[c] ?? "var(--muted)"} strokeWidth={2} pathLength={1} className="draw" />)}
        {[0, 6, 12].map(t => <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{t}/12</text>)}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {cases.map(c => <span key={c} className="mono" style={{ fontSize: 11, color: COLOR[c] }}>■ {LABEL[c] ?? c}</span>)}
      </div>
    </div>
  );
}

/** Ratchet % and weight cases vs avoided $/flexible-MW-yr, with the $50k line marking where the answer changes. */
function VariantBars({ rows, target = 50000 }: { rows: Post4cpVariantRow[]; target?: number }) {
  const W = 640, H = 200, m = { l: 56, r: 10, t: 10, b: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(target * 1.1, ...rows.map(r => r.avoided_usd_per_flexible_mw_yr));
  const bw = iw / rows.length, barW = Math.max(4, bw * 0.6);
  const sy = (v: number) => ih - (v / max) * ih;
  const label = (c: string) => c.startsWith("c_ratchet_") ? c.replace("c_ratchet_", "").replace("pct", "%") : `w=${c.replace("c_weighted_w", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={m.l} x2={W - m.r} y1={m.t + sy(target)} y2={m.t + sy(target)} stroke="var(--ember)" strokeDasharray="3 3" strokeWidth={1} />
      <text x={W - m.r} y={m.t + sy(target) - 4} textAnchor="end" fontSize={10} fill="var(--ember)" className="mono">$50k target</text>
      {rows.map((r, i) => {
        const x0 = m.l + i * bw + (bw - barW) / 2;
        const passes = r.avoided_usd_per_flexible_mw_yr >= target;
        return (
          <g key={r.case}>
            <rect className="bar" x={x0} y={m.t + sy(r.avoided_usd_per_flexible_mw_yr)} width={barW} height={ih - sy(r.avoided_usd_per_flexible_mw_yr)}
                  fill={passes ? "var(--gold-hi)" : "var(--gold-dim)"} style={{ animationDelay: `${i * 25}ms` }} />
            <text x={x0 + barW / 2} y={H - m.b + 14} textAnchor="middle" fontSize={9} fill="var(--faint)" className="mono" transform={`rotate(-40 ${x0 + barW / 2} ${H - m.b + 14})`}>{label(r.case)}</text>
          </g>
        );
      })}
      <text x={m.l - 4} y={m.t + 8} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{usd(max)}</text>
    </svg>
  );
}

/** Access levelized $/MW-yr vs months avoided, 0-36. */
function AccessCurve({ rows }: { rows: Post4cpAccessCurveRow[] }) {
  const W = 640, H = 200, m = { l: 70, r: 10, t: 10, b: 24 };
  const x = scaleLinear([0, 36], [m.l, W - m.r]);
  const max = Math.max(1, ...rows.map(r => r.levelized_usd_per_mw_yr));
  const y = scaleLinear([0, max], [H - m.b, m.t]);
  const sorted = [...rows].sort((a, b) => a.months_avoided - b.months_avoided);
  const d = line<Post4cpAccessCurveRow>().x(r => x(r.months_avoided)).y(r => y(r.levelized_usd_per_mw_yr)).curve(curveMonotoneX)(sorted) || "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, max / 2, max].map(v => <text key={v} x={m.l - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{usd(v)}</text>)}
      <path d={d} fill="none" stroke="var(--gold-hi)" strokeWidth={2} pathLength={1} className="draw" />
      {sorted.map(r => <circle key={r.months_avoided} cx={x(r.months_avoided)} cy={y(r.levelized_usd_per_mw_yr)} r={3} fill="var(--gold-hi)" />)}
      {[0, 12, 24, 36].map(t => <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{t} mo</text>)}
    </svg>
  );
}

/** Program-ledger bars: $/MW-yr per program, with expected curtailment hours labelled under each bar. */
function LedgerBars({ rows }: { rows: Post4cpClrRow[] }) {
  const W = 640, H = 200, m = { l: 60, r: 10, t: 10, b: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(1, ...rows.map(r => r.usd_per_mw_yr_mid ?? 0));
  const bw = iw / rows.length, barW = Math.max(10, bw * 0.5);
  const sy = (v: number) => ih - (v / max) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {rows.map((r, i) => {
        const v = r.usd_per_mw_yr_mid ?? 0;
        const x0 = m.l + i * bw + (bw - barW) / 2;
        return (
          <g key={r.id}>
            <rect className="bar" x={x0} y={m.t + sy(v)} width={barW} height={ih - sy(v)} fill={r.id === "ers" ? "var(--gold-hi)" : "var(--gold)"} style={{ animationDelay: `${i * 30}ms` }} />
            <text x={x0 + barW / 2} y={H - m.b + 14} textAnchor="middle" fontSize={10} fill="var(--ink)" className="mono">{r.id}</text>
            <text x={x0 + barW / 2} y={H - m.b + 27} textAnchor="middle" fontSize={9} fill="var(--faint)" className="mono">{r.expected_hours_per_yr ?? 0} h/yr</text>
          </g>
        );
      })}
      <text x={m.l - 4} y={m.t + 8} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{usd(max)}</text>
    </svg>
  );
}

/** ERCOT vs PJM, same units ($/MW-yr), each bar labelled with the standby hours it requires. */
function PjmVsErcotBars({ p4, ercotAccess }: { p4: Post4cp; ercotAccess: number | null }) {
  const bars = [
    { label: "ERCOT 4CP", v: p4.ercot_reference.fourcp_high, hours: "375–450 h", color: "var(--gold-hi)" },
    { label: "ERCOT access", v: ercotAccess ?? 0, hours: "44 h", color: "var(--gold)" },
    { label: "PJM PLC (5CP)", v: p4.pjm.rate_band["5cp"]?.high ?? 0, hours: `${p4.pjm.hours_5cp_persistence.hours_median ?? "?"} h`, color: "var(--ember)" },
    { label: "PJM NITS", v: p4.pjm.rate_band["1cp"]?.high ?? 0, hours: "22–70 h", color: "var(--muted)" },
  ];
  const W = 520, H = 220, m = { l: 60, r: 10, t: 10, b: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(1, ...bars.map(b => b.v));
  const bw = iw / bars.length, barW = bw * 0.55;
  const sy = (v: number) => ih - (v / max) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {bars.map((b, i) => {
        const x0 = m.l + i * bw + (bw - barW) / 2;
        return (
          <g key={b.label}>
            <rect className="bar" x={x0} y={m.t + sy(b.v)} width={barW} height={ih - sy(b.v)} fill={b.color} style={{ animationDelay: `${i * 40}ms` }} />
            <text x={x0 + barW / 2} y={m.t + sy(b.v) - 6} textAnchor="middle" fontSize={10} fill="var(--ink)" className="mono">{usd(b.v)}</text>
            <text x={x0 + barW / 2} y={H - m.b + 14} textAnchor="middle" fontSize={10} fill="var(--ink)">{b.label}</text>
            <text x={x0 + barW / 2} y={H - m.b + 27} textAnchor="middle" fontSize={9} fill="var(--faint)" className="mono">{b.hours}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Post4CP() {
  const [d, setD] = useState<Post4cp | null>(null);
  const [rule, setRule] = useState<(typeof RULES)[number]>("persistence");
  useEffect(() => { loadPost4cp().then(setD); }, []);

  const byYear = useMemo(() => d?.twelvecp.by_year_by_rule[rule] ?? [], [d, rule]);
  const ratioMean = (d?.twelvecp.rate_scaling as { ratio_mean?: number })?.ratio_mean;
  const rateMultiple = ratioMean ? (1 / ratioMean).toFixed(2) : "–";
  const medianHours12 = useMemo(() => {
    const vals = byYear.map(r => r.hours_12cp).filter((v): v is number => v != null).sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : null;
  }, [byYear]);
  const medianHours4 = useMemo(() => {
    const vals = byYear.map(r => r.hours_4cp).filter((v): v is number => v != null).sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : null;
  }, [byYear]);

  return (
    <main className="min-h-screen px-6 md:px-10 py-7 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>After 4CP</h1>
        <nav className="flex gap-6 label">
          <Link href="/" className="hover:text-[var(--ink)]">Map</Link>
          <Link href="/verdict/" className="hover:text-[var(--ink)]">Verdict</Link>
          <Link href="/policy/" className="hover:text-[var(--ink)]">Policy</Link>
          <Link href="/post4cp/" className="hover:text-[var(--ink)]">Post-4CP</Link>
          <Link href="/rank/" className="hover:text-[var(--ink)]">Rank</Link>
          <Link href="/network/" className="hover:text-[var(--ink)]">Network</Link>
          <Link href="/tightness/" className="hover:text-[var(--ink)]">Tightness</Link>
          <Link href="/history/" className="hover:text-[var(--ink)]">History</Link>
          <Link href="/methodology/" className="hover:text-[var(--ink)]">Method</Link>
          <Link href="/sources/" className="hover:text-[var(--ink)]">Sources</Link>
          <a href="/report/ercot-flex-report.zip" download="ercot-flex-report.zip" style={{ color: "var(--gold)" }}>Download zip ↓</a>
        </nav>
      </header>

      {!d && <div className="rise mt-8 label">Loading.</div>}
      {d && (
        <>
          {/* 1. 12CP vs 4CP */}
          <section className="mt-8">
            <div className="display" style={{ fontSize: 56, color: "var(--gold-hi)", lineHeight: 1 }}>{rateMultiple}×</div>
            <div className="label mt-2">the rate per avoided MW under 12CP vs 4CP — worth more per peak, at roughly {medianHours4 ? Math.round((medianHours12 ?? 0) / medianHours4) : "3"}× the standby hours</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 items-center mt-4">
              <span className="label">rule</span>
              {RULES.map(r => <button key={r} className="chip" aria-pressed={rule === r} onClick={() => setRule(r)}>{RULE_LABEL[r]}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 mt-4 items-start">
              <div>
                <div className="label mb-2">hours to catch every peak, by CP year · gold = 4CP · ember = 12CP-legacy</div>
                <YearPairBars rows={byYear} />
              </div>
              <div>
                <div className="label mb-2">derived monthly CP windows · hour 0–23 (bottom–top) × month (Jan–Dec)</div>
                <WindowStrip windows={d.twelvecp.windows} />
                <div className="mono mt-1" style={{ color: "var(--faint)", fontSize: 11 }}>winter mornings (Nov–Feb, ~06–10h) now carry CP risk, not just summer afternoons</div>
              </div>
            </div>
          </section>

          {/* 2. the floor */}
          <section className="mt-12 hair pt-6">
            <div className="display" style={{ fontSize: 56, color: "var(--ember)", lineHeight: 1 }}>$0</div>
            <div className="label mt-2">avoided per flexible MW-yr for a new large load, at any catch rate 0–12 — the non-coincident-peak leg binds</div>
            <div className="mt-4"><FloorLines rows={d.billing.floor_curve} /></div>
          </section>

          {/* 3. variants */}
          <section className="mt-12 hair pt-6">
            <div className="display" style={{ fontSize: 40, color: "var(--gold-hi)" }}>
              {typeof d.billing.breakevens.ratchet_pct_below_which_full_legacy_value_returns_at_12of12 === "number"
                ? `${(d.billing.breakevens.ratchet_pct_below_which_full_legacy_value_returns_at_12of12 * 100).toFixed(0)}%`
                : "–"}
            </div>
            <div className="label mt-2">ratchet breakeven — below this percentage of the floor, catching peaks pays again</div>
            <div className="mt-4"><VariantBars rows={d.billing.variants} /></div>
          </section>

          {/* 4. access */}
          <section className="mt-12 hair pt-6">
            <div className="display" style={{ fontSize: 40, color: "var(--gold-hi)" }}>{usd(d.ercot_reference.access_levelized_at_curated ?? 0)}</div>
            <div className="label mt-2">levelized $/MW-yr from queue-jump access alone, at the curated months-avoided scenario</div>
            <div className="mt-4"><AccessCurve rows={d.access.curve} /></div>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "4px 10px" }}>44 h/yr — access curtailment</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "4px 10px" }}>375–450 h/yr — 4CP standby</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "4px 10px" }}>
                {d.twelvecp.hours_to_catch_10_median ?? "?"}–{d.twelvecp.hours_to_catch_12_median ?? "?"} h/yr — 12CP (10 of 12 → all 12, persistence)
              </span>
            </div>
          </section>

          {/* 5. program ledger */}
          <section className="mt-12 hair pt-6">
            <div className="label mb-3">program ledger — $/MW-yr, expected curtailment hours below each bar</div>
            {d.clr ? <LedgerBars rows={d.clr.ledger} /> : <div className="label">pending</div>}
          </section>

          {/* 6. PJM vs ERCOT */}
          <section className="mt-12 hair pt-6 pb-10">
            <div className="label mb-3">PJM vs ERCOT, same units ($/MW-yr) — obligation survives non-firm status only until 2029-06-01 at the earliest</div>
            <PjmVsErcotBars p4={d} ercotAccess={d.ercot_reference.access_levelized_at_curated} />
          </section>
        </>
      )}
    </main>
  );
}
