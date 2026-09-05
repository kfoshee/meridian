"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Campus from "./Campus";
import { chapterFromProgress } from "./campus-config";
import "./campus.css";

export default function Four() {
  const section = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(1);
  const storyProgress = useRef(0);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const exploring = useRef(false);
  const onSelect = useCallback((value: number) => {
    // Exploration keeps the completed campus intact; deliberate scrolling resumes the story.
    storyProgress.current = 1;
    exploring.current = true;
    setChapter(value);
  }, []);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 600px) and (max-height: 540px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (motion.matches || mobile.matches) {
        storyProgress.current = 1;
        return;
      }
      if (exploring.current) return;
      const rect = element.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
      storyProgress.current = progress;
      setChapter(chapterFromProgress(progress));
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Focus, resize and browser scroll-into-view must not restart construction during inspection.
    const resume = () => {
      exploring.current = false;
      scroll();
    };
    const resumeKeys = (event: KeyboardEvent) => {
      if (
        ["PageUp", "PageDown", "ArrowUp", "ArrowDown", " "].includes(event.key) &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("button, input, select, textarea")
        )
      )
        resume();
    };
    let touchStart = { x: 0, y: 0 };
    const touchBegin = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) touchStart = { x: touch.clientX, y: touch.clientY };
    };
    const touchScroll = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (
        touch &&
        Math.abs(touch.clientY - touchStart.y) >
          Math.max(12, Math.abs(touch.clientX - touchStart.x))
      )
        resume();
    };
    const preferences = () => {
      setReducedMotion(motion.matches);
      scroll();
    };
    const visibility = () => setVisible(document.visibilityState === "visible");
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          preload.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    const view = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    preload.observe(element);
    view.observe(element.querySelector(".dc-stage") ?? element);
    const init = requestAnimationFrame(() => {
      preferences();
      visibility();
    });
    motion.addEventListener("change", preferences);
    mobile.addEventListener("change", preferences);
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("wheel", resume, { passive: true });
    addEventListener("keydown", resumeKeys);
    addEventListener("touchstart", touchBegin, { passive: true });
    addEventListener("touchmove", touchScroll, { passive: true });
    addEventListener("resize", scroll);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      preload.disconnect();
      view.disconnect();
      cancelAnimationFrame(init);
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", preferences);
      mobile.removeEventListener("change", preferences);
      removeEventListener("scroll", scroll);
      removeEventListener("wheel", resume);
      removeEventListener("keydown", resumeKeys);
      removeEventListener("touchstart", touchBegin);
      removeEventListener("touchmove", touchScroll);
      removeEventListener("resize", scroll);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <section id="campus" ref={section} className="dc-section" aria-labelledby="dc-title">
      <div className="dc-sticky">
        <h2 id="dc-title">Optimized for income and reliability.</h2>
        <Campus
          chapter={chapter}
          storyProgress={storyProgress}
          onSelect={onSelect}
          near={near}
          active={inView && visible}
          reducedMotion={reducedMotion}
        />
      </div>
    </section>
  );
}
