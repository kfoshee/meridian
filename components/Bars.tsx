"use client";
/** Small histogram / profile. Bars grow from baseline with stagger; re-animates when `k` changes. */
export default function Bars({ values, labels, k, height = 64, accent }: { values: number[]; labels?: string[]; k: string; height?: number; accent?: (i: number) => boolean }) {
  const max = Math.max(1e-9, ...values); const n = values.length;
  const every = Math.ceil(n / 8);
  return (
    <div>
      <svg key={k} viewBox={`0 0 ${n * 10} ${height}`} className="w-full block" style={{ height }} preserveAspectRatio="none">
        {values.map((v, i) => (
          <rect key={i} className="bar" x={i * 10 + 1} width={8} y={height - (v / max) * height} height={(v / max) * height}
                fill={accent?.(i) ? "var(--ember)" : "var(--gold)"} opacity={0.4 + 0.6 * (v / max)} style={{ animationDelay: `${i * 12}ms` }} rx={1} />
        ))}
      </svg>
      {labels && <div className="grid mono" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
        {labels.map((l, i) => <span key={i} className="text-center truncate">{(i % every === 0 || i === n - 1 || n <= 12) ? l : ""}</span>)}
      </div>}
    </div>
  );
}
