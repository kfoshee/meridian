"use client";
import { useEffect, useMemo, useState } from "react";
import type { Window } from "./ModelSim";

// The model as a part: a compute die in isometric. Signals flow in from the left, the die works,
// the answers flow out to the right. Layers settle onto each other on entrance; the core breathes;
// every event the running year finds makes it fire. Same projection as the campus. No tilt.
const S = 2.5, CX = 590, CY = 236;
const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const P = (x: number, y: number, z: number) => [CX + (x - y) * COS * S, CY + (x + y) * SIN * S - z * S] as const;
const pts = (a: (readonly [number, number])[]) => a.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
const path = (a: (readonly [number, number])[]) => "M" + a.map(p => p.map(v => v.toFixed(1)).join(",")).join(" L");

function Slab({ x, y, z, w, d, h, tone = "" }: { x: number; y: number; z: number; w: number; d: number; h: number; tone?: string }) {
  const p100 = P(x + w, y, z), p110 = P(x + w, y + d, z), p010 = P(x, y + d, z);
  const p001 = P(x, y, z + h), p101 = P(x + w, y, z + h), p111 = P(x + w, y + d, z + h), p011 = P(x, y + d, z + h);
  return (
    <g className={`dz ${tone}`}>
      <polygon className="dz-l" points={pts([p011, p111, p110, p010])} />
      <polygon className="dz-r" points={pts([p101, p100, p110, p111])} />
      <polygon className="dz-t" points={pts([p001, p101, p111, p011])} />
    </g>
  );
}

const INPUTS = ["prices", "load", "weather", "reserves", "campus"];
const OUTS = ["hours stepped aside this year", "events, each seen a day ahead", "next window"];
const SUB = 60, INT = 48, DIE = 38, CORE = 11;        // half-sizes, model units
const Z_SUB = 9, Z_INT = 4, Z_DIE = 6, Z_CORE = 3;
const PIN_STEP = 8, PIN_N = 14;

