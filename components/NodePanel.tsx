"use client";
import { useState } from "react";
import type { NodeData, Corr } from "@/lib/types";
import { CONF } from "@/lib/data";
import { h, pct, usd, dateShort } from "@/lib/format";
import Dial from "./Dial";
import Bars from "./Bars";
import Curve from "./Curve";

const DUR_LABELS = ["<½", "½–1", "1–2", "2–4", "4–8", "8–16", "16–32", "32–72", "72+"];
const GAP_LABELS = ["<6h", "6–24", "1–3d", "3–7d", "1–4w", "1–3m", "3m+"];
type Sec = null | "risk" | "events" | "when" | "trend" | "sites";

export default function NodePanel({ node, def, campusMw, confKey, corr, allNames, onPick }: {
  node: NodeData; def: string; campusMw: number; confKey: string; corr: Corr | null; allNames: Record<string, string>; onPick: (id: string) => void;
}) {
  const d = node.definitions[def]; const uw = node.underwrite[def];
  const [sec, setSec] = useState<Sec>(null);
  const share = uw?.safe_flex[confKey] ?? 0;
  const gi = uw ? uw.flex_grid.reduce((b, v, i) => Math.abs(v - share) < Math.abs(uw.flex_grid[b] - share) ? i : b, 0) : 0;
  const c = CONF.find(c => c.id === confKey)!;
  const target = parseFloat(c.target) / 100;
  const ck = corr && (corr.corr[def] ?? corr.corr["p500"]);
  const cb = corr && corr.corr["basis50"];
  const i = corr?.nodes.indexOf(node.id) ?? -1;
  const least = ck && i >= 0 ? corr!.nodes.map((n, j) => ({ n, r: ck.pearson_since_2022[i][j] })).filter(x => x.n !== node.id).sort((a, b) => a.r - b.r).slice(0, 5) : [];
  const pair = cb && i >= 0 ? corr!.nodes.map((n, j) => ({ n, r: cb.pearson_since_2022[i][j] })).filter(x => x.n !== node.id).sort((a, b) => a.r - b.r)[0] : null;
  const toggle = (s: Sec) => setSec(x => (x === s ? null : s));
  const S = ({ label, v, ember }: { label: string; v: string; ember?: boolean }) => (
    <div><div className="label">{label}</div><div className="display" style={{ fontSize: 36, color: ember ? "var(--ember)" : "var(--ink)", marginTop: 6 }}>{v}</div></div>
  );
  return (
    <div className="flex flex-col gap-7">
      <div className="rise" key={node.id + def + confKey}>
        <div className="label">{node.name} · current regime · 2024 → today</div>
        <div className="mt-4"><Dial value={share * campusMw} unit="megawatts flexible" sub={`of ${campusMw} MW · ${Math.round((1 - share) * campusMw)} MW firm carries the deadlines`} /></div>
        {pair && <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2" style={{ fontSize: 15 }}>
          <span><span style={{ color: "var(--muted)" }}>hours a year </span><span className="display" style={{ fontSize: 22 }}>{h(d.hours_per_year.q.mean)}</span></span>
          <span title="Least correlated site under local congestion, since 2022"><span style={{ color: "var(--muted)" }}>pairs with </span><button className="display hover:text-[var(--gold-hi)]" style={{ fontSize: 22 }} onClick={() => onPick(pair.n)}>{allNames[pair.n]}</button><span className="mono" style={{ color: "var(--muted)" }}> ρ {pair.r.toFixed(2)} local</span></span>
          {node.definitions.neg0 && <span><span style={{ color: "var(--muted)" }}>free power </span><span className="display" style={{ fontSize: 22, color: "var(--gold-hi)" }}>{h(node.definitions.neg0.hours_per_year.q.mean)} h</span></span>}
        </div>}
      </div>

      <div className="flex gap-6 hair pt-3">
        {([["risk", "risk"], ["events", "events"], ["when", "when"], ["trend", "trend"], ["sites", "pair with"]] as [Sec, string][]).map(([s, l]) => (
          <button key={s} className="chip" aria-pressed={sec === s} onClick={() => toggle(s)}>{l}</button>
        ))}
      </div>

      {sec === "risk" && uw && (
        <div className="rise flex flex-col gap-6" key={"risk" + def}>
          <Curve grid={uw.flex_grid} q={uw.boot.completion_q} pick={share} target={target} k={node.id + def} />
          <div className="grid grid-cols-2 gap-6">
            <S label="missed GPU-hours a year" v={fmtK(uw.boot.missed_mwh_mean[gi] * campusMw * 700)} ember />
            <S label="revenue at risk" v={usd(uw.boot.missed_mwh_mean[gi] * campusMw * 700 * 2.5)} ember />
            <S label="curtailed GPU-hours" v={fmtK(uw.boot.shed_mwh_mean[gi] * campusMw * 700)} />
            <S label="energy cost avoided" v={usd(uw.boot.cost_avoided_mean[gi] * campusMw)} />
            {uw.boot.redo_mwh_mean && <S label="redone after restarts" v={fmtK(uw.boot.redo_mwh_mean[gi] * campusMw * 700) + " GPU-h"} />}
          </div>
          {node.sensitivity && def === "p500" && <div>
            <div className="label mb-2">if the workload mix were different · {c.conf} · {c.target}</div>
            <div className="flex flex-wrap gap-6">{Object.entries(node.sensitivity).map(([k, s]) => <div key={k}><div className="display" style={{ fontSize: 22, color: k === "base" ? "var(--gold-hi)" : "var(--ink)" }}>{Math.round((s.safe_flex[confKey] ?? 0) * 100)}%</div><div className="label" style={{ letterSpacing: "0.08em" }}>{k === "base" ? "as modelled" : k.replace("-", " ")}</div><div style={{ fontSize: 12, color: "var(--faint)" }}>{Object.entries(s.mix).map(([L, v]) => `${+L >= 24 ? +L / 24 + "d" : L + "h"} ${Math.round(v * 100)}`).join(" · ")}</div></div>)}</div>
          </div>}
          {uw.boot.completion_by_bucket_q05 && <div>
            <div className="label mb-2">on time by deadline · worst 5% of years</div>
            <div className="flex gap-6">{uw.boot.bucket_hours!.map((L, b) => <div key={L}><div className="display" style={{ fontSize: 22, color: uw.boot.completion_by_bucket_q05![gi][b] < target ? "var(--ember)" : "var(--ink)" }}>{pct(uw.boot.completion_by_bucket_q05![gi][b], 1)}</div><div className="label" style={{ letterSpacing: "0.1em" }}>{L >= 24 ? `${L / 24} day` : `${L} hour`}</div></div>)}</div>
          </div>}
        </div>
      )}

      {sec === "events" && (
        <div className="rise flex flex-col gap-6" key={"ev" + def}>
          <div className="grid grid-cols-2 gap-6">
            <S label="constraint hours a year" v={h(d.hours_per_year.q.mean)} />
            <S label="worst year" v={`${h(d.hours_per_year.q.max)} h`} ember />
            <S label="events a year" v={h(d.events.per_year)} />
            <S label="longest" v={`${h(d.events.duration_h.max)} h`} ember />
          </div>
          <div><div className="label mb-2">duration · hours</div><Bars values={d.events.duration_hist} labels={DUR_LABELS} k={node.id + def} accent={i => i >= 6} /></div>
          <div><div className="label mb-2">time between events</div><Bars values={d.events.gap_hist} labels={GAP_LABELS} k={node.id + def + "g"} /></div>
          <div>
            {d.events.top.slice(0, 4).map(e => <div key={e.start} className="flex justify-between mono text-sm py-2.5 hair"><span>{dateShort(e.start)}</span><span style={{ color: "var(--muted)" }}>{h(e.duration_h)} h</span><span style={{ color: "var(--gold)" }}>+${Math.round(e.depth).toLocaleString()}</span></div>)}
          </div>
        </div>
      )}

      {sec === "when" && (
        <div className="rise flex flex-col gap-6" key={"wh" + def}>
          <div className="grid grid-cols-2 gap-6">
            <S label="seen in day-ahead" v={pct(d.predictability.signaled)} />
            <S label="p99 duration" v={`${h(d.events.duration_h.p99)} h`} />
          </div>
          <div><div className="label mb-2">hour of day</div><Bars values={d.profile.hour} labels={Array.from({ length: 24 }, (_, i) => `${i}`)} k={node.id + def + "h"} height={56} /></div>
          <div><div className="label mb-2">month</div><Bars values={d.profile.month} labels={["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]} k={node.id + def + "m"} height={56} /></div>
        </div>
      )}

      {sec === "trend" && (
        <div className="rise flex flex-col gap-6" key={"tr" + def}>
          <div><div className="label mb-2">constraint hours by year</div><Bars values={d.hours_per_year.by_year.map(r => r.hours_per_8760)} labels={d.hours_per_year.by_year.map(r => `${r.year}`)} k={node.id + def + "y"} height={90} /></div>
          <div><div className="label mb-2">share in the evening peak</div><Bars values={d.hours_per_year.by_year.map(r => r.net_peak_share)} labels={d.hours_per_year.by_year.map(r => `${r.year}`)} k={node.id + def + "n"} height={44} /></div>
          {uw && <div><div className="label mb-2">on time by year · at this flex share</div>
            <div className="flex gap-5">{uw.years.map((y, k) => <div key={y}><div className="display" style={{ fontSize: 22, color: uw.hist.completion[k][gi] < target ? "var(--ember)" : "var(--ink)" }}>{pct(uw.hist.completion[k][gi], 1)}</div><div className="label" style={{ letterSpacing: "0.1em" }}>{y}</div></div>)}</div></div>}
        </div>
      )}

      {sec === "sites" && (
        <div className="rise" key={"si" + def}>
          <div className="label mb-2">least correlated · since 2022 · shift-click on the map to pool</div>
          {least.map(x => <button key={x.n} onClick={() => onPick(x.n)} className="flex w-full justify-between text-sm py-2 hair hover:text-[var(--gold-hi)]"><span>{allNames[x.n] ?? x.n}</span><span className="mono" style={{ color: "var(--muted)" }}>ρ {x.r.toFixed(2)}</span></button>)}
        </div>
      )}
    </div>
  );
}
function fmtK(x: number) { return x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(0)}k` : Math.round(x).toString(); }
