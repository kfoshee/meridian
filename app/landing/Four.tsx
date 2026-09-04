"use client";
import { useEffect, useRef, useState } from "react";
import Campus from "./Campus";

// The campus, complete, and the scan that shows what every part does in an event.
export default function Four() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.35 });
    if (ref.current) io.observe(ref.current); return () => io.disconnect();
  }, []);
  return (
    <section className="steps">
      <article ref={ref} className="draft">
        <div className="draft-scene">
          <div className="draft-copy"><h2>We make the whole site flex.</h2></div>
          <Campus on={on} />
        </div>
      </article>
    </section>
  );
}
