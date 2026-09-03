"use client";
import { useEffect, useRef, useState } from "react";

// Flexibility pays. One slider (how many MW can turn off), two ways ERCOT pays for it, a year's total.
// Rates are public: 4CP transmission charges avoided (TDSP tariffs, $3.50–6.00 per kW-month) and
// reserves sold as a Controllable Load Resource (ECRS / RRS, market estimates). Reserves and ERS do not stack.
const MAX = 96,
  START = 40;
const FULL = MAX * 172_000; // the bar at 96 MW, high case
const ROWS = [
  { name: "4CP", what: "transmission charges avoided", lo: 42_000, hi: 72_000 },
  { name: "Reserves", what: "ECRS / RRS, paid to stand ready", lo: 50_000, hi: 100_000 },
];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const money = (v: number) =>
  v >= 1e6
    ? `$${(v / 1e6).toFixed(1)}M`
    : v >= 1e3
      ? `$${Math.round(v / 1e3)}k`
      : `$${Math.round(v)}`;

export default function Pays() {
  const sec = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [mw, setMw] = useState(0);
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (sec.current) io.observe(sec.current);
    return () => io.disconnect();
  }, []);
  // count up to the starting number on enter
  const played = useRef(false);
  useEffect(() => {
    if (!on || played.current) return;
    played.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setMw(START));
      return () => cancelAnimationFrame(frame);
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      if (heldRef.current) return;
      const k = clamp((t - t0 - 300) / 1400);
      setMw(easeOut(k) * START);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const pick = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    setMw(clamp((x - r.left) / r.width) * MAX);
  };
  const setHolding = (value: boolean) => {
    heldRef.current = value;
    setHeld(value);
  };
  const down = (e: React.PointerEvent) => {
    setHolding(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pick(e.clientX);
  };
  const move = (e: React.PointerEvent) => {
    if (held) pick(e.clientX);
  };
  const up = () => setHolding(false);

  const n = Math.round(mw),
    pct = (mw / MAX) * 100;
  const lo = ROWS.reduce((a, r) => a + r.lo * n, 0),
    hi = ROWS.reduce((a, r) => a + r.hi * n, 0);

  return (
    <section ref={sec} className={`pays${on ? " on" : ""}`}>
      <h2 className="pays-h">Flexibility pays.</h2>

      <div className="pays-calc">
        <div className="pays-big">
          <b>{n}</b>
          <span>MW flexible</span>
        </div>
        <div
          ref={track}
          className="commit-track pays-track"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={n}
          aria-label="Flexible megawatts"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setMw((v) => Math.min(MAX, v + 2));
            if (e.key === "ArrowLeft") setMw((v) => Math.max(0, v - 2));
          }}
        >
          <div className="pays-rail" />
          <div className="pays-fill" style={{ width: `${pct}%` }} />
          <div className="commit-knob" style={{ left: `${pct}%`, top: "calc(100% - 22px)" }} />
          <div className="commit-ticks">
            {[0, 24, 48, 72, 96].map((v) => (
              <span key={v} style={{ left: `${(v / MAX) * 100}%` }}>
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="pays-total">
          <b>
            {money(lo)} – {money(hi)}
          </b>
          <span>a year</span>
        </div>
        <div className="pays-bar" aria-hidden="true">
          {ROWS.map((r, i) => (
            <div
              key={r.name}
              className={`pays-seg s${i}`}
              style={{ width: `${((r.lo * n) / FULL) * 100}%` }}
            />
          ))}
          <div className="pays-seg band" style={{ width: `${((hi - lo) / FULL) * 100}%` }} />
        </div>
        <div className="pays-legend">
          {ROWS.map((r, i) => (
            <div key={r.name} className={`s${i}`}>
              <i />
              <b>{r.name}</b>
              <span>
                {money(r.lo * n)} – {money(r.hi * n)}
              </span>
              <em>
                {money(r.lo)}–{money(r.hi)} per MW
              </em>
            </div>
          ))}
        </div>
        <div className="pays-foot">
          ERCOT and TDSP tariffs, 2026. Reserves and ERS do not stack.
        </div>
      </div>

      <div className="pays-two">
        <div>
          <h3>Existing sites</h3>
          <p>Income from flexibility. Uptime untouched.</p>
        </div>
        <div>
          <h3>New sites</h3>
          <p>Firm and flexible declared. Connected in phases under SB 6.</p>
        </div>
      </div>
    </section>
  );
}
