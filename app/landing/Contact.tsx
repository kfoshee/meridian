"use client";
import { useEffect, useRef, useState } from "react";

// Contact: a button that opens a fixed slide-over sheet. Transform-only animation, so nothing reflows.
export default function Contact() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const sec = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
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
    const openerElement = opener.current;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      removeEventListener("keydown", onKey);
      openerElement?.focus();
    };
  }, [open]);

  return (
    <section ref={sec} className={`contact${seen ? " on" : ""}`}>
      <div className="contact-in">
        <h2>Tell us about your site.</h2>
        <button
          ref={opener}
          type="button"
          className="contact-open"
          onClick={() => setOpen(true)}
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
      >
        <div className="sheet-head">
          <h3>Write to us</h3>
          <button
            type="button"
            className="sheet-x"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="sheet-sub">Reach Meridian through Kian Foshee.</p>
        <div className="contact-actions">
          <a
            href="https://kianfoshee.com"
            className="contact-open sheet-send"
            tabIndex={open ? 0 : -1}
          >
            Contact Kian ↗
          </a>
        </div>
      </aside>
    </section>
  );
}
