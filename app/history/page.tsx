"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadHistory, loadRegime, loadIndex } from "@/lib/data";
import type { History, Regime, Index, Era } from "@/lib/types";
import { pct } from "@/lib/format";

const DEFNS = ["p500", "p1000", "top1", "basis50", "neg0"];
const DEFN_LABEL: Record<string, string> = { p500: "≥ $500/MWh", p1000: "≥ $1000/MWh", top1: "top 1% hours", basis50: "local congestion", neg0: "price ≤ $0" };
const Y0 = 2011, Y1 = 2027; // half-open [Y0, Y1)

function sci(p: number) {
  if (p >= 0.001) return p.toFixed(3);
  const s = p.toExponential(0); // "1e-5"
  return s.replace("e-0", "e-").replace("e+0", "e+");
}
function yearFrac(d: string) {
  if (!d) return Y1;
  const [y, m] = d.split("-").map(Number);
  return y + (m - 1) / 12;
}
function fmtHcap(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 2)}k cap`;
  return `$${v} cap`;
}

/** Bars of hours_per_8760 by year with era-cap shading behind. */
function EraBars({ years, values, eras }: { years: number[]; values: number[]; eras: Era[] }) {
  const W = 720, H = 150, m = { l: 36, r: 8, t: 10, b: 20 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(1e-6, ...values);
  const sx = (v: number) => m.l + ((v - Y0) / (Y1 - Y0)) * iw;
  const bw = iw / years.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {eras.map((e, i) => {
        const a = Math.max(Y0, yearFrac(e.start_date)), b = Math.min(Y1, yearFrac(e.end_date) || Y1);
        if (b <= Y0 || a >= Y1 || b <= a) return null;
        const x0 = sx(a), x1 = sx(b);
        return (
          <g key={i}>
            <rect x={x0} y={m.t} width={x1 - x0} height={ih} fill="var(--gold-dim)" opacity={0.35} />
            {x1 - x0 > 26 && <text x={(x0 + x1) / 2} y={m.t + 9} textAnchor="middle" fontSize={8} fill="var(--faint)" className="mono">{fmtHcap(e.hcap)}</text>}
          </g>
        );
      })}
      {years.map((yr, i) => {
        const v = values[i] ?? 0;
        const h = (v / max) * (ih - 14);
        return <rect key={yr} className="bar" x={sx(yr) + 2} y={m.t + ih - h} width={bw - 4} height={h} rx={1} fill="var(--gold)" style={{ animationDelay: `${i * 30}ms` }} />;
      })}
      {years.map((yr, i) => (i % 2 === 0 || years.length <= 10) && <text key={"l" + yr} x={sx(yr) + bw / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{yr}</text>)}
      <text x={m.l - 4} y={m.t + 8} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{max.toFixed(0)}h</text>
    </svg>
  );
}

/** Dual-axis lines: ge65 hours (gold, left) vs P($500|top0.5%) (ember, right 0-1). */
function TightnessLines({ years, ge65, cond }: { years: number[]; ge65: number[]; cond: number[] }) {
  const W = 720, H = 140, m = { l: 34, r: 34, t: 10, b: 20 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const maxA = Math.max(1e-6, ...ge65);
  const sx = (i: number) => m.l + (i / (years.length - 1)) * iw;
  const syA = (v: number) => m.t + ih - (v / maxA) * ih;
  const syB = (v: number) => m.t + ih - v * ih;
  const path = (ys: number[], sy: (v: number) => number) => ys.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i)},${sy(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <path d={path(ge65, syA)} fill="none" stroke="var(--gold)" strokeWidth={1.6} pathLength={1} className="draw" />
      <path d={path(cond, syB)} fill="none" stroke="var(--ember)" strokeWidth={1.6} pathLength={1} className="draw" />
      {cond.map((v, i) => <circle key={i} cx={sx(i)} cy={syB(v)} r={2} fill="var(--ember)" />)}
      {years.map((yr, i) => (i % 2 === 0) && <text key={yr} x={sx(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{yr}</text>)}
      <text x={m.l - 4} y={m.t + 6} textAnchor="end" fontSize={10} fill="var(--gold)" className="mono">{maxA.toFixed(0)}h</text>
      <text x={W - m.r + 4} y={m.t + 6} textAnchor="start" fontSize={10} fill="var(--ember)" className="mono">100%</text>
      <text x={W - m.r + 4} y={m.t + ih} textAnchor="start" fontSize={10} fill="var(--ember)" className="mono">0%</text>
    </svg>
  );
}

/** Dot scatter of mean $500-event start hour by year. */
function EventsDots({ years, values }: { years: number[]; values: number[] }) {
  const W = 720, H = 130, m = { l: 30, r: 8, t: 10, b: 20 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const sx = (i: number) => m.l + (i / (years.length - 1)) * iw;
  const sy = (v: number) => m.t + ih - (v / 24) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 6, 12, 18, 24].map(t => <line key={t} x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth={0.6} />)}
      {values.map((v, i) => <circle key={i} className="rise" cx={sx(i)} cy={sy(v)} r={4} fill="var(--gold-hi)" style={{ animationDelay: `${i * 25}ms` }} />)}
      {years.map((yr, i) => (i % 2 === 0) && <text key={yr} x={sx(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--faint)" className="mono">{yr}</text>)}
      {[0, 12, 24].map(t => <text key={t} x={m.l - 4} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="var(--faint)" className="mono">{t}h</text>)}
    </svg>
  );
}

/** Two bar strips: events/8760 and median duration, by year. */
function DurationBars({ years, events, dur }: { years: number[]; events: number[]; dur: number[] }) {
  const W = 720, m = { l: 0, r: 0 };
  const iw = W, bw = iw / years.length;
  const maxE = Math.max(1e-6, ...events), maxD = Math.max(1e-6, ...dur);
  const sx = (i: number) => m.l + i * bw;
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} 24`} className="w-full" style={{ height: 24 }}>
        {events.map((v, i) => <rect key={i} className="bar" x={sx(i) + 1} y={24 - (v / maxE) * 22} width={bw - 2} height={(v / maxE) * 22} fill="var(--gold)" opacity={0.7} style={{ animationDelay: `${i * 20}ms` }} />)}
      </svg>
      <svg viewBox={`0 0 ${W} 24`} className="w-full" style={{ height: 24 }}>
        {dur.map((v, i) => <rect key={i} className="bar" x={sx(i) + 1} y={24 - (v / maxD) * 22} width={bw - 2} height={(v / maxD) * 22} fill="var(--ember)" opacity={0.85} style={{ animationDelay: `${i * 20}ms` }} />)}
      </svg>
      <div className="grid mono" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)`, fontSize: 10, color: "var(--faint)" }}>
        {years.map((yr, i) => <span key={yr} className="text-center">{i % 2 === 0 ? yr : ""}</span>)}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [regime, setRegime] = useState<Regime | null>(null);
  const [index, setIndex] = useState<Index | null>(null);
  const [node, setNode] = useState("HB_HOUSTON");
  const [defn, setDefn] = useState("p500");

  useEffect(() => { loadHistory().then(setHistory); loadRegime().then(setRegime); loadIndex().then(setIndex); }, []);

  const names = useMemo(() => Object.fromEntries((index?.nodes ?? []).map(n => [n.id, n.name.replace(/ (Hub|Load Zone|Zone)$/, "")])), [index]);

  const years = useMemo(() => (history?.years ?? []).filter(y => y >= Y0 && y < Y1), [history]);
  const series = useMemo(() => (history?.series[node]?.[defn] ?? []).filter(r => r.year >= Y0 && r.year < Y1), [history, node, defn]);
  const tightness = useMemo(() => (history?.tightness ?? []).filter(r => r.year >= Y0 && r.year < Y1), [history]);
  const migration = useMemo(() => (history?.migration ?? []).filter(r => r.year >= Y0 && r.year < Y1), [history]);
  const duration = useMemo(() => (history?.duration ?? []).filter(r => r.year >= Y0 && r.year < Y1), [history]);

  const cr = regime?.current_regime.by_node[node]?.[defn];
  const ks = history?.tests.ks_start_hour;
  const mkDur = history?.tests.mk_duration;
  const headline = history?.headline;
  const proj = regime?.projection[node]?.[defn];
  const lro = regime?.diagnostics.leave_recent_out?.find(r => r.defn === defn);

  return (
    <main className="min-h-screen px-6 md:px-10 py-7 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>Fifteen years, three regimes.</h1>
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

      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="label">node</span>
        {(history?.nodes ?? []).map(n => <button key={n} className="chip" aria-pressed={node === n} onClick={() => setNode(n)}>{names[n] ?? n}</button>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="label">definition</span>
        {DEFNS.map(d => <button key={d} className="chip" aria-pressed={defn === d} onClick={() => setDefn(d)}>{DEFN_LABEL[d]}</button>)}
      </div>

      {cr && (
        <div className="rise mt-8">
          <div className="flex items-baseline gap-3">
            <div className="display" style={{ fontSize: 64, color: "var(--gold-hi)", lineHeight: 1 }}>{cr.hours.toFixed(0)}</div>
            <span className="mono" style={{ color: "var(--muted)", fontSize: 18 }}>[{cr.ci_lo.toFixed(0)}–{cr.ci_hi.toFixed(0)}]</span>
          </div>
          <div className="label mt-2">hours a year · 2024 → today · model-free</div>
        </div>
      )}

      <section className="mt-12">
        <div className="label mb-3">hours a year, by year · {DEFN_LABEL[defn]}</div>
        {series.length > 0 && <EraBars years={years} values={series.map(r => r.hours_per_8760)} eras={history?.eras ?? []} />}
      </section>

      <section className="mt-12 hair pt-6">
        <div className="label mb-3">tight grid, cheap prints</div>
        {tightness.length > 0 && <TightnessLines years={years} ge65={tightness.map(r => r.ge65_h_per_8760)} cond={tightness.map(r => r.p500_given_rank ?? 0)} />}
        {headline && <div className="mt-2 mono" style={{ color: "var(--muted)", fontSize: 13 }}>
          P($500 | tightest 0.5% of hours): {pct(headline.p500_given_rank_pre_tight as number, 0)} → {pct(headline.p500_given_rank_post_tight as number, 0)}
        </div>}
      </section>

      <section className="mt-12 hair pt-6">
        <div className="label mb-3">events moved</div>
        {migration.length > 0 && <EventsDots years={years} values={migration.map(r => r.mean_start_hour)} />}
        {ks && <div className="mt-2 mono" style={{ color: "var(--muted)", fontSize: 13 }}>{ks.mean_a.toFixed(1)}h → {ks.mean_b.toFixed(1)}h · KS p {sci(ks.p)}</div>}
      </section>

      <section className="mt-12 hair pt-6">
        <div className="label mb-3">longer, not fewer</div>
        {duration.length > 0 && <DurationBars years={years} events={duration.map(r => r.events_per_8760)} dur={duration.map(r => r.median_dur_h)} />}
        {mkDur && <div className="mt-2 mono" style={{ color: "var(--muted)", fontSize: 13 }}>
          events/yr τ {mkDur.events_per_8760.tau.toFixed(2)} · p {sci(mkDur.events_per_8760.p)} — duration τ {mkDur.median_dur_h.tau.toFixed(2)} · p {sci(mkDur.median_dur_h.p)}
        </div>}
      </section>

      <section className="mt-12 hair pt-6">
        <div className="label mb-3">2027 · 2029 · 2031</div>
        {proj && (
          <div className="flex gap-8 mono" style={{ color: "var(--faint)", fontSize: 20, textDecoration: "line-through" }}>
            {["2027", "2029", "2031"].map(y => <span key={y}>{proj[y]?.base?.hours.toFixed(1) ?? "–"}</span>)}
          </div>
        )}
        <p className="mt-3" style={{ color: "var(--muted)", maxWidth: 640, fontSize: 15 }}>
          Not estimable. Storage, solar and wind move as one axis (VIF 73–384); a model fit through 2023
          over-predicts 2024–26 by {lro?.value != null ? `${lro.value.toFixed(0)}×` : "166×"}; the scenario band spans{" "}
          {proj?.["2027"]?.base?.ci_scenario ? `${proj["2027"].base.ci_scenario[0].toFixed(1)}–${proj["2027"].base.ci_scenario[1].toFixed(1)}` : "0.03–211.2"} h.
        </p>
      </section>

      {history?.finding && (
        <section className="mt-12 hair pt-6 pb-10">
          <div className="label mb-3">finding</div>
          <div className="flex flex-col gap-3">
            {history.finding.slice(0, 5).map((f, i) => <p key={i} style={{ color: i === 0 ? "var(--ink)" : "var(--muted)", fontSize: 16, lineHeight: 1.5 }}>{(f.match(/^[^.]*\./) ?? [f])[0]}</p>)}
          </div>
        </section>
      )}
    </main>
  );
}
