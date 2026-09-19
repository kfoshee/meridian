"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

const EMAIL = "kianfoshee@gmail.com";

export default function ProviderContact() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const openerElement = opener.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstField.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      openerElement?.focus();
    };
  }, [open]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [
      `Name: ${data.get("name")}`,
      `Organization: ${data.get("organization")}`,
      `Email: ${data.get("email")}`,
      "",
      String(data.get("message") ?? ""),
    ].join("\n");
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Zenith conversation")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="mf-contact mf-reveal">
      <div>
        <h2>Interested?</h2>
      </div>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Contact →
      </button>

      <div
        className={`mf-dialog-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`mf-dialog${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mf-contact-title"
        aria-hidden={!open}
      >
        <div className="mf-dialog-head">
          <div>
            <small>MERIDIAN</small>
            <h3 id="mf-contact-title">Talk about Zenith.</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close contact form"
            tabIndex={open ? 0 : -1}
          >
            ×
          </button>
        </div>
        <p>Grid. Territory. Portfolio.</p>
        <form onSubmit={send}>
          <label>
            <span>Name</span>
            <input
              ref={firstField}
              name="name"
              autoComplete="name"
              required
              tabIndex={open ? 0 : -1}
            />
          </label>
          <label>
            <span>Organization</span>
            <input
              name="organization"
              autoComplete="organization"
              required
              tabIndex={open ? 0 : -1}
            />
          </label>
          <label>
            <span>Work email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              tabIndex={open ? 0 : -1}
            />
          </label>
          <label>
            <span>What do you manage?</span>
            <textarea name="message" rows={3} tabIndex={open ? 0 : -1} />
          </label>
          <button type="submit" tabIndex={open ? 0 : -1}>
            Open email draft →
          </button>
        </form>
      </div>
    </section>
  );
}
