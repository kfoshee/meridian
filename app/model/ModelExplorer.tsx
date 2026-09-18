"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProviderContact from "./ProviderContact";

type EvidenceKey = "ordinary" | "hourly" | "path" | "warning" | "coverage";

type PublicGridPoint = { at: number; prc_mw: number };
type PublicGridFeed = {
  schema: "meridian.public.ercot-prc.v1";
  status: "live" | "unavailable";
  updated_at?: string;
  current?: {
    prc_mw: number;
    state: string | null;
    title: string | null;
    note: string | null;
  };
  points?: PublicGridPoint[];
};

const evidenceOrder: EvidenceKey[] = ["coverage", "warning", "path", "hourly", "ordinary"];

type EvidenceMetric = {
  label: string;
  result: string;
  note: string;
  direction: string;
  mode: "lower" | "target";
  target?: number;
  values: { name: string; value: number; display: string }[];
};

const evidence = {
  ordinary: {
    label: "Ordinary",
    result: "399.94",
    note: "Zenith ordinary-condition WIS",
    direction: "Lower is better",
    mode: "lower",
    values: [
      { name: "Zenith", value: 399.9428, display: "399.94" },
      { name: "ERCOT-derived", value: 397.2783, display: "397.28" },
      { name: "EMOS / ECC", value: 400.3697, display: "400.37" },
      { name: "NGBoost / ECC", value: 401.5004, display: "401.50" },
    ],
  },
  hourly: {
    label: "Hourly",
    result: "409.08",
    note: "Zenith full-calendar WIS",
    direction: "Lower is better",
    mode: "lower",
    values: [
      { name: "Zenith", value: 409.077, display: "409.08" },
      { name: "ERCOT-derived", value: 406.9798, display: "406.98" },
      { name: "EMOS / ECC", value: 410.2024, display: "410.20" },
      { name: "NGBoost / ECC", value: 410.3919, display: "410.39" },
    ],
  },
  path: {
    label: "Trajectory",
    result: "642.12",
    note: "Zenith energy score",
    direction: "Lower is better",
    mode: "lower",
    values: [
      { name: "Zenith", value: 642.1195, display: "642.12" },
      { name: "ERCOT-derived", value: 645.8034, display: "645.80" },
      { name: "EMOS / ECC", value: 647.4532, display: "647.45" },
      { name: "NGBoost / ECC", value: 646.6572, display: "646.66" },
    ],
  },
  warning: {
    label: "Warning",
    result: "0.10004",
    note: "Zenith event-window Brier",
    direction: "Lower is better",
    mode: "lower",
    values: [
      { name: "Zenith", value: 0.1000357, display: "0.10004" },
      { name: "ERCOT-derived", value: 0.1014435, display: "0.10144" },
      { name: "EMOS / ECC", value: 0.1756586, display: "0.17566" },
      { name: "NGBoost / ECC", value: 0.1590887, display: "0.15909" },
    ],
  },
  coverage: {
    label: "Coverage",
    result: "88.92%",
    note: "Zenith nominal 90% coverage",
    direction: "Closer to 90% is better",
    mode: "target",
    target: 90,
    values: [
      { name: "Zenith", value: 88.9186, display: "88.92%" },
      { name: "ERCOT-derived", value: 86.3381, display: "86.34%" },
      { name: "EMOS / ECC", value: 87.0346, display: "87.03%" },
      { name: "NGBoost / ECC", value: 86.5941, display: "86.59%" },
    ],
  },
} satisfies Record<EvidenceKey, EvidenceMetric>;

const PUBLIC_GRID_FEED = "https://meridian-public-feed.vercel.app/api/grid";

