# Verdict, Phase C — does the business survive Project 58484?

Written 2026-08-29 against pre-registered criteria (curated/verdict_criteria_c.csv, sha256 pinned before any number). Sources read directly: PUCT Project 58000 Staff proposal for publication (2026-06-12), the Project 58484 draft report, the IMM 2025 State of the Market, FERC 193 FERC ¶ 61,217 (EL25-49) and 195 FERC ¶ 61,209.

## The answer

**No — the business as underwritten dies with 4CP. Not because of 12CP, because of one clause.** §25.193(d)(2)(B) bills every new §25.194 large load for at least fifteen years on the greater of contracted peak, prior-year non-coincident peak, and 12CP demand. A campus that ever draws nameplate has NCP = nameplate and is billed nameplate whatever it dodges; §25.192(f)(1)(B) adds the difference back into the DSP's 12CP load so nobody else's rate falls either. Transmission-cost avoidance for a new load is **$0 at every catch rate, at any prediction skill** (billing_floor.csv, cases a and b1). POST4CP-DEAD and MBD-BINDS both fired.

## What 12CP does on its own (legacy loads only)

- The 12CP denominator (mean of twelve monthly peaks, Oct–Sep) is 14% smaller than 4CP's: rate per fully-avoided MW rises **1.166×** to **$44.5k–87.8k/MW-yr**. Each caught peak is worth 1/12.
- Catching all twelve needs **1,069 h/yr** of standby under the realistic rule (oracle 490 h; 4CP was 323 h) — 3.3× the hours, now including 06–10h winter mornings (windows derived from fifteen years of peaks, not assumed). TWELVECP-COSTLY fired. At 50% flex the simulator still completes 100% of deadlines; at 70% flex it costs ≈$56–58k/MW-yr of missed compute.
- This value exists only for loads outside §25.193(d): pre-rule interconnections and sub-75 MW sites — a closed, shrinking cohort. LEGACY-ONLY holds.

## The variants Staff asked about

Avoidance re-enters the money only if the ratchet falls **below 30%** of contracted demand (= F/M) at a perfect 12/12 catch, or the weighted-average weight on contracted/NCP drops to **≤0.43** for $50k per flexible MW-yr. Serving the flexible block behind the meter so grid import never exceeds the floor keeps the full $44.5–87.8k, but at sourced 2026 costs (aeroderivative $2,058/kW ERCOT, RICE $2,300–2,800/kW, 4h BESS $380/kWh, gas $3.69/MMBtu) the breakeven capex is **negative** — the fuel premium over a $30/MWh grid already exceeds the avoided charge. That is a generation business, and today it loses.

## What carries a business

**Interconnection access.** A month of energization pulled forward is worth ≈$470k of contribution per MW (700 GPU/MW × $2.50/GPU-h × 92% utilization × 40% margin — the margin is an assumption and is flagged as such). Levelized over 15 years at 8%, **one month clears $50k/MW-yr; ERCOT's own timelines put 24+ months on the table**, against ~44 h/yr of curtailment at the Duke 0.5% headroom (10 GW), ~3 GW at zero curtailment per the IMM, and a 34.7-point PRM swing in ERCOT's CDR between "large load is firm" and "large load is curtailable" (≈42 GW of admissible load in 2029). The queue is 474 GW; approvals to energize run ≈2 GW/yr. ACCESS-CARRIES fired, by orders of magnitude — and it is the only line in the ledger the regulator has already priced.

**What the market itself chose.** ERS paid **$42,840 per MW-yr** in PY2025 for a 60-hour contractual ceiling of which **zero hours** were called (nine deployments since 2007, none since Sep 2023). Registering as a CLR pays ~$9.7k of ancillary services plus ~$25k of dispatched energy and spends the megawatt. Crypto left CLR for ERS despite five incentive improvements and no cost increase on record (H1, H4 supported; H2, H3 rejected — nodal settlement would have *paid* them, p=1.5e-33). CLR-REVEALED fired. **Sophisticated flexible loads sell the option, not the interruption.** A business whose premise is "loads curtail on our signal" is bidding against a program that pays more for the promise than the grid pays for the act.

**PJM, if ERCOT dies.** Catching all five capacity peaks costs **~123 h/yr** (persistence) and is worth **$121.7k/MW-yr** at the 2027/28 cap, plus NITS $25k–177k by zone — three times ERCOT's money for a third of the hours. And FERC's EL25-49 order says interim non-firm customers "would not be charged for generation capacity"; PJM proposed June 2029 and FERC has asked why not sooner. PJM-BETTER did not fire by the letter — only because ERCOT's access line is larger — but on transmission and capacity alone PJM wins outright.

## Criteria (pre-registered)

| id | fired | observed |
|---|---|---|
| POST4CP-DEAD | **yes** | $0 at peaks_caught 0..12 under the proposed MBD |
| MBD-BINDS | **yes** | billed = nameplate for all 13 values |
| TWELVECP-COSTLY | **yes** | 689 h for 10/12, 1,069 h for 12/12 (persistence, median) |
| ACCESS-CARRIES | **yes** | $50k/MW-yr cleared at 0.9 months avoided, 44 h/yr |
| PJM-BETTER | no (by the letter) | PJM $121.7k capacity + $25–177k NITS at ~123 h beats every ERCOT transmission/capacity line 3× at a third of the hours — but the criterion compares against ERCOT's best ≤100 h product, and that is access, which is larger still |
| CLR-REVEALED | **yes** | ERS $42.8k at 0 h ≥ CLR $34k at 89 h |
| LEGACY-ONLY | **yes** | positive only outside §25.193(d) |

## What would have to change for the ERCOT flex product to come back

1. Drop or soften §25.193(d)(2)(B) — the NCP leg — in the adopted rule (Project 58000; SB6 deadline 2026-12-31).
2. A weighted-average MBD with the contracted/NCP weight at or below 0.43, or a ratchet below 30% of contracted demand.
3. A curtailable / non-firm interconnection class exempt from the floor — the FERC-ordered kind (June 18 2026 show-cause; RM26-4) — adopted by the PUCT.
4. Gas or storage cheap enough that a behind-the-meter flex block breaks even against a $30/MWh grid.

Until one of those happens the product in Texas is **interconnection access sold as availability** — exactly what ERS already is — and the transmission arithmetic that anchored Phase B is gone.
