"use client";
import { forwardRef, useImperativeHandle, useRef } from "react";

// 8,760 hour-tiles: 120 × 73 (73 × 120 portrait). Time runs left to right, top to bottom.
// Driven imperatively: the scene's scroll handler calls draw(yp, shrink) inside its own rAF. No React state per frame.
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const easeC = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // ease-in-out cubic: a steadier front
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const HOUR = [0.0015,0.0014,0.0013,0.0013,0.0013,0.002,0.0054,0.0027,0.0023,0.0024,0.0022,0.0022,0.0037,0.0057,0.011,0.0164,0.0165,0.0101,0.0084,0.009,0.0057,0.0019,0.0016,0.0013];
const MONTH = [0.0013,0.0174,0.0023,0.004,0.0046,0.0028,0.0048,0.0123,0.004,0.0025,0.002,0.0012];
function stopHours(n: number) {
  let s = 987654321;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pick = (w: number[]) => { const t = w.reduce((a, b) => a + b, 0); let r = rnd() * t; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1; };
  const out = new Set<number>();
  while (out.size < n) { const m = pick(MONTH), h = pick(HOUR); const day = Math.min(364, Math.floor((m + rnd()) * 30.42)); out.add(day * 24 + h); }
  return [...out];
}
const STOPS = stopHours(81);
const STOPSET = new Set(STOPS);

export type YearHandle = { draw: (yp: number, shrink: number, card: { x: number; y: number; w: number; h: number }) => void };

const Year = forwardRef<YearHandle, { photo: HTMLImageElement | null }>(function Year({ photo }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    draw(yp, shrink, card) {
      const c = canvas.current; if (!c) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
      const g = c.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);

      const enter = ease(clamp(yp / 0.10));
      const split = ease(clamp((yp - 0.08) / 0.16));
      const settle = ease(clamp((yp - 0.22) / 0.14));
      const ripple = easeC(clamp((yp - 0.30) / 0.42));
      const dissolve = easeC(clamp((yp - 0.58) / 0.32));
      const close = dissolve;
      if (enter <= 0 || shrink >= 1) return;                      // before the year begins, or after the gallery has taken over

      // once the picture has resolved, it is just the photograph, shrinking into its frame when asked
      if (close >= 1 && photo) {
        const s = ease(shrink);
        const rx = lerp(0, card.x, s), ry = lerp(0, card.y, s), rw = lerp(w, card.w, s), rh = lerp(h, card.h, s);
        const k = Math.max(rw / photo.naturalWidth, rh / photo.naturalHeight);
        const sw = photo.naturalWidth * k, sh = photo.naturalHeight * k;
        g.save(); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
        g.drawImage(photo, rx + (rw - sw) / 2, ry + (rh - sh) / 2, sw, sh);
        g.restore();
        if (s > 0) { g.strokeStyle = `rgba(58,48,24,${s.toFixed(3)})`; g.lineWidth = 1; g.strokeRect(rx - 6.5, ry - 6.5, rw + 13, rh + 13); }
        return;
      }

      const portrait = h > w, COLS = portrait ? 73 : 120, ROWS = portrait ? 120 : 73;
      const heroCell = w <= 640 ? 56 : 80;
      const SUB = portrait ? 5 : 7;
      const pitchSplit = heroCell / SUB;
      const pitch = lerp(pitchSplit, w / COLS, settle);
      const gap = Math.max(0.6, pitch * 0.12) * (1 - close), tile = pitch - gap;
      const fieldH = ROWS * pitch, oy = lerp(0, Math.max(0, (h - fieldH) / 2), settle);
      const x0 = w / 2 - (COLS / 2) * pitch;
      const cx = (col: number) => x0 + col * pitch, cy = (row: number) => oy + row * pitch;
      const cMin = Math.max(0, Math.floor(-x0 / pitch) - 1), cMax = Math.min(COLS, Math.ceil((w - x0) / pitch) + 1);
      const rMax = Math.min(ROWS, Math.ceil((h - oy) / pitch) + 1);

      g.globalAlpha = enter;
      const heroA = 0.05, subA = lerp(0, 0.05, split);
      g.lineWidth = 1;
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = `rgba(247,242,230,${(pass ? subA : heroA).toFixed(3)})`; g.beginPath();
        for (let col = cMin; col <= cMax; col++) { if ((col % SUB === 0) === !!pass) continue; const x = Math.round(cx(col)) + 0.5; g.moveTo(x, 0); g.lineTo(x, h); }
        for (let row = 0; row <= rMax; row++) { if ((row % SUB === 0) === !!pass) continue; const y = Math.round(cy(row)) + 0.5; g.moveTo(0, y); g.lineTo(w, y); }
        g.stroke();
      }
      const nodeA = lerp(0.22, 0, clamp(split * 1.5));
      if (nodeA > 0) { g.fillStyle = `rgba(247,242,230,${nodeA.toFixed(3)})`; for (let col = cMin; col <= cMax; col += SUB) for (let row = 0; row <= rMax; row += SUB) { g.beginPath(); g.arc(Math.round(cx(col)) + 0.5, Math.round(cy(row)) + 0.5, 1.1, 0, Math.PI * 2); g.fill(); } }

      const ox = w / 2, oyR = h * 0.5;
      const R = ripple * Math.hypot(w, h) * 0.72;
      let ps = 0, sw = 0, sh = 0, sx0 = 0, sy0 = 0;
      if (photo) { ps = Math.max(w / photo.naturalWidth, h / photo.naturalHeight); sw = photo.naturalWidth * ps; sh = photo.naturalHeight * ps; sx0 = (w - sw) / 2; sy0 = (h - sh) / 2; }
      if (ripple > 0 || dissolve > 0) for (let row = 0; row < rMax; row++) {
        const y = cy(row);
        for (let col = cMin; col < cMax; col++) {
          const x = cx(col);
          const d = Math.hypot(x + pitch / 2 - ox, (y + pitch / 2 - oyR) * 1.15);
          const since = (R - d) / pitch;
          if (since < 0) continue;
          const k = row * COLS + col;
          if (!STOPSET.has(k)) {
            const a = 0.075 + 0.06 * Math.exp(-since / 40) + 0.10 * Math.exp(-since / 6);
            g.fillStyle = `rgba(243,217,122,${a.toFixed(3)})`; g.fillRect(x + gap / 2, y + gap / 2, tile, tile);
          } else {
            const dead = clamp((since - 2) / 6);
            g.fillStyle = "#000"; g.fillRect(x + gap / 2, y + gap / 2, tile, tile);
            if (dead > 0) { g.strokeStyle = `rgba(243,217,122,${(0.5 * dead).toFixed(3)})`; g.strokeRect(x + gap / 2 + 0.5, y + gap / 2 + 0.5, tile - 1, tile - 1); }
          }
        }
      }
      // the photograph arrives as one cross-fade (a single draw, so scrolling stays smooth)
      if (dissolve > 0 && photo) { g.globalAlpha = enter * dissolve; g.drawImage(photo, sx0, sy0, sw, sh); }
      g.globalAlpha = 1;
    },
  }), [photo]);

  return <canvas ref={canvas} className="year-canvas" aria-label="A year of hours as a lit grid; the few hours the grid can’t spare go dark, the rest stay lit; then the grid becomes a photograph of a data center" />;
});
export default Year;
