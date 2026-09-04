"use client";
import { useEffect, useRef } from "react";

// The model, running. Two lanes: the grid (tightness at the node, and where it says stop) and the campus
// (its load, which steps aside only in the windows the model scheduled). A year streams past and loops.
const HOUR = [0.0015,0.0014,0.0013,0.0013,0.0013,0.002,0.0054,0.0027,0.0023,0.0024,0.0022,0.0022,0.0037,0.0057,0.011,0.0164,0.0165,0.0101,0.0084,0.009,0.0057,0.0019,0.0016,0.0013];
const MONTH = [0.0013,0.0174,0.0023,0.004,0.0046,0.0028,0.0048,0.0123,0.004,0.0025,0.002,0.0012];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], MDAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function synth(seed = 42) {
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const hm = Math.max(...HOUR), mm = Math.max(...MONTH);
  const out = new Float32Array(8760); let w = 0;
  for (let i = 0; i < 8760; i++) {
    const h = i % 24, m = Math.min(11, Math.floor(i / 730));
    w = w * 0.992 + (rnd() - 0.5) * 0.05;
    const base = 0.18 + 0.42 * (HOUR[h] / hm) * (0.35 + 0.65 * MONTH[m] / mm) + w;
    const spike = rnd() < 0.012 * (MONTH[m] / mm) * (HOUR[h] / hm) ? 0.35 + rnd() * 0.5 : 0;
    out[i] = clamp(base + spike, 0.02, 1.4);
  }
  for (let i = 1; i < 8760; i++) if (out[i - 1] > 0.8 && rnd() < 0.6) out[i] = Math.max(out[i], out[i - 1] - 0.06 - rnd() * 0.08);
  const sm = new Float32Array(8760); for (let i = 0; i < 8760; i++) { let a = 0, n = 0; for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < 8760) { a += out[j]; n++; } } sm[i] = out[i] > 0.8 ? out[i] : a / n; }
  return sm;
}
const YEAR = synth();
const THRESH = 0.8;
const dateOf = (h: number) => { let d = Math.floor(h / 24); let m = 0; while (m < 11 && d >= MDAYS[m]) { d -= MDAYS[m]; m++; } return { m, d: d + 1, hh: h % 24 }; };

