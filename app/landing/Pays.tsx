"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Where, { readPlace, type Place } from "./Where";
import { FLEX_SHARE, PROGRAMS, applied } from "./programs";

// Flexibility pays. Where is the site, how big is it; Meridian says how much can step aside and what that earns.
const SIZES = [50, 100, 200, 500];
const SHARE = FLEX_SHARE;   // the share of a campus Meridian designs as flexible (40 of 96 MW in the campus above)
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

export default function Pays() {
  const sec = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [size, setSize] = useState<number | null>(100);
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0);   // the flexible MW, counted up

  useEffect(() => {
    setPlace(readPlace());
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.2 });
    if (sec.current) io.observe(sec.current); return () => io.disconnect();
  }, []);
  // the answer counts up each time the size changes
  useEffect(() => {
    if (size == null) { setShown(0); return; }
    const to = Math.round(size * SHARE), from = shown;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(to); return; }
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 900); setShown(Math.round(from + (to - from) * easeOut(k))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickTyped = () => { const v = Math.round(Number(typed)); if (v > 0 && v <= 5000) { setSize(v); } };
  const flex = size == null ? 0 : Math.round(size * SHARE);
  const pr = PROGRAMS[place?.program ?? "ERCOT"];

  return (
    <section ref={sec} className={`pays${on ? " on" : ""}${place ? " placed" : ""}${size != null ? " sized" : ""}`}>
      <h2 className="pays-h">Flexibility pays.</h2>

      <div className="pays-step">
        <h3>Where is the site?</h3>
        <Where value={place} onChange={setPlace} />
      </div>

      <div className="pays-step pays-mw">
        <h3>How big is the site?</h3>
        <div className="where-row">
          {SIZES.map(v => <button key={v} type="button" className="chip" aria-pressed={size === v} onClick={() => { setSize(v); setTyped(""); }}>{v} MW</button>)}
        </div>
        <div className="where-type">
          <input inputMode="numeric" value={typed} onChange={e => setTyped(e.target.value.replace(/[^\d]/g, ""))} placeholder="or type the megawatts" aria-label="Site size in megawatts"
            onKeyDown={e => { if (e.key === "Enter") pickTyped(); }} onBlur={pickTyped} />
        </div>
      </div>

      <div className="pays-step pays-answer">
        <div className="pays-flex"><b>{shown} MW</b> could step aside</div>
        {pr.priced && pr.a ? (() => { const A = applied(pr.a, flex); return (<>
          <div className="pays-total"><b>{A.text}</b><span>{A.after}</span></div>
        </>); })() : <div className="pays-total"><b>Not priced yet</b></div>}
        <div className="pays-links">
          <Link href={`/estimate/?program=${encodeURIComponent(place?.program ?? "ERCOT")}&mw=${size ?? ""}&place=${encodeURIComponent(place?.label ?? "")}`} className="pays-link dim">How this is calculated</Link>
          {pr.model && <Link href="/model/" className="pays-link">See the model for {(place?.label ?? "your site").replace(/^near /, "")}</Link>}
        </div>
      </div>
    </section>
  );
}
