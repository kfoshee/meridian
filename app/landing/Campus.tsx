"use client";
import { useState } from "react";

// The campus, built one decision at a time as you scroll. Seven chapters: each one raises a part of the
// campus, lights it, and says what Meridian decides there. At the end the whole campus stands and the
// legend answers hover. Pure SVG, computed projection. No sweep, no tilt.
const S = 2.25;
const CX = 520, CY = 100;
const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const P = (x: number, y: number, z: number) => [CX + (x - y) * COS * S, CY + (x + y) * SIN * S - z * S] as const;
const pts = (a: (readonly [number, number])[]) => a.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
const L = (a: readonly [number, number], b: readonly [number, number]) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

type Tone = "ink" | "gold" | "dim" | "glass" | "glass gold" | "rack" | "rack gold";
type BoxProps = { x: number; y: number; z?: number; w: number; d: number; h: number; tone?: Tone; delay: number };
function Box({ x, y, z = 0, w, d, h, tone = "ink", delay }: BoxProps) {
  const p100 = P(x + w, y, z), p110 = P(x + w, y + d, z), p010 = P(x, y + d, z);
  const p001 = P(x, y, z + h), p101 = P(x + w, y, z + h), p111 = P(x + w, y + d, z + h), p011 = P(x, y + d, z + h);
  return (
    <g className={`iso ${tone}`} style={{ transitionDelay: `${delay}ms` }}>
      <polygon className="f-left" points={pts([p011, p111, p110, p010])} />
      <polygon className="f-right" points={pts([p101, p100, p110, p111])} />
      <polygon className="f-top" points={pts([p001, p101, p111, p011])} />
    </g>
  );
}
function Mark({ n, at, dy, delay, gold }: { n: number; at: readonly [number, number]; dy: number; delay: number; gold?: boolean }) {
  return (
    <g className={`iso mark${gold ? " gold" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      <circle cx={at[0]} cy={at[1] + dy} r={8} />
      <text x={at[0]} y={at[1] + dy + 3} textAnchor="middle">{n}</text>
    </g>
  );
}

export const CHAPTERS = [
  { n: 1, name: "Switchyard", spec: "138 kV · 2 × 60 MVA", we: "Prices, weather and reserves, watched hours ahead." },
  { n: 2, name: "Meter & switchgear", spec: "96 to 56 MW", we: "The number the grid sees, held to the megawatt.", gold: true },
  { n: 3, name: "Firm hall", spec: "56 MW · always on", we: "Untouched. Every deadline kept." },
  { n: 4, name: "Flexible hall", spec: "40 MW · separable", we: "Earn income from your provider for flexibility.", gold: true },
  { n: 5, name: "Cooling", spec: "chiller plant N+1", we: "Pre-cooled to the minute, so the halls coast instead of stopping." },
  { n: 6, name: "Backup generation", spec: "4 × 3 MW", we: "Started only when cheaper than the revenue it saves." },
  { n: 7, name: "Battery", spec: "20 MWh", we: "Charged on cheap hours, dispatched where the price peaks.", gold: true },
];
export const STEPS = CHAPTERS.length + 1; // slab first, then seven decisions

// p ∈ [0,1] is the section's scroll progress; chapter 0 = the slab, 1..7 = the decisions, 8 = complete
export default function Campus({ p }: { p: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const chapter = Math.min(STEPS, Math.max(0, p));   // p is the chapter index, set only when it changes
  const done = chapter >= STEPS;
  const active = done ? hover : chapter >= 1 ? chapter : null;
  const built = (n: number) => chapter >= n;

  const feed = [P(-96, 62, 1), P(-56, 62, 1), P(-56, 48, 1), P(-30, 48, 1), P(-30, 40, 1), P(6, 40, 1)];
  const trayFirm = [P(6, 40, 3), P(30, 40, 3), P(30, 70, 3)];
  const trayFlex = [P(6, 40, 3), P(14, 40, 3), P(14, 128, 3), P(176, 128, 3), P(176, 118, 3)];
  const pipe = (y: number) => [P(190, y, 33), P(150, y, 33), P(150, y, 4), P(126, y, 4)];
  const part = (n: number) => ({ "data-part": n, className: `campus-layer${built(n) ? " on" : ""}${active === n ? " hot" : ""}`, onMouseEnter: () => done && setHover(n), onMouseLeave: () => setHover(null) });
  const cur = CHAPTERS[Math.min(6, Math.max(0, (active ?? 1) - 1))];

  return (
    <div className={`campus on${chapter >= 1 ? " started" : ""}${done ? " done" : ""}`} data-hot={active ?? undefined}>
      <div className="campus-side">
        <div className="chapter" key={active ?? "none"}>
          {active ? (<>
            <div className="chapter-n">{active} <span>/ 7</span></div>
            <div className={`chapter-name${cur.gold ? " gold" : ""}`}>{cur.name}</div>
            <div className="chapter-spec">{cur.spec}</div>
            <div className="chapter-we">{cur.we}</div>
          </>) : (<>
            <div className="chapter-n">{done ? "7 / 7" : "0 / 7"}</div>
            <div className="chapter-name">{done ? "The whole campus" : "A parcel and a slab"}</div>
          </>)}
        </div>
        <ol className="legend">
          {CHAPTERS.map(l => (
            <li key={l.n} className={`${l.gold ? "gold" : ""}${built(l.n) ? " built" : ""}${active === l.n ? " hot" : ""}`} onMouseEnter={() => done && setHover(l.n)} onMouseLeave={() => setHover(null)}>
              <i>{l.n}</i><div><b>{l.name}</b></div>
            </li>
          ))}
        </ol>
      </div>

      <div className="campus-stage" aria-hidden="true">
        <svg viewBox="170 -4 860 504" className="campus-layer" data-part={0}><Box x={0} y={0} w={250} d={132} h={2} tone="dim" delay={0} /></svg>

        {/* 1 · switchyard */}
        <svg viewBox="170 -4 860 504" {...part(1)}>
          {[-96, -76, -56].map((x, i) => (
            <g key={i} className="iso" style={{ transitionDelay: `${i * 160}ms` }}>
              <line {...L(P(x, 62, 0), P(x, 62, 26))} className="pole" />
              <line {...L(P(x - 6, 62, 23), P(x + 6, 62, 23))} className="pole" />
              <line {...L(P(x - 6, 62, 19), P(x + 6, 62, 19))} className="pole" />
            </g>
          ))}
          <g className="iso" style={{ transitionDelay: "500ms" }}>
            {[23, 19].map((z, k) => [[-96, -76], [-76, -56]].map(([a, b], j) => {
              const A = P(a - 6, 62, z), B = P(b - 6, 62, z), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2 + 6;
              return <path key={`${k}${j}`} d={`M${A[0]},${A[1]} Q${mx},${my} ${B[0]},${B[1]}`} className="wire" />;
            }))}
          </g>
          <g className="iso" style={{ transitionDelay: "650ms" }}>
            <polygon points={pts([P(-52, 30, 0.4), P(-14, 30, 0.4), P(-14, 70, 0.4), P(-52, 70, 0.4)])} className="yard" />
            {[36, 48, 60].map((y, i) => <line key={i} {...L(P(-50, y, 8), P(-16, y, 8))} className="bus" />)}
          </g>
          {[[-34, 33], [-34, 55]].map(([x, y], i) => (
            <g key={i}>
              <Box x={x} y={y} z={0.4} w={11} d={9} h={8} tone="dim" delay={800 + i * 160} />
              <Box x={x + 2} y={y + 2} z={8.4} w={7} d={5} h={3} tone="dim" delay={900 + i * 160} />
            </g>
          ))}
          {[-24, -20].map((x, i) => <Box key={i} x={x} y={38} z={0.4} w={2.5} d={26} h={5} tone="dim" delay={1150 + i * 120} />)}
          <Mark n={1} at={P(-33, 44, 12)} dy={-22} delay={1400} />
        </svg>

        {/* 2 · feed, meter, switchgear, trays */}
        <svg viewBox="170 -4 860 504" {...part(2)}>
          <polyline points={pts(feed)} className="feed" pathLength={1} />
          <Box x={4} y={36} z={2} w={6} d={8} h={6} tone="gold" delay={900} />
          <polyline points={pts(trayFirm)} className="tray" pathLength={1} style={{ transitionDelay: "1200ms" }} />
          <polyline points={pts(trayFlex)} className="tray gold" pathLength={1} style={{ transitionDelay: "1400ms" }} />
          <Mark n={2} at={P(7, 36, 8)} dy={-20} delay={1300} gold />
        </svg>

        {/* 3 · firm hall */}
        <svg viewBox="170 -4 860 504" {...part(3)}>
          {Array.from({ length: 5 }, (_, i) => <Box key={`r${i}`} x={32} y={22 + i * 18} z={3} w={104} d={5} h={7} tone="rack" delay={250 + i * 180} />)}
          <Box x={22} y={12} z={2} w={124} d={104} h={30} tone="glass" delay={1300} />
          <Mark n={3} at={P(84, 64, 32)} dy={0} delay={1600} />
        </svg>
        {/* 4 · flexible hall */}
        <svg viewBox="170 -4 860 504" {...part(4)}>
          {Array.from({ length: 5 }, (_, i) => <Box key={`f${i}`} x={162} y={22 + i * 18} z={3} w={58} d={5} h={7} tone="rack gold" delay={250 + i * 180} />)}
          <Box x={154} y={12} z={2} w={74} d={104} h={30} tone="glass gold" delay={1300} />
          <g className="iso" style={{ transitionDelay: "1400ms" }}><line {...L(P(150, 12, 32), P(150, 116, 32))} className="wall" /></g>
          <Mark n={4} at={P(191, 64, 32)} dy={0} delay={1600} gold />
        </svg>

        {/* 5 · cooling */}
        <svg viewBox="170 -4 860 504" {...part(5)}>
          <Box x={100} y={122} z={2} w={44} d={14} h={10} tone="dim" delay={0} />
          {[0, 1, 2].map(i => <Box key={i} x={104 + i * 14} y={124} z={12} w={10} d={10} h={4} tone="dim" delay={250 + i * 140} />)}
          <g className="iso" style={{ transitionDelay: "700ms" }}>{[40, 80].map((y, i) => <polyline key={i} points={pts(pipe(y))} className="pipe" />)}</g>
          {Array.from({ length: 6 }, (_, i) => <Box key={`c${i}`} x={30 + i * 19} y={100} z={32} w={12} d={9} h={5} tone="dim" delay={900 + i * 110} />)}
          {Array.from({ length: 3 }, (_, i) => <Box key={`cf${i}`} x={162 + i * 22} y={100} z={32} w={12} d={9} h={5} tone="dim" delay={1560 + i * 110} />)}
          <g className="iso" style={{ transitionDelay: "1900ms" }}>{Array.from({ length: 9 }, (_, i) => { const x = i < 6 ? 36 + i * 19 : 168 + (i - 6) * 22; const c = P(x, 104.5, 37); return <ellipse key={i} cx={c[0]} cy={c[1]} rx={5} ry={2.6} className="fan" />; })}</g>
          <Mark n={5} at={P(122, 129, 16)} dy={0} delay={2000} />
        </svg>

        {/* 6 · backup generation */}
        <svg viewBox="170 -4 860 504" {...part(6)}>
          {Array.from({ length: 4 }, (_, i) => <Box key={`g${i}`} x={34 + i * 28} y={-8} z={0.4} w={18} d={7} h={7} tone="dim" delay={i * 200} />)}
          <Mark n={6} at={P(80, -4, 8)} dy={-16} delay={900} />
        </svg>

        {/* 7 · battery */}
        <svg viewBox="170 -4 860 504" {...part(7)}>
          {Array.from({ length: 6 }, (_, i) => <Box key={`b${i}`} x={156 + i * 13} y={122} z={2} w={10} d={6} h={6} tone="gold" delay={i * 160} />)}
          {Array.from({ length: 3 }, (_, i) => <Box key={`iv${i}`} x={158 + i * 26} y={131} z={2} w={6} d={3} h={3} tone="dim" delay={1000 + i * 140} />)}
          <Mark n={7} at={P(195, 125, 8)} dy={-16} delay={1400} gold />
        </svg>
      </div>
    </div>
  );
}
