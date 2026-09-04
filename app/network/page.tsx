"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Bars from "@/components/Bars";
import { loadIndex, loadCorr, loadTails } from "@/lib/data";
import type { Index, Corr, Tails } from "@/lib/types";

const MEASURES = [
  { id: "lambda_u_q99", label: "λ_U · q 0.99" },
  { id: "lambda_u_q999", label: "λ_U · q 0.999" },
  { id: "cond_p1000", label: "P(≥$1000 | other ≥$1000)" },
  { id: "pearson_naive", label: "Pearson · daily (naive)" },
] as const;
type MeasureId = (typeof MEASURES)[number]["id"];

export default function Network() {
  const [index, setIndex] = useState<Index | null>(null);
  const [corr, setCorr] = useState<Corr | null>(null);
  const [tails, setTails] = useState<Tails | null>(null);
  const [measure, setMeasure] = useState<MeasureId>("lambda_u_q99");
  useEffect(() => { loadIndex().then(setIndex); loadCorr().then(setCorr); loadTails().then(setTails); }, []);

  const names = useMemo(() => Object.fromEntries((index?.nodes ?? []).map(n => [n.id, n.name.replace(/ (Hub|Load Zone|Zone)$/, "") + (n.type === "hub" ? " hub" : " zone")])), [index]);

  const n = useMemo(() => tails?.matrix.nodes ?? corr?.nodes ?? [], [tails, corr]);
  const m: (number | null)[][] | undefined = measure === "pearson_naive" ? corr?.corr.p500?.pearson_since_2022 : tails?.matrix[measure];

  const pairs = useMemo(() => {
    if (!m) return [];
    const out: { a: string; b: string; r: number }[] = [];
    for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) { const v = m[i]?.[j]; if (v != null) out.push({ a: n[i], b: n[j], r: v }); }
    return out.sort((x, y) => x.r - y.r);
  }, [m, n]);
  const median = pairs.length ? pairs[Math.floor(pairs.length / 2)].r : 0;
  const reading = median >= 0.8 ? "one bet: the extremes move together" : median >= 0.5 ? "partial" : "sites fail on different days";
  const color = (r: number | null) => r == null ? "var(--surface)" : `rgba(212,175,55,${Math.max(0.04, Math.min(1, (r + 0.1) / 1.1))})`;

  const ht = tails?.hub_taildep;
  const nodal = tails?.nodal_hub_test;
  const nq99 = nodal?.lambda_u_node_vs_own_hub_q99;
  const bf = tails?.basis_four_leg;

  return (
    <main className="min-h-screen px-6 md:px-10 py-7 max-w-[1100px] mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="display" style={{ fontSize: 34 }}>Does a second site diversify?</h1>
        <nav className="flex gap-6 label">
          <Link href="/">Map</Link><Link href="/verdict/">Verdict</Link><Link href="/policy/">Policy</Link><Link href="/post4cp/">Post-4CP</Link><Link href="/rank/">Rank</Link><Link href="/network/">Network</Link>
          <Link href="/tightness/">Tightness</Link>
          <Link href="/history/">History</Link><Link href="/methodology/">Method</Link><Link href="/sources/">Sources</Link>
          <a href="/report/ercot-flex-report.zip" download="ercot-flex-report.zip" style={{ color: "var(--gold)" }}>Download zip ↓</a>
        </nav>
      </header>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="label">measure</span>
        {MEASURES.map(k => <button key={k.id} className="chip" aria-pressed={measure === k.id} onClick={() => setMeasure(k.id)}>{k.label}</button>)}
      </div>
      {m && <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
        <div className="rise">
          <div className="display" style={{ fontSize: 64, color: "var(--gold-hi)", lineHeight: 1 }}>{median.toFixed(2)}</div>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>median pairwise · {reading}</div>
          {ht && <div className="mt-3 flex gap-6 mono" style={{ fontSize: 13, color: "var(--faint)" }}>
            <span>what a naive analysis would say — λ_U (extremes) <b style={{ color: "var(--gold)" }}>{ht.lambda_u_q99.median.toFixed(2)}</b> vs Pearson · daily (naive) <b style={{ color: "var(--muted)" }}>{ht.pearson_daily_top1.median.toFixed(2)}</b></span>
          </div>}
          <svg viewBox={`0 0 ${n.length * 40 + 140} ${n.length * 40 + 150}`} className="w-full mt-8">
            {n.map((a, i) => n.map((b, j) => (
              <g key={a + b}><rect x={140 + j * 40} y={150 + i * 40} width={38} height={38} rx={4} fill={color(m[i]?.[j] ?? null)} className="rise" style={{ animationDelay: `${(i + j) * 25}ms` }} />
                {m[i]?.[j] != null && <text x={159 + j * 40} y={173 + i * 40} textAnchor="middle" fontSize={11} fill={(m[i][j] as number) > 0.5 ? "var(--bg)" : "var(--muted)"} className="mono">{(m[i][j] as number).toFixed(2).replace("0.", ".")}</text>}</g>
            )))}
            {n.map((a, i) => <text key={"r" + a} x={132} y={173 + i * 40} textAnchor="end" fontSize={12} fill="var(--ink)">{names[a] ?? a}</text>)}
            {n.map((a, j) => <text key={"c" + a} x={162 + j * 40} y={140} textAnchor="start" fontSize={11} fill="var(--muted)" transform={`rotate(-60 ${162 + j * 40} 140)`}>{names[a] ?? a}</text>)}
          </svg>
        </div>
        <div className="rise">
          <div className="label mb-3">least correlated pairs</div>
          {pairs.slice(0, 10).map(p => <div key={p.a + p.b} className="flex justify-between py-2 hair" style={{ fontSize: 15 }}><span>{names[p.a]} · {names[p.b]}</span><span className="mono" style={{ color: "var(--gold-hi)" }}>{p.r.toFixed(2)}</span></div>)}
          <div className="label mt-8 mb-3">most correlated</div>
          {pairs.slice(-5).reverse().map(p => <div key={p.a + p.b} className="flex justify-between py-2 hair" style={{ fontSize: 15 }}><span>{names[p.a]} · {names[p.b]}</span><span className="mono" style={{ color: "var(--muted)" }}>{p.r.toFixed(2)}</span></div>)}
        </div>
      </div>}

      {nodal && nq99 && (
        <section className="mt-14 hair pt-6">
          <div className="label mb-3">every node, one month</div>
          <div className="display" style={{ fontSize: 48, color: "var(--gold-hi)", lineHeight: 1 }}>{nq99.median.toFixed(2)}</div>
          <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 15 }}>median λ_U · node vs. own hub · q 0.99 · {nodal.n_nodes.toLocaleString()} nodes · {nodal.months.join(", ")}</div>
          <div className="label mt-2" style={{ color: "var(--ember)" }}>provisional · 1 month of nodal data</div>
          <div className="mt-6 max-w-[520px]">
            <Bars values={nq99.hist} labels={nq99.hist_edges.slice(0, -1).map(e => e.toFixed(1))} k="nodal-hist" />
          </div>
        </section>
      )}

      {bf && (
        <section className="mt-14 hair pt-6 pb-10">
          <div className="label mb-3">is basis a product?</div>
          <div style={{ color: "var(--muted)", fontSize: 15, marginBottom: 12 }}>{bf.n_pass_4} of 13 pass all four</div>
          <div className="overflow-x-auto">
            <table className="w-full mono" style={{ fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr className="label" style={{ textAlign: "left" }}>
                  <th className="pb-2 pr-4">node</th><th className="pb-2 pr-4">half-life (d)</th><th className="pb-2 pr-4">local share</th>
                  <th className="pb-2 pr-4">λ_U</th><th className="pb-2 pr-4">trend p</th><th className="pb-2 pr-4">pass</th><th className="pb-2">verdict</th>
                </tr>
              </thead>
              <tbody>
                {bf.rows.map(r => (
                  <tr key={r.node} className="hair">
                    <td className="py-2 pr-4" style={{ color: "var(--ink)" }}>{names[r.node] ?? r.node}</td>
                    <td className="py-2 pr-4" style={{ color: r.persistent ? "var(--gold-hi)" : "var(--muted)" }}>{r.half_life_d.toFixed(1)}</td>
                    <td className="py-2 pr-4" style={{ color: r.local ? "var(--gold-hi)" : "var(--muted)" }}>{(r.local_share * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-4" style={{ color: r.uncorrelated ? "var(--gold-hi)" : "var(--muted)" }}>{r.lambda_u_median.toFixed(2)}</td>
                    <td className="py-2 pr-4" style={{ color: r.growing ? "var(--gold-hi)" : "var(--muted)" }}>{r.mk_p.toFixed(3)}</td>
                    <td className="py-2 pr-4" style={{ color: "var(--muted)" }}>{r.n_pass}/4</td>
                    <td className="py-2" style={{ color: r.n_pass === 4 ? "var(--gold-hi)" : "var(--faint)" }}>{r.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
