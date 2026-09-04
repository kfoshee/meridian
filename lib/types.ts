export type Q = { n: number; mean?: number; p50?: number; p90?: number; p95?: number; p99?: number; max?: number };
export type DefMeta = { kind: string; label: string; group: string };
export type YearRow = { year: number; intervals: number; hours: number; hours_per_8760: number; net_peak_share: number; mean_price: number; p99_price: number };
export type Definition = DefMeta & {
  hours_per_year: { by_year: YearRow[]; q: Q; pettitt: { index: number | null; p: number } };
  events: { n: number; per_year: number; duration_h: Q; depth: Q; ramp_in: Q; inter_arrival_h: Q; duration_hist: number[]; gap_hist: number[]; top: { start: string; duration_h: number; depth: number }[] };
  predictability: { n: number; signaled: number; lead_h: { mean?: number; ge24?: number; ge12?: number } };
  profile: { hour: number[]; month: number[] };
};
export type Underwrite = {
  flex_grid: number[]; years: number[];
  hist: { completion: number[][]; missed_mwh: number[][]; shed_mwh: number[][]; cost_avoided: number[][] };
  boot: { completion_q: Record<string, number[]>; missed_mwh_mean: number[]; shed_mwh_mean: number[]; redo_mwh_mean?: number[]; cost_avoided_mean: number[]; bucket_hours?: number[]; completion_by_bucket_q05?: number[][] };
  safe_flex: Record<string, number>;
};
export type NodeData = {
  id: string; name: string; type: "hub" | "zone"; lat: number; lon: number; geo_conf: string;
  coverage: { start: string; end: string; complete_years: number[] };
  exceedance: { q: number[]; price: number[]; hours_above: Record<string, number> };
  definitions: Record<string, Definition>; underwrite: Record<string, Underwrite>; daily_hours: Record<string, number[]>;
  sensitivity?: Record<string, { mix: Record<string, number>; restart_loss_h: number; safe_flex: Record<string, number> }>;
};
export type IndexNode = { id: string; name: string; type: "hub" | "zone"; lat: number; lon: number; geo_conf: string; safe_flex: Record<string, number>; hours_yr: number; events_yr: number; p99_dur_h: number };
export type Index = { generated: string; headline: { definition: string; key: string }; definitions: Record<string, DefMeta>; nodes: IndexNode[] };
export type Corr = { nodes: string[]; corr: Record<string, { pearson: number[][]; jaccard: number[][]; pearson_since_2022: number[][] }> };

// ---- history.json ----
export type HistYearSeries = { year: number; hours: number; hours_per_8760: number; events: number; events_per_8760: number; median_dur_h: number | null; p90_dur_h: number | null };
export type Covariate = { year: number; prm: number; solar_gw: number; storage_gw: number; wind_gw: number; dispatchable_gw: number; peak_load_gw: number; temp_anom: number | null; temp_anom_summer: number | null };
export type Tightness = {
  year: number; peak_net_gw: number; top_pct: number;
  ge55_h_per_8760: number; ge60_h_per_8760: number; ge65_h_per_8760: number; ge70_h_per_8760: number; ge75_h_per_8760: number;
  p500_given_rank: number | null; p500_given_abs: number | null; p1000_given_rank: number | null; p1000_given_abs: number | null;
  [key: string]: number | null;
};
export type Migration = { year: number; events: number; obs_intervals: number; events_per_8760: number; mean_start_hour: number; median_start_hour: number; hour_hist: number[]; month_hist: number[]; n_intervals: number; ramp_share: number; afternoon_share: number };
export type DurationYear = { year: number; events: number; obs_intervals: number; events_per_8760: number; median_dur_h: number; p90_dur_h: number; mean_dur_h: number; mean_depth: number };
export type Era = { start_date: string; end_date: string; hcap: number; ordc_change: string; note: string; source_url: string };
export type MKTest = { n: number; S: number; tau: number; z: number; p: number; trend: string };
export type KSTest = { D: number; p: number; n_a: number; n_b: number; mean_a: number; mean_b: number; era_a: string[]; era_b: string[] };
export type History = {
  nodes: string[]; years: number[]; defns: string[];
  series: Record<string, Record<string, HistYearSeries[]>>;
  covariates: Covariate[];
  tightness: Tightness[];
  migration: Migration[];
  duration: DurationYear[];
  eras: Era[];
  tests: { ks_start_hour: KSTest; mk_duration: Record<string, MKTest>; mk_tightness: Record<string, MKTest>; mk_conditional: Record<string, MKTest> };
  meta: { price: string; net_load_intervals: number; panel_intervals: number; current_regime_years: number[]; [key: string]: unknown };
  headline: Record<string, number | number[]>;
  finding: string[];
};

