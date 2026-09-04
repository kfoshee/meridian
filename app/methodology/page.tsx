import Link from "next/link";

export const metadata = { title: "Methodology · ERCOT flexible load" };

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="label mb-2">{label}</div>
      <div className="flex flex-col gap-1.5 text-sm" style={{ color: "var(--ink)" }}>{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <main className="min-h-screen px-5 md:px-8 py-6 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display" style={{ fontSize: 30, fontWeight: 300 }}>Method</h1>
        <nav className="flex gap-5 text-sm" style={{ color: "var(--muted)" }}>
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

      <Section label="question">
        <p>For any settlement point: how much deadline-guaranteed compute can a campus with F MW firm and M MW max safely sell?</p>
      </Section>

      <Section label="grid">
        <p>15-minute real-time settlement point prices, America/Chicago, 2021-01-01 to present.</p>
        <p>DAM hourly prices forward-filled to 15 min.</p>
      </Section>

      <Section label="curtailment definitions">
        <p>A campus is &ldquo;curtailed&rdquo; when:</p>
        <div className="mt-1 flex flex-col gap-3">
          <div>
            <div className="label mb-1" style={{ fontSize: 11 }}>Economic — the price says stop</div>
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyle: "disc" }}>
              <li><span className="mono">≥ $θ/MWh</span> — real-time price at or above θ ∈ {"{100, 250, 500, 1000, 2000, 5000}"}.</li>
              <li><span className="mono">top p% hours</span> — the highest-priced p% of intervals in each calendar year, p ∈ {"{0.5, 1, 2, 5}"}. Self-normalizing.</li>
              <li><span className="mono">4CP window</span> — the 30 highest system-load 15-minute intervals per month, June–September (an ex-ante superset of the four coincident peaks).</li>
            </ul>
          </div>
          <div>
            <div className="label mb-1" style={{ fontSize: 11 }}>Local — the wires here</div>
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyle: "disc" }}>
              <li><span className="mono">basis ≥ $k</span> — node price minus the ERCOT hub average ≥ k ∈ {"{25, 50, 100}"}.</li>
            </ul>
          </div>
          <div>
            <div className="label mb-1" style={{ fontSize: 11 }}>Reliability — ERCOT said stop</div>
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyle: "disc" }}>
              <li><span className="mono">EEA declared</span> — intervals inside a declared Energy Emergency Alert, from the curated table. Only two in the window: Winter Storm Uri Feb 15–19 2021 and Sep 6 2023 19:25–20:37 CT.</li>
            </ul>
          </div>
          <div>
            <div className="label mb-1" style={{ fontSize: 11 }}>Upside — run harder</div>
            <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyle: "disc" }}>
              <li><span className="mono">price ≤ $0</span> — hours where a flexible load should run harder, not stop. Reported as free-power hours, never as curtailment.</li>
            </ul>
          </div>
        </div>
        <p className="mt-1" style={{ color: "var(--muted)" }}>Coming: shadow-price-confirmed congestion at resource nodes (Phase B).</p>
      </Section>

      <Section label="events">
        <p>Maximal runs of curtailed intervals, merged across gaps ≤ 30 min.</p>
        <p>Per event: duration, depth (max price above threshold), ramp in/out ($ per 15 min over the 4 intervals before/after), inter-arrival.</p>
        <p>Empirical quantiles to p99 and max. No fitted distributions.</p>
      </Section>

      <Section label="predictability">
        <p>An event is &ldquo;seen in DAM&rdquo; if the day-ahead price for its first hour cleared above the threshold.</p>
        <p>DAM posts ~13:30 the day before, so lead ≈ 10–34 h.</p>
      </Section>

      <Section label="trend">
        <p>Constraint hours per year normalized to 8760, net-peak (17–21h) share, Pettitt change-point test.</p>
      </Section>

      <Section label="correlation">
        <p>Pearson and Jaccard on daily constraint hours across nodes.</p>
        <p>Since-2022 variant excludes Winter Storm Uri.</p>
        <p>Median pairwise correlation since 2022: ≈0.90 under price definitions (one bet repeated), ≈0.22 under local congestion (sites fail on different days). See <Link href="/network/" className="hover:text-[var(--ink)]" style={{ textDecoration: "underline" }}>/network</Link>.</p>
      </Section>

      <Section label="simulator">
        <p>Fluid earliest-deadline-first scheduler at hourly resolution.</p>
        <p>Work offered at 92% of M, split by deadline: 1h 15%, 6h 25%, 24h 35%, 7d 25%.</p>
        <p>Flexible MW (M−F) is shed in proportion to the hour&rsquo;s curtailed fraction; firm MW never sheds.</p>
        <p>Missed work = work still unfinished at its deadline.</p>
        <p>700 GPU per MW (1.4 kW/GPU incl. PUE), $2.50 per GPU-hour, penalty 1.0×.</p>
        <p>Results are per MW of M and scale linearly.</p>
        <p>Restart cost: when flexible MW are newly shed, 1 hour of in-flight work on them is lost and re-queued (checkpoint interval; set to 0 for perfect checkpointing).</p>
      </Section>

      <Section label="sensitivity">
        <p>The deadline mix drives the answer.</p>
        <p>Each node also reports the safe flex share under a short-heavy mix (1h 40% / 6h 25% / 24h 20% / 7d 15%), a long-heavy mix (5 / 15 / 30 / 50), and with no restart cost.</p>
      </Section>

      <Section label="underwriting">
        <p>150 synthetic years by month-aware block bootstrap (14-day blocks drawn from the same calendar slot of a random complete historical year).</p>
        <p>Largest safe flexible commitment = the largest flex share whose completion rate at the chosen confidence (worst 5% or 1% of synthetic years) still meets the target (99% or 99.5%).</p>
        <p>Flex share grid 0–100% in 2.5% steps.</p>
      </Section>

      <Section label="fifteen years">
        <p>Nodal go-live 2010-12-01 to present; the real-time offer cap moved eight times, from $2,250 to $9,000 and back down to $2,000/MWh.</p>
        <p>2011→2012: $2,250 → $3,000 → $4,500. 2013→2015: NPRR385 price floor, then $5,000 → $7,000 (ORDC live) → $9,000.</p>
        <p>2019→2020: two 0.25σ ORDC Mu shifts (0.50σ cumulative) ahead of Winter Storm Uri. 2021-03: LCAP binds, cap cut to $2,000.</p>
        <p>2022–2023: cap cut to $5,000, MCL raised; ECRS launches; RTORPA price-adder floors added.</p>
        <p>2023-12→2025-12: Emergency Pricing Program caps a 12-of-24-hour HCAP run at $2,000. 2025-12: RTC+B splits the cap ($5,000 DAM / $2,000 RTM).</p>
      </Section>

      <Section label="regime model">
        <p>NB2 GLM of constrained intervals per node-month, node + calendar-month fixed effects, offset log(observed intervals); a hurdle (logit for P(n&gt;0) × zero-truncated NB2 for positives) runs the same design.</p>
        <p>Diagnostics: VIF against the full design, leave-one-covariate-out on the 2029-base projection, and leave-recent-out (fit through 2023, score 2024–26).</p>
        <p>The forward projection is not estimable: storage, solar and wind load as one axis (VIF 73–384), so the model cannot attribute hours to any one of them, and a fit through 2023 over-predicts 2024–26 by two orders of magnitude.</p>
      </Section>

      <Section label="tightness">
        <p>Net load = system load minus wind minus solar, on the native interval; tight hours are the year&rsquo;s own top 0.5% by rank (self-normalizing) and separately an absolute ≥65 GW threshold (load grew ~25% over the panel, so only the absolute series speaks to physical level).</p>
        <p>The discriminating statistic is the conditional P(price ≥ $500 | net load in the year&rsquo;s top 0.5%): if it collapses while tightness holds, the price signal was administratively suppressed, not a fading grid.</p>
      </Section>

      <Section label="tail dependence">
        <p>λ_U = P(F_b(B) &gt; q | F_a(A) &gt; q), the empirical upper-tail-dependence coefficient computed on ranks over jointly observed intervals, so a $9,000-cap hub and a quiet zone are comparable.</p>
        <p>Confidence intervals use a calendar-day block bootstrap (whole local days, 500 replicates); rank thresholds are held fixed across replicates since the sampling variance lives in the co-occurrence rate, not the quantile.</p>
      </Section>

      <Section label="basis four-leg test">
        <p>A node&rsquo;s local congestion counts as a durable product only if it passes all four: persistent (AR(1) half-life &gt; 30 days), local (local_share &gt; 70%), uncorrelated (median λ_U &lt; 0.20) and growing (Mann-Kendall p &lt; 0.10).</p>
        <p>0 of 13 nodes currently pass all four; daily basis hours are memoryless (half-life 0.4–1.4 d) everywhere tested.</p>
      </Section>

      <Section label="decision model">
        <p>Gradient-boosted classifier over point-in-time features: tier A (price/DAM history, always available) and tier B (load/weather forecasts, live-window only); every feature is stamped with the timestamp its source data was actually published, so lead-24h features cannot see anything posted after t−24h.</p>
        <p>Walk-forward: <span className="mono">expanding</span> trains on everything before the test year, <span className="mono">recent3</span> trains on the three years before it; scores are isotonic-calibrated on a trailing 20% calibration slice of the training window.</p>
        <p>p* is grid-searched (2%, 5%, 10%, 15%, 25%, 40%) through the campus simulator and set to the value that earns the most subject to completion staying above target and never losing money in any backtest year — so the recommended rule can never beat &ldquo;never curtail&rdquo; by construction and can never lose to it either.</p>
        <p>Oracle-inversion caveat: in some node-years the hard p*-threshold policy earns less than curtailing every p500 hour after the fact would have, because p* is chosen for completion safety across the whole window, not for a single lucky year — <Link href="/policy/" className="hover:text-[var(--ink)]" style={{ textDecoration: "underline" }}>/policy</Link> shows both.</p>
      </Section>

      <Section label="discrete jobs">
        <p>Poisson arrivals per deadline bucket, job size ~ lognormal(median 4 MWh, σ = 1.0), clipped to stay feasible on an uncurtailed campus; preemptive earliest-deadline-first, matched hour-for-hour against the fluid engine&rsquo;s capacity path.</p>
        <p>An evicted job redoes up to one checkpoint interval (default 1 h) of progress and pays 10 minutes of restart overhead on resume.</p>
      </Section>

      <Section label="sensitivity">
        <p>One-at-a-time parameter sweeps (utilization, block length, GPU price/count, lookahead, restart loss, bootstrap replicates, workload mix) around the base configuration; elasticity is % change in safe flex share per % change in the parameter.</p>
        <p>Utilization dominates: safe flex falls from 0.85 to 0.50–0.55 as utilization rises to 100%.</p>
      </Section>

      <Section label="verdict arithmetic">
        <p>GM_flex per flexible MW-year = 4CP transmission charge avoided + backtested energy-arbitrage earnings + paid-to-consume surge value − missed-deadline compute cost.</p>
        <p>C_firm (the capital flexibility could displace) is the annualized substation/interconnection cost, and it is displaced only where the load interconnects as curtailable under SB6 — otherwise the firm-capacity cost is paid regardless.</p>
      </Section>

      <Section label="pre-registration">
        <p>Six criteria (<span className="mono">pipeline/curated/verdict_criteria.csv</span>) were written and sha256-pinned before any of the numbers above existed, each with a numeric threshold and its data source named in advance.</p>
        <p>The hypothesis is falsifiable by construction: ARB-DEAD, BASIS-DEAD, RELIABILITY-UNPRICEABLE, PREDICT-DEAD, FLEX-DEAD and TAIL-COUPLED each specify in advance what result would have killed the product. See <Link href="/verdict/" className="hover:text-[var(--ink)]" style={{ textDecoration: "underline" }}>/verdict</Link>.</p>
      </Section>

      <Section label="12cp">
        <p>PUCT Project 58000 (Staff proposal filed 2026-06-12, implementing SB6 via Project 58484) replaces ERCOT&rsquo;s four summer coincident peaks with twelve monthly ones.</p>
        <p>Proposed 16 TAC 25.192(a)(4): the ERCOT 12CP intervals are the twelve 30-minute monthly system-peak intervals over a CP year running Oct 1 &rarr; Sep 30. A DSP&rsquo;s 12CP load is the average of its twelve coincident demands, so each caught peak is worth 1/12 of the determinant, not 1/4.</p>
        <p>Our load series is hourly, forward-filled onto the 15-minute panel grid, so a CP resolves to its peak hour rather than the 30-minute interval the rule actually settles on &mdash; every &ldquo;hours&rdquo; number below is an hour-resolution answer, and a 30-minute settlement can only make catching a CP harder.</p>
        <p>Peak-hour windows are derived, not assumed: at most two contiguous local-hour ranges per calendar month covering &ge;95% of observed monthly peaks over 2011&ndash;2025, padded &plusmn;1 h. December&ndash;February peaks at 07h; October at 16h; March&ndash;May are bimodal.</p>
        <p>Rules, using only information available before the interval: <span className="mono">oracle</span> (the day&rsquo;s peak is known in advance, a lower bound), <span className="mono">persistence</span> (today&rsquo;s peak = yesterday&rsquo;s), <span className="mono">rolling week</span> (today&rsquo;s peak = mean of the last 7 daily peaks).</p>
        <p>Rate scaling: mean(12 monthly peaks) / mean(4 summer peaks) &asymp; 0.858 per CP year, so <span className="mono">rate_12cp = rate_4cp / ratio</span> &asymp; 1.166&times; rate_4cp &mdash; a smaller denominator means a larger $/kW rate, not a smaller one.</p>
        <p>Catching all twelve needs 1,069 h/yr of standby under persistence (490 h under oracle), worth $44.5k&ndash;87.8k/MW-yr &mdash; but only for loads outside the minimum billing demand, below.</p>
      </Section>

      <Section label="minimum billing demand">
        <p>Proposed 16 TAC 25.193(d): a REP serving a 25.194 large load (&ge;75 MW) is charged a minimum billing demand for at least 15 years, equal to the greatest of (A) contracted peak demand C, (B) the highest non-coincident peak (NCP) in the past year, and (C) the 12CP demand.</p>
        <p>Per 25.192(f)(1)(B), ERCOT adds back <span className="mono">MBD &minus; measured 12CP</span> to the DSP&rsquo;s 12CP load for each such customer, so the avoided cost is imputed straight back onto the system-wide bill.</p>
        <p>A campus whose nameplate is M and which ever draws M &mdash; even once, for one interval &mdash; has NCP = M. Leg (B) then binds at M for fifteen years no matter how many coincident peaks it dodges: new-load transmission avoidance is $0 at every catch rate 0..12, at any prediction skill. Metering, not prediction, is the constraint.</p>
        <p>The one exception is physical: cap grid import at the firm floor F and serve the flexible block behind the meter. Then the meter never exceeds F, all three legs equal F, and (M&minus;F)&times;rate_12CP is released &mdash; but the campus has bought a generation business, and its avoided charge has to clear that supply&rsquo;s cost.</p>
        <p>Staff also asked about softer variants: a <span className="mono">ratchet</span> (a percentage of contracted/NCP), a <span className="mono">weighted average</span> of the floor with 12CP demand, and a <span className="mono">phase-in</span>. Avoidance re-enters the money only if the ratchet falls below 30% of contracted demand at a perfect 12-of-12 catch, or the weighted-average weight on contracted/NCP drops to &le;0.43, for $50k per flexible MW-yr.</p>
        <p>At sourced 2026 costs (aeroderivative $2,058/kW, RICE $2,300&ndash;2,800/kW, 4h BESS $380/kWh, gas $3.69/MMBtu) the behind-the-meter breakeven capex is negative: the fuel premium over a $30/MWh grid already exceeds the avoided charge. That is a generation business, and today it loses.</p>
        <p>The 12CP value above survives only for loads outside 25.193(d): pre-rule interconnections and sub-75 MW sites &mdash; a closed, shrinking cohort.</p>
      </Section>

      <Section label="access">
        <p>If the minimum billing demand kills transmission-charge avoidance for new load, the only thing left a flexible campus sells is speed: energization into existing headroom instead of waiting for the wire.</p>
        <p>The value is a one-time gain, not an annuity &mdash; N months of gross margin the campus would otherwise never have earned, pulled forward. Every $/MW-yr figure here is that gain levelized over 15 years at 8% discount, and is zero at zero months.</p>
        <p>Margin per MW-month &asymp; 700 GPU/MW &times; $2.50/GPU-h &times; 730 h &times; 92% utilization &times; 0.40 contribution margin &asymp; $470k. The 0.40 contribution margin is the one genuinely unsourced number in the stack and is flagged <span className="mono">quality=assumption</span> in <span className="mono">access_assumptions.csv</span>; it scales the whole answer linearly.</p>
        <p>Three headroom estimates are kept separate, not blended, because they answer different questions: Duke&rsquo;s Nicholas Institute study finds 10 GW absorbable in ERCOT at 0.5% curtailment (&asymp;44 h/yr); the IMM finds &gt;3 GW of new peak demand absorbable with no added shortage; ERCOT&rsquo;s own SB6 CDR scenarios imply &asymp;42 GW of headroom for 2029 (a 34.7-point reserve-margin swing on a 122.2 GW peak) that exists only if the new load is curtailable.</p>
        <p>ERCOT is tracking &asymp;474 GW of large-load interconnection requests; &asymp;9.5 GW has been approved to energize since January 2022, of which &asymp;4.4 GW is actually operating &mdash; a funnel under 1%, moving at &asymp;2 GW/yr (throughput measured as the slope of the cumulative approved-to-energize series, since that series is non-monotone).</p>
        <p>One month of pulled-forward energization clears $50k/MW-yr levelized; ERCOT&rsquo;s own timelines put 24+ months on the table, against &asymp;44 h/yr of curtailment at the Duke headroom estimate &mdash; two orders of magnitude apart from the 12CP and access-vs-standby duration comparison above.</p>
      </Section>

      <Section label="clr vs ers">
        <p>Revealed preference: in 2025, aggregate ERCOT crypto-mining demand grew &asymp;900 MW, yet Controllable Load Resource (CLR) load fell 41% to a 240 MW monthly average across the 12 remaining CLRs, while those same mines grew to &gt;64% of Emergency Response Service (ERS) volume (IMM 2025 SOTM).</p>
        <p>ERS has been deployed nine times since 2007 and not once since September 2023, yet paid $42,840 per MW-yr in PY2025 for a 60-hour contractual ceiling that was never called.</p>
        <p>ERS is priced cell by cell: ERCOT clears the program year in 4 standard contract terms (DecMar, AprMay, JunSep, OctNov) against 8 daily time periods &mdash; 32 cells, hours &times; clearing price summed, hours totaling exactly 8,760.</p>
        <p>Registering as a CLR instead pays &asymp;$9.7k of ancillary services (award share &times; DAM clearing price &times; hours) plus &asymp;$25k of dispatched Phase B energy value &mdash; spending the megawatt for less. <span className="mono">clr_as_upper_bound</span> caps the AS leg at the whole flexible MW sold as the single priciest AS product, every hour, as a robustness check.</p>
        <p>Four hypotheses were tested against the move: H1 (ERS has the higher expected value) and H4 (nodal settlement would have paid mines more, rejected p=1.5e-33) are supported; H2 and H3 (a CLR cost increase or benefit cut on record) are rejected.</p>
        <p>Sophisticated flexible loads sell the option, not the interruption: a product whose premise is &ldquo;loads curtail on our signal&rdquo; is bidding against a program that pays more for the promise than the grid pays for the act.</p>
      </Section>

      <Section label="pjm">
        <p>EIA-930 hourly, BA-reported PJM RTO demand, 2018 &rarr; present; the adjusted-demand column is used and EIA-flagged spikes are dropped before peaks are computed.</p>
        <p>5CP / PLC (RPM capacity, Manual 19 &sect;4.3): the mean of the five highest non-holiday weekday summer (Jun&ndash;Sep) daily peaks, one hour each. Missing one of the five buys only a fifth of the reduction &mdash; the payoff is linear in peaks caught, unlike ERCOT 4CP&rsquo;s all-or-nothing months.</p>
        <p>1CP / NSPL (NITS transmission): the single annual zonal peak hour, all-or-nothing. There is no PJM-wide NSPL definition &mdash; it is set per transmission owner; Dominion instead uses a 12CP average, which behaves like the ERCOT 12CP case above.</p>
        <p>Catching all five capacity peaks costs &asymp;123 h/yr under persistence, worth $121.7k/MW-yr at the 2027/28 Base Residual Auction cap ($333.44/MW-day, cleared at the FERC-approved cap RTO-wide); NITS adds $25k&ndash;177k/MW-yr by zone &mdash; roughly three times ERCOT&rsquo;s money for a third of the hours.</p>
        <p>FERC&rsquo;s EL25-49 order (Dec 18 2025, 193 FERC &para;61,217) holds that interim non-firm capacity customers &ldquo;would not be charged for generation capacity&rdquo;; relief is proposed effective 2029-06-01, and FERC&rsquo;s June 18 2026 show-cause order (RM26-4) asks PJM why not sooner.</p>
      </Section>

      <Section label="phase c pre-registration">
        <p>Seven criteria (<span className="mono">pipeline/curated/verdict_criteria_c.csv</span>, sha256-pinned) were written before any Phase C number was computed.</p>
        <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyle: "disc" }}>
          <li><span className="mono">POST4CP-DEAD</span> &mdash; new-load avoidance under the proposed MBD stays below $5,000/MW-yr at every peaks-caught rate 0..12.</li>
          <li><span className="mono">MBD-BINDS</span> &mdash; for a campus that ever draws nameplate, billed demand equals nameplate at all 13 values.</li>
          <li><span className="mono">TWELVECP-COSTLY</span> &mdash; hours to catch &ge;10 of 12 monthly peaks under persistence exceed 600 h/yr at the median.</li>
          <li><span className="mono">ACCESS-CARRIES</span> &mdash; interconnection-access value levelized over 15 years at 8% is &ge;$50,000/MW-yr at &le;100 h/yr of curtailment.</li>
          <li><span className="mono">PJM-BETTER</span> &mdash; PJM&rsquo;s avoidable value per MW-yr is at least 2&times; ERCOT&rsquo;s best avoidable value at &le;100 h/yr.</li>
          <li><span className="mono">CLR-REVEALED</span> &mdash; ERS revenue per MW-yr is at least equal to CLR revenue while ERS expected deployment is below 5 h/yr.</li>
          <li><span className="mono">LEGACY-ONLY</span> &mdash; 12CP avoidance value is positive only for loads outside 25.193(d).</li>
        </ul>
        <p>Six of seven fired as predicted. PJM-BETTER did not fire by the letter, only because ERCOT&rsquo;s own access line is larger still &mdash; on transmission and capacity alone PJM wins outright. See <Link href="/verdict/" className="hover:text-[var(--ink)]" style={{ textDecoration: "underline" }}>/verdict</Link>.</p>
      </Section>

      <Section label="caveats">
        <ul className="flex flex-col gap-1.5 pl-4" style={{ listStyle: "disc" }}>
          <li>Price is not physical curtailment: a $5,000 price means someone valued the power more, not that ERCOT ordered anything off.</li>
          <li>Hubs and load zones are regions; the dot is a representative point.</li>
          <li>Five years span a regime shift (≈30 GW of new solar and storage); 2021 may be unrepresentative in both directions.</li>
          <li>A new load&rsquo;s own settlement point can differ from the hub or zone.</li>
          <li>Only two Energy Emergency Alerts occurred in the window: Winter Storm Uri (Feb 15–19, 2021) and Sep 6, 2023 (19:25–20:37 CT).</li>
          <li>Every constant above lives in <span className="mono">pipeline/src/flexuw/config.py</span>.</li>
        </ul>
      </Section>

      <Section label="reproduce">
        <pre className="mono text-xs p-3 mt-1 overflow-x-auto card" style={{ whiteSpace: "pre-wrap" }}>
{`git clone <repo>
cd pipeline && uv sync
uv run flexuw fetch-yearly
uv run flexuw fetch-load
uv run flexuw parse-yearly
uv run flexuw parse-load
uv run flexuw build-site-data
cd ../site && pnpm build`}
        </pre>
        <p className="mt-1" style={{ color: "var(--muted)" }}>MANIFEST.jsonl records every downloaded file with sha256.</p>
      </Section>

      <Section label="download">
        <p>
          Everything on this site, one file: <a href="/report/ercot-flex-report.zip" download="ercot-flex-report.zip" className="mono hover:text-[var(--ink)]" style={{ color: "var(--gold)" }}>/report/ercot-flex-report.zip</a> (summary.csv, yearly.csv, correlation/*.csv, nodes/*.json, curated tables, MANIFEST.jsonl, methodology.md).
        </p>
      </Section>
    </main>
  );
}