type Tally = { hours: number; events: number; week: Window[]; today: string };
export default function Chip({ tally, on }: { tally: Tally; on: boolean }) {
  const [narrow, setNarrow] = useState(false);
  const [settled, setSettled] = useState(false);   // entrance done: hover lifts and drops quickly from here on
  useEffect(() => { if (!on) return; const t = setTimeout(() => setSettled(true), 2300); return () => clearTimeout(t); }, [on]);
  useEffect(() => { const m = matchMedia("(max-width: 640px)"); const f = () => setNarrow(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const geo = useMemo(() => {
    const inEnd = narrow ? 300 : 90, outEnd = narrow ? 900 : 1010;
    // pins on all four edges of the substrate
    const pins: { x: number; y: number; w: number; d: number }[] = [];
    for (let i = 0; i < PIN_N; i++) {
      const c = -SUB + PIN_STEP * (i + 0.5) + (SUB - PIN_STEP * PIN_N / 2);
      pins.push({ x: -SUB - 7, y: c - 1.5, w: 7, d: 3 }, { x: SUB, y: c - 1.5, w: 7, d: 3 });
      pins.push({ x: c - 1.5, y: -SUB - 7, w: 3, d: 7 }, { x: c - 1.5, y: SUB, w: 3, d: 7 });
    }
    // circuit on the die top: a fine grid, buses from the core, and vias where they meet
    const zt = Z_SUB + Z_INT + Z_DIE;
    const grid: string[] = [];
    for (let k = -DIE + 6; k < DIE; k += 6) { grid.push(path([P(k, -DIE + 2, zt), P(k, DIE - 2, zt)])); grid.push(path([P(-DIE + 2, k, zt), P(DIE - 2, k, zt)])); }
    const buses: string[] = [];
    for (let k = -8; k <= 8; k += 4) {
      buses.push(path([P(-CORE, k, zt), P(-DIE + 3, k, zt)]), path([P(CORE, k, zt), P(DIE - 3, k, zt)]));
      buses.push(path([P(k, -CORE, zt), P(k, -DIE + 3, zt)]), path([P(k, CORE, zt), P(k, DIE - 3, zt)]));
    }
    let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const vias: (readonly [number, number])[] = [];
    for (let i = 0; i < 70; i++) { const gx = -DIE + 6 * Math.floor(rnd() * 12) + 6, gy = -DIE + 6 * Math.floor(rnd() * 12) + 6; if (Math.abs(gx) > CORE + 2 || Math.abs(gy) > CORE + 2) vias.push(P(gx, gy, zt)); }
    // signal traces: in along the north-west edge, out along the south-east edge, at pin height
    const zp = 3;
    const ins = INPUTS.map((_, i) => { const y = -44 + i * 22, L = 34 + (4 - i) * 9; const a = P(-SUB - 7, y, zp), b = P(-SUB - 7 - L, y, zp); return { d: path([[inEnd, b[1]] as const, b, a]), lx: 78, ly: b[1] }; });
    const outs = OUTS.map((_, i) => { const y = -34 + i * 34, L = 24 + i * 16; const a = P(SUB + 7, y, zp), b = P(SUB + 7 + L, y, zp); return { d: path([a, b, [outEnd, b[1]] as const]), vx: 1024, vy: b[1] }; });
    const core = P(0, 0, zt + Z_CORE);
    return { pins, grid, buses, vias, ins, outs, core, zt };
  }, [narrow]);

  const wk = tally.week[0];
  const nums = [String(tally.hours), String(tally.events), wk ? `${wk.day} ${wk.from}–${wk.to}` : "none this week"];

  return (
    <div className={`die-wrap${on ? " on" : ""}${settled ? " settled" : ""}`} tabIndex={-1}>
      <div className="die-row" aria-hidden="true">{INPUTS.map(w => <span key={w}>{w}</span>)}</div>
    <svg className="die" viewBox={narrow ? "280 40 640 400" : "0 0 1280 500"} aria-hidden="true">
      <defs>
        <radialGradient id="die-glow"><stop offset="0" stopColor="#f3d97a" stopOpacity="0.9" /><stop offset="0.35" stopColor="#f3d97a" stopOpacity="0.28" /><stop offset="1" stopColor="#f3d97a" stopOpacity="0" /></radialGradient>
        <filter id="die-blur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>

      {/* where the substrate rests, shown while the stack is lifted apart */}
      <polygon className="die-rest" points={pts([P(-SUB, -SUB, Z_SUB), P(SUB, -SUB, Z_SUB), P(SUB, SUB, Z_SUB), P(-SUB, SUB, Z_SUB)])} />
      {/* contact shadow */}
      <polygon className="die-shadow" points={pts([P(-SUB - 10, -SUB - 10, -1), P(SUB + 10, -SUB - 10, -1), P(SUB + 10, SUB + 10, -1), P(-SUB - 10, SUB + 10, -1)])} filter="url(#die-blur)" />

      {/* signals in */}
      <g className="die-sig in">
        {geo.ins.map((t, i) => <g key={i}><path className="die-wire" d={t.d} /><circle className="die-dot" r={2.2} style={{ offsetPath: `path("${t.d}")`, animationDuration: `${3.2 + i * 0.5}s`, animationDelay: `${-i * 1.3}s` }} /><text className="die-word" x={t.lx} y={t.ly + 3.5} textAnchor="end">{INPUTS[i]}</text></g>)}
      </g>

      {/* the stack, bottom up: substrate + pins, interposer, die, core */}
      <g className="die-layer" style={{ transitionDelay: "0ms", "--lift": "0px" } as React.CSSProperties}>
        <Slab x={-SUB} y={-SUB} z={0} w={SUB * 2} d={SUB * 2} h={Z_SUB} tone="sub" />
        {geo.pins.map((p, i) => <Slab key={i} x={p.x} y={p.y} z={0} w={p.w} d={p.d} h={3} tone="pin" />)}
      </g>
      <g className="die-layer" style={{ transitionDelay: "260ms", "--lift": "26px" } as React.CSSProperties}>
        <Slab x={-INT} y={-INT} z={Z_SUB} w={INT * 2} d={INT * 2} h={Z_INT} tone="int" />
      </g>
      <g className="die-layer" style={{ transitionDelay: "520ms", "--lift": "52px" } as React.CSSProperties}>
        <Slab x={-DIE} y={-DIE} z={Z_SUB + Z_INT} w={DIE * 2} d={DIE * 2} h={Z_DIE} tone="chip" />
        <g className="die-circuit">
          {geo.grid.map((d, i) => <path key={i} className="die-grid" d={d} />)}
          {geo.buses.map((d, i) => <path key={i} className="die-bus" d={d} />)}
          {geo.vias.map((v, i) => <circle key={i} className="die-via" cx={v[0]} cy={v[1]} r={1.1} />)}
        </g>
      </g>
      <g className="die-layer" style={{ transitionDelay: "780ms", "--lift": "80px" } as React.CSSProperties}>
        <circle className="die-halo" cx={geo.core[0]} cy={geo.core[1]} r={54} fill="url(#die-glow)" />
        <Slab x={-CORE} y={-CORE} z={geo.zt} w={CORE * 2} d={CORE * 2} h={Z_CORE} tone="core" />
        {tally.events > 0 && <g key={tally.events} className="die-fire"><circle cx={geo.core[0]} cy={geo.core[1]} r={30} /></g>}
      </g>

      {/* answers out */}
      <g className="die-sig out">
        {geo.outs.map((t, i) => <g key={i}><path className="die-wire" d={t.d} /><text className="die-val" x={t.vx} y={t.vy + 10}>{nums[i]}<tspan className="die-unit" dx={10}>{OUTS[i]}</tspan></text><line className="die-rule" x1={t.vx} x2={t.vx + 236} y1={t.vy + 24} y2={t.vy + 24} /></g>)}
        <g key={tally.events}>{geo.outs.map((t, i) => <circle key={i} className="die-dot out" r={2.2} style={{ offsetPath: `path("${t.d}")`, animationDuration: "3.4s", animationDelay: `${i * 0.6}s` }} />)}</g>
      </g>
    </svg>
      <div className="die-outs">{OUTS.map((w, i) => <div key={w}><b>{nums[i]}</b><span>{w}</span></div>)}</div>
    </div>
  );
}