// ---- tails.json ----
export type StatDist = { n: number; median: number; p10: number; p90: number; mean: number; min: number; max: number; hist_edges: number[]; hist: number[] };
export type BasisFourLegRow = {
  node: string; mean_basis: number; half_life_d: number; local_share: number; lambda_u_median: number; lambda_u_median_price: number;
  mk_p: number; mk_tau: number; n_pass: number; verdict: string;
  persistent: boolean; local: boolean; uncorrelated: boolean; growing: boolean;
  [key: string]: unknown;
};
export type Tails = {
  panel: unknown;
  hub_taildep: {
    nodes: string[]; n_intervals: number;
    lambda_u_q99: StatDist; lambda_u_q999: StatDist; cond_p250: StatDist; cond_p1000: StatDist; pearson_daily_top1: StatDist;
    median_pair: { a: string; b: string; lambda_u: number; ci: [number, number]; n_exceed: number };
    note: string;
  };
  nodal_hub_test: {
    months: string[]; n_months: number; n_hours: number; n_nodes: number; hubs: string[]; reference: string;
    lambda_u_node_vs_own_hub_q99: StatDist; lambda_u_hub_vs_hub_q99: StatDist;
    lambda_u_node_vs_own_hub_q95: StatDist; lambda_u_hub_vs_hub_q95: StatDist;
    [key: string]: unknown;
  };
  basis_four_leg: { rows: BasisFourLegRow[]; thresholds: Record<string, number>; n_pass_4: number; note: string };
  tail_index: unknown;
  fourcp: unknown;
  matrix: { nodes: string[]; lambda_u_q99: (number | null)[][]; lambda_u_q999: (number | null)[][]; cond_p1000: (number | null)[][] };
};

// ---- misc.json ----
export type Misc = { panel: unknown; upside: unknown; queue: unknown; watch: unknown; anomaly: unknown };

// ---- regime.json ----
export type CurrentRegimeEntry = { hours: number; ci_lo: number; ci_hi: number; n_constrained: number; n_intervals: number; nb_alpha: number };
export type ProjectionScenario = { hours: number; hours_support_capped: number; hours_hurdle: number; ci_param: [number, number]; ci_disp: [number, number]; ci_scenario: [number, number]; model_flag: string };
export type LeaveRecentOutRow = { diagnostic: string; defn: string; key: string; value: number | null; extra: number | null; note: string };
export type ModelCoef = { term: string; coef: number; se: number; z: number };
export type Regime = {
  current_regime: { years: number[]; by_node: Record<string, Record<string, CurrentRegimeEntry>> };
  projection: Record<string, Record<string, Record<string, Record<string, ProjectionScenario>>>>;
  diagnostics: { support_bounds: Record<string, [number, number]>; leave_recent_out?: LeaveRecentOutRow[] };
  caveats: string[];
  models: Record<string, { alpha: number; n_obs: number; coefficients: ModelCoef[] }>;
};

