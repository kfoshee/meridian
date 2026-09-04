"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Dial from "@/components/Dial";
import Bars from "@/components/Bars";
import Where, { readPlace, type Place } from "@/app/landing/Where";
import { loadIndex, loadNode } from "@/lib/data";
import type { Index, NodeData } from "@/lib/types";
import "@/app/landing/sections.css";

// The model, reduced to its one answer: where the site is, how many hours a year the grid says stop there.
const HOW = [
  "Real-time prices at every hub and zone, every 15 minutes, 2021 to now.",
  "An hour counts when the price says stop: $500 a megawatt-hour and above.",
  "Hours are joined into events: how long, how deep, and how much warning the day-ahead market gave.",
  "150 synthetic years, month-aware, set the largest flexible share that still finishes 99% of its work.",
];

export default function ModelPage() {
  const [ix, setIx] = useState<Index | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [nodes, setNodes] = useState<Record<string, NodeData>>({});
  const id = place?.nodeId ?? "HB_HOUSTON";
  const outside = !!place && !place.nodeId;

  useEffect(() => { setPlace(readPlace()); loadIndex().then(setIx).catch(() => {}); }, []);
  useEffect(() => { if (!nodes[id]) loadNode(id).then(n => setNodes(s => ({ ...s, [id]: n }))).catch(() => {}); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const def = ix?.headline.definition ?? "p500";
  const meta = ix?.nodes.find(n => n.id === id);
  const node = nodes[id];
  const d = node?.definitions[def];
  const years = d?.hours_per_year.by_year ?? [];

  return (
    <main className="min-h-screen px-6 md:px-10 py-10" style={{ fontFamily: "var(--font-ui), system-ui, sans-serif" }}>
      <header className="max-w-[880px] mx-auto flex items-baseline justify-between gap-4">
        <Link href="/landing/" className="display" style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", textDecoration: "none" }}>Meridian</Link>
        <nav className="flex gap-6 label">
          <span style={{ color: "var(--ink)" }}>Model</span>
          <Link href="/research/" className="hover:text-[var(--ink)]">Research</Link>
          <Link href="/methodology/" className="hover:text-[var(--ink)]">Methodology</Link>
          <Link href="/about/" className="hover:text-[var(--ink)]">About</Link>
        </nav>
      </header>

      <section className="max-w-[880px] mx-auto pays-page" style={{ paddingTop: "10vh", paddingBottom: "12vh" }}>
        <div className="pays-step on">
          <h3>Where is the site?</h3>
          <Where value={place} onChange={setPlace} />
          {outside && <div className="where-note" style={{ marginTop: 10 }}>The model covers ERCOT. {place?.label} is shown against Houston.</div>}
        </div>

        <div style={{ marginTop: "9vh" }}>
          <div className="label" style={{ marginBottom: 20 }}>Hours a year the grid says stop · {meta?.name ?? "…"}</div>
          <Dial value={meta?.hours_yr ?? 0} unit="hours a year" sub={`about ${meta ? Math.round(meta.events_yr) : "…"} events, the longest under ${meta ? Math.ceil(meta.p99_dur_h) : "…"} hours`} />
        </div>

        <div style={{ marginTop: "8vh" }}>
          {years.length > 0 && <Bars values={years.map(y => y.hours)} labels={years.map(y => String(y.year))} k={`${id}-${def}`} height={120} />}
          <div className="label" style={{ marginTop: 10 }}>by year</div>
        </div>

        <div className="how" style={{ marginTop: "10vh" }}>
          <h3>How it is built</h3>
          <ol>{HOW.map((h, i) => <li key={i}><i>{i + 1}</i><span>{h}</span></li>)}</ol>
          <Link href="/methodology/" className="pays-link">The full methodology</Link>
        </div>
      </section>
    </main>
  );
}
