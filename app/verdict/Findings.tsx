"use client";
/** Meridian fresh-look findings. Self-contained: fetches /data/findings.json, house tokens only, one number per card. */
import { useEffect, useState } from "react";
import Link from "next/link";

type Series = { kind?: "bar" | "line"; label?: string; x: (string | number)[]; y: (number | null)[] };
type Finding = {
  id: string; rank: number; title: string; claim: string; status: "finding" | "no_result" | "pending";
  headline: { value: string; unit?: string; sub?: string };
  who_loses?: string; software_fix?: string;
  usd_scale?: { low?: number | null; high?: number | null; unit?: string; assumption?: string };
  confidence?: { level: "high" | "medium" | "low"; reason?: string };
  data_through?: string; proxy_fields?: string[]; series?: Series;
  link?: string;
};

const money = (v?: number | null) => v == null ? "—" : Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : Math.abs(v) >= 1e3 ? `$${(v / 1e3).toFixed(0)}k` : `$${v.toFixed(0)}`;

function Chart({ s }: { s: Series }) {
  const W = 320, H = 72, n = s.y.length; if (!n) return null;
  const ys = s.y.map(v => v ?? 0); const lo = Math.min(0, ...ys), hi = Math.max(1e-9, ...ys), span = hi - lo || 1;
  const sy = (v: number) => H - ((v - lo) / span) * (H - 6) - 3;
  const every = Math.max(1, Math.ceil(n / 6));
  return (
    <div style={{ marginTop: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: H }} preserveAspectRatio="none">
        {lo < 0 && <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} stroke="var(--line-2)" strokeWidth={1} />}
        {s.kind === "line"
          ? <polyline fill="none" stroke="var(--gold)" strokeWidth={1.5} points={ys.map((v, i) => `${(i / (n - 1 || 1)) * W},${sy(v)}`).join(" ")} />
          : ys.map((v, i) => { const bw = W / n; const y0 = sy(0), y1 = sy(v); return <rect key={i} x={i * bw + 1} width={Math.max(1, bw - 2)} y={Math.min(y0, y1)} height={Math.abs(y0 - y1)} fill={v < 0 ? "var(--ember)" : "var(--gold)"} opacity={0.45 + 0.55 * (Math.abs(v) / (Math.max(Math.abs(lo), hi) || 1))} rx={1} />; })}
      </svg>
      <div className="mono" style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, fontSize: 11, color: "var(--faint)", marginTop: 3 }}>
        {s.x.map((l, i) => <span key={i} className="truncate text-center">{(i % every === 0 || i === n - 1) ? String(l) : ""}</span>)}
      </div>
      {s.label && <div className="label" style={{ marginTop: 4, fontSize: 11 }}>{s.label}</div>}
    </div>
  );
}

const STATUS: Record<string, { label: string; color: string }> = {
  finding: { label: "finding", color: "var(--gold)" },
  no_result: { label: "no result", color: "var(--muted)" },
  pending: { label: "pending data", color: "var(--ember)" },
};

export default function Findings() {
  const [d, setD] = useState<{ generated?: string; note?: string; findings: Finding[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { fetch("/data/findings.json").then(r => r.json()).then(setD).catch(() => setD({ findings: [] })); }, []);
  if (!d) return null;
  const fs = [...d.findings].sort((a, b) => a.rank - b.rank);
  return (
    <section style={{ marginTop: 56, borderTop: "1px solid var(--line)", paddingTop: 32 }}>
      <div className="label">Meridian · fresh look, no hypothesis</div>
      <h2 className="display" style={{ fontSize: 32, marginTop: 8, lineHeight: 1.15 }}>What the fifteen years say when you stop asking about data centers.</h2>
      {d.note && <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: 720 }}>{d.note}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginTop: 24 }}>
        {fs.map(f => {
          const st = STATUS[f.status] ?? STATUS.pending; const isOpen = open === f.id;
          const inner = (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="mono" style={{ color: "var(--faint)", fontSize: 12 }}>#{f.rank} · {f.id}</span>
                <span className="mono" style={{ color: st.color, fontSize: 12 }}>{st.label}{f.confidence ? ` · ${f.confidence.level}` : ""}</span>
              </div>
              <div className="display" style={{ fontSize: 40, marginTop: 8, color: f.status === "finding" ? "var(--gold-hi)" : "var(--muted)", lineHeight: 1 }}>{f.headline.value}<span style={{ fontSize: 16, color: "var(--muted)", marginLeft: 6 }}>{f.headline.unit}</span></div>
              {f.headline.sub && <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{f.headline.sub}</div>}
              <div style={{ fontWeight: 600, marginTop: 12 }}>{f.title}</div>
              <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>{f.claim}</p>
              {f.series && <Chart s={f.series} />}
              {f.link && <div className="label" style={{ marginTop: 12, color: "var(--gold)" }}>Full model &amp; charts →</div>}
              {isOpen && !f.link && (
                <div style={{ marginTop: 14, fontSize: 13, color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  {f.who_loses && <p><span className="label">Who loses</span><br />{f.who_loses}</p>}
                  {f.software_fix && <p style={{ marginTop: 8 }}><span className="label">Software fix</span><br />{f.software_fix}</p>}
                  {f.usd_scale && <p style={{ marginTop: 8 }}><span className="label">Scale</span><br />{money(f.usd_scale.low)}–{money(f.usd_scale.high)} {f.usd_scale.unit}{f.usd_scale.assumption ? ` — ${f.usd_scale.assumption}` : ""}</p>}
                  {f.confidence?.reason && <p style={{ marginTop: 8 }}><span className="label">Confidence</span><br />{f.confidence.reason}</p>}
                  <p className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--faint)" }}>data through {f.data_through ?? "—"}{f.proxy_fields?.length ? ` · proxies: ${f.proxy_fields.join(", ")}` : ""}</p>
                </div>
              )}
            </>
          );
          const style = { background: "var(--surface)", border: `1px solid ${f.status === "finding" ? "var(--line-2)" : "var(--line)"}`, borderRadius: 8, padding: 18, cursor: "pointer", display: "block", textDecoration: "none", color: "inherit" } as const;
          return f.link
            ? <Link key={f.id} href={f.link} style={style}>{inner}</Link>
            : <article key={f.id} onClick={() => setOpen(isOpen ? null : f.id)} style={style}>{inner}</article>;
        })}
      </div>
      <p className="mono" style={{ color: "var(--faint)", fontSize: 12, marginTop: 18 }}>Falsifiers pre-registered in analyses/fresh/HYPOTHESES.md (sha256 pinned) before any number ran. Every CSV is in the download zip under analyses/fresh/.</p>
    </section>
  );
}
