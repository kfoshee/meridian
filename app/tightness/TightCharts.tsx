"use client";
/** Meridian physical grid-tightness model. Self-contained: fetches /data/tightness.json via loadTightness(),
 *  house tokens only (gold = physical, ember = price), plain inline SVG (no charting libs). */
import { useEffect, useMemo, useState } from "react";
import { loadTightness } from "@/lib/data";
import type { TightnessModel, TightReliability, TightPrCurve, TightMissRow } from "@/lib/types";
import Bars from "@/components/Bars";

const ERA_LABEL: Record<string, string> = {
  pre_ecrs: "pre-ECRS", post_ecrs: "post-ECRS (2023–24)", post_2024: "post-2024", rtc: "RTC (2026–)",
};
const ERAS = ["pre_ecrs", "post_ecrs", "post_2024", "rtc"];
const COLOR: Record<string, string> = { physical: "var(--gold)", price: "var(--ember)" };
const FAM_LABEL: Record<string, string> = {
  structure: "structure (grid state, capacity)", state: "state (recent load/wind/solar/storage)",
  weather: "weather (station obs + derived)", ercot_fc: "ERCOT forecasts (load/wind/solar/outage)",
  fc_error: "forecast-error history",
};

const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const num = (v: number | null | undefined, d = 3) => (v == null ? "—" : v.toFixed(d));

/** One era's reliability panel: predicted-p vs observed-y bins, physical (gold) vs price (ember), y=x ref. */
function ReliabilityPanel({ era, physical, price }: { era: string; physical?: TightReliability; price?: TightReliability }) {
  const W = 160, H = 168, m = { l: 26, r: 6, t: 6, b: 20 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const sx = (v: number) => m.l + Math.min(1, v) * iw;
  const sy = (v: number) => m.t + ih - Math.min(1, v) * ih;
  const live = (r?: TightReliability) => (r?.bins ?? []).filter(b => b.n > 0 && b.p_mean != null && b.y_rate != null);
  const pPts = live(physical), rPts = live(price);
  const mk = (pts: ReturnType<typeof live>) => pts.map(b => `${sx(b.p_mean as number)},${sy(b.y_rate as number)}`).join(" ");
  const r = (n: number) => Math.max(1.4, Math.min(5, Math.sqrt(n) / 6));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: H }}>
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="2 2" />
        <polyline points={mk(rPts)} fill="none" stroke="var(--ember)" strokeWidth={1.3} opacity={0.85} />
        {rPts.map((b, i) => <circle key={`r${i}`} cx={sx(b.p_mean as number)} cy={sy(b.y_rate as number)} r={r(b.n)} fill="var(--ember)" opacity={0.85} />)}
        <polyline points={mk(pPts)} fill="none" stroke="var(--gold)" strokeWidth={1.3} />
        {pPts.map((b, i) => <circle key={`p${i}`} cx={sx(b.p_mean as number)} cy={sy(b.y_rate as number)} r={r(b.n)} fill="var(--gold)" opacity={0.95} />)}
        {[0, 0.5, 1].map(t => <text key={t} x={sx(t)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--faint)" className="mono">{t}</text>)}
      </svg>
      <div className="label" style={{ marginTop: 2, fontSize: 11, textAlign: "center" }}>{ERA_LABEL[era] ?? era}</div>
    </div>
  );
}

