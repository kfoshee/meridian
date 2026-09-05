"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import "./footer-mark.css";

const DEPTH_LAYERS = Array.from({ length: 28 }, (_, index) => 28 - index);
const MARK = "/media/meridian-mark-20.webp";

export default function FooterMark() {
  const root = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const active = hovered || focused || pinned;

  const resetPosition = () => {
    cancelAnimationFrame(frame.current);
    const style = root.current?.style;
    style?.removeProperty("--mark-x");
    style?.removeProperty("--mark-y");
    style?.removeProperty("--light-x");
    style?.removeProperty("--light-y");
  };

  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setPinned(false);
        setFocused(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(false);
      setHovered(false);
      setFocused(false);
      resetPosition();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame.current);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const style = root.current?.style;
      style?.setProperty("--mark-x", `${-y * 23}deg`);
      style?.setProperty("--mark-y", `${x * 28}deg`);
      style?.setProperty("--light-x", `${(x + 1) * 50}%`);
      style?.setProperty("--light-y", `${(y + 1) * 50}%`);
    });
  };

  return (
    <button
      ref={root}
      type="button"
      className="footer-mark"
      data-active={active}
      aria-label="Explore the Meridian mark in 3D"
      aria-pressed={pinned}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerMove={move}
      onPointerLeave={() => {
        setHovered(false);
        resetPosition();
      }}
      onPointerCancel={() => {
        setHovered(false);
        resetPosition();
      }}
      onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => {
        setFocused(false);
        setPinned(false);
        resetPosition();
      }}
      onClick={() => {
        setPinned((value) => !value);
        setFocused(false);
        resetPosition();
      }}
    >
      <span className="footer-mark-aura" aria-hidden="true" />
      <span className="footer-mark-solid" aria-hidden="true">
        {DEPTH_LAYERS.map((depth) => (
          <span
            key={depth}
            className="footer-mark-edge"
            style={
              { "--depth": depth, "--edge-light": `${22 + (depth % 7) * 5}%` } as CSSProperties
            }
          />
        ))}
        <Image
          className="footer-mark-face"
          src={MARK}
          alt=""
          width={896}
          height={793}
          sizes="(max-width: 640px) 130px, 210px"
          unoptimized
          draggable={false}
        />
        <span className="footer-mark-light" />
      </span>
    </button>
  );
}