function LiveGridChart() {
  const [feed, setFeed] = useState<PublicGridFeed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch(PUBLIC_GRID_FEED, { cache: "no-store" });
        if (!response.ok) throw new Error("Grid feed unavailable");
        const next = (await response.json()) as PublicGridFeed;
        if (
          next.schema !== "meridian.public.ercot-prc.v1" ||
          next.status !== "live" ||
          !Array.isArray(next.points) ||
          next.points.length < 2
        ) {
          throw new Error("Grid feed failed validation");
        }
        if (active) {
          setFeed(next);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const points = feed?.points ?? [];
  const values = points.map((point) => point.prc_mw);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const spread = Math.max(high - low, 1);
  const path = points
    .map((point, index) => {
      const x = 42 + (index / Math.max(points.length - 1, 1)) * 654;
      const y = 250 - ((point.prc_mw - low) / spread) * 150;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const lastPoint = points.at(-1);
  const lastY = lastPoint ? 250 - ((lastPoint.prc_mw - low) / spread) * 150 : 175;
  const updated = feed?.updated_at
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
        timeZoneName: "short",
      }).format(new Date(feed.updated_at))
    : null;

  return (
    <div
      className="mf-chart mf-live-chart"
      aria-label="Live ERCOT reported Physical Responsive Capability over the last six hours"
    >
      <div className="mf-chart-head">
        <span>
          <i className={failed ? "is-offline" : ""} /> Live ERCOT grid state
        </span>
        <span>{updated ?? (failed ? "Unavailable" : "Connecting…")}</span>
      </div>
      <div className="mf-live-value">
        <strong>{feed?.current?.prc_mw?.toLocaleString("en-US") ?? "—"}</strong>
        <span>MW reported PRC</span>
        <em>{feed?.current?.title ?? (failed ? "Feed unavailable" : "Loading live signal")}</em>
      </div>
      <svg viewBox="0 0 720 300" role="img" aria-label="Six-hour reported PRC trend">
        <defs>
          <linearGradient id="mf-live-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4af37" stopOpacity=".28" />
            <stop offset="1" stopColor="#d4af37" stopOpacity="0" />
          </linearGradient>
          <filter id="mf-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[70, 130, 190, 250].map((y) => (
          <line key={y} x1="42" x2="696" y1={y} y2={y} className="mf-grid" />
        ))}
        {path ? <path className="mf-live-area" d={`${path} L696 250 L42 250 Z`} /> : null}
        {path ? <path className="mf-live-line" filter="url(#mf-glow)" d={path} /> : null}
        {lastPoint ? (
          <g className="mf-live-point" transform={`translate(696 ${lastY.toFixed(1)})`}>
            <circle r="10" className="mf-live-point-ring" />
            <circle r="4" className="mf-point" />
          </g>
        ) : null}
        <text x="42" y="282" className="mf-label">
          6 HOURS AGO
        </text>
        <text x="696" y="282" textAnchor="end" className="mf-label">
          NOW
        </text>
      </svg>
      <div className="mf-live-foot">
        <span>Public ERCOT data</span>
        <span>Not a Zenith forecast</span>
      </div>
    </div>
  );
}

const uriCoverage = [
  { name: "Zenith", short: "Zenith", value: 43.58 },
  { name: "ERCOT-derived", short: "ERCOT", value: 41.96 },
  { name: "EMOS / ECC", short: "EMOS", value: 42.77 },
  { name: "NGBoost / ECC", short: "NGBoost", value: 46.12 },
];

function UriChart() {
  return (
    <div
      className="mf-alert-chart"
      role="img"
      aria-label="Nominal 90 percent interval coverage during Uri was 43.58 percent for Zenith, 41.96 percent for the ERCOT-derived baseline, 42.77 percent for EMOS ECC, and 46.12 percent for NGBoost ECC. Every model failed the 87 percent qualification gate."
    >
      <div className="mf-alert-axis" aria-hidden="true">
        <span>87%</span>
        <span>44%</span>
        <span>0</span>
      </div>
      <div className="mf-alert-groups" aria-hidden="true">
        {uriCoverage.map((item) => (
          <div className="mf-alert-group" key={item.name}>
            <div className="mf-alert-bars">
              <i
                className={item.name === "Zenith" ? "zenith" : ""}
                style={{ height: `${(item.value / 87) * 100}%` }}
              >
                <b>{item.value.toFixed(2)}%</b>
              </i>
            </div>
            <span>{item.short}</span>
          </div>
        ))}
      </div>
      <div className="mf-alert-legend">
        <span>
          <i className="zenith" />
          Zenith
        </span>
        <span>
          <i />
          Comparators
        </span>
        <small>All below the 87% qualification gate</small>
      </div>
    </div>
  );
}

