"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProviderContact from "./ProviderContact";

type EvidenceKey = "ordinary" | "hourly" | "path" | "warning" | "coverage";

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

function ForecastChart() {
  return (
    <div className="mf-chart" aria-label="Illustrative seven-day grid constraint forecast">
      <div className="mf-chart-head">
        <span>Constraint outlook</span>
        <span>Now → 168h</span>
      </div>
      <svg viewBox="0 0 720 330" role="img" aria-label="Forecast path and uncertainty range">
        <defs>
          <linearGradient id="mf-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4af37" stopOpacity=".3" />
            <stop offset="1" stopColor="#d4af37" stopOpacity=".02" />
          </linearGradient>
          <filter id="mf-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[62, 126, 190, 254].map((y) => (
          <line key={y} x1="42" x2="696" y1={y} y2={y} className="mf-grid" />
        ))}
        <line x1="42" x2="696" y1="218" y2="218" className="mf-threshold" />
        <text x="48" y="210" className="mf-label">
          CONSTRAINED
        </text>
        <path
          className="mf-band-wide"
          d="M42 75 C110 72 145 91 202 99 C258 107 302 128 345 175 C393 228 430 286 490 270 C547 254 582 178 628 140 C660 114 678 106 696 104 L696 175 C670 182 650 196 628 222 C581 275 547 310 490 314 C429 318 393 292 345 245 C302 202 258 170 202 155 C145 139 105 132 42 128 Z"
        />
        <path
          className="mf-band-core"
          d="M42 92 C109 88 148 105 202 116 C256 127 303 149 345 193 C393 244 431 275 490 261 C547 248 582 190 628 158 C661 135 680 128 696 126 L696 154 C680 158 660 167 628 190 C581 225 547 278 490 289 C431 301 392 272 345 222 C302 177 256 151 202 138 C147 125 108 113 42 116 Z"
        />
        <path
          className="mf-median"
          filter="url(#mf-glow)"
          d="M42 105 C110 102 147 114 202 126 C257 138 302 161 345 207 C392 258 430 287 490 276 C548 265 582 209 628 176 C660 153 679 143 696 142"
        />
        <line x1="374" x2="374" y1="48" y2="292" className="mf-event" />
        <line x1="576" x2="576" y1="48" y2="292" className="mf-event" />
        <text x="384" y="47" className="mf-label">
          ONSET
        </text>
        <text x="586" y="47" className="mf-label">
          RECOVERY
        </text>
        <circle cx="374" cy="235" r="4" className="mf-point" />
        <circle cx="576" cy="214" r="4" className="mf-point" />
        <text x="42" y="318" className="mf-label">
          NOW
        </text>
        <text x="229" y="318" className="mf-label">
          +48H
        </text>
        <text x="438" y="318" className="mf-label">
          +96H
        </text>
        <text x="696" y="318" textAnchor="end" className="mf-label">
          +168H
        </text>
      </svg>
      <div className="mf-legend">
        <span>
          <i className="line" />
          Forecast
        </span>
        <span>
          <i className="band" />
          Possible futures
        </span>
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
        <ForecastChart />
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
