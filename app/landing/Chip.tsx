"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "./chip.css";
import type { Window } from "./ModelSim";

// The model as a part: a compute die in isometric. Signals flow in from the left, the die works,
// the answers flow out to the right. Layers settle onto each other on entrance; the core breathes;
// every event the running year finds makes it fire. Physical graphite and champagne surfaces.
const S = 2.5,
  CX = 590,
  CY = 236;
const COS = Math.cos(Math.PI / 6),
  SIN = Math.sin(Math.PI / 6);
const P = (x: number, y: number, z: number) =>
  [CX + (x - y) * COS * S, CY + (x + y) * SIN * S - z * S] as const;
const pts = (a: (readonly [number, number])[]) =>
  a.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
const path = (a: (readonly [number, number])[]) =>
  "M" + a.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L");

function Slab({
  x,
  y,
  z,
  w,
  d,
  h,
  tone = "",
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  tone?: string;
}) {
  const p100 = P(x + w, y, z),
    p110 = P(x + w, y + d, z),
    p010 = P(x, y + d, z);
  const p001 = P(x, y, z + h),
    p101 = P(x + w, y, z + h),
    p111 = P(x + w, y + d, z + h),
    p011 = P(x, y + d, z + h);
  const finish =
    tone === "pin" || tone === "core" ? "gold" : tone === "chip" ? "silicon" : "graphite";
  const bevel = tone === "pin" ? 0.25 : 0.7;
  return (
    <g className={`dz ${tone}`}>
      <polygon
        style={{ fill: `url(#mc-${finish}-left)` }}
        className="dz-l"
        points={pts([p011, p111, p110, p010])}
      />
      <polygon
        style={{ fill: `url(#mc-${finish}-right)` }}
        className="dz-r"
        points={pts([p101, p100, p110, p111])}
      />
      <polygon
        style={{ fill: `url(#mc-${finish}-top)` }}
        className="dz-t"
        points={pts([p001, p101, p111, p011])}
      />
      <path className="die-bevel-lit" d={path([p011, p001, p101])} />
      <path className="die-bevel-shade" d={path([p011, p111, p101])} />
      <polygon
        className="die-inset"
        points={pts([
          P(x + bevel, y + bevel, z + h),
          P(x + w - bevel, y + bevel, z + h),
          P(x + w - bevel, y + d - bevel, z + h),
          P(x + bevel, y + d - bevel, z + h),
        ])}
      />
    </g>
  );
}

const INPUTS = ["prices", "load", "weather", "reserves", "campus"];
const OUTS = ["hours stepped aside this year", "events, each seen a day ahead", "next window"];
const SUB = 60,
  INT = 48,
  DIE = 38,
  CORE = 11; // half-sizes, model units
const Z_SUB = 9,
  Z_INT = 4,
  Z_DIE = 6,
  Z_CORE = 3;
const PIN_STEP = 8,
  PIN_N = 14;

