"use client";
/**
 * Live scarcity-warning card for one node, backed by `/api/cron/decide`'s persisted `today.json`.
 * Not mounted anywhere yet (Kian mounts it). Reads `NEXT_PUBLIC_TODAY_URL` (the public Vercel
 * Blob URL for today.json -- set this once the blob store exists) or falls back to the route's
 * own public read (`?public=1`, which only serves the last persisted snapshot and never
 * recomputes). Renders nothing if the snapshot is missing or older than 6 hours.
 */
import { useEffect, useState } from "react";
import { mw } from "@/lib/format";

type Driver = { name: string; value: number };
type Hour = { ts: string; lead_h: number; p_matters: number; reduce_mw: number; drivers: Driver[] };
type Today = { generated_at: string; nodes: Record<string, { hours: Hour[] }>; degraded: string[] };

const STALE_MS = 6 * 60 * 60 * 1000;
// Trailing slash matters: next.config.ts sets `trailingSlash: true` site-wide, so the bare path
// 308-redirects (vercel.json's cron entry uses the slash form for the same reason).
const SOURCE = process.env.NEXT_PUBLIC_TODAY_URL || "/api/cron/decide/?public=1";

function hourLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", hour12: false }).format(new Date(iso)) + ":00";
}

function pickNode(data: Today, preferred?: string): string | null {
  if (preferred && data.nodes[preferred]) return preferred;
  const ids = Object.keys(data.nodes);
  if (!ids.length) return null;
  return ids.reduce((best, id) => {
    const peak = (n: string) => Math.max(0, ...data.nodes[n].hours.map((h) => h.reduce_mw));
    return peak(id) > peak(best) ? id : best;
  }, ids[0]);
}

export default function TodayCard({ node }: { node?: string }) {
  const [data, setData] = useState<Today | null>(null);

  useEffect(() => {
    let live = true;
    fetch(SOURCE, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      // Freshness is checked here, at fetch time, rather than in the render body: `Date.now()`
      // is an impure call and must not run during render (react-hooks/purity).
      .then((d: Today | null) => {
        if (!live) return;
        setData(d && Date.now() - new Date(d.generated_at).getTime() <= STALE_MS ? d : null);
      })
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, []);

  if (!data) return null;

  const id = pickNode(data, node);
  if (!id) return null;
  const hours = data.nodes[id].hours.slice(0, 24);
  if (!hours.length) return null;

  const peak = hours.reduce((a, b) => (b.reduce_mw > a.reduce_mw || (b.reduce_mw === a.reduce_mw && b.p_matters > a.p_matters) ? b : a));

  return (
    <div className="rise">
      <div className="label">{id.replace(/_/g, " ")}</div>

      <div className="flex gap-[2px] mt-2" style={{ height: 28 }}>
        {hours.map((h, i) => (
          <div
            key={i}
            title={`${hourLabel(h.ts)} · p=${h.p_matters.toFixed(2)}`}
            style={{
              flex: 1,
              height: "100%",
              borderRadius: 2,
              background: h.reduce_mw > 0 ? "var(--ember)" : "var(--gold)",
              opacity: Math.max(0.12, Math.min(1, h.p_matters)),
            }}
          />
        ))}
      </div>

      <div className="mt-4">
        {peak.reduce_mw > 0 ? (
          <>
            <div className="display goldtext" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              reduce {mw(peak.reduce_mw)} MW at {hourLabel(peak.ts)}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {peak.drivers.map((d) => (
                <span key={d.name} className="chip" aria-pressed="true">
                  {d.name.replace(/_/g, " ")} {d.value >= 100 ? Math.round(d.value) : d.value.toFixed(2)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="display" style={{ fontSize: 20, color: "var(--muted)" }}>
            No reduction expected in the next 24 h.
          </div>
        )}
      </div>
    </div>
  );
}
