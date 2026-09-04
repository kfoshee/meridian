"use client";
import { useEffect, useRef, useState } from "react";
import { loadIndex } from "@/lib/data";
import type { Index, IndexNode } from "@/lib/types";
import { PROGRAMS, type Program } from "./programs";

// Where is the site? Six places to click, a city to type, the browser's exact location — or, before
// any of that, a coarse guess from the visitor's network address (no prompt, no permission) that
// the page names as a guess and lets them change. The answer is a market program (what pays for
// flexibility there) and, in ERCOT, a node in the model.
export { PROGRAMS, type Program };
export type Place = { nodeId: string | null; nodeName: string; label: string; program: Program; typed?: boolean; guessed?: boolean; at?: [number, number] };

const HUBS: { id: string | null; label: string; program: Program }[] = [
  { id: "HB_HOUSTON", label: "Houston", program: "CenterPoint" },
  { id: "HB_NORTH", label: "Dallas", program: "Oncor" },
  { id: "HB_SOUTH", label: "San Antonio", program: "ERCOT" },
  { id: "HB_WEST", label: "West Texas", program: "Oncor" },
  { id: null, label: "Los Angeles", program: "LADWP" },
  { id: null, label: "California", program: "CAISO" },
];
type City = [string, number, number, Program | null];
const CITIES: City[] = [
  ["Houston", 29.76, -95.37, "CenterPoint"], ["Dallas", 32.78, -96.8, "Oncor"], ["Fort Worth", 32.75, -97.33, "Oncor"], ["Plano", 33.02, -96.7, "Oncor"], ["Arlington", 32.74, -97.11, "Oncor"], ["Irving", 32.81, -96.95, "Oncor"],
  ["Austin", 30.27, -97.74, "ERCOT"], ["Round Rock", 30.51, -97.68, "Oncor"], ["San Marcos", 29.88, -97.94, "ERCOT"], ["San Antonio", 29.42, -98.49, "ERCOT"], ["Temple", 31.1, -97.34, "Oncor"], ["Killeen", 31.12, -97.73, "Oncor"], ["Waco", 31.55, -97.15, "Oncor"],
  ["Midland", 31.99, -102.08, "Oncor"], ["Odessa", 31.85, -102.37, "Oncor"], ["Abilene", 32.45, -99.73, "AEP Texas"], ["Lubbock", 33.58, -101.86, "Oncor"], ["Sweetwater", 32.47, -100.4, "AEP Texas"], ["San Angelo", 31.46, -100.44, "AEP Texas"],
  ["Corpus Christi", 27.8, -97.4, "AEP Texas"], ["Laredo", 27.51, -99.51, "AEP Texas"], ["McAllen", 26.2, -98.23, "AEP Texas"], ["Brownsville", 25.9, -97.5, "AEP Texas"], ["Victoria", 28.81, -97.0, "AEP Texas"],
  ["Tyler", 32.35, -95.3, "Oncor"], ["Longview", 32.5, -94.74, "AEP Texas"], ["College Station", 30.63, -96.33, "ERCOT"], ["Galveston", 29.3, -94.8, "TNMP"], ["Lewisville", 33.05, -96.99, "TNMP"],
  ["Los Angeles", 34.05, -118.24, "LADWP"], ["Long Beach", 33.77, -118.19, "CAISO"], ["Irvine", 33.68, -117.83, "CAISO"], ["San Diego", 32.72, -117.16, "CAISO"], ["San Francisco", 37.77, -122.42, "CAISO"], ["San Jose", 37.34, -121.89, "CAISO"], ["Santa Clara", 37.35, -121.95, "CAISO"], ["Oakland", 37.8, -122.27, "CAISO"], ["Sacramento", 38.58, -121.49, "CAISO"], ["Fresno", 36.74, -119.79, "CAISO"], ["Bakersfield", 35.37, -119.02, "CAISO"], ["Riverside", 33.95, -117.4, "CAISO"],
  ["El Paso", 31.76, -106.49, null], ["Amarillo", 35.22, -101.83, null], ["Beaumont", 30.08, -94.1, null], ["Port Arthur", 29.9, -93.93, null], ["Texarkana", 33.43, -94.05, null],
];
const KEY = "meridian.where";
const dist = (a: number, b: number, c: number, d: number) => { const r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r * Math.cos((a + c) / 2 * r); return Math.sqrt(x * x + y * y); };
const nearest = (nodes: IndexNode[], lat: number, lon: number) => nodes.reduce((best, n) => dist(lat, lon, n.lat, n.lon) < dist(lat, lon, best.lat, best.lon) ? n : best, nodes[0]);

