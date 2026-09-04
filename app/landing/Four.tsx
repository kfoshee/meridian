"use client";
import { useEffect, useRef, useState } from "react";
import Campus, { STEPS } from "./Campus";

// The campus, built one decision at a time as you scroll, then run against the grid.
export default function Four() {
  const draftRef = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    const el = draftRef.current; if (!el) return;
    // once the campus is complete, the long track folds to one screen and the section scrolls like any other
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setChapter(STEPS); return; }
    // phones: no pinned track; the campus builds itself when the section comes into view
    if (matchMedia("(max-width: 900px)").matches) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setChapter(STEPS); io.disconnect(); } }, { threshold: 0.25 });
      io.observe(el); return () => io.disconnect();
    }
    let raf = 0, last = 0;
    // the chapter index from raw progress; React renders only when the index changes (at most eight times per pass)
    const update = () => { raf = 0; const r = el.getBoundingClientRect(); const v = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const c = Math.min(STEPS, Math.floor(v * (STEPS + 0.999)));
      if (c > last) { last = c; setChapter(c); }   /* builds once per page load; scrolling back never un-builds it */
      };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="steps">
      {/* 3 · Design: the campus, built one decision at a time as you scroll */}
      <article ref={draftRef} className="draft" data-io>
        <div className="draft-scene">
          <div className="draft-copy">
            <h2>Optimized for income and reliability.</h2>
          </div>
          <Campus p={chapter} />
        </div>
      </article>

    </section>
  );
}