function ModelFlow() {
  return (
    <section className="mf-flow mf-reveal" aria-label="Decision outlook">
      <div className="mf-flow-map">
        <div className="mf-flow-inputs" aria-label="High-level input categories">
          {[
            ["Demand", "M5 30 C24 8 39 26 57 14 S91 30 115 9"],
            ["Renewables", "M5 27 C22 12 39 8 57 25 S89 11 115 18"],
            ["Capacity", "M5 13 C28 14 39 29 59 18 S90 9 115 25"],
            ["Outages", "M5 12 C28 13 39 24 59 19 S91 30 115 25"],
          ].map(([label, path]) => (
            <div key={label}>
              <span>{label}</span>
              <svg viewBox="0 0 120 40" aria-hidden="true">
                <path d={path} />
              </svg>
            </div>
          ))}
        </div>
        <span className="mf-flow-arrow" aria-hidden="true">
          →
        </span>
        <div className="mf-flow-core">
          <small>ZENITH</small>
          <strong>168h</strong>
          <span>decision outlook</span>
          <div>
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <span className="mf-flow-arrow" aria-hidden="true">
          →
        </span>
        <div className="mf-flow-outputs">
          <div>
            <small>WHEN</small>
            <strong>Onset + recovery</strong>
          </div>
          <div>
            <small>WHERE</small>
            <strong>Grid tightness</strong>
          </div>
          <div>
            <small>HOW</small>
            <strong>Flexible timing</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison({ active }: { active: EvidenceKey }) {
  const item = evidence[active];
  const quality = item.values.map((value) =>
    item.mode === "target"
      ? -Math.abs(value.value - (item.target ?? value.value))
      : -value.value,
  );
  const best = Math.max(...quality);
  const worst = Math.min(...quality);

  return (
    <div className="mf-comparison" aria-live="polite">
      <div className="mf-result">
        <strong>{item.result}</strong>
        <span>{item.note}</span>
      </div>
      <div className="mf-bars">
        {item.values.map((value, index) => {
          const width =
            78 + ((quality[index] - worst) / Math.max(best - worst, Number.EPSILON)) * 22;
          return (
            <div key={value.name}>
              <div className="mf-bar-label">
                <span>{value.name}</span>
                <strong>{value.display}</strong>
              </div>
              <div className="mf-bar-track">
                <span
                  className={value.name === "Zenith" ? "accent" : ""}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
        <small>{item.direction}</small>
      </div>
    </div>
  );
}

export default function ModelExplorer() {
  const [active, setActive] = useState<EvidenceKey>("coverage");

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".mf-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6%" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="mf-root">
      <header className="mf-header">
        <Link href="/" className="mf-back">
          ← Back
        </Link>
        <div className="mf-lockup">
          <Image src="/media/meridian-mark-20.webp" alt="" width={44} height={40} priority />
          <span>
            <strong>Meridian</strong>
            <small>Texas · ERCOT</small>
          </span>
        </div>
      </header>

      <section className="mf-hero mf-reveal">
        <div className="mf-copy">
          <span className="mf-development">Still in development</span>
          <h1>Zenith</h1>
          <p>Probabilistic Texas grid-tightness forecasting.</p>
          <div className="mf-stats">
            <span>
              <strong>168h</strong> horizon
            </span>
            <span>
              <strong>1,096</strong> origins
            </span>
            <span>
              <strong>4</strong> models
            </span>
          </div>
        </div>
        <LiveGridChart />
      </section>

      <section className="mf-questions mf-reveal" aria-labelledby="mf-questions-title">
        <div className="mf-section-copy">
          <h2 id="mf-questions-title">Illustrative outlook.</h2>
        </div>
        <div className="mf-example-card">
          <header>
            <span>Tue · 4–7 PM</span>
            <span>Example only</span>
          </header>
          <div className="mf-example-body">
            <div className="mf-example-risk">
              <small>CONSTRAINT RISK</small>
              <strong>72%</strong>
              <span>Elevated</span>
            </div>
            <div
              className="mf-example-window"
              aria-label="Risk rises from 4 PM to 7 PM and clears by 9 PM"
            >
              <div>
                <span>4 PM</span>
                <span>7 PM</span>
                <span>9 PM</span>
              </div>
              <svg
                viewBox="0 0 600 120"
                role="img"
                aria-label="Constraint risk rises toward 7 PM and clears by 9 PM"
              >
                <defs>
                  <linearGradient id="mf-example-fill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#d4af37" stopOpacity=".03" />
                    <stop offset=".62" stopColor="#d4af37" stopOpacity=".34" />
                    <stop offset="1" stopColor="#d4af37" stopOpacity=".02" />
                  </linearGradient>
                </defs>
                <line x1="0" x2="600" y1="78" y2="78" className="mf-example-threshold" />
                <path
                  className="mf-example-area"
                  d="M0 96 C90 93 130 79 188 62 C250 44 312 29 382 35 C457 42 505 70 600 91 L600 112 L0 112 Z"
                />
                <path
                  className="mf-example-line"
                  d="M0 96 C90 93 130 79 188 62 C250 44 312 29 382 35 C457 42 505 70 600 91"
                />
                <circle cx="382" cy="35" r="5" className="mf-example-point" />
              </svg>
              <p>
                <span>Risk window</span>
                <span>Clear</span>
              </p>
            </div>
            <div className="mf-example-action">
              <small>FLEXIBLE WINDOW</small>
              <strong>Shift before peak</strong>
              <span>Resume after 9 PM</span>
            </div>
          </div>
        </div>
      </section>

      <ModelFlow />

      <section className="mf-proof mf-reveal" aria-label="Model evidence">
        <div className="mf-proof-head">
          <h2>Comparison.</h2>
          <span>1,096 matched origins · 2020–2022</span>
        </div>
        <div className="mf-tabs" role="tablist" aria-label="Model evidence">
          {evidenceOrder.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              onClick={() => setActive(key)}
            >
              {evidence[key].label}
            </button>
          ))}
        </div>
        <Comparison active={active} />
        <p className="mf-evidence-note">
          Historical reconstruction · ERCOT-derived is not ERCOT&apos;s internal model.
        </p>
      </section>

      <section className="mf-headtohead mf-reveal" aria-label="Uri coverage comparison">
        <div className="mf-proof-head mf-alert-head">
          <p>Nominal 90% interval coverage during Uri.</p>
        </div>
        <UriChart />
      </section>

      <section className="mf-value mf-reveal" aria-label="Forecast value">
        <h2>Forecast what matters.</h2>
        <ul>
          <li>
            <span>Anticipate 4CP peaks</span>
          </li>
          <li>
            <span>Shift flexible load</span>
          </li>
          <li>
            <span>Lower grid costs</span>
          </li>
          <li>
            <span>Protect uptime</span>
          </li>
        </ul>
      </section>

      <ProviderContact />
    </main>
  );
}