// ---- verdict.json ----
export type VerdictCriterion = { id: string; fired: boolean | "partial"; observed: string };
export type Verdict = {
  registered_on: string; computed_on: string;
  the_number: { name: string; usd_low: number; usd_high: number; ercot_wide_2026: number; source: string; risk: string };
  gm_flex_per_flexible_mw_yr: {
    fourcp_avoided: { low: number; high: number; catch_rule: string; hours_curtailed_per_yr: string; all4_caught_years: string };
    energy_arbitrage_policy_L24: Record<string, Record<string, number> | string>;
    surge_value_per_surge_mw: Record<string, number | string>;
    missed_compute_cost: { current_regime: string; note: string; [key: string]: string };
    total_current_regime_west: { low: number; high: number };
    total_current_regime_houston: { low: number; high: number };
  };
  c_firm_displaced: { note: string; substation_annualized: string; observed_upgrades_annualized: string };
  current_regime_hours: Record<string, Record<string, number>>;
  criteria: VerdictCriterion[];
  decision: string;
  sensitivities: { utilization: string; block_days: string; mix: string };
};

// ---- verdict.json schema 2 (Phase C: post-4CP / 12CP / minimum billing demand) ----
export type CriterionCFired = boolean | "partial" | "pending";
export type CriterionCRow = { id: string; fired: CriterionCFired; observed: string };
export type WorldA = {
  the_number: { low: number; high: number };
  hours_per_yr: { low: number | null; high: number | null };
  ledger: Verdict["gm_flex_per_flexible_mw_yr"];
  status: string;
};
export type WorldB = {
  new_load: { the_number: number; why: string };
  legacy_load: {
    low: number; high: number;
    hours_per_yr: { catch_all_12_median: number | null; catch_10_of_12_median: number | null };
  };
  status: string;
};
export type WorldC = {
  ratchet: Record<string, number>;
  weighted: Record<string, number>;
  phased: Record<string, number>;
  breakeven_ratchet_pct: number | null;
  breakeven_weight: number | null;
  btm_self_supply: Record<string, { breakeven_capex_usd_per_kw?: number; quoted_capex_usd_per_kw?: number; pays?: boolean;[k: string]: unknown }>;
};
export type AccessBlockV2 = {
  levelized_usd_per_mw_yr: number | null; one_time_usd_per_mw: number | null;
  months_avoided: number | null; months_to_clear_50k: number | null;
  curtailment_h_per_yr: number;
  headroom: { duke: number | null; imm: number | null; cdr: number | null };
  funnel: { queue_gw: number | null; a2e_mw: number | null; operating_mw: number | null; throughput_mw_per_yr: number | null };
};
export type PjmBlockV2 = {
  capacity_usd_per_mw_yr: number | null; capacity_basis: string;
  hours_5cp_persistence: { median: number | null; p90: number | null };
  nits_range: { low: number | null; high: number | null };
  obligation_survives_nonfirm: boolean;
  obligation_survives_nonfirm_citation: string;
};
export type ClrLedgerRow = {
  kind: string; id: string; program: string; label: string;
  usd_per_mw_yr_low: number | null; usd_per_mw_yr_high: number | null; usd_per_mw_yr_mid: number | null;
  expected_hours_per_yr: number | null; obligation: string; basis: string;
  test: string; observed: string; verdict: string; margin_usd_per_mw_yr: number | null; source_url: string;
};
export type ClrEvidence = { ledger: ClrLedgerRow[]; hypotheses: ClrLedgerRow[]; evidence: Record<string, string> };
export type RateScalingV2 = { ratio_mean: number | null; ratio_median: number | null; rate_12cp_low: number | null; rate_12cp_high: number | null };
export type VerdictV2 = Verdict & {
  schema: 2;
  worlds: { A_today_4cp: WorldA; B_12cp_mbd: WorldB; C_12cp_variants: WorldC };
  access: AccessBlockV2;
  pjm: PjmBlockV2;
  clr_evidence: ClrEvidence | null;
  rate_scaling: RateScalingV2;
  criteria_c: CriterionCRow[];
  decision_c: string;
  what_would_have_to_change: string[];
};
export type VerdictAny = Verdict | VerdictV2;
export const isVerdictV2 = (v: VerdictAny): v is VerdictV2 => (v as VerdictV2).schema === 2;