export type Window = { day: string; from: number; to: number };
export default function ModelSim({ onTally }: { onTally?: (hours: number, events: number, week: Window[], today: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current!; let alive = true, raf = 0;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now(), HPS = 56, START = 24 * 200;
    const draw = (now: number) => {
      if (!alive) return; raf = requestAnimationFrame(draw);
      const r = c.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
      const g = c.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const font = getComputedStyle(document.body).fontFamily;
      const phone = w <= 640;
      const run = (reduce ? 3000 : ((now - t0) / 1000) * HPS) % 8760;
      const nowH = (START + run) % 8760, iNow = Math.floor(nowH);
      const span = phone ? 24 * 9 : 24 * 20, pxPerH = w / span, nowX = w * 0.66;
      const X = (i: number) => nowX + (i - nowH) * pxPerH;
      const fh = phone ? 24 : 48;
      const at = (i: number) => YEAR[((i % 8760) + 8760) % 8760];
      const first = iNow - Math.ceil(nowX / pxPerH) - 1, last = iNow + fh;

      const L1 = { top: 40, bottom: h * 0.60 }, L2 = { top: h * 0.66, bottom: h - 44 };
      const y1 = (v: number) => L1.bottom - clamp(v / 1.4) * (L1.bottom - L1.top);
      const y2 = (v: number) => L2.bottom - v * (L2.bottom - L2.top);
      g.font = `${phone ? 11 : 13}px ${font}`; g.textBaseline = "middle";

      // a soft light behind now
      const nl = g.createLinearGradient(nowX - 160, 0, nowX + 60, 0); nl.addColorStop(0, "rgba(243,217,122,0)"); nl.addColorStop(0.85, "rgba(243,217,122,0.06)"); nl.addColorStop(1, "rgba(243,217,122,0)");
      g.fillStyle = nl; g.fillRect(nowX - 160, L1.top, 220, L2.bottom - L1.top);
      // day grid + date axis
      g.strokeStyle = "rgba(247,242,230,0.05)"; g.lineWidth = 1; g.beginPath();
      for (let i = Math.floor(first / 24) * 24; i <= last + 24; i += 24) { const x = Math.round(X(i)) + 0.5; g.moveTo(x, L1.top); g.lineTo(x, L2.bottom); }
      g.stroke();
      g.fillStyle = "rgba(122,112,90,0.9)"; g.textAlign = "left";
      for (let i = Math.floor(first / 24) * 24; i <= last + 24; i += 24) { const dd = dateOf(((i % 8760) + 8760) % 8760); if (dd.d === 1 || dd.d % (phone ? 3 : 5) === 0) { if (!phone || X(i) < w - 120) g.fillText(`${MONTHS[dd.m]} ${dd.d}`, X(i) + 4, h - 12); } }

      // lane 1: the grid; the stop level as a band at the top
      const band = g.createLinearGradient(0, L1.top, 0, y1(THRESH)); band.addColorStop(0, "rgba(210,98,42,0.16)"); band.addColorStop(1, "rgba(210,98,42,0.02)");
      g.fillStyle = band; g.fillRect(0, L1.top, w, y1(THRESH) - L1.top);
      g.strokeStyle = "rgba(210,98,42,0.45)"; g.beginPath(); g.moveTo(0, y1(THRESH) + 0.5); g.lineTo(w, y1(THRESH) + 0.5); g.stroke();
      g.fillStyle = "rgba(210,98,42,0.9)"; g.fillText("where the grid says stop", 8, y1(THRESH) - 9);
      g.fillStyle = "rgba(122,112,90,0.9)"; g.fillText("grid", 8, L1.bottom - 8); g.fillText("campus", 8, L2.top + 10);
      // the trace: quiet in ink, events in glowing gold
      g.save(); g.lineJoin = "round"; g.lineWidth = phone ? 1.2 : 1.6; g.strokeStyle = "rgba(247,242,230,0.36)"; g.beginPath();
      for (let i = first; i <= iNow; i++) g[i === first ? "moveTo" : "lineTo"](X(i), y1(at(i))); g.stroke(); g.restore();
      g.save(); g.lineJoin = "round"; g.lineWidth = phone ? 1.8 : 2.4; g.strokeStyle = "rgba(243,217,122,0.95)"; g.shadowBlur = 16; g.shadowColor = "rgba(243,217,122,0.9)"; g.beginPath(); let pen = false;
      for (let i = first; i <= iNow; i++) { if (at(i) <= THRESH) { pen = false; continue; } if (!pen) { g.moveTo(X(i - 1), y1(at(i - 1))); pen = true; } g.lineTo(X(i), y1(at(i))); }
      g.stroke(); g.restore();
      // forecast: a widening band and a dotted median
      g.beginPath();
      for (let k = 0; k <= fh; k++) { const wid = 0.03 + 0.12 * (k / fh); g[k ? "lineTo" : "moveTo"](X(iNow + k), y1(at(iNow + k) + wid)); }
      for (let k = fh; k >= 0; k--) { const wid = 0.03 + 0.12 * (k / fh); g.lineTo(X(iNow + k), y1(at(iNow + k) - wid)); }
      g.closePath(); g.fillStyle = "rgba(243,217,122,0.09)"; g.fill();
      g.strokeStyle = "rgba(243,217,122,0.6)"; g.setLineDash([2, 4]); g.lineWidth = 1; g.beginPath();
      for (let k = 0; k <= fh; k++) g[k ? "lineTo" : "moveTo"](X(iNow + k), y1(at(iNow + k)));
      g.stroke(); g.setLineDash([]);

      // lane 2: the campus. full power, except the windows the model scheduled
      const load = (i: number) => (at(i) > THRESH ? 0.62 : 1);
      let labelDone = false;
      for (let i = first; i <= last; i++) if (at(i) > THRESH) {
        const future = i > iNow; g.fillStyle = future ? "rgba(243,217,122,0.10)" : "rgba(243,217,122,0.18)";
        g.fillRect(X(i), L2.top, pxPerH + 0.5, L2.bottom - L2.top);
        if (!labelDone && !future && at(i - 1) <= THRESH && X(i) > 60) { labelDone = true; g.fillStyle = "rgba(243,217,122,0.9)"; g.textAlign = "left"; g.fillText("stepped aside", X(i) + 4, L2.top + 10); }
      }
      g.save(); g.lineWidth = phone ? 1.5 : 2; g.strokeStyle = "rgba(247,242,230,0.85)"; g.shadowBlur = 8; g.shadowColor = "rgba(247,242,230,0.35)"; g.beginPath();
      for (let i = first; i <= iNow; i++) g[i === first ? "moveTo" : "lineTo"](X(i), y2(load(i)));
      g.stroke(); g.restore();
      g.strokeStyle = "rgba(247,242,230,0.35)"; g.setLineDash([2, 4]); g.beginPath();
      for (let k = 0; k <= fh; k++) g[k ? "lineTo" : "moveTo"](X(iNow + k), y2(load(iNow + k)));
      g.stroke(); g.setLineDash([]);
      g.fillStyle = "rgba(122,112,90,0.9)"; g.textAlign = "right"; g.fillText("100%", w - 6, y2(1)); g.fillText("62%", w - 6, y2(0.62));

      // now
      g.strokeStyle = "rgba(255,250,240,0.9)"; g.lineWidth = 1; g.beginPath(); g.moveTo(nowX + 0.5, L1.top - 8); g.lineTo(nowX + 0.5, L2.bottom); g.stroke();
      const cur = at(iNow);
      const glow = g.createRadialGradient(nowX, y1(cur), 0, nowX, y1(cur), 26); glow.addColorStop(0, "rgba(255,243,196,0.95)"); glow.addColorStop(0.35, "rgba(243,217,122,0.35)"); glow.addColorStop(1, "rgba(243,217,122,0)");
      g.fillStyle = glow; g.beginPath(); g.arc(nowX, y1(cur), 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(nowX, y1(cur), 3.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(nowX, y2(load(iNow)), 2.2, 0, Math.PI * 2); g.fill();
      const dd = dateOf(iNow);
      g.fillStyle = "rgba(247,242,230,0.9)"; g.textAlign = phone ? "right" : "center"; g.fillText(`now · ${MONTHS[dd.m]} ${dd.d}, ${String(dd.hh).padStart(2, "0")}:00`, phone ? nowX - 6 : nowX, L1.top - 18);
      g.fillStyle = "rgba(122,112,90,0.9)"; g.textAlign = "right"; if (phone) g.fillText("forecast, 24 h", w - 6, h - 12); else g.fillText("forecast, next 48 h", w - 6, L1.top - 18);

      let hours = 0, events = 0, prev = false;
      for (let k = 0; k < Math.floor(run); k++) { const on = at(START + k) > THRESH; if (on) hours++; if (on && !prev) events++; prev = on; }
      // the coming week's windows, as a briefing
      const week: Window[] = [];
      for (let k = 1; k <= 24 * 7; k++) { const i = iNow + k; if (at(i) > THRESH && at(i - 1) <= THRESH) { let e = i; while (at(e + 1) > THRESH && e - i < 12) e++; const a = dateOf(((i % 8760) + 8760) % 8760); week.push({ day: `${MONTHS[a.m]} ${a.d}`, from: a.hh, to: (a.hh + (e - i) + 1) % 24 }); } }
      onTally?.(hours, events, week, `${MONTHS[dd.m]} ${dd.d}`);
    };
    raf = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [onTally]);
  return <canvas ref={canvas} className="sim-canvas" aria-label="The model running through a year: grid tightness and where it says stop, a day-ahead forecast, and the campus load stepping aside only in the scheduled windows" />;
}
