import Link from "next/link";
import fs from "fs";
import path from "path";
import Dial from "@/components/Dial";
import Findings from "@/app/verdict/Findings";
import type { VerdictAny } from "@/lib/types";
import { isVerdictV2 } from "@/lib/types";

export const metadata = { title: "Research · Meridian" };

function loadVerdict(): VerdictAny {
  const p = path.join(process.cwd(), "public", "data", "verdict.json");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

const DEEP_LINKS: { title: string; href: string; summary: string }[] = [
  { title: "History", href: "/history/", summary: "Fifteen years, three regimes." },
  { title: "Network", href: "/network/", summary: "Does a second site diversify?" },
  { title: "Policy", href: "/policy/", summary: "Should the campus cut power right now?" },
  { title: "Post-4CP", href: "/post4cp/", summary: "After 4CP" },
];

export default function ResearchPage() {
  const v = loadVerdict();
  const range = isVerdictV2(v) ? v.worlds.A_today_4cp.the_number : { low: v.the_number.usd_low, high: v.the_number.usd_high };
  const lowK = Math.round(range.low / 1000);
  const highK = Math.round(range.high / 1000);
  const midK = Math.round((range.low + range.high) / 2 / 1000);

  return (
    <main className="min-h-screen px-6 md:px-10 py-10">
      <header className="max-w-[960px] mx-auto flex items-baseline justify-between gap-4">
        <Link href="/landing/" className="display" style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", textDecoration: "none" }}>
          Meridian
        </Link>
        <nav className="flex gap-6 label">
          <Link href="/model/" className="hover:text-[var(--ink)]">Model</Link>
          <span style={{ color: "var(--ink)" }}>Research</span>
          <Link href="/methodology/" className="hover:text-[var(--ink)]">Methodology</Link>
          <Link href="/about/" className="hover:text-[var(--ink)]">About</Link>
        </nav>
      </header>

      <div className="max-w-[960px] mx-auto">
        <section className="rise" style={{ marginTop: 72 }}>
          <h1 className="display" style={{ fontSize: 44, fontWeight: 300, lineHeight: 1.15, maxWidth: 760 }}>
            What fifteen years of ERCOT data say.
          </h1>
          <div style={{ marginTop: 40 }}>
            <Dial value={midK} unit="$k / flexible MW·yr" sub={`$${lowK}k–$${highK}k · ${v.the_number.name}`} />
          </div>
          <Link href="/verdict/" className="label" style={{ display: "inline-block", marginTop: 22, color: "var(--gold)" }}>
            how this was computed
          </Link>
        </section>

        <section style={{ marginTop: 80 }}>
          <div className="label">Nineteen findings, pre-registered</div>
          <Findings />
        </section>

        <section style={{ marginTop: 72 }}>
          {DEEP_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hair"
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                gap: 24, padding: "22px 0", textDecoration: "none", color: "inherit",
              }}
            >
              <span className="display" style={{ fontSize: 21, fontWeight: 300, color: "var(--ink)" }}>{l.title}</span>
              <span style={{ color: "var(--muted)", fontSize: 14, textAlign: "right", maxWidth: 460 }}>{l.summary}</span>
            </Link>
          ))}
        </section>

        <footer className="hair" style={{ marginTop: 8, paddingTop: 24, paddingBottom: 48 }}>
          <Link href="/sources/" className="label" style={{ color: "var(--muted)" }}>Sources</Link>
        </footer>
      </div>
    </main>
  );
}
