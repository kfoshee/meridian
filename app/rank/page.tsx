"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadIndex, loadNode, loadCorr, UW_KEYS, CONF } from "@/lib/data";
import type { Index, NodeData, Corr } from "@/lib/types";
import { h, pct } from "@/lib/format";

export default function RankPage() {
  const router = useRouter();
  const [index, setIndex] = useState<Index | null>(null);
  const [nodes, setNodes] = useState<Record<string, NodeData>>({});
  const [corr, setCorr] = useState<Corr | null>(null);
  const [def, setDef] = useState("p500");
  const [confKey, setConfKey] = useState("c95_t0.99");

  useEffect(() => { loadIndex().then(setIndex); }, []);
  useEffect(() => { index?.nodes.forEach(n => loadNode(n.id).then(d => setNodes(s => s[n.id] ? s : { ...s, [n.id]: d }))); }, [index]);
  useEffect(() => { loadCorr().then(setCorr); }, []);

  const pairsBest = useMemo(() => {
    const out: Record<string, { name: string; rho: number }> = {};
    if (!corr || !index) return out;
    const mat = corr.corr["basis50"]?.pearson_since_2022;
    if (!mat) return out;
    const nameOf = new Map(index.nodes.map(n => [n.id, n.name]));
    corr.nodes.forEach((id, i) => {
      let bestJ = -1, bestV = Infinity;
      mat[i].forEach((v, j) => { if (j !== i && v < bestV) { bestV = v; bestJ = j; } });
      if (bestJ >= 0) out[id] = { name: nameOf.get(corr.nodes[bestJ]) ?? corr.nodes[bestJ], rho: bestV };
    });
    return out;
  }, [corr, index]);

  const defs = index ? UW_KEYS.filter(k => index.definitions[k]) : [];

  const rows = useMemo(() => {
    if (!index) return [];
    return index.nodes.map(n => {
      const node = nodes[n.id];
      const d = node?.definitions[def];
      const uw = node?.underwrite[def];
      return {
        id: n.id,
        name: n.name,
        share: uw?.safe_flex[confKey] ?? 0,
        hoursYr: d?.hours_per_year.q.mean,
        eventsYr: d?.events.per_year,
        p99Dur: d?.events.duration_h.p99,
        worstYr: d?.hours_per_year.q.max,
        seenDam: d?.predictability.signaled,
        pairBest: pairsBest[n.id],
      };
    }).sort((a, b) => b.share - a.share);
  }, [index, nodes, def, confKey, pairsBest]);

  return (
    <main className="min-h-screen px-5 md:px-8 py-6 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 30, fontWeight: 300 }}>Rank</h1>
        <nav className="flex gap-5 text-sm" style={{ color: "var(--muted)" }}>
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
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Where flexible capacity is worth the most and risks the least.</p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Median correlation: price definitions ≈0.90 · local congestion ≈0.22 — see <Link href="/network/" className="hover:text-[var(--ink)]" style={{ textDecoration: "underline" }}>Network</Link>.</p>

      <section className="mt-5 flex flex-wrap items-center gap-2">
        <span className="label mr-1">curtailed when</span>
        {defs.map(k => <button key={k} className="chip" aria-pressed={def === k} onClick={() => setDef(k)} title={index!.definitions[k].kind}>{index!.definitions[k].label}</button>)}
        <span className="label ml-4 mr-1">confidence</span>
        {CONF.map(c => <button key={c.id} className="chip" aria-pressed={confKey === c.id} onClick={() => setConfKey(c.id)}>{c.conf} · {c.target}</button>)}
      </section>

      <section className="mt-5 card p-3 overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="label text-left" style={{ borderBottom: "1px solid var(--line)" }}>
              <th className="py-2 pr-3 font-normal">Rank</th>
              <th className="py-2 pr-3 font-normal">Node</th>
              <th className="py-2 pr-3 font-normal">Flex share</th>
              <th className="py-2 pr-3 font-normal">Hours/yr</th>
              <th className="py-2 pr-3 font-normal">Events/yr</th>
              <th className="py-2 pr-3 font-normal">p99 duration h</th>
              <th className="py-2 pr-3 font-normal">Worst year h</th>
              <th className="py-2 pr-3 font-normal">Seen in DAM</th>
              <th className="py-2 pr-3 font-normal">Pairs best with</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className="rise"
                style={{ animationDelay: `${i * 30}ms`, borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                onClick={() => router.push(`/?node=${r.id}`)}
              >
                <td className="py-2 pr-3 mono" style={{ color: "var(--faint)" }}>{i + 1}</td>
                <td className="py-2 pr-3">{r.name} <span className="mono text-xs" style={{ color: "var(--faint)" }}>{r.id}</span></td>
                <td className="py-2 pr-3 display" style={{ color: "var(--gold)", fontSize: 16 }}>{Math.round(r.share * 100)}%</td>
                <td className="py-2 pr-3 mono">{h(r.hoursYr)}</td>
                <td className="py-2 pr-3 mono">{h(r.eventsYr)}</td>
                <td className="py-2 pr-3 mono">{h(r.p99Dur)}</td>
                <td className="py-2 pr-3 mono">{h(r.worstYr)}</td>
                <td className="py-2 pr-3 mono">{pct(r.seenDam)}</td>
                <td className="py-2 pr-3 mono">{r.pairBest ? `${r.pairBest.name} · ρ ${r.pairBest.rho.toFixed(2)}` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