export const readPlace = (): Place | null => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) as Place : null; } catch { return null; } };
const savePlace = (p: Place) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

export default function Where({ value, onChange }: { value: Place | null; onChange: (p: Place) => void }) {
  const [ix, setIx] = useState<Index | null>(null);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { loadIndex().then(setIx).catch(() => {}); }, []);

  const nodeName = (id: string) => ix?.nodes.find(n => n.id === id)?.name ?? id;
  const inTexas = (lat: number, lon: number) => lat > 25.8 && lat < 36.6 && lon > -106.7 && lon < -93.5;
  const pick = (p: Place) => { savePlace(p); setNote(""); setQ(""); onChange(p); };
  const pickHub = (h: typeof HUBS[number]) => pick({ nodeId: h.id, nodeName: h.id ? nodeName(h.id) : h.label, label: h.label, program: h.program });
  const fromPoint = (label: string, lat: number, lon: number, program: Program) => {
    const n = ix && inTexas(lat, lon) ? nearest(ix.nodes, lat, lon) : null;
    pick({ nodeId: n?.id ?? null, nodeName: n?.name ?? label, label, program, typed: true });
  };
  const pickCity = (c: City) => { if (!c[3]) { setNote(`${c[0]} is outside ERCOT and CAISO.`); return; } fromPoint(c[0], c[1], c[2], c[3]); };
  // The place a point resolves to, or null when it is outside both markets.
  const placeAt = (lat: number, lon: number, guessed = false): Place | null => {
    const inCal = lat > 32.5 && lat < 42.1 && lon > -124.5 && lon < -114.1, inLA = lat > 33.7 && lat < 34.35 && lon > -118.7 && lon < -117.7;
    if (!inTexas(lat, lon) && !inCal) return null;
    const c = CITIES.filter(x => x[3]).reduce((b, x) => dist(lat, lon, x[1], x[2]) < dist(lat, lon, b[1], b[2]) ? x : b, CITIES[0]);
    const program: Program = inLA ? "LADWP" : inCal ? "CAISO" : (c[3] as Program);
    const n = ix && inTexas(lat, lon) ? nearest(ix.nodes, lat, lon) : null;
    return { nodeId: n?.id ?? null, nodeName: n?.name ?? `near ${c[0]}`, label: `near ${c[0]}`, program, typed: true, guessed, at: [lat, lon] };
  };
  const pickGuess = (p: Place) => { savePlace(p); setQ(""); setNote(""); onChange(p); };
  const locate = () => {
    if (!navigator.geolocation) { setNote("No location available."); return; }
    setNote("Finding you…");
    navigator.geolocation.getCurrentPosition(pos => {
      const p = placeAt(pos.coords.latitude, pos.coords.longitude);
      if (!p) { setNote("You are outside ERCOT and CAISO. Pick a place."); return; }
      pick(p);
    }, () => setNote("Location was blocked. Type a city."), { timeout: 8000 });
  };
  // The default: a coarse guess from the network address, only when nothing was ever chosen.
  // A saved choice, a click or a typed city always wins, and a guess is labelled as one.
  useEffect(() => {
    const saved = readPlace();
    // a guess made before the node index arrived has no node yet; once it arrives, finish it locally
    if (saved && saved.guessed && ix && saved.nodeId == null && saved.at && inTexas(saved.at[0], saved.at[1])) { const n = nearest(ix.nodes, saved.at[0], saved.at[1]); const p = { ...saved, nodeId: n.id, nodeName: n.name }; savePlace(p); onChange(p); return; }
    if (saved) return;
    const ctrl = new AbortController();
    // the hosting edge's guess first (Vercel); on a static host, a public IP lookup (city-level, no key, no prompt)
    const edge = fetch("/api/where/", { signal: ctrl.signal }).then(r => r.ok ? r.json() : null).catch(() => null);
    const open = () => fetch("https://get.geojs.io/v1/ip/geo.json", { signal: ctrl.signal }).then(r => r.ok ? r.json() : null)
      .then(j => j && Number.isFinite(+j.latitude) && Number.isFinite(+j.longitude) ? { ok: true, lat: +j.latitude, lon: +j.longitude } : null).catch(() => null);
    const open2 = () => fetch("https://ipapi.co/json/", { signal: ctrl.signal }).then(r => r.ok ? r.json() : null)
      .then(j => j && Number.isFinite(+j.latitude) && Number.isFinite(+j.longitude) ? { ok: true, lat: +j.latitude, lon: +j.longitude } : null).catch(() => null);
    edge.then(g => (g && g.ok) ? g : open()).then(g => (g && g.ok) ? g : open2()).then(g => {
      if (ctrl.signal.aborted) return;
      const now = readPlace();
      if (now && !now.guessed) return;
      // a place is always chosen on load: the guess, or Houston when the guess is outside the markets or unavailable
      const p = (g && g.ok ? placeAt(g.lat, g.lon, true) : null) ?? { nodeId: "HB_HOUSTON", nodeName: nodeName("HB_HOUSTON"), label: "Houston", program: "CenterPoint" as Program, typed: true, guessed: true };
      pickGuess(p);
    }).catch(() => {});
    return () => ctrl.abort();
  }, [ix]); // eslint-disable-line react-hooks/exhaustive-deps

  const [openList, setOpenList] = useState(false);
  const [sel, setSel] = useState(0);
  const query = q.trim().toLowerCase();
  const rows = CITIES.filter(c => !query || c[0].toLowerCase().startsWith(query) || c[0].toLowerCase().includes(" " + query));
  const tx = rows.filter(c => c[2] > -107 && c[1] < 37 && c[2] > -106.7 || (c[3] && c[3] !== "LADWP" && c[3] !== "CAISO")), ca = rows.filter(c => c[3] === "LADWP" || c[3] === "CAISO"), out = rows.filter(c => !c[3]);
  const ordered: (City | string)[] = [...(tx.length ? ["Texas", ...tx] : []), ...(ca.length ? ["California", ...ca] : []), ...(out.length ? ["Outside the markets", ...out] : [])];
  const pickable = ordered.filter((r): r is City => typeof r !== "string" && !!r[3]);
  const choose = (c: City) => { pickCity(c); setOpenList(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpenList(true); setSel(v => Math.min(pickable.length - 1, v + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(v => Math.max(0, v - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (pickable[sel]) choose(pickable[sel]); }
    else if (e.key === "Escape") setOpenList(false);
  };
  return (
    <div className="where">
      <div className="where-row">
        {HUBS.map(h => <button key={h.label} type="button" className="chip" aria-pressed={!value?.typed && value?.label === h.label} onClick={() => pickHub(h)}>{h.label}</button>)}
        <button type="button" className="chip where-geo" onClick={locate}>Use my exact location</button>
      </div>
      <div className="where-type">
        <input ref={input} value={q} onChange={e => { setQ(e.target.value); setNote(""); setSel(0); setOpenList(true); }} onFocus={() => setOpenList(true)} onBlur={() => setTimeout(() => setOpenList(false), 150)} onKeyDown={onKey}
          placeholder="or type a city" aria-label="City" role="combobox" aria-expanded={openList} aria-autocomplete="list" />
        {openList && ordered.length > 0 && (
          <ul className="city-list" role="listbox">
            {ordered.map((r, i) => typeof r === "string" ? <li key={`h${i}`} className="hd" role="presentation">{r}</li> : (
              <li key={r[0]} role="option" aria-selected={pickable[sel] === r} className={`${pickable[sel] === r ? "sel" : ""}${r[3] ? "" : " out"}`} onMouseDown={e => { e.preventDefault(); if (r[3]) choose(r); }}>
                {r[0]}<span>{r[3] ? (r[3] === "ERCOT" ? "ERCOT" : r[3]) : "outside ERCOT and CAISO"}</span>
              </li>))}
          </ul>
        )}
        {note && <div className="where-note">{note}</div>}
      </div>
      {value?.typed && <div className="where-picked">{value.label}{value.guessed && <span> · guessed from your network</span>}</div>}
    </div>
  );
}
