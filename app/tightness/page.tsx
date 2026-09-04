import Link from "next/link";
import TightCharts from "./TightCharts";

export const metadata = { title: "Tightness · Meridian" };

export default function TightnessPage() {
  return (
    <main className="min-h-screen px-6 md:px-10 py-7 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>Can grid tightness be called without price?</h1>
        <nav className="flex gap-6 label">
          <Link href="/" className="hover:text-[var(--ink)]">Map</Link>
          <Link href="/verdict/" className="hover:text-[var(--ink)]">Verdict</Link>
          <Link href="/policy/" className="hover:text-[var(--ink)]">Policy</Link>
          <Link href="/post4cp/" className="hover:text-[var(--ink)]">Post-4CP</Link>
          <Link href="/rank/" className="hover:text-[var(--ink)]">Rank</Link>
          <Link href="/network/" className="hover:text-[var(--ink)]">Network</Link>
          <Link href="/tightness/" className="hover:text-[var(--ink)]">Tightness</Link>
          <Link href="/history/" className="hover:text-[var(--ink)]">History</Link>
          <Link href="/methodology/" className="hover:text-[var(--ink)]">Method</Link>
          <Link href="/sources/" className="hover:text-[var(--ink)]">Sources</Link>
          <a href="/report/ercot-flex-report.zip" download="ercot-flex-report.zip" style={{ color: "var(--gold)" }}>Download zip ↓</a>
        </nav>
      </header>
      <p className="mt-2" style={{ color: "var(--muted)", fontSize: 15, maxWidth: 760 }}>
        A walk-forward model of ERCOT physical tightness — grid structure, recent state, weather, and ERCOT&rsquo;s own
        forecasts, nothing downstream of price — scored the same way, on the same splits, as a price-history model.
      </p>
      <TightCharts />
    </main>
  );
}
