"use client";
import TodayCard from "@/components/TodayCard";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadPolicy, loadSensitivity } from "@/lib/data";
import type { Policy, Sensitivity, PolicyDecisionRow } from "@/lib/types";
import { pct } from "@/lib/format";

const LEADS = [1, 4, 24, 72];
const LEAD_LABEL: Record<number, string> = { 1: "1 h", 4: "4 h", 24: "24 h", 72: "72 h" };
const NODE_LABEL: Record<string, string> = { HB_HOUSTON: "Houston hub", HB_WEST: "West hub", HB_NORTH: "North hub", LZ_AEN: "Austin zone" };
const CUR_YEARS = [2024, 2025, 2026];
const usdk = (v: number) => `$${Math.round(v / 1000)}k`;

/** Three thin bars per year: policy (gold-hi) / DAM-only (gold) / oracle-best (gold-dim). */
function YearBars({ years, policy, dam, oracle }: { years: number[]; policy: number[]; dam: number[]; oracle: number[] }) {
  const W = 760, H = 200, m = { l: 44, r: 8, t: 10, b: 20 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(1e-6, ...policy, ...dam, ...oracle);
  const bw = iw / years.length;
  const barW = Math.max(2, bw / 4);
  const sy = (v: number) => ih - (v / max) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {years.map((yr, i) => {
        const x0 = m.l + i * bw;
        return (
          <g key={yr}>
            <rect className="bar" x={x0 + bw * 0.15} y={m.t + sy(policy[i])} width={barW} height={ih - sy(policy[i])} fill="var(--gold-hi)" style={{ animationDelay: `${i * 30}ms` }} />
            <rect className="bar" x={x0 + bw * 0.15 + barW + 2} y={m.t + sy(dam[i])} width={barW} height={ih - sy(dam[i])} fill="var(--gold)" style={{ animationDelay: `${i * 30 + 15}ms` }} />
            <rect className="bar" x={x0 + bw * 0.15 + 2 * (barW + 2)} y={m.t + sy(oracle[i])} width={barW} height={ih - sy(oracle[i])} fill="var(--gold-dim)" style={{ animationDelay: `${i * 30 + 30}ms` }} />
            <text x={x0 + bw / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{yr}</text>
          </g>
        );
      })}
      <text x={m.l - 4} y={m.t + 8} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{usdk(max)}</text>
    </svg>
  );
}

/** Predicted vs observed reliability dots for one node/lead, with a y=x reference in --line. */
function CalibrationDots({ points }: { points: { p: number; y: number }[] }) {
  const W = 320, H = 320, m = { l: 30, r: 10, t: 10, b: 24 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(0.05, ...points.map(p => Math.max(p.p, p.y))) * 1.1;
  const sx = (v: number) => m.l + (v / max) * iw;
  const sy = (v: number) => m.t + ih - (v / max) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={sx(0)} y1={sy(0)} x2={sx(max)} y2={sy(max)} stroke="var(--line)" strokeWidth={1} />
      {points.map((p, i) => <circle key={i} className="rise" cx={sx(p.p)} cy={sy(p.y)} r={4} fill="var(--gold-hi)" style={{ animationDelay: `${i * 25}ms` }} />)}
      <text x={m.l} y={H - 4} fontSize={10} fill="var(--faint)" className="mono">predicted p</text>
      <text x={4} y={m.t + 8} fontSize={10} fill="var(--faint)" className="mono" transform={`rotate(-90 4 ${m.t + 8})`}>observed</text>
    </svg>
  );
}

/** 365-day x 24-hour heat strip: opacity = p, gold-hi fill when fired & caught, ember outline when fired & false. */
function DecisionHeatStrip({ rows }: { rows: PolicyDecisionRow[] }) {
  const cell = 3, hours = 24, days = Math.ceil(rows.length / hours);
  const W = days * cell, H = hours * cell;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} preserveAspectRatio="none">
      {rows.map((r, i) => {
        const day = Math.floor(i / hours), hour = i % hours;
        const caught = r.decision === 1 && r.y === 1;
        const falseAlarm = r.decision === 1 && r.y === 0;
        const fill = caught ? "var(--gold-hi)" : "var(--gold)";
        const opacity = caught ? 1 : falseAlarm ? 0.85 : Math.max(0.03, Math.min(1, r.p));
        return (
          <rect key={i} x={day * cell} y={hour * cell} width={cell - 0.4} height={cell - 0.4}
                fill={fill} opacity={opacity} stroke={falseAlarm ? "var(--ember)" : "none"} strokeWidth={falseAlarm ? 0.6 : 0} />
        );
      })}
    </svg>
  );
}

const PARAM_LABEL: Record<string, string> = { TARGET_UTILIZATION: "utilization", BLOCK_DAYS: "bootstrap block · days", RESTART_LOSS_H: "restart loss · h", BOOTSTRAP_REPLICATES: "replicates", GPU_PER_MW: "GPU per MW", PRICE_PER_GPU_HR: "$ per GPU-hour" };

