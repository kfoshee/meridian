"use client";
import { line, curveMonotoneX } from "d3-shape";
import { scaleLinear } from "d3-scale";
/** Completion vs flex share: p1 / p5 / median bands + chosen point. */
export default function Curve({ grid, q, pick, target, k }: { grid: number[]; q: Record<string, number[]>; pick: number; target: number; k: string }) {
  const W = 420, H = 150, m = { l: 44, r: 10, t: 10, b: 24 };
  const lo = Math.max(0.9, Math.floor((Math.min(...q["0.01"]) - 0.004) * 200) / 200);
  const x = scaleLinear([0, 1], [m.l, W - m.r]); const y = scaleLinear([lo, 1], [H - m.b, m.t]);
  const mk = (ys: number[]) => line<number>().x((_, i) => x(grid[i])).y(v => y(Math.max(lo, v))).curve(curveMonotoneX)(ys) || "";
  return (
    <svg key={k} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      <line x1={m.l} x2={W - m.r} y1={y(target)} y2={y(target)} stroke="var(--ember)" strokeDasharray="3 3" strokeWidth={0.8} />
      <text x={W - m.r} y={y(target) + 9} textAnchor="end" fontSize={11} fill="var(--ember)" className="mono">{(target * 100).toFixed(1)}% target</text>
      {[["0.5", "var(--gold-lo)", 1], ["0.05", "var(--gold)", 1.2], ["0.01", "var(--gold-hi)", 1.6]].map(([key, c, w]) => (
        <path key={key as string} d={mk(q[key as string])} fill="none" stroke={c as string} strokeWidth={w as number} pathLength={1} className="draw" />
      ))}
      <circle cx={x(pick)} cy={y(Math.max(lo, q["0.01"][grid.reduce((b, v, i) => Math.abs(v - pick) < Math.abs(grid[b] - pick) ? i : b, 0)] ?? 1))} r={4} fill="var(--gold-hi)" />
      {[0, 0.5, 1].map(t => <text key={t} x={x(t)} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--faint)" className="mono">{t * 100}%</text>)}
      {[lo, 1].map(t => <text key={t} x={m.l - 4} y={y(t) + 3} textAnchor="end" fontSize={11} fill="var(--faint)" className="mono">{(t * 100).toFixed(1)}</text>)}
      <text x={m.l + 4} y={H - m.b - 4} fontSize={11} fill="var(--faint)">on-time share · worst 1% / 5% / median synthetic year</text>
    </svg>
  );
}
