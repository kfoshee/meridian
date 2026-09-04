import type { Index, NodeData, Corr, History, Tails, Misc, Regime, VerdictAny, Policy, Sensitivity, Post4cp, TightnessModel } from "./types";
const cache = new Map<string, Promise<unknown>>();
function get<T>(url: string): Promise<T> {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }));
  return cache.get(url) as Promise<T>;
}
export const loadIndex = () => get<Index>("/data/index.json");
export const loadNode = (id: string) => get<NodeData>(`/data/nodes/${id}.json`);
export const loadCorr = () => get<Corr>("/data/corr.json");
export const loadHistory = () => get<History>("/data/history.json");
export const loadTails = () => get<Tails>("/data/tails.json");
export const loadMisc = () => get<Misc>("/data/misc.json");
export const loadRegime = () => get<Regime>("/data/regime.json");
export const loadVerdict = () => get<VerdictAny>("/data/verdict.json");
export const loadPolicy = () => get<Policy>("/data/policy.json");
export const loadSensitivity = () => get<Sensitivity>("/data/sensitivity.json");
export const loadPost4cp = () => get<Post4cp>("/data/post4cp.json");
export const loadTightness = () => get<TightnessModel>("/data/tightness.json");
export const UW_KEYS = ["p250", "p500", "p1000", "top1", "top2", "basis50", "peak4cp", "eea"];
export const KIND_LABEL: Record<string, string> = { economic: "economic · price says stop", local: "local · the wires here", reliability: "reliability · ERCOT said stop", upside: "upside · run harder" };
export const CONF = [{ id: "c95_t0.99", conf: "95%", target: "99%" }, { id: "c99_t0.99", conf: "99%", target: "99%" }, { id: "c95_t0.995", conf: "95%", target: "99.5%" }, { id: "c99_t0.995", conf: "99%", target: "99.5%" }];
