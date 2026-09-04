import Link from "next/link";
import fs from "fs";
import path from "path";

export const metadata = { title: "Sources · ERCOT flexible load" };

type Row = string[];

function parseCsv(text: string, cols: number): { header: Row; rows: Row[] } | null {
  const lines = text.split("\n").filter(l => l.length > 0 && !l.startsWith("#"));
  if (lines.length === 0) return null;
  const parseLine = (line: string): Row => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const header = parseLine(lines[0]).slice(0, cols);
  const rows = lines.slice(1).map(l => parseLine(l).slice(0, cols));
  return { header, rows };
}

function readCsv(filename: string, cols: number) {
  try {
    const p = path.join(process.cwd(), "..", "pipeline", "curated", filename);
    const text = fs.readFileSync(p, "utf-8");
    return parseCsv(text, cols);
  } catch {
    return null;
  }
}

type ManifestRow = { filename: string; sha256: string; bytes: number; downloaded_at: string };
type ManifestSummary = { total: number; totalBytes: number; byKey: { key: string; n: number; bytes: number; last: string }[]; sample: ManifestRow[] };

// MANIFEST.jsonl is append-only and now ~1M rows; aggregate per source key and keep a small sample
// rather than rendering every row (which exhausts the build's heap).
function readManifest(): ManifestSummary | null {
  try {
    const p = path.join(process.cwd(), "..", "MANIFEST.jsonl");
    const text = fs.readFileSync(p, "utf-8");
    const agg = new Map<string, { n: number; bytes: number; last: string }>();
    const sample: ManifestRow[] = [];
    let total = 0, totalBytes = 0, start = 0;
    while (start < text.length) {
      let end = text.indexOf("\n", start); if (end < 0) end = text.length;
      const line = text.slice(start, end); start = end + 1;
      if (!line.trim()) continue;
      let r: { key?: string; filename: string; sha256: string; bytes: number; downloaded_at: string };
      try { r = JSON.parse(line); } catch { continue; }
      total += 1; totalBytes += r.bytes || 0;
      const k = r.key || "unknown";
      const a = agg.get(k) || { n: 0, bytes: 0, last: "" };
      a.n += 1; a.bytes += r.bytes || 0; if ((r.downloaded_at || "") > a.last) a.last = r.downloaded_at || "";
      agg.set(k, a);
      if (sample.length < 40 && total % 25000 === 1) sample.push({ filename: r.filename, sha256: r.sha256, bytes: r.bytes, downloaded_at: r.downloaded_at });
    }
    const byKey = [...agg.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.n - a.n);
    return { total, totalBytes, byKey, sample };
  } catch {
    return null;
  }
}

