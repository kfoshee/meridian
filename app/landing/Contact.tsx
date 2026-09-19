"use client";
import { useEffect, useRef, useState } from "react";

// Contact: a button that opens a fixed slide-over sheet. Transform-only animation, so nothing reflows.
const TO = "kianfoshee@gmail.com";
// The site is a static export on GitHub Pages, so the form posts cross-origin to the
// route handler on Vercel. The trailing slash matters: without it the request is a 308
// redirect, and a redirected preflight fails CORS.
const ENDPOINT = "https://ercot-flex.vercel.app/api/contact/";

type Status = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const sec = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (sec.current) io.observe(sec.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const openerEl = opener.current;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => first.current?.focus(), 440);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
      removeEventListener("keydown", onKey);
      openerEl?.focus();
    };
  }, [open]);

  const show = () => setOpen(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      location: String(fd.get("location") ?? ""),
      sizeMw: String(fd.get("sizeMw") ?? ""),
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""),
    };
    setStatus("sending");
    setErrors({});
    setFailure("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("sent");
        return;
      }
      if (res.status === 400 && data?.errors) {
        setErrors(data.errors);
        setStatus("idle");
        return;
      }
      setFailure(data?.error || "Could not send your message. Please try again.");
      setStatus("error");
    } catch {
      setFailure("Could not reach the server. Please check your connection and try again.");
      setStatus("error");
    }
  }

  const sending = status === "sending";

  return (
    <section ref={sec} className={`contact${seen ? " on" : ""}`}>
      <div className="contact-in">
        <h2>Tell us about your site.</h2>
        <button
          ref={opener}
          type="button"
          className="contact-open"
          onClick={show}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Contact us
        </button>
      </div>

      <div
        className={`sheet-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`sheet${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Contact Meridian"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="sheet-head">
          <h3>Contact.</h3>
          <button type="button" className="sheet-x" onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
        </div>

        {status === "sent" ? (
          <div className="contact-success">
            <p className="contact-ok">
              Thank you — your message is on its way to Kian. He answers from{" "}
              <a href={`mailto:${TO}`}>{TO}</a>, usually within a day.
            </p>
            <button type="button" className="contact-open sheet-done" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="sheet-sub">
              Tell Kian about your facility, power constraints, or interest in a Meridian design
              partnership.
            </p>
            <form onSubmit={onSubmit} noValidate>
              <div>
                <input
                  ref={first}
                  name="name"
                  type="text"
                  placeholder="Name"
                  autoComplete="name"
                  required
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "contact-e-name" : undefined}
                />
                {errors.name && <p className="contact-err" id="contact-e-name">{errors.name}</p>}
              </div>
              <div>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "contact-e-email" : undefined}
                />
                {errors.email && <p className="contact-err" id="contact-e-email">{errors.email}</p>}
              </div>
              <input name="company" type="text" placeholder="Company or site" autoComplete="organization" />
              <input name="location" type="text" placeholder="Location" />
              <input name="sizeMw" type="text" inputMode="decimal" placeholder="Site size (MW)" />
              <div>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Message"
                  required
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "contact-e-message" : undefined}
                />
                {errors.message && <p className="contact-err" id="contact-e-message">{errors.message}</p>}
              </div>

              {/* Honeypot: off-screen and never announced. A filled value means a bot. */}
              <div className="contact-hp" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <button type="submit" className="contact-open sheet-send" disabled={sending}>
                {sending ? "Sending…" : "Send"}
              </button>

              <div className="contact-actions" aria-live="polite">
                {sending && <p className="contact-err">Sending your message…</p>}
                {status === "error" && (
                  <p className="contact-err">
                    {failure} You can also write to <a href={`mailto:${TO}`}>{TO}</a>.
                  </p>
                )}
              </div>
            </form>
            <p className="sheet-sub" style={{ marginTop: 24 }}>
              Prefer your own email app? Write to{" "}
              <a href={`mailto:${TO}?subject=${encodeURIComponent("Meridian design partnership")}`}>
                {TO}
              </a>
              .
            </p>
          </>
        )}
      </aside>
    </section>
  );
}
