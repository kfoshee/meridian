"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Campus from "./Campus";
import Commit from "./Commit";

// One product, then its parts: Commitment (the number to file) and Design (the campus, run against the grid).
export default function Four() {
  const ref = useRef<HTMLElement>(null);
  const draftRef = useRef<HTMLElement>(null);
  const [dp, setDp] = useState(0);
  const [on, setOn] = useState<boolean[]>(() => Array(5).fill(false));
  useEffect(() => {
    const els = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-io]") ?? []);
    // once the campus is complete, the long track folds to one screen and the section scrolls like any other
    const collapse = (el: HTMLElement) => {
      const h = el.getBoundingClientRect().height,
        y = scrollY;
      el.classList.add("built");
      el.style.height = "100svh";
      scrollTo({ top: y - (h - innerHeight), behavior: "instant" });
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => {
        setOn(Array(5).fill(true));
        setDp(1);
        if (draftRef.current) {
          draftRef.current.classList.add("built");
          draftRef.current.style.height = "100svh";
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const i = els.indexOf(e.target as HTMLElement);
          if (i < 0) return;
          setOn((o) => {
            if (o[i] === e.isIntersecting) return o;
            const n = [...o];
            n[i] = e.isIntersecting;
            return n;
          });
        }),
      { threshold: 0.4 },
    );
    els.forEach((el) => io.observe(el));
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = draftRef.current;
      if (!el || el.classList.contains("built")) return;
      const r = el.getBoundingClientRect();
      const v = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      setDp((d) =>
        Math.max(d, v),
      ); /* builds once per page load; scrolling back never un-builds it */
      if (v >= 1 && !el.classList.contains("built")) collapse(el);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="steps">
      {/* 2 · Commitment */}
      <article className={`commit${on[0] ? " on" : ""}`} data-io>
        <Image className="commit-bg" src="/media/four-commitment.png" alt="" fill sizes="100vw" />
        <div className="commit-in">
          <h2>The number to file.</h2>
          <Commit on={on[0]} />
        </div>
      </article>

      {/* 3 · Design: the campus, built one decision at a time as you scroll */}
      <article ref={draftRef} className="draft" data-io>
        <div className="draft-scene">
          <div className="draft-copy">
            <h2>We find what can turn off.</h2>
          </div>
          <Campus p={dp} />
        </div>
      </article>
    </section>
  );
}
