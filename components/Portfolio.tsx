"use client";
import { useMemo } from "react";
import type { NodeData } from "@/lib/types";
import { h } from "@/lib/format";

function q(xs: number[], p: number) { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; }

/** Equal-weight portfolio of selected nodes vs. the single node: does spreading sites actually diversify? */
export default function Portfolio({ nodes, def, onRemove }: { nodes: NodeData[]; def: string; onRemove: (id: string) => void }) {
  const r = useMemo(() => {
    const series = nodes.map(n => (n.daily_hours[def] ?? n.daily_hours["p500"]).map(v => v / 10));
    if (!series.length) return null;
    const D = Math.min(...series.map(s => s.length));
    const port = Array.from({ length: D }, (_, d) => series.reduce((a, s) => a + s[d], 0) / series.length);
    const single = series.map(s => ({ worst: q(s, 0.99), yr: s.reduce((a, b) => a + b, 0) / (D / 365) }));
    return { worst: q(port, 0.99), yr: port.reduce((a, b) => a + b, 0) / (D / 365), single, anyDay: port.filter(v => v > 0).length / D };
  }, [nodes, def]);
  if (!r || nodes.length < 2) return <div className="text-sm" style={{ color: "var(--faint)" }}>Shift-click nodes on the map to compare a portfolio.</div>;
  const avgWorst = r.single.reduce((a, s) => a + s.worst, 0) / r.single.length;
  return (
    <div className="rise">
      <div className="flex flex-wrap gap-2 mb-3">{nodes.map(n => <button key={n.id} className="chip" aria-pressed="true" onClick={() => onRemove(n.id)}>{n.name} ×</button>)}</div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="worst day · single site" v={`${h(avgWorst)} h`} />
        <Stat label="worst day · portfolio" v={`${h(r.worst)} h`} hi />
        <Stat label="hours / yr · single" v={h(r.single.reduce((a, s) => a + s.yr, 0) / r.single.length)} />
        <Stat label="hours / yr · portfolio" v={h(r.yr)} hi />
      </div>
      <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>
        {r.worst < avgWorst * 0.8 ? "Diversifies: the worst day shrinks when sites are pooled." : "One bet repeated: sites fail on the same days."}
      </div>
    </div>
  );
}
function Stat({ label, v, hi }: { label: string; v: string; hi?: boolean }) {
  return <div><div className="label">{label}</div><div className="display" style={{ fontSize: 28, color: hi ? "var(--gold-hi)" : "var(--ink)" }}>{v}</div></div>;
}
