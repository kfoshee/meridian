"use client";
import { useState } from "react";
import { usd } from "@/lib/format";
import type { VerdictV2, CriterionCFired, VerdictCriterion } from "@/lib/types";

const WORLD_LABEL: Record<string, string> = {
  A: "A · today · 4CP",
  B: "B · 12CP + minimum billing demand",
  C: "C · 12CP variants",
};

const FIRED_C_STYLE: Record<string, { label: string; color: string }> = {
  true: { label: "fired", color: "var(--gold)" },
  false: { label: "no", color: "var(--muted)" },
  partial: { label: "partial", color: "var(--ember)" },
  pending: { label: "pending", color: "var(--faint)" },
};

const WATCHLIST = [
  "Project 58484 / 58000 adoption",
  "Docket 59080 remand",
  "NPRR 1188 / 1244 — Jan 2027",
  "PJM EL25-49 non-firm effective date — 2029-06-01",
];

const VARIANT_LABEL: Record<string, (k: string) => string> = {
  ratchet: (k) => `ratchet ${k.replace("c_ratchet_", "").replace("pct", "%")}`,
  weighted: (k) => `weight ${k.replace("c_weighted_w", "")}`,
  phased: (k) => k.replace("c_phased_", "").replace("_", " · "),
};

function hours(v: number | null | undefined) {
  return v == null ? "–" : `${Math.round(v).toLocaleString()} h/yr`;
}

export default function WorldsPanel({ v }: { v: VerdictV2 }) {
  const [world, setWorld] = useState<"A" | "B" | "C">("A");
  const [legacy, setLegacy] = useState(false);
  const [showB, setShowB] = useState(false);

  const A = v.worlds.A_today_4cp;
  const B = v.worlds.B_12cp_mbd;
  const C = v.worlds.C_12cp_variants;

  const variantRows = (kind: "ratchet" | "weighted" | "phased") =>
    Object.entries(C[kind]).map(([k, val]) => ({ key: k, label: VARIANT_LABEL[kind](k), val }));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
        <span className="label">world</span>
        {(["A", "B", "C"] as const).map((w) => (
          <button key={w} className="chip" aria-pressed={world === w} onClick={() => setWorld(w)}>{WORLD_LABEL[w]}</button>
        ))}
      </div>

      {world === "A" && (
        <div className="rise mt-6">
          <div className="display" style={{ fontSize: 64, color: "var(--gold-hi)", lineHeight: 1 }}>
            {usd(A.the_number.low)}–{usd(A.the_number.high)}
          </div>
          <div className="label mt-2">per flexible megawatt a year · retail 4CP transmission charge avoided</div>
          <div className="mono mt-2" style={{ color: "var(--muted)", fontSize: 14 }}>
            {hours(A.hours_per_yr.low)}–{hours(A.hours_per_yr.high).replace(" h/yr", "")} of standby to catch all four peaks · {A.status}
          </div>
        </div>
      )}

      {world === "B" && (
        <div className="rise mt-6">
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="display" style={{ fontSize: 64, color: legacy ? "var(--gold-hi)" : "var(--ember)", lineHeight: 1 }}>
              {legacy ? `${usd(B.legacy_load.low)}–${usd(B.legacy_load.high)}` : "$0"}
            </div>
            <button className="chip" aria-pressed={legacy} onClick={() => setLegacy((s) => !s)}>
              {legacy ? "showing: legacy load" : "showing: new load"} — toggle
            </button>
          </div>
          <div className="label mt-2">
            {legacy ? "per flexible megawatt a year · 12CP demand avoided · closed cohort, no minimum billing demand"
                    : "per flexible megawatt a year · new large load under proposed §25.193(d)"}
          </div>
          <div className="mono mt-2" style={{ color: "var(--muted)", fontSize: 14, maxWidth: 640 }}>
            {legacy
              ? `${hours(B.legacy_load.hours_per_yr.catch_10_of_12_median)} to catch 10 of 12 · ${hours(B.legacy_load.hours_per_yr.catch_all_12_median)} to catch all 12 (persistence, median CP year)`
              : B.new_load.why}
          </div>
          <div className="mono mt-1" style={{ color: "var(--faint)", fontSize: 13 }}>{B.status}</div>
        </div>
      )}

      {world === "C" && (
        <div className="rise mt-6">
          <div className="label mb-3">avoided $ per flexible MW-yr at 12 of 12 caught, high rate end</div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {(["ratchet", "weighted", "phased"] as const).flatMap((kind) =>
                  variantRows(kind).map((r) => (
                    <tr key={r.key} className="hair">
                      <td className="py-2 pr-4 mono" style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>{r.label}</td>
                      <td className="py-2 mono" style={{ fontSize: 14, color: r.val > 0 ? "var(--gold-hi)" : "var(--faint)" }}>{usd(r.val)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              breakeven ratchet: <span className="mono" style={{ color: "var(--gold)" }}>{C.breakeven_ratchet_pct != null ? `${(C.breakeven_ratchet_pct * 100).toFixed(0)}%` : "–"}</span> of the floor — below it, catching peaks pays again
            </p>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              breakeven weight for $50k/flexible-MW-yr: <span className="mono" style={{ color: "var(--gold)" }}>{C.breakeven_weight != null ? C.breakeven_weight.toFixed(2) : "–"}</span>
            </p>
          </div>
        </div>
      )}

      <section className="mt-10 hair pt-6">
        <div className="label mb-4">phase C pre-registered criteria</div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="label" style={{ textAlign: "left" }}>
                <th className="pb-2 pr-4">id</th><th className="pb-2 pr-4">fired</th><th className="pb-2">observed</th>
              </tr>
            </thead>
            <tbody>
              {v.criteria_c.map((c) => {
                const st = FIRED_C_STYLE[String(c.fired as CriterionCFired)];
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

        <button className="chip mt-4" aria-pressed={showB} onClick={() => setShowB((s) => !s)}>
          {showB ? "hide" : "show"} Phase B criteria
        </button>
        {showB && (
          <div className="overflow-x-auto mt-3">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {v.criteria.map((c: VerdictCriterion) => {
                  const st = FIRED_C_STYLE[String(c.fired)];
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
        )}
      </section>

      <section className="mt-12 hair pt-6">
        <div className="label mb-4">what kills it</div>
        <div className="rise" style={{ borderLeft: "2px solid var(--ember)", paddingLeft: 14, fontSize: 16, color: "var(--ink)" }}>
          §25.193(d)(2)(B) — the non-coincident-peak leg of the minimum billing demand
        </div>
        <p className="mt-3" style={{ color: "var(--muted)", fontSize: 15, maxWidth: 700 }}>
          A campus that ever draws nameplate has an NCP equal to nameplate, and is billed on it for at least
          fifteen years regardless of how many of the twelve monthly peaks it dodges. Prediction skill does not
          move this number; metering does.
        </p>
        <div className="label mt-6 mb-3">watchlist</div>
        <div className="flex flex-wrap gap-3">
          {WATCHLIST.map((w) => (
            <span key={w} className="mono" style={{ fontSize: 13, color: "var(--muted)", border: "1px solid var(--line-2)", borderRadius: 999, padding: "6px 12px" }}>{w}</span>
          ))}
        </div>
      </section>
    </section>
  );
}