// ---- post4cp.json ----
export type Post4cpByYearRow = { cp_year: number; hours_4cp: number | null; hours_12cp: number | null };
export type Post4cpWindowRow = { month: number; window_1_lo: number | null; window_1_hi: number | null; window_2_lo: number | null; window_2_hi: number | null; window_hours_per_day: number };
export type Post4cpFloorRow = { case: string; peaks_caught: number; avoided_usd_per_flexible_mw_yr: number };
export type Post4cpVariantRow = { case: string; avoided_usd_per_flexible_mw_yr: number };
export type Post4cpAccessCurveRow = { months_avoided: number; levelized_usd_per_mw_yr: number };
export type Post4cpClrRow = { id: string; label: string; usd_per_mw_yr_mid: number | null; expected_hours_per_yr: number | null };
export type Post4cp = {
  twelvecp: {
    by_year_by_rule: Record<"oracle_day" | "persistence", Post4cpByYearRow[]>;
    windows: Post4cpWindowRow[];
    rate_scaling: Record<string, unknown>;
    hours_to_catch_10_median: number | null;
    hours_to_catch_12_median: number | null;
  };
  billing: {
    floor_curve: Post4cpFloorRow[];
    variants: Post4cpVariantRow[];
    breakevens: Record<string, number | string>;
    btm: Record<string, { breakeven_capex_usd_per_kw?: number; quoted_capex_usd_per_kw?: number; pays?: boolean;[k: string]: unknown }>;
  };
  access: {
    curve: Post4cpAccessCurveRow[];
    headroom: { headroom_source: string; headroom_mw: number;[k: string]: unknown }[];
    funnel: Record<string, unknown>;
    curtailment_h_per_yr: number;
  };
  pjm: {
    rate_band: Record<string, { low: number; high: number; ids?: string[] }>;
    hours_5cp_persistence: { hours_median?: number; hours_p90?: number;[k: string]: unknown };
  };
  clr: { ledger: Post4cpClrRow[] } | null;
  ercot_reference: { fourcp_low: number; fourcp_high: number; access_levelized_at_curated: number | null };
};

// ---- policy.json ----
export type PolicyByYearRow = {
  node: string; defn: string; lead_h: number; train: string; year: number;
  n_hours: number; n_pos: number; base_rate: number; p_star: number; flex_share: number;
  pr_auc: number; pr_auc_dam: number; brier: number; brier_dam: number;
  fire_hours: number; precision: number; recall: number; lift: number;
  dam_fire_hours: number; dam_precision: number; dam_recall: number; dam_lift: number;
  caught_value_share: number; caught_value_share_dam: number;
  false_curtail_hours: number; false_curtail_rate: number;
  earnings_policy: number; earnings_flat: number; earnings_oracle: number; earnings_dam_only: number;
  completion_policy: number; completion_oracle: number; gpu_hours_sacrificed: number;
  cost_avoided_policy: number; missed_value_policy: number; earnings_oracle_best: number; oracle_best_threshold: number;
};
export type PolicyCalibrationRow = { node: string; defn: string; lead_h: number; train: string; years: string; bin: number; lo: number; hi: number; n: number; p_mean: number; y_rate: number };
export type PolicyBestWarningRow = { node: string; defn: string; train: string; best_lead_h: number; lift: number; caught_value_share: number; false_curtail_rate: number; n_pos: number; years: string; min_lift: number };
export type PolicyPStarRow = { node: string; defn: string; lead_h: number; train: string; mode: string; flex_share: number; years: number[]; p_star: number; never_curtail: boolean; net_total: number; completion_min: number };
export type PolicyReliabilityRow = { node: string; defn: string; lead_h: number; p_star: number; test_years: number[]; n_windows_scored: number; n_windows_total: number; recall: number; n_eea_scored: number; n_watch_scored: number };
export type PolicyOracleInversionRow = { node: string; lead_h: number; year: number; train: string; policy: number; oracle_p500: number; oracle_best: number };
export type PolicyDecisionRow = { ts: string; p: number; reduce_mw: number; decision: number; price: number; y: number };
export type Policy = {
  leads: number[]; nodes: string[];
  p_star: PolicyPStarRow[];
  by_year: PolicyByYearRow[];
  calibration: PolicyCalibrationRow[];
  best_warning: PolicyBestWarningRow[];
  reliability: PolicyReliabilityRow[];
  oracle_inversions: PolicyOracleInversionRow[];
  decisions_sample: PolicyDecisionRow[];
};

