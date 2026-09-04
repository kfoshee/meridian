"use client";
import { useEffect, useMemo, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import type { IndexNode } from "@/lib/types";

type Geo = { state: GeoJSON.Feature; counties: GeoJSON.FeatureCollection };
const W = 900, H = 820;

export default function TexasMap({ nodes, value, selected, portfolio, onSelect, onToggle }: {
  nodes: IndexNode[]; value: (n: IndexNode) => number; selected: string | null; portfolio: string[];
  onSelect: (id: string) => void; onToggle: (id: string) => void;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { fetch("/tx.json").then(r => r.json()).then(setGeo); }, []);
  const proj = useMemo(() => {
    const p = geoConicConformal().parallels([27.5, 35]).rotate([100, 0]);
    if (geo) p.fitExtent([[50, 40], [W - 50, H - 40]], geo.state);
    return p;
  }, [geo]);
  const path = useMemo(() => geoPath(proj), [proj]);
  if (!geo) return <div className="aspect-[9/8.2] w-full" />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Map of Texas grid nodes">
      <defs>
        <radialGradient id="glow"><stop offset="0" stopColor="var(--gold-hi)" stopOpacity="0.45" /><stop offset="1" stopColor="var(--gold-hi)" stopOpacity="0" /></radialGradient>
        <radialGradient id="disc"><stop offset="0" stopColor="var(--gold)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--gold)" stopOpacity="0.04" /></radialGradient>
      </defs>
      <g fill="none" stroke="var(--line)" strokeWidth="0.5" className="fade">{geo.counties.features.map((f, i) => <path key={i} d={path(f) || ""} />)}</g>
      <path d={path(geo.state) || ""} fill="none" stroke="var(--gold)" strokeOpacity={0.55} strokeWidth="1.2" pathLength={1} className="draw" />
      {nodes.map((n, i) => {
        const [x, y] = proj([n.lon, n.lat]) || [0, 0];
        const v = Math.max(0, Math.min(1, value(n)));
        const sel = selected === n.id, inP = portfolio.includes(n.id), hov = hover === n.id;
        const r = n.type === "hub" ? 27 : 18;
        const c = 2 * Math.PI * r;
        return (
          <g key={n.id} transform={`translate(${x},${y})`} className="node-hit"
             onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
             onClick={e => (e.shiftKey ? onToggle(n.id) : onSelect(n.id))}
             tabIndex={0} role="button" aria-pressed={sel} aria-label={`${n.name}, ${Math.round(v * 100)} percent flexible`}
             onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.shiftKey ? onToggle(n.id) : onSelect(n.id); } }}>
            <g className="breathe" style={{ animationDelay: `${300 + i * 70}ms` }}>
              {(sel || hov) && <circle r={r * 2.6} fill="url(#glow)" className={sel ? "pulse" : undefined} />}
              <circle r={r} fill="url(#disc)" />
              <circle r={r} fill="none" stroke="var(--gold-dim)" strokeWidth={1} />
              <circle className="ring" r={r} fill="none" stroke={sel || hov ? "var(--gold-hi)" : "var(--gold)"} strokeWidth={sel ? 4 : 2.5}
                      strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90)" strokeLinecap="round" />
              {inP && <circle r={r + 7} fill="none" stroke="var(--gold-hi)" strokeWidth={0.8} strokeDasharray="2 5" />}
              <text y={n.type === "hub" ? 5 : 4} textAnchor="middle" className="display" fontSize={n.type === "hub" ? 17 : 13} fill={sel ? "var(--gold-hi)" : "var(--ink)"}>{Math.round(v * 100)}</text>
            </g>
            <text y={r + 17} textAnchor="middle" fontSize={12} fontWeight={600} letterSpacing="0.06em" fill={sel || hov ? "var(--gold-hi)" : "var(--muted)"} style={{ transition: "fill var(--t)", textTransform: "uppercase" }}>{n.name.replace(/ (Hub|Load Zone|Zone)$/, "")}</text>
          </g>
        );
      })}
    </svg>
  );
}
