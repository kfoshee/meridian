"use client";
import { useEffect, useRef, useState } from "react";
import Campus, { STEPS } from "./Campus";

// The campus, built one decision at a time as you scroll, then run against the grid.
export default function Four() {
  const ref = useRef<HTMLElement>(null);
  const draftRef = useRef<HTMLElement>(null);
  const [dp, setDp] = useState(0);
  const [on, setOn] = useState<boolean[]>(() => Array(5).fill(false));
  useEffect(() => {
    const els = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-io]") ?? []);
    // once the campus is complete, the long track folds to one screen and the section scrolls like any other
    const collapse = (el: HTMLElement) => { const h = el.getBoundingClientRect().height, y = scrollY; el.classList.add("built"); el.style.height = "100svh"; scrollTo({ top: y - (h - innerHeight), behavior: "instant" }); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(Array(5).fill(true)); setDp(1); if (draftRef.current) { draftRef.current.classList.add("built"); draftRef.current.style.height = "100svh"; } return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      const i = els.indexOf(e.target as HTMLElement); if (i < 0) return;
      setOn(o => { if (o[i] === e.isIntersecting) return o; const n = [...o]; n[i] = e.isIntersecting; return n; });
    }), { threshold: 0.4 });
    els.forEach(el => io.observe(el));
    let raf = 0, ds = -1, lastT = 0;   // eased progress (τ = 90 ms), so a wheel tick glides instead of jumping
    const update = (now: number = performance.now()) => { raf = 0; const el = draftRef.current; if (!el || el.classList.contains("built")) return; const r = el.getBoundingClientRect(); const v = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      if (ds < 0) ds = v; else { const dt = Math.min(64, now - lastT || 16); ds += (v - ds) * (1 - Math.exp(-dt / 90)); if (Math.abs(v - ds) < 0.0005) ds = v; }
      lastT = now;
      setDp(d => Math.max(d, ds)); /* builds once per page load; scrolling back never un-builds it */
      if (ds >= 1 && !el.classList.contains("built")) { collapse(el); return; }
      if (ds !== v && !raf) raf = requestAnimationFrame(update); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll);
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section ref={ref} className="steps">
      {/* 3 · Design: the campus, built one decision at a time as you scroll */}
      <article ref={draftRef} className="draft" data-io>
        <div className="draft-scene">
          <div className="draft-copy">
            <h2>We find what can step aside.</h2>
          </div>
          <Campus p={dp} />
        </div>
      </article>

    </section>
  );
}