type Tally = { hours: number; events: number; week: Window[]; today: string };
export default function Chip({ tally, on }: { tally: Tally; on: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const pointerFrame = useRef(0);
  const [running, setRunning] = useState(true);
  const [signal, setSignal] = useState<number | null>(null);
  const [hoverSignal, setHoverSignal] = useState<number | null>(null);
  const highlightedSignal = hoverSignal ?? signal;
  const [narrow, setNarrow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(false);
  const [settled, setSettled] = useState(false); // entrance done: hover lifts and drops quickly from here on
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => setSettled(true), 2300);
    return () => clearTimeout(t);
  }, [on]);
  useEffect(() => {
    const m = matchMedia("(max-width: 640px)");
    const f = () => setNarrow(m.matches);
    const init = requestAnimationFrame(f);
    m.addEventListener("change", f);
    return () => {
      cancelAnimationFrame(init);
      m.removeEventListener("change", f);
    };
  }, []);
  useEffect(() => {
    let inView = false;
    const update = () => setRunning(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (root.current) observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      cancelAnimationFrame(pointerFrame.current);
    };
  }, []);
  const resetPointer = () => {
    cancelAnimationFrame(pointerFrame.current);
    root.current?.style.removeProperty("--chip-x");
    root.current?.style.removeProperty("--chip-y");
  };
  const geo = useMemo(() => {
    const inEnd = narrow ? 320 : 90,
      outEnd = narrow ? 905 : 1010;
    // pins on all four edges of the substrate
    const pins: { x: number; y: number; w: number; d: number }[] = [];
    for (let i = 0; i < PIN_N; i++) {
      const c = -SUB + PIN_STEP * (i + 0.5) + (SUB - (PIN_STEP * PIN_N) / 2);
      pins.push({ x: -SUB - 7, y: c - 1.5, w: 7, d: 3 }, { x: SUB, y: c - 1.5, w: 7, d: 3 });
      pins.push({ x: c - 1.5, y: -SUB - 7, w: 3, d: 7 }, { x: c - 1.5, y: SUB, w: 3, d: 7 });
    }
    // circuit on the die top: a fine grid, buses from the core, and vias where they meet
    const zt = Z_SUB + Z_INT + Z_DIE;
    const grid: string[] = [];
    for (let k = -DIE + 6; k < DIE; k += 6) {
      grid.push(path([P(k, -DIE + 2, zt), P(k, DIE - 2, zt)]));
      grid.push(path([P(-DIE + 2, k, zt), P(DIE - 2, k, zt)]));
    }
    const buses: string[] = [];
    for (let k = -8; k <= 8; k += 4) {
      buses.push(
        path([P(-CORE, k, zt), P(-DIE + 3, k, zt)]),
        path([P(CORE, k, zt), P(DIE - 3, k, zt)]),
      );
      buses.push(
        path([P(k, -CORE, zt), P(k, -DIE + 3, zt)]),
        path([P(k, CORE, zt), P(k, DIE - 3, zt)]),
      );
    }
    const rnd = (index: number) => {
      const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const vias: (readonly [number, number])[] = [];
    for (let i = 0; i < 70; i++) {
      const gx = -DIE + 6 * Math.floor(rnd(i * 2) * 12) + 6,
        gy = -DIE + 6 * Math.floor(rnd(i * 2 + 1) * 12) + 6;
      if (Math.abs(gx) > CORE + 2 || Math.abs(gy) > CORE + 2) vias.push(P(gx, gy, zt));
    }
    // signal traces: in along the north-west edge, out along the south-east edge, at pin height
    const zp = 3;
    const ins = INPUTS.map((_, i) => {
      const y = -44 + i * 22,
        L = 34 + (4 - i) * 9;
      const a = P(-SUB - 7, y, zp),
        b = P(-SUB - 7 - L, y, zp);
      return { d: path([[inEnd, b[1]] as const, b, a]), lx: 78, ly: b[1] };
    });
    const outs = OUTS.map((_, i) => {
      const y = -34 + i * 34,
        L = 24 + i * 16;
      const a = P(SUB + 7, y, zp),
        b = P(SUB + 7 + L, y, zp);
      return { d: path([a, b, [outEnd, b[1]] as const]), vx: 1024, vy: b[1] };
    });
    const core = P(0, 0, zt + Z_CORE);
    return { pins, grid, buses, vias, ins, outs, core, zt };
  }, [narrow]);

  const wk = tally.week[0];
  const nums = [
    String(tally.hours),
    String(tally.events),
    wk ? `${wk.day} ${wk.from}–${wk.to}` : "none this week",
  ];

  return (
    <div
      ref={root}
      data-signal={highlightedSignal ?? ""}
      data-running={on && running}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSignal(null);
          setHoverSignal(null);
          setExpanded(false);
          setPreview(false);
          resetPointer();
        }
      }}
      className={`die-wrap${on ? " on" : ""}${settled ? " settled" : ""}`}
      data-expanded={expanded}
      data-preview={preview}
    >
      <div className="die-stage">
        <nav className="die-input-controls" aria-label="Explore model inputs">
          {INPUTS.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={signal === i}
              style={{ "--wire-y": `${(geo.ins[i].ly / 500) * 100}%` } as React.CSSProperties}
              onClick={() => setSignal((current) => (current === i ? null : i))}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHoverSignal(i);
              }}
              onPointerLeave={() => setHoverSignal(null)}
              onFocus={() => setHoverSignal(i)}
              onBlur={() => setHoverSignal(null)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="die-plot">
          <svg
            className="die"
            viewBox={narrow ? "270 0 650 455" : "0 0 1280 500"}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="mc-graphite-top" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#4a505b" />
                <stop offset=".22" stopColor="#272e38" />
                <stop offset=".6" stopColor="#111821" />
                <stop offset="1" stopColor="#303946" />
              </linearGradient>
              <linearGradient id="mc-graphite-left" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#252c37" />
                <stop offset=".2" stopColor="#141a22" />
                <stop offset="1" stopColor="#070b10" />
              </linearGradient>
              <linearGradient id="mc-graphite-right" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#3e4754" />
                <stop offset=".18" stopColor="#252d38" />
                <stop offset="1" stopColor="#10151c" />
              </linearGradient>
              <linearGradient id="mc-silicon-top" x1="0" y1="1" x2=".8" y2="0">
                <stop stopColor="#141c26" />
                <stop offset=".46" stopColor="#202c3b" />
                <stop offset=".65" stopColor="#465260" />
                <stop offset=".78" stopColor="#252e3b" />
                <stop offset="1" stopColor="#121923" />
              </linearGradient>
              <linearGradient id="mc-silicon-left">
                <stop stopColor="#56472f" />
                <stop offset=".2" stopColor="#171d27" />
                <stop offset="1" stopColor="#080c12" />
              </linearGradient>
              <linearGradient id="mc-silicon-right">
                <stop stopColor="#ae905a" />
                <stop offset=".1" stopColor="#393632" />
                <stop offset="1" stopColor="#111722" />
              </linearGradient>
              <linearGradient id="mc-gold-top" x1="0" y1="0" x2=".7" y2="1">
                <stop stopColor="#fff4d6" />
                <stop offset=".24" stopColor="#d7c18e" />
                <stop offset=".48" stopColor="#f1e4bf" />
                <stop offset=".52" stopColor="#c4a66a" />
                <stop offset="1" stopColor="#98804f" />
              </linearGradient>
              <linearGradient id="mc-gold-left" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#e0c083" />
                <stop offset=".2" stopColor="#8c6a33" />
                <stop offset="1" stopColor="#453118" />
              </linearGradient>
              <linearGradient id="mc-gold-right" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#f1d798" />
                <stop offset=".24" stopColor="#b48c49" />
                <stop offset=".8" stopColor="#5b421d" />
                <stop offset="1" stopColor="#c2a064" />
              </linearGradient>
              <filter id="mc-contact" x="-30%" y="-50%" width="160%" height="200%">
                <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000" floodOpacity=".8" />
              </filter>
              <radialGradient id="die-glow">
                <stop offset="0" stopColor="#f3d97a" stopOpacity="0.9" />
                <stop offset="0.35" stopColor="#f3d97a" stopOpacity="0.28" />
                <stop offset="1" stopColor="#f3d97a" stopOpacity="0" />
              </radialGradient>
              <filter id="die-blur" x="-30%" y="-60%" width="160%" height="220%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
            </defs>

            {/* where the substrate rests, shown while the stack is lifted apart */}
            <polygon
              className="die-rest"
              points={pts([
                P(-SUB, -SUB, Z_SUB),
                P(SUB, -SUB, Z_SUB),
                P(SUB, SUB, Z_SUB),
                P(-SUB, SUB, Z_SUB),
              ])}
            />
            {/* contact shadow */}
            <polygon
              className="die-shadow"
              points={pts([
                P(-SUB - 10, -SUB - 10, -1),
                P(SUB + 10, -SUB - 10, -1),
                P(SUB + 10, SUB + 10, -1),
                P(-SUB - 10, SUB + 10, -1),
              ])}
              filter="url(#die-blur)"
            />

            {/* signals in */}
            <g className="die-sig in">
              {geo.ins.map((t, i) => (
                <g key={i} className="die-input-wire" data-highlighted={highlightedSignal === i}>
                  <path className="die-wire" d={t.d} />
                  <circle
                    className="die-dot"
                    r={2.2}
                    style={{
                      offsetPath: `path("${t.d}")`,
                      animationDuration: `${3.2 + i * 0.5}s`,
                      animationDelay: `${-i * 1.3}s`,
                    }}
                  />
                  <text className="die-word" x={t.lx} y={t.ly + 3.5} textAnchor="end">
                    {INPUTS[i]}
                  </text>
                </g>
              ))}
            </g>

            {/* The physical stack follows pointer movement without moving labels or readouts. */}
            <g className="die-body">
              <g
                className="die-layer"
                style={{ transitionDelay: "0ms", "--lift": "0px" } as React.CSSProperties}
              >
                <Slab x={-SUB} y={-SUB} z={0} w={SUB * 2} d={SUB * 2} h={Z_SUB} tone="sub" />
                {geo.pins.map((p, i) => (
                  <Slab key={i} x={p.x} y={p.y} z={0} w={p.w} d={p.d} h={3} tone="pin" />
                ))}
              </g>
              <g
                className="die-layer die-contact"
                style={{ transitionDelay: "260ms", "--lift": "26px" } as React.CSSProperties}
              >
                <Slab x={-INT} y={-INT} z={Z_SUB} w={INT * 2} d={INT * 2} h={Z_INT} tone="int" />
                {[-1, 1].flatMap((side) =>
                  Array.from({ length: 8 }, (_, i) => (
                    <g key={`${side}-${i}`}>
                      <Slab
                        x={side < 0 ? -45 : 40}
                        y={-32 + i * 8}
                        z={Z_SUB + Z_INT}
                        w={4}
                        d={2.5}
                        h={1.2}
                        tone="pin"
                      />
                      <Slab
                        x={-32 + i * 8}
                        y={side < 0 ? -45 : 40}
                        z={Z_SUB + Z_INT}
                        w={2.5}
                        d={4}
                        h={1.2}
                        tone="pin"
                      />
                    </g>
                  )),
                )}
              </g>
              <g
                className="die-layer die-contact"
                style={{ transitionDelay: "520ms", "--lift": "52px" } as React.CSSProperties}
              >
                <Slab
                  x={-DIE}
                  y={-DIE}
                  z={Z_SUB + Z_INT}
                  w={DIE * 2}
                  d={DIE * 2}
                  h={Z_DIE}
                  tone="chip"
                />
                <g className="die-circuit">
                  {geo.grid.map((d, i) => (
                    <path key={i} className="die-grid" d={d} />
                  ))}
                  {geo.buses.map((d, i) => (
                    <path key={i} className="die-bus" d={d} />
                  ))}
                  {geo.vias.map((v, i) => (
                    <circle key={i} className="die-via" cx={v[0]} cy={v[1]} r={1.1} />
                  ))}
                </g>
              </g>
              <g
                className="die-layer die-contact"
                style={{ transitionDelay: "780ms", "--lift": "80px" } as React.CSSProperties}
              >
                <circle
                  className="die-halo"
                  cx={geo.core[0]}
                  cy={geo.core[1]}
                  r={54}
                  fill="url(#die-glow)"
                />
                <Slab
                  x={-CORE}
                  y={-CORE}
                  z={geo.zt}
                  w={CORE * 2}
                  d={CORE * 2}
                  h={Z_CORE}
                  tone="core"
                />
                <polygon
                  className="die-core-window"
                  points={pts([
                    P(-8, -8, geo.zt + Z_CORE + 0.05),
                    P(8, -8, geo.zt + Z_CORE + 0.05),
                    P(8, 8, geo.zt + Z_CORE + 0.05),
                    P(-8, 8, geo.zt + Z_CORE + 0.05),
                  ])}
                />
                {Array.from({ length: 4 }, (_, row) =>
                  Array.from({ length: 4 }, (_, col) => {
                    const x = -6.6 + col * 3.5,
                      y = -6.6 + row * 3.5,
                      z = geo.zt + Z_CORE + 0.1;
                    return (
                      <polygon
                        key={`${row}-${col}`}
                        className="die-core-cell"
                        points={pts([
                          P(x, y, z),
                          P(x + 2.8, y, z),
                          P(x + 2.8, y + 2.8, z),
                          P(x, y + 2.8, z),
                        ])}
                      />
                    );
                  }),
                )}
                {tally.events > 0 && (
                  <g key={tally.events} className="die-fire">
                    <circle cx={geo.core[0]} cy={geo.core[1]} r={30} />
                  </g>
                )}
              </g>
            </g>
            {/* answers out */}
            <g className="die-sig out">
              {geo.outs.map((t, i) => (
                <g key={i}>
                  <path className="die-wire" d={t.d} />
                  <text className="die-val" x={t.vx} y={t.vy + 10}>
                    {nums[i]}
                    <tspan className="die-unit" x={t.vx} dy={20}>
                      {OUTS[i]}
                    </tspan>
                  </text>
                  <line
                    className="die-rule"
                    x1={t.vx}
                    x2={t.vx + 236}
                    y1={t.vy + 42}
                    y2={t.vy + 42}
                  />
                </g>
              ))}
              <g key={tally.events}>
                {geo.outs.map((t, i) => (
                  <circle
                    key={i}
                    className="die-dot out"
                    r={2.2}
                    style={{
                      offsetPath: `path("${t.d}")`,
                      animationDuration: "3.4s",
                      animationDelay: `${i * 0.6}s`,
                    }}
                  />
                ))}
              </g>
            </g>
          </svg>
          <button
            type="button"
            className="die-explore"
            aria-label={expanded ? "Assemble layers" : "Separate layers"}
            aria-pressed={expanded}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setPreview(true);
            }}
            onPointerLeave={() => {
              setPreview(false);
              resetPointer();
            }}
            onPointerCancel={() => {
              setPreview(false);
              resetPointer();
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              const rect = event.currentTarget.getBoundingClientRect();
              const x = Math.max(
                -1,
                Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
              );
              const y = Math.max(
                -1,
                Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
              );
              cancelAnimationFrame(pointerFrame.current);
              pointerFrame.current = requestAnimationFrame(() => {
                root.current?.style.setProperty("--chip-x", `${x * 7}px`);
                root.current?.style.setProperty("--chip-y", `${y * 4}px`);
              });
            }}
            onClick={() => {
              setExpanded((value) => !value);
              setPreview(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setExpanded(false);
                setPreview(false);
              }
            }}
          />
        </div>
      </div>
      <div className="die-outs" aria-label="Model results">
        {OUTS.map((w, i) => (
          <div key={w}>
            <b>{nums[i]}</b>
            <span>{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