function Table({ header, rows }: { header: Row; rows: Row[] }) {
  return (
    <div className="card p-3 overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr className="label text-left" style={{ borderBottom: "1px solid var(--line)" }}>
            {header.map((c, i) => <th key={i} className="py-2 pr-4 font-normal">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
              {r.map((c, j) => <td key={j} className="py-2 pr-4 align-top" style={{ color: j === 0 ? "var(--ink)" : "var(--muted)" }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SOURCES = [
  { name: "Historical RTM Load Zone and Hub Prices", id: "NP6-785-ER", url: "https://www.ercot.com/mp/data-products/data-product-details?id=NP6-785-ER" },
  { name: "Historical DAM Load Zone and Hub Prices", id: "NP4-180-ER", url: "https://www.ercot.com/mp/data-products/data-product-details?id=NP4-180-ER" },
  { name: "Hourly Load Data Archives (Native Load by weather zone)", id: "gridinfo/load", url: "https://www.ercot.com/gridinfo/load/load_hist" },
  { name: "Settlement Point Prices at Resource Nodes, Hubs and Load Zones", id: "NP6-905-CD", url: "https://www.ercot.com/mp/data-products/data-product-details?id=NP6-905-CD", note: "phase 2" },
  { name: "SCED Shadow Prices and Binding Transmission Constraints", id: "NP6-86-CD", url: "https://www.ercot.com/mp/data-products/data-product-details?id=NP6-86-CD", note: "phase 2" },
  { name: "60-Day SCED Disclosure Reports", id: "NP3-965-ER", url: "https://www.ercot.com/mp/data-products/data-product-details?id=NP3-965-ER", note: "phase 2" },
  { name: "Large Load Interconnection (Monthly Operational Overview)", id: "—", url: "https://www.ercot.com/services/rq/large-load-integration" },
  { name: "Energy Emergency Alert history", id: "curated", url: "pipeline/curated/eea_events.csv" },
  { name: "County boundaries", id: "us-atlas", url: "https://github.com/topojson/us-atlas" },
  { name: "PUCT Project 58000 — Staff proposal for publication (2026-06-12)", id: "58000", url: "https://interchange.puc.texas.gov/Documents/58000_3_1655786.PDF", note: "phase C" },
  { name: "PUCT Project 58484 — draft report", id: "58484", url: "https://interchange.puc.texas.gov/Documents/58484_10_1537291.PDF", note: "phase C" },
  { name: "IMM 2025 State of the Market Report for ERCOT", id: "IMM SOTM", url: "https://www.potomaceconomics.com/wp-content/uploads/2026/06/2025-State-of-the-Market-Report-for-ERCOT.pdf", note: "phase C" },
  { name: "FERC order, EL25-49-000 (Dec 18 2025)", id: "EL25-49", url: "https://www.gravel2gavel.com/files/2025/12/E-1-EL25-49-000.pdf", note: "phase C" },
  { name: "FERC show-cause order (Jun 18 2026)", id: "RM26-4", url: "https://www.ferc.gov/rm26-4", note: "phase C" },
  { name: "PJM 2027/2028 Base Residual Auction report", id: "PJM BRA", url: "https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2027-2028/2027-2028-bra-report.pdf", note: "phase C" },
  { name: "EIA-930 Hourly Electric Grid Monitor", id: "EIA-930", url: "https://www.eia.gov/electricity/gridmonitor/", note: "phase C" },
  { name: "Duke Nicholas Institute headroom study (Feb 2025)", id: "Nicholas Institute", url: "https://nicholasinstitute.duke.edu/", note: "phase C" },
];

export default function SourcesPage() {
  const eea = readCsv("eea_events.csv", 4);
  const watch = readCsv("watch_events.csv", 4);
  const queue = readCsv("large_load_queue.csv", 4);
  const programRevenue = readCsv("program_revenue.csv", 8);
  const pjmRates = readCsv("pjm_rates.csv", 6);
  const pjmRatesResearch = readCsv("pjm_rates_research.csv", 8);
  const accessAssumptions = readCsv("access_assumptions.csv", 7);
  const btmCost = readCsv("btm_cost.csv", 7);
  const btmCostResearch = readCsv("btm_cost_research.csv", 6);
  const verdictCriteriaC = readCsv("verdict_criteria_c.csv", 5);
  const manifest = readManifest();

  return (
    <main className="min-h-screen px-5 md:px-8 py-6 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 30, fontWeight: 300 }}>Sources</h1>
        <nav className="flex gap-5 text-sm" style={{ color: "var(--muted)" }}>
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

      <section className="mt-6 card p-3 overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="label text-left" style={{ borderBottom: "1px solid var(--line)" }}>
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Product id</th>
              <th className="py-2 pr-4 font-normal">Link</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map(s => (
              <tr key={s.name} style={{ borderBottom: "1px solid var(--line)" }}>
                <td className="py-2 pr-4 align-top">{s.name}{s.note ? <span className="label ml-2">{s.note}</span> : null}</td>
                <td className="py-2 pr-4 align-top mono" style={{ color: "var(--muted)" }}>{s.id}</td>
                <td className="py-2 pr-4 align-top mono text-xs" style={{ color: "var(--gold)", wordBreak: "break-all" }}>
                  {s.url.startsWith("http") ? <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-[var(--gold-hi)]">{s.url}</a> : s.url}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="label mt-8 mb-2">curated tables</div>

      {eea && (
        <div className="mt-3">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Energy Emergency Alert events</div>
          <Table header={eea.header} rows={eea.rows} />
        </div>
      )}
      {watch && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Watch / advisory events</div>
          <Table header={watch.header} rows={watch.rows} />
        </div>
      )}
      {queue && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Large load interconnection queue</div>
          <Table header={queue.header} rows={queue.rows} />
        </div>
      )}
      {verdictCriteriaC && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Phase C pre-registered criteria</div>
          <Table header={verdictCriteriaC.header} rows={verdictCriteriaC.rows} />
        </div>
      )}
      {programRevenue && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>ERS / CLR program revenue (curated)</div>
          <Table header={programRevenue.header} rows={programRevenue.rows} />
        </div>
      )}
      {pjmRates && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>PJM capacity and NITS rates</div>
          <Table header={pjmRates.header} rows={pjmRates.rows} />
        </div>
      )}
      {pjmRatesResearch && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>PJM rates — research notes</div>
          <Table header={pjmRatesResearch.header} rows={pjmRatesResearch.rows} />
        </div>
      )}
      {accessAssumptions && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Interconnection-access assumptions</div>
          <Table header={accessAssumptions.header} rows={accessAssumptions.rows} />
        </div>
      )}
      {btmCost && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Behind-the-meter generation cost</div>
          <Table header={btmCost.header} rows={btmCost.rows} />
        </div>
      )}
      {btmCostResearch && (
        <div className="mt-5">
          <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>Behind-the-meter cost — research notes</div>
          <Table header={btmCostResearch.header} rows={btmCostResearch.rows} />
        </div>
      )}

      {manifest && (
        <div className="mt-8">
          <div className="label mb-2">manifest · {manifest.total.toLocaleString()} files · {(manifest.totalBytes / 1e9).toFixed(2)} GB · every file sha256-pinned in MANIFEST.jsonl (in the zip)</div>
          <div className="card p-3 overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="label text-left" style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="py-2 pr-4 font-normal">Source</th>
                  <th className="py-2 pr-4 font-normal">Files</th>
                  <th className="py-2 pr-4 font-normal">Bytes</th>
                  <th className="py-2 pr-4 font-normal">Last download</th>
                </tr>
              </thead>
              <tbody>
                {manifest.byKey.map((r) => (
                  <tr key={r.key} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="py-2 pr-4 align-top mono text-xs">{r.key}</td>
                    <td className="py-2 pr-4 align-top mono text-xs">{r.n.toLocaleString()}</td>
                    <td className="py-2 pr-4 align-top mono text-xs">{r.bytes.toLocaleString()}</td>
                    <td className="py-2 pr-4 align-top mono text-xs" style={{ color: "var(--muted)" }}>{r.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="label mt-4 mb-2">sample rows</div>
          <div className="card p-3 overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {manifest.sample.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="py-2 pr-4 align-top mono text-xs">{r.filename}</td>
                    <td className="py-2 pr-4 align-top mono text-xs" style={{ color: "var(--muted)" }}>{(r.sha256 || "").slice(0, 12)}</td>
                    <td className="py-2 pr-4 align-top mono text-xs">{(r.bytes || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 align-top mono text-xs" style={{ color: "var(--muted)" }}>{r.downloaded_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="mt-8 text-xs" style={{ color: "var(--faint)" }}>
        All sources are public. No data is rehosted; the site publishes derived statistics.
      </footer>
    </main>
  );
}
