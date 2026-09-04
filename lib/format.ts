export const mw = (x: number) => x >= 100 ? Math.round(x).toString() : x.toFixed(1);
export const h = (x?: number) => x == null ? "–" : x >= 10 ? Math.round(x).toString() : x.toFixed(1);
export const pct = (x?: number, d = 0) => x == null ? "–" : (x * 100).toFixed(d) + "%";
export const usd = (x: number) => x >= 1e6 ? `$${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `$${(x / 1e3).toFixed(0)}k` : `$${x.toFixed(0)}`;
export const dateShort = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "America/Chicago" }); };
