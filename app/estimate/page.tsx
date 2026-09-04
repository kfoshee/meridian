"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FLEX_SHARE, PROGRAMS, applied, range, type Program, type Stream } from "@/app/landing/programs";

// The arithmetic behind the number on the landing page, one stream at a time, with each rate's period and
// source. Streams are not summed: whether they stack depends on the site's enrollment, not on this page.
const PROGRAM_IDS = Object.keys(PROGRAMS) as Program[];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="label mb-2">{label}</div>
      <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--ink)", maxWidth: "72ch", lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

export default function EstimatePage() { return <Suspense fallback={null}><Estimate /></Suspense>; }
function Estimate() {
  const sp = useSearchParams();
  const one = (k: string) => sp.get(k) ?? undefined;
  const programId = (PROGRAM_IDS.includes(one("program") as Program) ? one("program") : "ERCOT") as Program;
  const mwRaw = Math.round(Number(one("mw")));
  const mw = Number.isFinite(mwRaw) && mwRaw > 0 && mwRaw <= 5000 ? mwRaw : 100;
  const place = (one("place") ?? "").slice(0, 60);
  const pr = PROGRAMS[programId];
  const flex = Math.round(mw * FLEX_SHARE);

  return (
    <main className="min-h-screen px-5 md:px-8 py-6 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 30, fontWeight: 300 }}>How the estimate is calculated</h1>
        <nav className="flex gap-5 text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
          <Link href="/model/" className="hover:text-[var(--ink)]">Model</Link>
          <Link href="/methodology/" className="hover:text-[var(--ink)]">Method</Link>
        </nav>
      </header>

      <p className="mt-6 text-sm" style={{ color: "var(--muted)", maxWidth: "72ch", lineHeight: 1.6 }}>
        The figures on the front page are published rates applied to an illustrative flexible share. They are not a quote,
        an offer or a forecast of what any site will be paid. What a site actually earns is measured event by event and
        settled by the utility or the market.
      </p>

      <Section label={`Worked example${place ? ` — ${place}` : ""}`}>
        <div className="grid gap-1" style={{ gridTemplateColumns: "minmax(140px, 240px) 1fr", columnGap: 24 }}>
          <span style={{ color: "var(--muted)" }}>Site size</span><span>{mw} MW (what you typed or picked)</span>
          <span style={{ color: "var(--muted)" }}>Flexible share</span><span>{Math.round(FLEX_SHARE * 100)}%, illustrative, gives {flex} MW. A real site&rsquo;s share comes from its own assessment.</span>
          <span style={{ color: "var(--muted)" }}>Program</span><span>{pr.note}</span>
          {pr.priced && pr.a ? ([pr.a, pr.b].filter((x): x is Stream => !!x).map(st => { const ap = applied(st, flex); return (<span key={st.name} style={{ display: "contents" }}>
            <span style={{ color: "var(--muted)" }}>{st.name}</span><span>{range(st.rate[0], st.rate[1])} {st.unit}{st.scale !== "rate" && <> gives <span style={{ color: "var(--gold-hi)" }}>{ap.text} {ap.after}</span></>} <a href={st.cite.url} style={{ color: "var(--faint)" }}>source</a></span>
          </span>); })) : (<><span style={{ color: "var(--muted)" }}>Rates</span><span>not priced: no program source on file</span></>)}
        </div>
        <p style={{ color: "var(--muted)" }}>Streams are shown separately and never added: two streams are two obligations against the same megawatts, in different units over different periods. Hourly and monthly rates are not multiplied into a year.</p>
      </Section>

      <Section label="Rates as published, by stream, from the revenue-stream registry">
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pr-6 py-1">Program</th><th className="text-left pr-6 py-1">Capacity or transmission</th><th className="text-left pr-6 py-1">Reserves or events</th><th className="text-left py-1">Status</th></tr></thead>
            <tbody>
              {PROGRAM_IDS.map(id => { const p = PROGRAMS[id]; return (
                <tr key={id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="pr-6 py-1.5">{id}</td>
                  <td className="pr-6 py-1.5">{p.a ? `${range(p.a.rate[0], p.a.rate[1])} ${p.a.unit}` : "not priced"}</td>
                  <td className="pr-6 py-1.5">{p.b ? `${range(p.b.rate[0], p.b.rate[1])} ${p.b.unit}` : "not estimated"}</td>
                  <td className="py-1.5" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{(p.a?.status ?? "unsourced").replace(/_/g, " ").replace(" tc", " terms")}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        <p style={{ color: "var(--muted)" }}>In ERCOT the first column is the retail 4CP transmission charge at transmission voltage from each utility&rsquo;s PUCT rate report effective August 2026, avoided by being off during the four coincident peaks; the second is what ERS and the reserve services (ECRS, RRS, NSRS) cleared per MW-hour of committed availability, 2025 and the 2026 estimate, never multiplied into a year. For LADWP the capacity incentive is $10 to $15 per kW a month for the June 15 to October 15 season under the 2025 terms, paid per month of enrollment; the 2026 terms are not yet published. California outside Los Angeles has no program source on file and is not priced.</p>
      </Section>

      <Section label="What this number is not">
        <p>It is not a quote, and nobody will be offered it. It is not a forecast of grid conditions; the <Link href="/model/" style={{ color: "var(--gold)" }}>model</Link> is a separate thing and covers ERCOT only. It does not subtract the cost of the flexibility itself.</p>
        <p>The 4CP figure depends on being off during four specific hours a year that are only known afterwards. Missing one of them changes the year.</p>
      </Section>

      <Section label="What would make it a real number">
        <p>A site&rsquo;s own equipment and commitments, so the flexible share is its own and not an illustration. Its enrollment terms, so the rates are the ones it is actually paid. And then measured events: a baseline, a delivered reduction, a settlement.</p>
        <p><Link href="/methodology/" style={{ color: "var(--gold)" }}>How the model works</Link><span className="mx-3" style={{ color: "var(--faint)" }}>·</span><Link href="/" style={{ color: "var(--gold)" }}>Back to the estimate</Link></p>
      </Section>
    </main>
  );
}
