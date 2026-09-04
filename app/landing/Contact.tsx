"use client";
import { useEffect, useRef, useState } from "react";

// Contact: a button that opens a fixed slide-over sheet. Transform-only animation, so nothing reflows.
const TO = "hello@meridian.energy";
export default function Contact() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const first = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const sec = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 }); if (sec.current) io.observe(sec.current); return () => io.disconnect(); }, []);

  useEffect(() => {
    if (!open) return;
    const openerEl = opener.current;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => first.current?.focus(), 440);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; clearTimeout(t); removeEventListener("keydown", onKey); openerEl?.focus(); };
  }, [open]);

  const show = () => {
    setErr("");
    setStatus("idle");
    setOpen(true);
  };

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErr("Enter your name and a valid email.");
      return;
    }

    setErr("");
    setStatus("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const r = await fetch("/api/lead/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail }),
        signal: controller.signal,
      });
      const result = await r.json().catch(() => null) as { error?: string } | null;
      if (!r.ok) throw new Error(result?.error || "We couldn't send your request.");
      setName("");
      setEmail("");
      setStatus("sent");
    } catch {
      setStatus("idle");
      setErr("We couldn't send that. Try again, or email us directly.");
    } finally {
      clearTimeout(timeout);
    }
  };

  return (
    <section ref={sec} className={`contact${seen ? " on" : ""}`}>
      <div className="contact-in">
        <h2>Tell us about your site.</h2>
        <button ref={opener} type="button" className="contact-open" onClick={show} aria-haspopup="dialog" aria-expanded={open}>Contact us</button>
      </div>

      <div className={`sheet-backdrop${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`sheet${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Contact Meridian" aria-hidden={!open}>
        <div className="sheet-head">
          <h3>Write to us</h3>
          <button type="button" className="sheet-x" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} aria-label="Close">✕</button>
        </div>
        <p className="sheet-sub">Leave your name and email. We’ll reach out to you for the details.</p>
        {status === "sent" ? (
          <div className="contact-success" role="status" aria-live="polite">
            <p className="contact-ok">Thanks. Your details are with us.</p>
            <button type="button" className="contact-open sheet-done" onClick={() => setOpen(false)}>Done</button>
          </div>
        ) : (
          <form onSubmit={send} noValidate aria-busy={status === "sending"}>
            <input ref={first} placeholder="Name" value={name} onChange={e => setName(e.target.value)} aria-label="Name" autoComplete="name" tabIndex={open ? 0 : -1} />
            <input type="email" inputMode="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" autoComplete="email" autoCapitalize="none" spellCheck={false} tabIndex={open ? 0 : -1} />
            <input className="contact-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="contact-actions">
              <button type="submit" className="contact-open sheet-send" disabled={status === "sending"} tabIndex={open ? 0 : -1}>{status === "sending" ? "Sending…" : "Send"}</button>
              {err && <span className="contact-err" role="alert">{err} <a href={`mailto:${TO}`}>{TO}</a></span>}
            </div>
          </form>
        )}
      </aside>
    </section>
  );
}
