"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import { EQUIPMENT, type EquipmentId } from "./campus-config";
import type { SceneProps } from "./CampusScene";

const Scene = dynamic<SceneProps>(() => import("./CampusScene"), { ssr: false });

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Campus({
  chapter,
  storyProgress,
  onSelect,
  near,
  active,
  reducedMotion,
}: {
  chapter: number;
  storyProgress: RefObject<number>;
  onSelect: (chapter: number) => void;
  near: boolean;
  active: boolean;
  reducedMotion: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hoverState, setHoverState] = useState<{ id: EquipmentId | null; chapter: number }>({
    id: null,
    chapter,
  });
  const hovered = hoverState.chapter === chapter ? hoverState.id : null;
  const setHovered = useCallback(
    (id: EquipmentId | null) => setHoverState({ id, chapter }),
    [chapter],
  );
  const [previewState, setPreviewState] = useState({ id: null as EquipmentId | null, chapter });
  const [inspection, setInspection] = useState({ id: null as EquipmentId | null, chapter });
  const inspected =
    (previewState.chapter === chapter ? previewState.id : null) ??
    (inspection.chapter === chapter ? inspection.id : null);
  const markerLock = useRef<{ id: EquipmentId; x: number; y: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0, orbit: 0 });
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1.2);
  const stage = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const lastTouchTime = useRef(0);
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const resetView = useCallback(() => {
    pointer.current = { x: 0, y: 0, orbit: 0 };
    setZoom(1.2);
    setHovered(null);
    setPreviewState({ id: null, chapter });
    setInspection({ id: null, chapter });
    markerLock.current = null;
    onSelect(0);
  }, [chapter, onSelect, setHovered]);
  const drag = useRef<{ x: number; y: number; orbit: number; id: EquipmentId | null } | null>(null);
  const dragged = useRef(false);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = EQUIPMENT[chapter - 1]?.id ?? null;
  const item = EQUIPMENT.find((entry) => entry.id === (inspected ?? hovered ?? selected));
  const preview = (id: EquipmentId | null) => {
    setHovered(id);
    setPreviewState({ id, chapter });
    if (!id) markerLock.current = null;
  };
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  const select = useCallback(
    (id: EquipmentId) => {
      const nextChapter = EQUIPMENT.findIndex((item) => item.id === id) + 1;
      pointer.current.orbit = 0;
      setInspection({ id, chapter: nextChapter });
      setPreviewState({ id: null, chapter: nextChapter });
      onSelect(nextChapter);
    },
    [onSelect],
  );
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const clampZoom = (value: number) => Math.max(0.75, Math.min(1.65, value));
    const wheel = (event: WheelEvent) => {
      // Ordinary page scrolling is preserved until the visitor engages the model.
      if (!event.ctrlKey && document.activeElement !== element) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(chapter);
      setZoom((value) => clampZoom(value * Math.exp(-event.deltaY * 0.0025)));
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current = null;
      dragged.current = true;
      setDragging(false);
      const [a, b] = event.touches;
      pinch.current = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom: zoomRef.current,
      };
      onSelect(chapter);
    };
    const touchMove = (event: TouchEvent) => {
      if (!pinch.current || event.touches.length !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      const [a, b] = event.touches;
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setZoom(clampZoom((pinch.current.zoom * distance) / Math.max(1, pinch.current.distance)));
    };
    const touchEnd = () => {
      pinch.current = null;
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", touchStart, { passive: false });
    element.addEventListener("touchmove", touchMove, { passive: false });
    element.addEventListener("touchend", touchEnd);
    element.addEventListener("touchcancel", touchEnd);
    return () => {
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchmove", touchMove);
      element.removeEventListener("touchend", touchEnd);
      element.removeEventListener("touchcancel", touchEnd);
    };
  }, [chapter, onSelect]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") resetView();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [resetView]);

  return (
    <div
      className="dc-campus"
      data-chapter={chapter}
      data-hovered={hovered ?? ""}
      data-inspected={inspected ?? ""}
      data-renderer={failed ? "fallback" : ready ? "webgl" : "loading"}
    >
      <div className="dc-side">
        <div className="dc-chapter" aria-live="polite" aria-atomic="true">
          <div className="dc-count">
            {item ? EQUIPMENT.indexOf(item) + 1 : 0} <span>/ 7</span>
          </div>
          <h3>{item?.name ?? "The whole campus"}</h3>
          <p>{item?.detail ?? "Power, working together."}</p>
        </div>
        <nav className="dc-legend" aria-label="Explore the campus">
          {EQUIPMENT.map((equipment, index) => (
            <button
              key={equipment.id}
              type="button"
              aria-pressed={selected === equipment.id}
              onClick={() => select(equipment.id)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") preview(equipment.id);
              }}
              onPointerLeave={() => preview(null)}
              onFocus={() => preview(equipment.id)}
              onBlur={() => preview(null)}
            >
              <span>{index + 1}</span>
              {equipment.name}
            </button>
          ))}
        </nav>
      </div>
      <div className="dc-visual">
        <div
          className="dc-stage"
          ref={stage}
          title="Drag to rotate · Double-click or pinch to zoom"
          onDoubleClick={(event) => {
            if (performance.now() - lastTouchTime.current < 600) return;
            if ((event.target as HTMLElement).closest("button")) return;
            event.currentTarget.focus({ preventScroll: true });
            onSelect(chapter);
            setZoom((value) => (value > 1.4 ? 1.2 : 1.65));
          }}
          data-dragging={dragging}
          onPointerDown={(event) => {
            if (event.pointerType === "touch") lastTouchTime.current = performance.now();
            if ((event.target as HTMLElement).closest("button")) return;
            dragged.current = false;
            if (event.pointerType === "mouse") event.currentTarget.focus({ preventScroll: true });
            if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              orbit: pointer.current.orbit,
              id: inspected ?? selected,
            };
          }}
          onClickCapture={(event) => {
            if (dragged.current) {
              event.stopPropagation();
              dragged.current = false;
            }
          }}
          onPointerUp={(event) => {
            if (
              event.pointerType === "touch" &&
              !dragged.current &&
              !pinch.current &&
              !(event.target as HTMLElement).closest("button")
            ) {
              const now = performance.now();
              if (
                now - lastTap.current.time < 320 &&
                Math.hypot(event.clientX - lastTap.current.x, event.clientY - lastTap.current.y) <
                  25
              ) {
                onSelect(chapter);
                setZoom((value) => (value > 1.4 ? 1.2 : 1.65));
                lastTap.current.time = 0;
              } else lastTap.current = { time: now, x: event.clientX, y: event.clientY };
            }
            drag.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
          }}
          onLostPointerCapture={() => {
            drag.current = null;
            setDragging(false);
          }}
          onPointerMove={(event) => {
            if (pinch.current) return;
            if (drag.current) {
              const dx = event.clientX - drag.current.x;
              const dy = event.clientY - drag.current.y;
              if (
                !dragged.current &&
                Math.abs(dx) > 5 &&
                (event.pointerType === "mouse" || Math.abs(dx) > Math.abs(dy))
              ) {
                dragged.current = true;
                setDragging(true);
                event.currentTarget.focus({ preventScroll: true });
                event.currentTarget.setPointerCapture(event.pointerId);
                setInspection({ id: drag.current.id, chapter });
                preview(null);
                onSelect(chapter);
              }
              if (dragged.current) {
                // Unlimited horizontal orbit, with the same gesture sensitivity on every screen.
                const width = event.currentTarget.clientWidth;
                pointer.current.orbit =
                  drag.current.orbit + (dx / Math.max(320, width)) * Math.PI * 1.5;
                pointer.current.x = 0;
                pointer.current.y = 0;
              }
              return;
            }
            if (event.pointerType !== "mouse") return;
            const rect = event.currentTarget.getBoundingClientRect();
            pointer.current = {
              orbit: pointer.current.orbit,
              x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
              y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
            };
          }}
          onPointerLeave={() => {
            if (dragged.current && drag.current) return;
            pointer.current = { x: 0, y: 0, orbit: pointer.current.orbit };
            drag.current = null;
            preview(null);
          }}
          role="group"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
              event.preventDefault();
              setInspection({ id: null, chapter });
              preview(null);
              pointer.current.orbit += event.key === "ArrowLeft" ? -0.18 : 0.18;
            }
            if (["+", "=", "-"].includes(event.key)) {
              event.preventDefault();
              onSelect(chapter);
              setZoom((value) =>
                Math.max(0.75, Math.min(1.65, value + (event.key === "-" ? -0.15 : 0.15))),
              );
            }
            if (event.key === "Home") {
              event.preventDefault();
              resetView();
            }
          }}
          aria-label="Interactive campus. Drag to rotate. Pinch or double-click to zoom. After engaging the model, scroll to zoom. Keyboard: arrows to rotate, plus and minus to zoom, Home to reset."
        >
          <div
            className={`dc-poster${ready && !failed ? " dc-poster-hidden" : ""}`}
            aria-hidden={ready && !failed}
          >
            <Image
              src="/media/campus-poster.png"
              alt="An architectural cutaway of Meridian’s illustrative data center, with server halls, switchyard, cooling, battery storage, and standby generators."
              fill
              sizes="(max-width: 900px) 100vw, 75vw"
              unoptimized
            />
          </div>
          {near && !failed && (
            <div className={`dc-webgl${ready ? " dc-webgl-ready" : ""}`} aria-hidden="true">
              <SceneBoundary onError={onError}>
                <Scene
                  selected={selected}
                  hovered={hovered}
                  inspected={inspected}
                  zoom={zoom}
                  cutaway
                  dragging={dragging}
                  markerLock={markerLock}
                  onHover={(id) => {
                    if (!drag.current) setHovered(id);
                  }}
                  pointer={pointer}
                  storyProgress={storyProgress}
                  onSelect={select}
                  reducedMotion={reducedMotion}
                  active={active}
                  markers={markers}
                  onReady={onReady}
                  onError={onError}
                />
              </SceneBoundary>
            </div>
          )}
          {!failed && (
            <div
              className={`dc-hotspots${ready ? "" : " dc-hotspots-pending"}`}
              aria-hidden={!ready}
            >
              {EQUIPMENT.map((equipment, index) => (
                <button
                  ref={(node) => {
                    markers.current[index] = node;
                  }}
                  key={equipment.id}
                  type="button"
                  className={`dc-hotspot${(inspected ?? hovered ?? selected) === equipment.id ? " dc-hotspot-selected" : ""}`}
                  tabIndex={ready ? 0 : -1}
                  aria-label={`Explore ${equipment.name}`}
                  aria-pressed={selected === equipment.id}
                  onClick={() => select(equipment.id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") {
                      markerLock.current = {
                        id: equipment.id,
                        x: parseFloat(event.currentTarget.style.left),
                        y: parseFloat(event.currentTarget.style.top),
                      };
                      preview(equipment.id);
                    }
                  }}
                  onPointerLeave={() => preview(null)}
                  onFocus={() => preview(equipment.id)}
                  onBlur={() => preview(null)}
                >
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