/** Precision (y) vs recall (x), physical vs price, pooled, with each arm's base-rate reference line. */
function PrCurveChart({ curves }: { curves: TightPrCurve[] }) {
  const W = 420, H = 220, m = { l: 34, r: 10, t: 10, b: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const sx = (v: number) => m.l + v * iw;
  const sy = (v: number) => m.t + ih - v * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="var(--line)" strokeWidth={0.5} />)}
      {curves.map(c => (
        <g key={c.arm}>
          <polyline points={c.points.map(p => `${sx(p.recall)},${sy(p.precision)}`).join(" ")} fill="none" stroke={COLOR[c.arm]} strokeWidth={1.8} />
          {c.base_rate != null && <line x1={sx(0)} x2={sx(1)} y1={sy(c.base_rate)} y2={sy(c.base_rate)} stroke={COLOR[c.arm]} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.55} />}
        </g>
      ))}
      {[0, 0.5, 1].map(t => <text key={`x${t}`} x={sx(t)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{t}</text>)}
      {[0, 0.5, 1].map(t => <text key={`y${t}`} x={m.l - 4} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{t}</text>)}
      <text x={m.l} y={H - m.b + 18} fontSize={10} fill="var(--faint)" className="mono">recall →</text>
      <text x={4} y={m.t + 8} fontSize={10} fill="var(--faint)" className="mono" transform={`rotate(-90 4 ${m.t + 8})`}>precision</text>
    </svg>
  );
}