export default function PolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [sens, setSens] = useState<Sensitivity | null>(null);
  const [node, setNode] = useState("HB_WEST");
  const [lead, setLead] = useState(24);
  useEffect(() => { loadPolicy().then(setPolicy); loadSensitivity().then(setSens); }, []);

  const nodes = policy?.nodes ?? [];
  const byYearAll = useMemo(() => (policy?.by_year ?? []).filter(r => r.node === node && r.lead_h === lead).sort((a, b) => a.year - b.year), [policy, node, lead]);
  const cur = useMemo(() => byYearAll.filter(r => CUR_YEARS.includes(r.year)), [byYearAll]);
  const mean = (f: (r: typeof cur[number]) => number) => cur.length ? cur.reduce((s, r) => s + f(r), 0) / cur.length : 0;
  const caughtShare = mean(r => r.caught_value_share);
  const falseRate = mean(r => r.false_curtail_rate);
  const lift = mean(r => r.lift);
  const damLift = mean(r => r.dam_lift);

  const calib = useMemo(() => (policy?.calibration ?? [])
    .filter(r => r.node === node && r.lead_h === lead)
    .sort((a, b) => a.bin - b.bin)
    .map(r => ({ p: r.p_mean, y: r.y_rate })), [policy, node, lead]);

  const heatRows = policy?.decisions_sample ?? [];

  const topSens = useMemo(() => (sens?.rows ?? [])
    .filter(r => r.elasticity != null && r.elasticity !== 0)
    .slice()
    .sort((a, b) => Math.abs(b.elasticity as number) - Math.abs(a.elasticity as number))
    .filter((r, i, arr) => arr.findIndex(q => q.node === r.node && q.param === r.param && q.value === r.value) === i)
    .slice(0, 5), [sens]);

  return (
    <main className="min-h-screen px-6 md:px-10 py-7 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>Should the campus cut power right now?</h1>
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

      <TodayCard />

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="label">node</span>
        {nodes.map(n => <button key={n} className="chip" aria-pressed={node === n} onClick={() => setNode(n)}>{NODE_LABEL[n] ?? n}</button>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="label">lead</span>
        {LEADS.map(l => <button key={l} className="chip" aria-pressed={lead === l} onClick={() => setLead(l)}>{LEAD_LABEL[l]}</button>)}
      </div>

      <div className="rise mt-8 flex flex-wrap items-baseline gap-10">
        <div>
          <div className="display" style={{ fontSize: 64, color: "var(--gold-hi)", lineHeight: 1 }}>{pct(caughtShare, 0)}</div>
          <div className="label mt-2">of expensive hours caught · false-curtail rate {pct(falseRate, 0)}</div>
        </div>
        <div>
          <div className="display" style={{ fontSize: 32, color: "var(--ink)" }}>{lift.toFixed(1)}×</div>
          <div className="label mt-1">lift vs {damLift.toFixed(1)}× DAM-only</div>
        </div>
      </div>

      <section className="mt-12 hair pt-6">
        <div className="label mb-3">by year · earnings — policy / DAM-only / oracle-best per flexible MW</div>
        {byYearAll.length > 0 && <YearBars years={byYearAll.map(r => r.year)} policy={byYearAll.map(r => r.earnings_policy)} dam={byYearAll.map(r => r.earnings_dam_only)} oracle={byYearAll.map(r => r.earnings_oracle_best)} />}
      </section>

      <section className="mt-12 hair pt-6 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <div className="label mb-3">calibration · predicted vs observed · 2024–26</div>
          <div className="max-w-[340px]">{calib.length > 0 && <CalibrationDots points={calib} />}</div>
        </div>
        <div>
          <div className="label mb-3">a year of decisions · HB_WEST · 24 h · 2025</div>
          <div className="flex justify-center">{heatRows.length > 0 && <DecisionHeatStrip rows={heatRows} />}</div>
          <div className="mono mt-2" style={{ color: "var(--faint)", fontSize: 12 }}>rows = day of year · columns = hour · gold-hi caught · ember outline false alarm</div>
        </div>
      </section>

      <section className="mt-12 hair pt-6">
        <div className="label mb-3">warning horizon</div>
        <div className="flex flex-col gap-2">
          {(policy?.best_warning ?? []).map(r => (
            <p key={r.node} style={{ fontSize: 15, color: "var(--muted)" }}>
              <span style={{ color: "var(--ink)" }}>{NODE_LABEL[r.node] ?? r.node}</span> · {LEAD_LABEL[r.best_lead_h] ?? `${r.best_lead_h} h`} · lift {r.lift.toFixed(1)} · catches {pct(r.caught_value_share, 0)} at {pct(r.false_curtail_rate, 0)} false
            </p>
          ))}
        </div>
      </section>

      <section className="mt-12 hair pt-6 pb-10">
        <div className="label mb-3">what the answer depends on</div>
        <div className="flex flex-col gap-2">
          {topSens.map((r, i) => (
            <p key={i} style={{ fontSize: 15, color: "var(--muted)" }}>
              <span style={{ color: "var(--ink)" }}>{NODE_LABEL[r.node] ?? r.node}</span> · {PARAM_LABEL[r.param] ?? r.param} → {r.param === "TARGET_UTILIZATION" ? `${Math.round(Number(r.value) * 100)}%` : r.value} · elasticity <span className="mono" style={{ color: "var(--gold)" }}>{(r.elasticity as number).toFixed(2)}</span>
            </p>
          ))}
          <p style={{ fontSize: 15, color: "var(--muted)" }}>discrete jobs: −0 to −2.5 pp of flex share</p>
        </div>
      </section>
    </main>
  );
}
