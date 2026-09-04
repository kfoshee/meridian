"use client";
import { useEffect, useRef, useState } from "react";
export default function Dial({ value, unit, sub }: { value: number; unit: string; sub?: string }) {
  const [v, setV] = useState(value); const from = useRef(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(value); return; }
    const a = from.current, b = value, t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 900); const e = 1 - Math.pow(1 - k, 3); setV(a + (b - a) * e); if (k < 1) raf = requestAnimationFrame(step); else from.current = b; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div>
      <div className="display goldtext" style={{ fontSize: "clamp(104px, 11vw, 176px)", lineHeight: 0.92 }}>
        {v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 0 : 1)}
      </div>
      <div className="display" style={{ fontSize: 30, color: "var(--ink)", marginTop: 8 }}>{unit}</div>
      {sub && <div className="mt-3" style={{ color: "var(--muted)", fontSize: 16 }}>{sub}</div>}
    </div>
  );
}
