"use client";
import { useEffect, useRef, useState } from "react";

// The thesis, revealed a word at a time as it enters the viewport.
const KEY = new Set(["bottleneck", "Intelligence", "outcomes:", "power.", "megawatt", "Meridian"]);
const TEXT =
  "Energy is the bottleneck of everything that comes next. Intelligence is becoming cheap; machines that can do physical work on their own are close behind. Together they turn energy straight into outcomes: a cure found in months instead of decades, a city rebuilt before the next storm, food and medicine and shelter for everyone who needs them. What limits how fast that happens is power. Every megawatt we unlock brings that world forward, and Meridian exists to unlock them.";

export default function Thesis() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setOn(true));
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const words = TEXT.split(" ");
  return (
    <section ref={ref} className={`close${on ? " on" : ""}`}>
      <div className="close-in">
        <div className="close-block">
          <p aria-label={TEXT}>
            {words.map((w, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={KEY.has(w) ? "key" : undefined}
                style={{ transitionDelay: `${Math.min(i * 28, 2400)}ms` }}
              >
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
