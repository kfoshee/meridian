import Link from "next/link";
import Findings from "./Findings";
import fs from "fs";
import path from "path";
import type { VerdictAny } from "@/lib/types";
import { isVerdictV2 } from "@/lib/types";
import WorldsPanel from "./WorldsPanel";

export const metadata = { title: "Verdict · Meridian" };

function loadVerdict(): VerdictAny {
  const p = path.join(process.cwd(), "public", "data", "verdict.json");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

const k = (v: number) => `$${Math.round(v / 1000)}k`;
const kExact = (v: number) => `$${v.toLocaleString()}`;

const FINDINGS = [
  "Scarcity did not go away; its price did.",
  "Events moved and got longer.",
  "The forward number is not estimable.",
  "Diversification inside ERCOT is dead in the tail.",
  "Basis is not a product yet.",
  "Reliability curtailment is unpriceable from history.",
];

const KILLS_IT = [
  "PUCT Project 58484 — replaces 4CP with 12CP, spreading the charge across twelve peaks and multiplying curtailment hours.",
  "The remand of Docket 59080, the rate matrix the 4CP number above is built on.",
  "Any rule that makes large-load curtailment mandatory rather than compensated.",
];

const FIRED_STYLE: Record<string, { label: string; color: string }> = {
  true: { label: "fired", color: "var(--gold)" },
  false: { label: "no", color: "var(--muted)" },
  partial: { label: "partial", color: "var(--ember)" },
};

export default function VerdictPage() {
  const v = loadVerdict();
  const g = v.gm_flex_per_flexible_mw_yr;
  const arbWest = g.energy_arbitrage_policy_L24.HB_WEST as Record<string, number>;
  const arbHou = g.energy_arbitrage_policy_L24.HB_HOUSTON as Record<string, number>;
  const arbRange = (r: Record<string, number>) => {
    const vals = [r["2024"], r["2025"], r["2026"]];
    return [Math.min(...vals), Math.max(...vals)];
  };
  const [arbWestLo, arbWestHi] = arbRange(arbWest);
  const [arbHouLo, arbHouHi] = arbRange(arbHou);
  const surge = g.surge_value_per_surge_mw;
  const surgeWest = surge.HB_WEST as number;
  const surgeHou = surge.HB_HOUSTON as number;
  const surgeNote = surge.note as string;

  return (
    <main className="min-h-screen px-6 md:px-10 py-7 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 32 }}>Is this a business?</h1>
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

      <div className="rise mt-8">
        <div className="display mt-4" style={{ fontSize: 28, color: "var(--ink)", maxWidth: 820 }}>{(v as { decision_c?: string }).decision_c ?? v.decision}</div>
        {(v as { decision_c?: string }).decision_c && <div className="mt-2" style={{ color: "var(--muted)", fontSize: 15 }}>Phase B answer, before Project 58484: {v.decision}</div>}
      </div>

      {isVerdictV2(v) ? <WorldsPanel v={v} /> : (
        <div className="rise mt-4">
          <div className="display" style={{ fontSize: 64, color: "var(--gold-hi)", lineHeight: 1 }}>
            {k(v.the_number.usd_low)}–{k(v.the_number.usd_high)}
          </div>
          <div className="label mt-2">per flexible megawatt a year · retail 4CP transmission charge avoided</div>
        </div>
      )}

      <section className="mt-12 hair pt-6">
        <div className="label mb-4">gross margin per flexible MW-year, current regime</div>
        <div className="flex flex-col gap-5">
          <div>
            <div className="display" style={{ fontSize: 30, color: "var(--gold-hi)" }}>{k(g.fourcp_avoided.low)}–{k(g.fourcp_avoided.high)}</div>
            <div style={{ fontSize: 15 }}>4CP transmission charge avoided</div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>
              {g.fourcp_avoided.catch_rule} · {g.fourcp_avoided.hours_curtailed_per_yr} h/yr curtailed · caught all four peaks {g.fourcp_avoided.all4_caught_years}
            </div>
          </div>
          <div>
            <div className="display" style={{ fontSize: 30, color: "var(--ink)" }}>{kExact(arbWest["2025"])} <span className="mono" style={{ color: "var(--muted)", fontSize: 16 }}>West</span> · {kExact(arbHou["2025"])} <span className="mono" style={{ color: "var(--muted)", fontSize: 16 }}>Houston</span></div>
            <div style={{ fontSize: 15 }}>energy arbitrage, backtested policy · 24 h lead · 2025</div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>
              2024–26 range: West {k(arbWestLo)}–{k(arbWestHi)} · Houston {k(arbHouLo)}–{k(arbHouHi)} · {g.energy_arbitrage_policy_L24.note as string}
            </div>
          </div>
          <div>
            <div className="display" style={{ fontSize: 30, color: "var(--ink)" }}>{kExact(surgeWest)} <span className="mono" style={{ color: "var(--muted)", fontSize: 16 }}>West</span> · ~$16k <span className="mono" style={{ color: "var(--muted)", fontSize: 16 }}>Panhandle</span> · {kExact(surgeHou)} <span className="mono" style={{ color: "var(--muted)", fontSize: 16 }}>Houston</span></div>
            <div style={{ fontSize: 15 }}>paid to consume · price ≤ $0</div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>{surgeNote} — needs surge headroom, not curtailment</div>
          </div>
          <div>
            <div className="display" style={{ fontSize: 30, color: "var(--ember)" }}>{g.missed_compute_cost.current_regime} → {g.missed_compute_cost["2023_like_summer"]}</div>
            <div style={{ fontSize: 15 }}>missed-deadline compute, current regime → a 2023-style summer</div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>{g.missed_compute_cost.note}</div>
          </div>
          <div className="hair pt-5">
            <div className="display" style={{ fontSize: 40, color: "var(--gold-hi)" }}>
              {k(g.total_current_regime_west.low)}–{k(g.total_current_regime_west.high)} <span className="mono" style={{ color: "var(--muted)", fontSize: 18 }}>West</span>
              {"  ·  "}
              {k(g.total_current_regime_houston.low)}–{k(g.total_current_regime_houston.high)} <span className="mono" style={{ color: "var(--muted)", fontSize: 18 }}>Houston</span>
            </div>
            <div style={{ fontSize: 15, marginTop: 4 }}>gross margin, current regime — ~70% of it is the 4CP line</div>
          </div>
        </div>
      </section>

      {!isVerdictV2(v) && (
        <section className="mt-12 hair pt-6">
          <div className="label mb-4">pre-registered criteria</div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="label" style={{ textAlign: "left" }}>
                  <th className="pb-2 pr-4">id</th><th className="pb-2 pr-4">fired</th><th className="pb-2">observed</th>
                </tr>
              </thead>
              <tbody>
                {v.criteria.map(c => {
                  const st = FIRED_STYLE[String(c.fired)];
                  return (
                    <tr key={c.id} className="hair">
                      <td className="py-3 pr-4 mono" style={{ fontSize: 14, color: "var(--ink)", whiteSpace: "nowrap" }}>{c.id}</td>
                      <td className="py-3 pr-4 mono" style={{ fontSize: 14, color: st.color }}>{st.label}</td>
                      <td className="py-3" style={{ fontSize: 15, color: "var(--muted)", maxWidth: 640 }}>{c.observed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-12 hair pt-6">
        <div className="label mb-4">what the fifteen years say</div>
        <div className="flex flex-col gap-3">
          {FINDINGS.map((f, i) => <p key={i} style={{ color: i === 0 ? "var(--ink)" : "var(--muted)", fontSize: 16, lineHeight: 1.5 }}>{f}</p>)}
        </div>
      </section>

      {!isVerdictV2(v) && (
        <section className="mt-12 hair pt-6 pb-10">
          <div className="label mb-4">what kills it</div>
          <div className="flex flex-col gap-3">
            {KILLS_IT.map((c, i) => (
              <div key={i} className="rise" style={{ borderLeft: "2px solid var(--ember)", paddingLeft: 14, fontSize: 15, color: "var(--ink)", animationDelay: `${i * 60}ms` }}>{c}</div>
            ))}
          </div>
          <p className="mt-4" style={{ color: "var(--muted)", fontSize: 14 }}>The number to watch is the 4CP rate, not the price duration curve.</p>
        </section>
      )}
      <div className="pb-10" />
      <Findings />
    </main>
  );
}
