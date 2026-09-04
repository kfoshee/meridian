# Verdict — can a company sell deadline-guaranteed compute on non-firm ERCOT power?

Written 2026-08-29 against pre-registered criteria (curated/verdict_criteria.csv, sha256 pinned before any number existed).

## The number

**$38,000–75,000 per flexible MW-year.** That is the retail 4CP transmission charge a transmission-voltage large load avoids by not drawing during ERCOT's four summer coincident peaks (PUCT Docket 59080 rate matrix; TNMP cheapest, CenterPoint dearest; ERCOT-wide $75,527/MW-yr for 2026). It is the only line in the ledger large enough to carry a business, and it is earned by curtailing ~375–450 hours a summer under a rule that catches all four peaks in 14 of 15 years, at a simulated deadline-completion cost of ≈$0–3k per flexible MW in the current regime (≈$56k in a 2023-style summer).

## Everything else, per flexible MW-year, current regime (2024→)

| line | West hub | Houston hub | note |
|---|---|---|---|
| 4CP charge avoided | 38–75k | 38–75k | the product |
| energy arbitrage, backtested policy (24 h lead) | 16–34k | 2–10k | 85–95% of curtailments are false; 2024 was a 92k outlier |
| paid-to-consume (price ≤ $0) | ~4k (Panhandle 16k) | ~1k | needs surge headroom, not curtailment |
| missed-deadline compute | −0 to −3k | −0 to −3k | fluid EDF; discrete jobs within 2.5 pp |
| **gross margin** | **≈55–110k** | **≈40–85k** | ~70% of it is the 4CP line |

## What the fifteen years say

- **Scarcity did not go away; its price did.** Net peak load hit 75.6 GW in 2026 and ≥70 GW — never seen 2011–2022 — now happens every year. The conversion of a top-0.5% tight hour into a ≥$500 print fell from 0.41 to 0.09 after ECRS, the RTORPA floors, the Emergency Pricing Program and the $2,000 real-time cap. That is a level shift in the pricing apparatus, not a drift. Underwriting on $/MWh means underwriting a rulebook the PUCT has rewritten three times in thirty months.
- **Events moved and got longer.** Mean event start moved from 13:06 to 15:52 (KS p = 1e-5); 74% of ≥$500 intervals now sit in the 18–21 h ramp; median duration rose 0.5 → 2.25 h while the count is flat.
- **The forward number is not estimable.** Storage, solar and wind move as one axis (VIF 73–384); a model fit through 2023 over-predicts 2024–26 by 166×; scenario bands span four orders of magnitude. The defensible figure is model-free: **9–25 constrained hours a year at ≥$500** across hubs and zones today.
- **Diversification inside ERCOT is dead in the tail.** Upper-tail dependence between hubs is 0.84 at q = 0.99 and 0.98 at q = 0.999 — worse than the 0.90 Pearson suggested. One month of nodal data shows nodes as tail-tied to hubs as hubs are to each other (median 0.857; provisional).
- **Basis is not a product yet.** 0 of 13 nodes pass persistent + local + uncorrelated + growing: daily basis hours are memoryless (half-life 0.4–1.4 d). LZ_WEST is the exception worth watching (326 h/yr, 94% local).
- **Reliability curtailment is unpriceable from history.** Two EEAs since 2021. Watches are the only usable trigger and they cover 34% of ≥$1,000 intervals with a 20% false-alarm rate.
- **The queue is the demand signal.** Large-load queue 39.6 GW → 474 GW (2023→2026) while median ≥$500 hours fell 195 → 5. ERCOT's own CDR scenario holds the planning reserve margin at +27–29% through 2030 *if* large load is curtailable, versus negative by 2028 if firm. That 35-point swing is the interconnection-access product, priced by the regulator, not the market.

## Pre-registered criteria

| id | fired | observed |
|---|---|---|
| ARB-DEAD | **partial** | Houston/North/Austin arbitrage $2–10k per flexible MW (dead); West $16–34k (alive, and unstable) |
| BASIS-DEAD | no (by the letter) | median basis50 43 h/yr, positive trend at 8/13 — but the product test fails 0/13 on persistence |
| RELIABILITY-UNPRICEABLE | **yes** | 2 EEAs in the curated window |
| PREDICT-DEAD | no | 24 h lift 16–58× base rate; 72 h dead |
| FLEX-DEAD | no | discrete safe flex within 0–2.5 pp of fluid |
| TAIL-COUPLED | **yes** (provisional) | node-vs-hub λ_U 0.857 |

## Decision

**Yes — but the product is interconnection access and transmission-cost avoidance, not energy arbitrage.** A campus that can drop to its firm floor for ~400 summer hours at ≤24 h notice earns $38–75k per flexible MW-year from the 4CP charge alone, keeps ≥99.8% of deadlines in the current regime, and is exactly the "curtailable large load" ERCOT's own resource-adequacy scenario assumes. Energy arbitrage adds $2–34k depending on node and year and is a bet on a pricing rulebook that has been rewritten three times since 2023. Basis and reliability products do not exist yet.

The decision model earns its place as a 4CP-and-ramp predictor with a 24 h horizon, not as a price forecaster.

**What kills it:** PUCT Project 58484 (replace 4CP with 12CP — spreads the charge across twelve peaks and multiplies the curtailment hours), the remand of Docket 59080, and any rule that makes large-load curtailment mandatory rather than compensated. The number to watch is the 4CP rate, not the price duration curve.
