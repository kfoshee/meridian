/**
 * Pure TypeScript port of `pipeline/src/flexuw/decide/export_model.py::score_json`.
 *
 * The Python function is the reference implementation (checked against sklearn's
 * `predict_proba` to 1e-6 in `pipeline/tests/test_policy.py`); this file has to reproduce its
 * arithmetic exactly, not just its shape. Parity is asserted by `scripts/scorer-parity.mjs`
 * against a fixture generated straight from `score_json` — see that script for the tolerance.
 *
 * Tree traversal: each exported tree is a flat set of parallel arrays (one entry per node).
 * A node is a leaf when `is_leaf[i]` is truthy; otherwise it tests `X[feature_idx[i]]` against
 * `threshold[i]` and goes left when the value is `<= threshold` OR the value is missing (NaN /
 * null / undefined) and `missing_go_to_left[i]` is truthy — this mirrors scikit-learn
 * HistGradientBoosting's native NaN routing, learned per split at fit time. No imputation.
 */

export type ModelTree = {
  feature_idx: number[];
  threshold: number[];
  left: number[];
  right: number[];
  value: number[];
  missing_go_to_left: number[];
  is_leaf: number[];
};

export type IsotonicCalibration = {
  x: number[];
  y: number[];
  out_of_bounds: "clip" | string;
};

export type ModelJson = {
  schema: string;
  node: string;
  defn: string;
  lead_h: number;
  features: string[];
  live_features: string[];
  live_complete: boolean;
  nan_policy: string;
  link: "logistic" | string;
  baseline: number;
  learning_rate: number;
  n_trees: number;
  n_iter: number;
  base_rate: number;
  train_rows: number;
  train_pos: number;
  train_years: number[];
  dam_theta: number;
  isotonic: IsotonicCalibration | null;
  trees: ModelTree[];
  trained_through?: number;
  test_year?: number;
  train_mode?: string;
  tier_b_used?: boolean;
  feature_rules?: Record<string, unknown>;
};

const MAX_DEPTH_GUARD = 64;

function isMissing(v: number | null | undefined): boolean {
  return v == null || Number.isNaN(v);
}

/** Evaluate one boosted tree for one row of feature values (in `mj.features` order). */
function evalTree(t: ModelTree, x: (number | null)[]): number {
  let cur = 0;
  for (let step = 0; step < MAX_DEPTH_GUARD; step++) {
    if (t.is_leaf[cur]) return t.value[cur];
    const v = x[t.feature_idx[cur]];
    const goLeft = isMissing(v) ? !!t.missing_go_to_left[cur] : (v as number) <= t.threshold[cur];
    cur = goLeft ? t.left[cur] : t.right[cur];
  }
  // Depth guard tripped (shouldn't happen for well-formed trees): fall back to whatever node
  // we landed on, treating it as a leaf.
  return t.value[cur];
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** Linear interpolation matching numpy.interp's clip-at-the-ends behavior (`out_of_bounds: "clip"`). */
function interp(px: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return px;
  if (px <= xs[0]) return ys[0];
  if (px >= xs[n - 1]) return ys[n - 1];
  // xs is sorted ascending (isotonic thresholds); binary search for the bracketing pair.
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= px) lo = mid; else hi = mid;
  }
  const x0 = xs[lo], x1 = xs[hi], y0 = ys[lo], y1 = ys[hi];
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (px - x0)) / (x1 - x0);
}

/**
 * Score one feature row against an exported model. `x` must be a plain object keyed by feature
 * name; any feature in `mj.features` that is absent, `null`, or `undefined` scores as missing
 * (native HGB NaN routing) — this is exactly how the model was trained to handle features that
 * were not yet available at decision time.
 */
export function scoreModel(mj: ModelJson, x: Record<string, number | null | undefined>): number {
  const row: (number | null)[] = mj.features.map((name) => {
    const v = x[name];
    return v == null || Number.isNaN(v) ? null : v;
  });
  let raw = mj.baseline;
  for (const t of mj.trees) {
    raw += evalTree(t, row);
  }
  let p = sigmoid(raw);
  if (mj.isotonic) {
    p = interp(p, mj.isotonic.x, mj.isotonic.y);
  }
  return Math.min(1, Math.max(0, p));
}

/** Batch convenience: score many rows against the same model. */
export function scoreModelBatch(
  mj: ModelJson,
  rows: Record<string, number | null | undefined>[]
): number[] {
  return rows.map((r) => scoreModel(mj, r));
}
