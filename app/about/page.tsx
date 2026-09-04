import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About · Meridian", description: "Meridian manages power for AI data centers: siting, commitment, design, operations." };

const FOUR = [
  { k: "Siting", when: "Before they build.", body: "We tell them what each candidate parcel is worth in megawatts: constraint history, congestion exposure, and the likely firm-versus-flexible split at that node. That split is the whole game. A better node can mean 30 more megawatts of firm capacity, worth hundreds of millions over the life of the asset." },
  { k: "Commitment", when: "Before they file.", body: "They have to declare how much of their load will be dispatchable. Commit too little and megawatts go unallocated. Commit too much and a performance failure revokes the whole flexible portion. Today they pick a number. We give them one with a distribution behind it." },
  { k: "Design", when: "While they build.", body: "If flexibility determines megawatts, it should shape the building: battery sizing, cooling response, whether to separate a flexible zone, what the scheduler must support, and metering fine enough to prove compliance later. These are design-time decisions, and expensive to retrofit." },
  { k: "Operations", when: "Once they’re live.", body: "We forecast physical tightness at their node a day ahead, turn it into a schedule so the curtailment lands on work that doesn’t care, execute in cost order, and produce the meter-verified record." },
];

export default function About() {
  return (
    <main className="min-h-screen px-6 md:px-10 py-10" style={{ fontFamily: "var(--font-ui), system-ui, sans-serif" }}>
      <header className="max-w-[880px] mx-auto flex items-baseline justify-between gap-4">
        <Link href="/landing/" className="display" style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", textDecoration: "none" }}>Meridian</Link>
        <nav className="flex gap-6 label">
          <span style={{ color: "var(--ink)" }}>About</span>
          <Link href="/model/" className="hover:text-[var(--ink)]">Model</Link>
          <Link href="/research/" className="hover:text-[var(--ink)]">Research</Link>
          <Link href="/methodology/" className="hover:text-[var(--ink)]">Methodology</Link>
        </nav>
      </header>

      <article className="max-w-[880px] mx-auto" style={{ paddingTop: "14vh", paddingBottom: "12vh" }}>
        <h1 style={{ fontWeight: 300, fontSize: "clamp(34px, 4.2vw, 60px)", lineHeight: 1.1, letterSpacing: "-0.015em", color: "var(--ink)", margin: 0, maxWidth: "16em" }}>
          Meridian manages power for AI data centers.
        </h1>
        <p style={{ marginTop: 28, maxWidth: "36em", color: "var(--muted)", fontWeight: 300, fontSize: "clamp(17px, 1.3vw, 20px)", lineHeight: 1.55 }}>
          Power is the binding constraint on AI, and the people constrained by it are not managing it. Compute and cooling have vendors, tooling, and specialists. Power is treated as a fixed input you accept. It is a set of decisions, and today every one of them is made on intuition. Meridian makes each one with a number behind it.
        </p>

        <section style={{ marginTop: "12vh" }}>
          <div className="label" style={{ marginBottom: 20 }}>Why this matters</div>
          <div style={{ display: "grid", gap: 22, maxWidth: "38em", color: "var(--muted)", fontWeight: 300, fontSize: "clamp(17px, 1.3vw, 20px)", lineHeight: 1.6 }}>
            <p style={{ margin: 0, color: "var(--ink)" }}>Energy is the bottleneck of everything that comes next.</p>
            <p style={{ margin: 0 }}>Intelligence is becoming cheap. Machines that can do physical work on their own, in labs, on farms, in hospitals and on disaster sites, are close behind. Put those two together and energy turns straight into outcomes: a cure found in months instead of decades, a city rebuilt before the next storm, food and medicine and shelter for everyone who needs them.</p>
            <p style={{ margin: 0 }}>The rate of all of that is set by how much power we can bring online and how well we use it. A grid that turns away load, or an interconnection that takes seven years, is not an inconvenience. It is the speed limit on how quickly the hard problems get solved.</p>
            <p style={{ margin: 0 }}>Meridian is built on that bet. Every megawatt we unlock, at a node that had none to spare, in a building designed to flex, in an hour the grid could not otherwise carry, brings that world forward. We do the unglamorous part: the siting, the commitment, the design, the operations, with a number behind each decision. The acceleration is the point.</p>
          </div>
        </section>

        <section style={{ marginTop: "12vh" }}>
          <div className="label" style={{ marginBottom: 36 }}>Four things, following the customer’s lifecycle</div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 44 }}>
            {FOUR.map((f, i) => (
              <li key={f.k} className="hair" style={{ paddingTop: 28, display: "grid", gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr)", gap: 28 }}>
                <div>
                  <div style={{ color: "var(--gold-hi)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>{i + 1} · {f.k}</div>
                  <div style={{ marginTop: 8, color: "var(--ink)", fontWeight: 300, fontSize: 22, lineHeight: 1.2 }}>{f.when}</div>
                </div>
                <p style={{ margin: 0, color: "var(--muted)", fontWeight: 300, fontSize: 17, lineHeight: 1.6, maxWidth: "38em" }}>{f.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ marginTop: "12vh", display: "grid", gap: 40 }}>
          <div>
            <div className="label" style={{ marginBottom: 14 }}>What makes it defensible</div>
            <p style={{ margin: 0, color: "var(--muted)", fontWeight: 300, fontSize: "clamp(17px, 1.3vw, 20px)", lineHeight: 1.55, maxWidth: "36em" }}>
              The forecast can be copied. The response function cannot: how <em style={{ fontStyle: "normal", color: "var(--gold-hi)" }}>this</em> building’s meter actually moves when you act, given its cooling lag, conversion losses, and rebound. It is different at every site and learned only by operating. Each site teaches the next.
            </p>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 14 }}>Where we work</div>
            <p style={{ margin: 0, color: "var(--muted)", fontWeight: 300, fontSize: "clamp(17px, 1.3vw, 20px)", lineHeight: 1.55, maxWidth: "36em" }}>
              ERCOT first: fifteen years of settlement-point data, thirteen hubs and zones, and a model you can read end to end. The <Link href="/model/" style={{ color: "var(--ink)" }}>model</Link>, the <Link href="/research/" style={{ color: "var(--ink)" }}>research</Link>, and the <Link href="/methodology/" style={{ color: "var(--ink)" }}>methodology</Link> are all public.
            </p>
          </div>
        </section>

        <nav className="hair label" style={{ marginTop: "12vh", paddingTop: 24, display: "flex", gap: 28 }}>
          <Link href="/landing/" className="hover:text-[var(--ink)]">Home</Link>
          <Link href="/model/" className="hover:text-[var(--ink)]">Model</Link>
          <Link href="/research/" className="hover:text-[var(--ink)]">Research</Link>
          <Link href="/sources/" className="hover:text-[var(--ink)]">Sources</Link>
        </nav>
      </article>
    </main>
  );
}