function MissTable({ rows, label, tint }: { rows: TightMissRow[]; label: string; tint: string }) {
  return (
    <div>
      <div className="label mb-2">{label}</div>
      <div className="overflow-x-auto">
        <table className="w-full mono" style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr className="label" style={{ textAlign: "left" }}>
              <th className="pb-1 pr-3">ts (CT)</th><th className="pb-1 pr-3">era</th><th className="pb-1 pr-3">p</th>
              <th className="pb-1 pr-3">headroom MW</th><th className="pb-1 pr-3">fc err MW</th><th className="pb-1 pr-3">heat idx °C</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hair">
                <td className="py-1 pr-3" style={{ whiteSpace: "nowrap" }}>{r.ts_ct?.slice(0, 16).replace("T", " ")}</td>
                <td className="py-1 pr-3" style={{ color: "var(--muted)" }}>{r.era}</td>
                <td className="py-1 pr-3" style={{ color: tint }}>{num(r.p, 3)}</td>
                <td className="py-1 pr-3">{r.headroom_mw != null ? Math.round(r.headroom_mw).toLocaleString() : "—"}</td>
                <td className="py-1 pr-3">{r.fc_err_mw != null ? Math.round(r.fc_err_mw).toLocaleString() : "—"}</td>
                <td className="py-1 pr-3">{r.wxE_pop_heat_index_c != null ? r.wxE_pop_heat_index_c.toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TightCharts() {
  const [d, setD] = useState<TightnessModel | null>(null);
  const [selP, setSelP] = useState(0);
  useEffect(() => { loadTightness().then(setD).catch(() => setD(null)); }, []);
  const relByEra = useMemo(() => {
    const byKey = new Map<string, TightReliability>();
    (d?.reliability ?? []).forEach(r => byKey.set(`${r.arm}:${r.era}`, r));
    return ERAS.map(era => ({ era, physical: byKey.get(`physical:${era}`), price: byKey.get(`price:${era}`) }));
  }, [d]);
  const latestEra = "rtc";
  const physLatest = d?.era_table.find(r => r.arm === "physical" && r.era === latestEra);
  const priceLatest = d?.era_table.find(r => r.arm === "price" && r.era === latestEra);
  const eLead = d?.skill_by_lead.filter(r => r.tier === "E") ?? [];
  const wLead = d?.skill_by_lead.filter(r => r.tier === "W") ?? [];
  const hasEPlus = (d?.skill_by_lead ?? []).some(r => r.tier === "E+");

  if (!d) return <div className="rise mt-8 label">Loading.</div>;
  const th = d.thresholds;
  const sel = th[Math.min(selP, th.length - 1)];

  return (
    <>
      {/* headline number */}
      <div className="rise mt-8 flex flex-wrap items-baseline gap-10">
        <div>
          <div className="display" style={{ fontSize: 64, color: "var(--gold-hi)", lineHeight: 1 }}>{num(physLatest?.bss, 2)}</div>
          <div className="label mt-2">physical BSS · Tier {d.headline.tier} · {d.headline.lead_h} h · {ERA_LABEL[latestEra]}</div>
        </div>
        <div>
          <div className="display" style={{ fontSize: 32, color: "var(--ember)" }}>{num(priceLatest?.bss, 2)}</div>
          <div className="label mt-1">price BSS, same era/tier/lead</div>
        </div>
      </div>
      <p className="mt-3" style={{ color: "var(--muted)", fontSize: 15, maxWidth: 760 }}>
        Physical wins the honest comparison — but the pre-registered falsifier still fired: physical calibration swings
        era to era as much as price&rsquo;s does. Neither arm is "done."
      </p>

      {/* reliability small multiples */}
      <section className="mt-12 hair pt-6">
        <div className="label mb-3">reliability by era · gold = physical · ember = price · Tier {d.headline.tier} · {d.headline.lead_h} h · dashed = perfect calibration</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[720px]">
          {relByEra.map(e => <ReliabilityPanel key={e.era} era={e.era} physical={e.physical} price={e.price} />)}
        </div>
      </section>

      {/* era skill table */}
      <section className="mt-12 hair pt-6">
        <div className="label mb-3">skill by era · headline pair · HGB</div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="label" style={{ textAlign: "left" }}>
                <th className="pb-2 pr-4">arm</th><th className="pb-2 pr-4">era</th><th className="pb-2 pr-4">n / pos</th>
                <th className="pb-2 pr-4">BSS (90% CI)</th><th className="pb-2 pr-4">PR-AUC</th><th className="pb-2 pr-4">cal slope</th><th className="pb-2">pred/obs</th>
              </tr>
            </thead>
            <tbody>
              {d.era_table.map((r, i) => (
                <tr key={i} className="hair">
                  <td className="py-2 pr-4 mono" style={{ color: COLOR[r.arm] }}>{r.arm}</td>
                  <td className="py-2 pr-4" style={{ fontSize: 14 }}>{ERA_LABEL[r.era] ?? r.era}</td>
                  <td className="py-2 pr-4 mono" style={{ fontSize: 13, color: "var(--muted)" }}>{r.n.toLocaleString()} / {r.n_pos}</td>
                  <td className="py-2 pr-4 mono" style={{ fontSize: 13 }}>{num(r.bss, 3)} <span style={{ color: "var(--faint)" }}>[{num(r.bss_lo, 2)}, {num(r.bss_hi, 2)}]</span></td>
                  <td className="py-2 pr-4 mono" style={{ fontSize: 13 }}>{num(r.pr_auc, 3)}</td>
                  <td className="py-2 pr-4 mono" style={{ fontSize: 13, color: r.cal_slope < 0.8 || r.cal_slope > 1.2 ? "var(--ember)" : "var(--muted)" }}>{num(r.cal_slope, 2)}</td>
                  <td className="py-2 mono" style={{ fontSize: 13 }}>{num(r.pred_obs_ratio, 2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* PR curves */}
      <section className="mt-12 hair pt-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div>
          <div className="label mb-3">PR curves, pooled · gold physical · ember price · dashed = base rate</div>
          <PrCurveChart curves={d.pr_curves} />
        </div>
        <div>
          <div className="label mb-3">skill by lead horizon · HGB, pooled</div>
          <div className="flex flex-col gap-1 mono" style={{ fontSize: 13 }}>
            {["E", "W"].map(tier => (
              <div key={tier} className="mt-2">
                <span className="label">tier {tier}{tier === "E" ? " · strict ex ante" : " · weather-known upper bound"}</span>
                {(tier === "E" ? eLead : wLead).map((r, i) => (
                  <div key={i} className="flex justify-between" style={{ color: r.target === d.headline.physical_target ? "var(--gold)" : "var(--ember)" }}>
                    <span>{r.target === d.headline.physical_target ? "physical" : "price"} · {r.lead_h} h</span>
                    <span>BSS {num(r.bss, 3)} · PR-AUC {num(r.pr_auc, 3)}</span>
                  </div>
                ))}
              </div>
            ))}
            {!hasEPlus && <div className="mt-2" style={{ color: "var(--faint)", fontSize: 12 }}>Tier E+ (Open-Meteo previous-run vintages) not built yet — weather_om_fc absent.</div>}
          </div>
        </div>
      </section>

      {/* thresholds */}
      <section className="mt-12 hair pt-6">
        <div className="label mb-3">operating point · physical, Tier {d.headline.tier}, {d.headline.lead_h} h</div>
        <input type="range" min={0} max={th.length - 1} step={1} value={selP} onChange={e => setSelP(+e.target.value)} style={{ width: 260 }} aria-label="Threshold p*" />
        <span className="mono ml-3" style={{ color: "var(--gold-hi)" }}>p* = {num(sel?.p_star, 2)}</span>
        <div className="overflow-x-auto mt-4">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="label" style={{ textAlign: "left" }}>
                <th className="pb-2 pr-4">p*</th><th className="pb-2 pr-4">fire hrs</th><th className="pb-2 pr-4">precision</th>
                <th className="pb-2 pr-4">recall</th><th className="pb-2 pr-4">false-alarm</th><th className="pb-2">lift</th>
              </tr>
            </thead>
            <tbody>
              {th.map((r, i) => (
                <tr key={i} className="hair" style={{ background: i === selP ? "var(--gold-dim)" : "transparent", cursor: "pointer" }} onClick={() => setSelP(i)}>
                  <td className="py-2 pr-4 mono">{num(r.p_star, 2)}</td>
                  <td className="py-2 pr-4 mono">{r.fire_hours.toLocaleString()}</td>
                  <td className="py-2 pr-4 mono">{pct(r.precision)}</td>
                  <td className="py-2 pr-4 mono">{pct(r.recall)}</td>
                  <td className="py-2 pr-4 mono">{pct(r.false_alarm_rate)}</td>
                  <td className="py-2 mono">{r.lift.toFixed(1)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* misses / false alarms */}
      <section className="mt-12 hair pt-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <MissTable rows={d.misses} label={`20 largest misses (tight hours the model called quiet) · physical`} tint="var(--ember)" />
        <MissTable rows={d.false_alarms} label={`20 largest false alarms (quiet hours the model called tight) · physical`} tint="var(--gold)" />
      </section>

      {/* feature importance */}
      <section className="mt-12 hair pt-6">
        <div className="label mb-3">permutation importance by feature family · PR-AUC drop when zeroed · physical, Tier {d.headline.tier}, {d.headline.lead_h} h, HGB</div>
        <Bars k="fi" values={d.feature_importance.map(f => f.pr_auc_drop)} labels={d.feature_importance.map(f => FAM_LABEL[f.family] ?? f.family)} height={72} />
      </section>

      {/* what this is / is not */}
      <section className="mt-12 hair pt-6 pb-10">
        <div className="label mb-3">what this is / is not</div>
        <div className="flex flex-col gap-3" style={{ maxWidth: 760, fontSize: 15, color: "var(--muted)" }}>
          <p><span style={{ color: "var(--ink)" }}>Nothing downstream of price is in the physical feature set</span> — only grid structure/capacity, recent state, weather, ERCOT&rsquo;s own forecasts, and forecast-error history. The physical model cannot be "cheating" by seeing price.</p>
          <p><span style={{ color: "var(--ink)" }}>Tier E is the honest number</span> — strict ex ante, only information available at the cut time. <span style={{ color: "var(--ink)" }}>Tier W is a weather-known upper bound</span> — it gets the realized weather instead of the forecast, so it shows what perfect weather knowledge would buy, not a number to underwrite against.</p>
          <p><span style={{ color: "var(--ember)" }}>The pre-registered falsifier fired</span>: {d.headline.hypotheses.falsifier_detail.rule}. Neither H1 (physical holds calibration across eras) nor H2 (price loses calibration after 2024) was supported — physical wins on skill, but both arms move around across market-structure eras (ECRS, RTC) in ways a single pooled number hides.</p>
        </div>
      </section>
    </>
  );
}
