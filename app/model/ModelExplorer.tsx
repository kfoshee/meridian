"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ComponentKey = "demand" | "wind" | "solar" | "net";
type Forecast = { point: number; actual: number; low: number; high: number };
type Hour = {
  hour: number;
  components: Record<ComponentKey, Forecast>;
  baseline: number;
  correction: number;
  temperature: number;
  windCapacity: number;
  solarCapacity: number;
};
type Snapshot = {
  version: string;
  modelHash: string;
  day: string;
  snapshotDate: string;
  status: string;
  reloadMaxErrorMW: number;
  horizons: {
    days: number;
    issueTime: string;
    trainingDays: number;
    trainingHours: number;
    hours: Hour[];
  }[];
};
const names: Record<ComponentKey, string> = {
  demand: "Demand",
  wind: "Wind",
  solar: "Solar",
  net: "Residual demand",
};
const steps = ["Forecast", "Model", "System"];
const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

function HourChart({
  hours,
  metric,
  selected,
  observed,
  interval,
  onSelect,
}: {
  hours: Hour[];
  metric: ComponentKey;
  selected: number;
  observed: boolean;
  interval: boolean;
  onSelect: (hour: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const data = hours.map((h) => h.components[metric]);
  const maximum =
    Math.ceil(
      Math.max(...data.flatMap((d) => [d.point, observed ? d.actual : 0, interval ? d.high : 0])) /
        10,
    ) * 10;
  const top = Math.max(10, maximum);
  const left = 43,
    right = width - 18,
    bottom = 254;
  const x = (i: number) => left + (i / 23) * (right - left);
  const y = (v: number) => bottom - (v / top) * 218;
  const line = (key: keyof Forecast) =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(d[key]).toFixed(2)}`).join(" ");
  const band = `${line("high")} ${data.map((d, i) => `L${x(23 - i).toFixed(2)},${y(data[23 - i].low).toFixed(2)}`).join(" ")} Z`;
  const ticks = width < 480 ? [0, 8, 16, 23] : [0, 4, 8, 12, 16, 20, 23];
  return (
    <div className="mx-chart" ref={container}>
      <svg
        width="100%"
        height="300"
        viewBox={`0 0 ${width} 300`}
        role="img"
        aria-label={`${names[metric]} on July 1, 2025. Forecast${observed ? ", observations" : ""}${interval ? " and 5th to 95th scenario percentiles" : ""}, in gigawatts.`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onSelect(
            Math.max(
              0,
              Math.min(
                23,
                Math.round(
                  ((((event.clientX - rect.left) * width) / rect.width - left) / (right - left)) *
                    23,
                ),
              ),
            ),
          );
        }}
      >
        <text x="4" y="18">
          GW
        </text>
        {[0, 1, 2, 3, 4].map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={right}
              y1={y((top * n) / 4)}
              y2={y((top * n) / 4)}
              className="mx-gridline"
            />
            <text x={left - 10} y={y((top * n) / 4) + 4} textAnchor="end">
              {(top * n) / 4}
            </text>
          </g>
        ))}
        {interval ? <path d={band} className="mx-band" /> : null}
        {observed ? <path d={line("actual")} className="mx-observed" /> : null}
        <path d={line("point")} className="mx-forecast" />
        <line x1={x(selected)} x2={x(selected)} y1="28" y2={bottom} className="mx-cursor" />
        <circle cx={x(selected)} cy={y(data[selected].point)} r="5" className="mx-dot" />
        {ticks.map((h) => (
          <text key={h} x={x(h)} y="277" textAnchor={h === 23 ? "end" : "middle"}>
            {String(h).padStart(2, "0")}
          </text>
        ))}
        <text x={right} y="298" textAnchor="end">
          Hour · Central time
        </text>
      </svg>
    </div>
  );
}

function Stage({ label, title, value }: { label: string; title: string; value?: string }) {
  return (
    <div className="mm-node">
      <span>{label}</span>
      <strong>{title}</strong>
      {value ? <small>{value}</small> : null}
    </div>
  );
}

export default function ModelExplorer({ snapshot }: { snapshot: Snapshot }) {
  const [step, setStep] = useState(0);
  const [horizon, setHorizon] = useState(0);
  const [hour, setHour] = useState(14);
  const [metric, setMetric] = useState<ComponentKey>("demand");
  const day = snapshot.horizons[horizon];
  const current = day.hours[hour];
  const point = current.components[metric];
  return (
    <main className="mm-root">
      <header className="mm-header">
        <Link href="/" aria-label="Meridian home" className="mm-logo">
          <Image
            src="/media/meridian-mark-20.webp"
            alt="Meridian"
            width={54}
            height={48}
            priority
          />
        </Link>
        <span className="mm-region">
          <strong>Texas</strong>
          <small>ERCOT</small>
        </span>
      </header>
      <div className="mm-shell">
        <nav className="mm-tabs" role="tablist" aria-label="Model walkthrough">
          {steps.map((name, i) => (
            <button
              key={name}
              type="button"
              id={`mm-tab-${i}`}
              role="tab"
              aria-selected={step === i}
              aria-controls={`mm-panel-${i}`}
              onClick={() => setStep(i)}
              onKeyDown={(event) => {
                if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : (i + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                setStep(next);
                document.getElementById(`mm-tab-${next}`)?.focus();
              }}
            >
              {name}
            </button>
          ))}
        </nav>
        <section
          className="mm-stage"
          role="tabpanel"
          id={`mm-panel-${step}`}
          aria-labelledby={`mm-tab-${step}`}
        >
          {step === 0 ? (
            <>
              <div className="mm-toolbar">
                <div className="mm-components" aria-label="Component">
                  {(Object.keys(names) as ComponentKey[]).map((key) => (
                    <button
                      type="button"
                      key={key}
                      aria-pressed={metric === key}
                      onClick={() => setMetric(key)}
                    >
                      {names[key]}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Forecast horizon"
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                >
                  {snapshot.horizons.map((h, i) => (
                    <option key={h.days} value={i}>
                      D+{h.days}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mm-reading" aria-live="polite">
                <h1>
                  {point.point.toFixed(1)}
                  <small> GW</small>
                </h1>
                <span>
                  {hourLabel(hour)} CT <i>·</i> 01 Jul 2025
                </span>
              </div>
              <HourChart
                hours={day.hours}
                metric={metric}
                selected={hour}
                observed={true}
                interval={true}
                onSelect={setHour}
              />
              <div className="mm-legend">
                <span>
                  <i />
                  Forecast
                </span>
                <span>
                  <i className="mm-dashed" />
                  Observed
                </span>
                <span>
                  <i className="mm-band-key" />
                  5–95% scenarios
                </span>
              </div>
            </>
          ) : step === 1 ? (
            <>
              <div className="mm-toolbar">
                <h1>Demand model</h1>
                <select
                  aria-label="Forecast horizon"
                  value={horizon}
                  onChange={(e) => setHorizon(Number(e.target.value))}
                >
                  {snapshot.horizons.map((h, i) => (
                    <option key={h.days} value={i}>
                      D+{h.days}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mm-input-strip">
                <span>Weather</span>
                <b>+</b>
                <span>Calendar</span>
                <b>+</b>
                <span>Fleet</span>
              </div>
              <div className="mm-down" aria-hidden="true">
                ↓
              </div>
              <div className="mm-model-equation">
                <Stage label="Ridge baseline" title={current.baseline.toFixed(3)} value="GW" />
                <b>+</b>
                <Stage label="Boosted residual" title={current.correction.toFixed(3)} value="GW" />
                <b>=</b>
                <Stage
                  label="Demand"
                  title={current.components.demand.point.toFixed(3)}
                  value="GW"
                />
              </div>
              <div className="mm-fit">
                <span>
                  <strong>{day.trainingDays.toLocaleString("en-US")}</strong> training days
                </span>
                <span>
                  <strong>{day.trainingHours.toLocaleString("en-US")}</strong> hourly rows
                </span>
              </div>
              <div className="mm-renewables">
                <span>Wind / solar</span>
                <strong>Boosted capacity factor × fleet capacity</strong>
              </div>
            </>
          ) : (
            <>
              <div className="mm-toolbar">
                <h1>System architecture</h1>
                <span className="mm-subtle">Offline → online</span>
              </div>
              <div className="mm-system">
                <div className="mm-system-row">
                  <Stage label="Sources" title="NOAA + EIA" />
                  <b>→</b>
                  <Stage label="ETL" title="Python / Parquet" />
                  <b>→</b>
                  <Stage label="Fit + inference" title="scikit-learn" />
                </div>
                <div className="mm-spine" aria-hidden="true">
                  ↓
                </div>
                <div className="mm-artifact">
                  <span>Versioned forecast artifact</span>
                  <code>SHA-256 · {snapshot.modelHash.slice(0, 12)}</code>
                </div>
                <div className="mm-branches">
                  <div>
                    <span className="mm-branch-arrow" aria-hidden="true">
                      ↓
                    </span>
                    <Stage
                      label="Research API · separate"
                      title="FastAPI + Pydantic"
                      value="Runtime validation"
                    />
                  </div>
                  <div>
                    <span className="mm-branch-arrow" aria-hidden="true">
                      ↓
                    </span>
                    <Stage
                      label="This page · JSON snapshot"
                      title="Next.js + TypeScript"
                      value="Static export + React state"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          {step < 2 ? (
            <div className="mm-slider">
              <label htmlFor="mm-hour">{hourLabel(hour)} CT</label>
              <input
                id="mm-hour"
                aria-label="Forecast hour, Central time"
                aria-valuetext={`${hourLabel(hour)} Central time`}
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
