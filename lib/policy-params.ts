/**
 * Frozen policy parameters for the live decision cron.
 *
 * Provenance: `data/analyses/policy.json`, generated 2026-08-29T15:02:26 by the pipeline's
 * `flexuw decide` sweep (`pipeline/src/flexuw/decide/policy.py::choose_p_star`), which
 * grid-searches p* through the campus simulator per (node, defn, lead_h) and keeps the
 * threshold that earns the most subject to completion >= target and never losing money in any
 * backtest year. The rows below are exactly `policy.json["p_star"]` filtered to
 * `train == "expanding"` (matches every exported model's `train_mode`), `mode == "hard"`,
 * `defn == "p500"`, `lead_h in (1, 4, 24)` -- the 12 rows for the 4 nodes this cron serves.
 *
 * `never_curtail: true` (HB_WEST/L4) means the grid search found no p* that beat "never fire"
 * on the backtest history at that lead -- the cron must never reduce load for that (node, lead).
 *
 * CampusSpec defaults (100 MW total / 40 MW firm -> 60 MW flex) match
 * `pipeline/tests/test_policy.py::CAMPUS` and `flexuw.decide.policy.CampusSpec`'s field
 * defaults' sibling test fixture -- NOT `policy.json["config"]["campus"]`, which used
 * mw_firm=50/flex_share=0.5 for the historical backtest sweep that produced the p* grid above.
 * The two are independent: p* is a probability threshold chosen on the backtest campus; mw_flex
 * is how many MW the live campus actually has to give up once that threshold fires.
 */

export type PStarRow = {
  node: string;
  leadH: 1 | 4 | 24;
  pStar: number;
  neverCurtail: boolean;
};

export const P_STAR: PStarRow[] = [
  { node: "HB_HOUSTON", leadH: 1, pStar: 0.40, neverCurtail: false },
  { node: "HB_HOUSTON", leadH: 4, pStar: 0.25, neverCurtail: false },
  { node: "HB_HOUSTON", leadH: 24, pStar: 0.10, neverCurtail: false },
  { node: "HB_NORTH", leadH: 1, pStar: 0.25, neverCurtail: false },
  { node: "HB_NORTH", leadH: 4, pStar: 0.40, neverCurtail: false },
  { node: "HB_NORTH", leadH: 24, pStar: 0.10, neverCurtail: false },
  { node: "HB_WEST", leadH: 1, pStar: 0.40, neverCurtail: false },
  { node: "HB_WEST", leadH: 4, pStar: 1.01, neverCurtail: true },
  { node: "HB_WEST", leadH: 24, pStar: 0.05, neverCurtail: false },
  { node: "LZ_AEN", leadH: 1, pStar: 0.25, neverCurtail: false },
  { node: "LZ_AEN", leadH: 4, pStar: 0.25, neverCurtail: false },
  { node: "LZ_AEN", leadH: 24, pStar: 0.10, neverCurtail: false },
];

const P_STAR_INDEX = new Map(P_STAR.map((r) => [`${r.node}_L${r.leadH}`, r]));

/** p* for a (node, lead); `null` if this cron has no policy row for that combination. */
export function pStarFor(node: string, leadH: number): PStarRow | null {
  return P_STAR_INDEX.get(`${node}_L${leadH}`) ?? null;
}

export const NODES = ["HB_HOUSTON", "HB_WEST", "HB_NORTH", "LZ_AEN"] as const;
export const LEADS = [1, 4, 24] as const;
export const DEFN = "p500" as const;

/** pipeline/tests/test_policy.py::CAMPUS -- the live campus default. */
export const CAMPUS = {
  mwTotal: 100.0,
  mwFirm: 40.0,
  get mwFlex(): number {
    return Math.max(this.mwTotal - this.mwFirm, 0);
  },
};

/**
 * `hard`-mode policy from `flexuw.decide.policy.recommend`, without the live slack/backlog term
 * (the cron has no view of the campus's actual workload backlog, so it always uses slack=1 --
 * the same as an idle campus with nothing owed): reduce_mw = mw_flex * 1[p >= p*].
 */
export function reduceMw(pMatters: number, pStar: PStarRow | null): number {
  if (!pStar || pStar.neverCurtail) return 0;
  return pMatters >= pStar.pStar ? CAMPUS.mwFlex : 0;
}
