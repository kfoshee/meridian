"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Year, { type YearHandle } from "./Year";
import Four from "./Four";
import Pays from "./Pays";
import ModelStrip from "./ModelStrip";
import Thesis from "./Thesis";
import Contact from "./Contact";
import "./hero.css";
import "./sections.css";

// One scene, one timeline. Scroll progress P over the whole section drives every layer imperatively:
// hero (CSS vars) → year canvas → photograph → gallery. No React state is written on the scroll path.
const COPY_Y = 56;
const CELLS = 14;
const HERO_END = 0.24;      // hero climbs, peaks, exits
const YEAR_START = 0.205;   // the year canvas fades in under the hero grid before the hero ends
const YEAR_END = 1.0;       // the photograph has resolved and holds to the end of the scene
const isPhone = () => innerWidth <= 640;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export default function Landing() {
  const scene = useRef<HTMLElement>(null);
  const pulse = useRef<HTMLDivElement>(null);
  const cells = useRef<HTMLDivElement>(null);
  const hoverCell = useRef<HTMLDivElement>(null);
  const yearCopy = useRef<HTMLDivElement>(null);
  const year = useRef<YearHandle>(null);
  const [entered, setEntered] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [yState, setYState] = useState(-1);
  const foot = useRef<HTMLElement>(null);
  const [footIn, setFootIn] = useState(false);
  const lastY = useRef(-1);

  useLayoutEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => { const img = new Image(); img.src = "/media/dc-golden.png"; img.onload = () => setPhoto(img); }, []);
  // the mark appears a second after the visitor reaches the bottom, once
  useEffect(() => {
    const el = foot.current; if (!el) return; let t = 0;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { t = window.setTimeout(() => setFootIn(true), 1000); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el); return () => { io.disconnect(); clearTimeout(t); };
  }, []);

  useEffect(() => {
    const el = scene.current!;
    const cellPx = () => (isPhone() ? 56 : 80);
    const vw = () => document.documentElement.clientWidth;
    const setOrigin = () => el.style.setProperty("--ox", `${(vw() / 2) % cellPx()}px`);
    setOrigin();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The scene chases the real scroll position over a few frames (τ = 30 ms), so a wheel tick becomes a
    // short glide instead of a jump. Scrolling itself is untouched; only what the scene shows is eased.
    let raf = 0, Ps = -1, lastT = 0;
    const update = (now: number = performance.now()) => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const Pr = reduce ? 1 : clamp(-r.top / (r.height - innerHeight));
      if (Ps < 0 || reduce) Ps = Pr;
      else { const dt = Math.min(64, now - lastT || 16); Ps += (Pr - Ps) * (1 - Math.exp(-dt / 30)); if (Math.abs(Pr - Ps) < 0.00005) Ps = Pr; }
      lastT = now;
      const P = Ps;
      // hero
      const p = clamp(P / HERO_END);
      const start = COPY_Y - 10;
      const sy = Math.max(7, start - p * 2 * (start - 7));
      const out = clamp((p - 0.62) / 0.24);
      const set = clamp((p - 0.80) / 0.20);
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--peak", (1 - Math.abs(p * 2 - 1)).toFixed(4));
      // the sun rides the meridian: continuous, no snapping
      const sunPx = (sy + set * set * (110 - sy)) / 100 * innerHeight;
      el.style.setProperty("--sy", (sunPx / innerHeight * 100).toFixed(3));
      el.style.setProperty("--sypx", `${sunPx.toFixed(2)}px`);
      el.style.setProperty("--out", out.toFixed(4));
      el.style.setProperty("--set", set.toFixed(4));
      el.classList.toggle("scrolled", P > 0.01);
      // year + photograph + the shrink into frame 0
      const yp = clamp((P - YEAR_START) / (YEAR_END - YEAR_START));
      year.current?.draw(yp, 0, { x: 0, y: 0, w: innerWidth, h: innerHeight });
      const yc = yearCopy.current; if (yc) yc.style.opacity = "1";
      const ys = yp < 0.28 ? -1 : yp < 0.58 ? 0 : yp < 0.80 ? 1 : 2;
      if (ys !== lastY.current) { lastY.current = ys; setYState(ys); }
      if (Ps !== Pr && r.bottom > 0 && r.top < innerHeight && !raf) raf = requestAnimationFrame(update);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => { setOrigin(); Ps = -1; onScroll(); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    if (reduce) return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onResize); };

    const onMove = (e: MouseEvent) => {
      const cell = cellPx(), ox = (vw() / 2) % cell;
      el.style.setProperty("--mx", `${e.clientX}px`); el.style.setProperty("--my", `${e.clientY}px`); el.style.setProperty("--hover", "1");
      const hc = hoverCell.current; if (hc) hc.style.transform = `translate(${ox + Math.floor((e.clientX - ox) / cell) * cell}px, ${Math.floor(e.clientY / cell) * cell}px)`;
    };
    const onLeave = () => el.style.setProperty("--hover", "0");
    addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    const heroLive = () => parseFloat(el.style.getPropertyValue("--out") || "0") === 0;
    let pulseTimer = 0; let anim: Animation | undefined;
    const runPulse = () => {
      const d = pulse.current; if (!d) return;
      if (!heroLive()) { pulseTimer = window.setTimeout(runPulse, 1500); return; }
      const cell = cellPx(), ox = (vw() / 2) % cell;
      const vertical = Math.random() < 0.5, dir = Math.random() < 0.5 ? 1 : -1;
      d.classList.toggle("v", vertical);
      let from: string, to: string;
      if (vertical) { const x = ox + Math.floor(Math.random() * Math.floor((vw() - ox) / cell)) * cell; from = `translate(${x}px, ${dir > 0 ? -110 : innerHeight}px)`; to = `translate(${x}px, ${dir > 0 ? innerHeight : -110}px)`; }
      else { const y = Math.floor(Math.random() * Math.floor(innerHeight / cell)) * cell; from = `translate(${dir > 0 ? -110 : vw()}px, ${y}px)`; to = `translate(${dir > 0 ? vw() : -110}px, ${y}px)`; }
      anim = d.animate([{ transform: from, opacity: 0 }, { opacity: 0.8, offset: 0.1 }, { opacity: 0.8, offset: 0.9 }, { transform: to, opacity: 0 }], { duration: 2000, easing: "cubic-bezier(0.4, 0, 0.6, 1)" });
      anim.onfinish = () => { pulseTimer = window.setTimeout(runPulse, 3000 + Math.random() * 2500); };
    };
    pulseTimer = window.setTimeout(runPulse, 1600);

    let i = 0; let cellTimer = 0;
    const tick = () => {
      const pool = cells.current; if (!pool) return;
      if (!heroLive()) { cellTimer = window.setTimeout(tick, 800); return; }
      const cell = cellPx(), ox = (vw() / 2) % cell;
      const cols = Math.floor((vw() - ox) / cell), rows = Math.floor(innerHeight / cell);
      const sunY = parseFloat(el.style.getPropertyValue("--sy") || "50") / 100 * innerHeight;
      const nearSun = Math.random() < 0.45;
      const col = nearSun ? Math.round(cols / 2 + (Math.random() - 0.5) * 6) : Math.floor(Math.random() * cols);
      const row = nearSun ? Math.round(sunY / cell + (Math.random() - 0.5) * 5) : Math.floor(Math.random() * rows);
      if (col < 0 || col >= cols || row < 0 || row >= rows) { cellTimer = window.setTimeout(tick, 120); return; }
      const d = pool.children[i++ % CELLS] as HTMLDivElement;
      const flash = Math.random() < 0.35;
      d.classList.toggle("flash", flash);
      d.style.transform = `translate(${ox + col * cell}px, ${row * cell}px)`;
      d.animate(flash ? [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0.35, offset: 0.3 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }],
        { duration: flash ? 900 : 3000, easing: flash ? "cubic-bezier(0.2, 0, 0.4, 1)" : "ease-in-out" });
      cellTimer = window.setTimeout(tick, (isPhone() ? 260 : 140) + Math.random() * 320);
    };
    cellTimer = window.setTimeout(tick, 1300);

    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onResize); removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onLeave); cancelAnimationFrame(raf); clearTimeout(pulseTimer); clearTimeout(cellTimer); anim?.cancel(); };
  }, [photo]);

  const yLines = [
    <>AI is built out of power.</>,
    <><em>Meridian</em> is how data centers get it.</>,
    <></>,
  ];

  return (<>
    <section ref={scene} className={`hero${entered ? " in" : ""}`}>
      <div className="hero-scene">
        <Year ref={year} photo={photo} />
        <div className="hero-grid hero-fade" />
        <div className="hero-grid-lit hero-fade" />
        <div className="hero-grid-hover hero-fade" />
        <div ref={hoverCell} className="hero-hover-cell hero-fade" aria-hidden="true" />
        <div ref={cells} className="hero-fade" aria-hidden="true">{Array.from({ length: CELLS }, (_, k) => <div key={k} className="hero-cell" />)}</div>
        <div className="hero-warm hero-fade" />
        <div className="hero-meridian hero-fade" />
        <div className="hero-fade" aria-hidden="true"><div ref={pulse} className="hero-pulse" /></div>
        <div className="hero-sunwrap" aria-hidden="true">
          <div className="hero-sun-tail" /><div className="hero-sun-haze" /><div className="hero-sun-bloom" /><div className="hero-sun-halo" /><div className="hero-sun-core" />
        </div>
        <div className="hero-clear hero-fade" />
        <h1 className="hero-copy"><strong>Meridian</strong> manages power for AI data centers.</h1>
        <div ref={yearCopy} className={`year-copy${yState >= 0 ? " lit" : ""}`} aria-live="polite">
          {yLines.map((l, i) => <p key={i} className={`year-state${i === yState ? " on" : i < yState ? " past" : ""}`}><span>{l}</span></p>)}
        </div>
      </div>
    </section>
    <Four />
    <Pays />
    <Thesis />
    <ModelStrip />
    <Contact />
    <footer ref={foot} className={`foot${footIn ? " in" : ""}`} aria-label="Meridian">
      <div className="foot-lockup">
        <img className="foot-logo" src="/media/meridian-mark-6.webp" alt="" width={900} height={600} decoding="async" />
        <span className="foot-name">Meridian</span>
        <span className="foot-tagline">Power for AI data centers.</span>
      </div>
    </footer>
  </>);
}
