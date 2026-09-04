import Link from "next/link";

// Every page except the landing page: a quiet hold, and the way back.
export default function ComingSoon() {
  return (
    <main style={{ minHeight: "100svh", background: "#000", display: "grid", placeItems: "center", padding: "10vh 8vw", fontFamily: "var(--font-ui), system-ui, sans-serif", textAlign: "center" }}>
      <div>
        <h1 style={{ margin: 0, fontWeight: 300, fontSize: "clamp(32px, 4vw, 56px)", letterSpacing: "-0.015em", color: "var(--ink)" }}>Coming soon.</h1>
        <Link href="/" style={{ display: "inline-block", marginTop: 34, padding: "12px 22px", border: "1px solid var(--gold)", borderRadius: 999, color: "var(--gold-hi)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, textDecoration: "none" }}>Back to Meridian</Link>
      </div>
    </main>
  );
}