// ---- sensitivity.json ----
export type SensitivityRow = {
  node: string; param: string; value: number | string | null; multiplier: number | null;
  "safe_flex_c95_t0.99": number; "safe_flex_c99_t0.995": number; elasticity: number | null;
};
export type DiscreteVsFluidRow = { node: string; flex_share: number; completion_fluid_q01: number; completion_discrete_q01: number; safe_flex_fluid: number; safe_flex_discrete: number; gap_pp: number };
export type Sensitivity = { rows: SensitivityRow[]; discrete: DiscreteVsFluidRow[] };

// ---- tightness.json (Meridian physical grid-tightness model, data/analyses/tight/) ----
export type TightEraRow = {
  arm: "physical" | "price"; target: string; tier: string; lead_h: number; model: string; era: string;
  n: number; n_pos: number; base_rate: number; pred_mean: number; pred_obs_ratio: number;
  cal_slope: number; cal_intercept: number; bss: number; bss_lo: number; bss_hi: number;
  brier: number; pr_auc: number; pr_auc_lo: number; pr_auc_hi: number;
};
export type TightReliabilityBin = { bin: number; lo: number; hi: number; n: number; n_pos: number; p_mean: number | null; y_rate: number | null };
export type TightReliability = { arm: "physical" | "price"; era: string; bins: TightReliabilityBin[] };
export type TightPrCurve = { arm: "physical" | "price"; points: { recall: number; precision: number }[]; base_rate: number | null };
export type TightThreshold = { p_star: number; fire_hours: number; fire_rate: number; precision: number; recall: number; false_alarm_rate: number; lift: number; base_rate: number };
export type TightSkillByLead = { target: string; tier: "E" | "W" | "E+"; lead_h: number; bss: number; pr_auc: number };
export type TightFeatureImportance = { family: string; n_cols: number; pr_auc_drop: number; brier_rise: number };
export type TightMissRow = {
  ts_ct: string; date: string; year: number; era: string; hour: number; month: number;
  p: number; y: number; brier_contrib: number; net_load_mw: number | null; headroom_mw: number | null;
  fc_err_mw: number | null; wxE_pop_heat_index_c: number | null; wx_wind100_ms: number | null;
  st_storage_net_mwh: number | null; st_netload_last_mw: number | null; fc_load_sys_disagree_pct: number | null;
  wxW_pop_heat_index_c: number | null;
};
export type TightTargetYear = { target: string; group: number; n: number; n_pos: number; base_rate: number };
export type TightnessModel = {
  headline: {
    generated: string; physical_target: string; price_target: string; tier: string; lead_h: number; model: string;
    hypotheses: {
      H1_physical_holds_calibration: boolean; H1_detail: Record<string, unknown>;
      H2_price_loses_calibration: boolean; H2_detail: Record<string, unknown>;
      falsifier_fired: boolean; falsifier_detail: { rule: string;[k: string]: unknown };
    };
    pending: string[];
  };
  era_table: TightEraRow[];
  reliability: TightReliability[];
  pr_curves: TightPrCurve[];
  thresholds: TightThreshold[];
  skill_by_lead: TightSkillByLead[];
  feature_importance: TightFeatureImportance[];
  misses: TightMissRow[];
  false_alarms: TightMissRow[];
  targets_summary: TightTargetYear[];
  eplus?: Record<string, Record<string, unknown>[]>;
};
