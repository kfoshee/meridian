"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ModelSim, { type Window } from "./ModelSim";
import Chip from "./Chip";

export default function ModelStrip() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  const [tally, setTally] = useState<{ hours: number; events: number; week: Window[]; today: string }>({ hours: 0, events: 0, week: [], today: "" });
  const last = useRef(0);
  const onTally = useCallback((hours: number, events: number, week: Window[], today: string) => {
    const now = performance.now(); if (now - last.current < 120) return; last.current = now;   // throttle re-renders
    setTally(t => (t.hours === hours && t.events === events && t.today === today) ? t : { hours, events, week, today });
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.2 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className={`strip${on ? " in" : ""}`}>
      <h2 className="strip-h">Meridian makes power dynamic.</h2>
      <div className="strip-sim"><ModelSim onTally={onTally} /></div>
      <Chip tally={tally} on={on} />
    </section>
  );
}
