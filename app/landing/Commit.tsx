"use client";
import { useEffect, useRef, useState } from "react";

// The commitment: how much load you promise the grid you will curtail. Too little leaves megawatts unallocated;
// too much and one missed event revokes the flexible portion. The slider makes the trade-off visible;
// it sweeps on its own to the number the model finds, and you can drag it yourself.
const MAX = 96;                 // campus, MW
const BEST = 40;                // what the model recommends, MW
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
// chance of missing a performance event in a year, as a function of the commitment (illustrative shape)
const risk = (mw: number) => clamp(0.62 / (1 + Math.exp(-0.55 * (mw - 48))), 0, 1);

export default function Commit({ on }: { on: boolean }) {
  const [mw, setMw] = useState(0);
  const [held, setHeld] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  // sweep to the number on enter, unless the visitor grabs it
  const played = useRef(false), heldRef = useRef(false); heldRef.current = held;
  useEffect(() => {
    if (!on || played.current) return; played.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setMw(BEST); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      if (heldRef.current) return;
      const k = clamp((t - t0 - 600) / 3800);
      // overshoot past the cliff, then come back to rest on the number
      const v = k < 0.7 ? ease(k / 0.7) * 58 : 58 - ease((k - 0.7) / 0.3) * (58 - BEST);
      setMw(v); if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [on]);

  const pick = (clientX: number) => { const r = track.current!.getBoundingClientRect(); setMw(clamp((clientX - r.left) / r.width) * MAX); };
  const onDown = (e: React.PointerEvent) => { setHeld(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pick(e.clientX); };
  const onMove = (e: React.PointerEvent) => { if (held) pick(e.clientX); };
  const onUp = () => setHeld(false);

  const r = risk(mw), pct = mw / MAX * 100;
  const curve = "M" + Array.from({ length: 97 }, (_, i) => `${i * 10},${(78 - risk(i) * 76).toFixed(2)}`).join(" L");
  const state = mw < 30 ? "low" : r > 0.15 ? "high" : "right";
  const verdict = state === "low" ? `${Math.round(BEST - mw)} MW left unallocated` : state === "high" ? "one missed event revokes it all" : "the number you can defend";

  return (
    <div className={`commit-ui${on ? " on" : ""}`} data-state={state}>
      <div className="commit-read">
        <div className="commit-big"><b>{Math.round(mw)}</b><span>MW</span></div>
        <div className="commit-side">
          <div><b>{(r * 100).toFixed(1)}%</b><span>risk</span></div>
        </div>
      </div>
      <div ref={track} className="commit-track" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="slider" aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={Math.round(mw)} aria-label="Committed dispatchable load, megawatts" tabIndex={0}
        onKeyDown={e => { if (e.key === "ArrowRight") setMw(v => Math.min(MAX, v + 2)); if (e.key === "ArrowLeft") setMw(v => Math.max(0, v - 2)); }}>
        <div className="commit-zone low" style={{ left: 0, width: `${30 / MAX * 100}%` }} />
        <div className="commit-zone right" style={{ left: `${30 / MAX * 100}%`, width: `${14 / MAX * 100}%` }} />
        <div className="commit-zone high" style={{ left: `${44 / MAX * 100}%`, right: 0 }} />
        <svg className="commit-curve" viewBox="0 0 960 80" preserveAspectRatio="none" aria-hidden="true">
          <defs><clipPath id="commit-clip"><rect x={0} y={-10} width={pct * 9.6} height={100} /></clipPath></defs>
          <path d={curve} />
          <path d={curve} className="commit-fill-path" clipPath="url(#commit-clip)" />
        </svg>
        <div className="commit-knob" style={{ left: `${pct}%`, top: `calc((100% - 22px) * ${((78 - r * 76) / 80).toFixed(4)})` }} />
        <div className="commit-ticks">{[0, 24, 48, 72, 96].map(v => <span key={v} style={{ left: `${v / MAX * 100}%` }}>{v}</span>)}</div>
      </div>
      <div className="commit-verdict">{verdict}</div>
    </div>
  );
}
