"use client";
import { useEffect, useRef, useState } from "react";

// Contact: a button that opens a fixed slide-over sheet. Transform-only animation, so nothing reflows.
const TO = "kianfoshee@gmail.com";
export default function Contact() {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLAnchorElement>(null);
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
        <p className="sheet-sub">
          Tell Kian about your facility, power constraints, or interest in a Meridian design
          partnership.
        </p>
        <a
          ref={first}
          className="contact-open sheet-send"
          href={`mailto:${TO}?subject=${encodeURIComponent("Meridian design partnership")}`}
          tabIndex={open ? 0 : -1}
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          Email Kian
        </a>
        <p className="sheet-sub" style={{ marginTop: 24 }}>
          Opens your email app. You can also write directly to{" "}
          <a href={`mailto:${TO}`} tabIndex={open ? 0 : -1}>
            {TO}
          </a>
          .
        </p>
      </aside>
    </section>
  );
}
