# Meridian campus experience

The campus keeps “Optimized for income and reliability.”, seven equipment labels, and one short description at a time. Graphite enclosures, champagne trim, rack lighting, shadows, and physical cutaways match Meridian’s palette. The hero, calculator, chip, footer mark, contact flow, and model pages are not changed by the scroll update.

## Scroll behavior

- A stable five-screen section pins the scene on desktop, tablet, and portrait phones.
- Scroll position drives construction through switchyard, meter and switchgear, firm hall, flexible hall, cooling, backup generation, and battery. The first stage also builds the foundation: ribs, 24 individual slab bays, utility runs, paving panels, road sections, kerbs, and service lighting.
- Within each stage, structural bodies precede panels, wiring, indicators, and roof sections. Every part has a deterministic arrival direction, growth axis, and assembly interval. Each stage completes before the next begins. Moving backward reverses construction. Stopping scroll stops construction; operating lights and fans may continue. There is no timer or replay control. The bottom helper text and progress rule have been removed entirely.
- Each system has a camera composition; short interpolation smooths camera and construction changes without taking control of page scrolling.
- Buttons reveal the chosen stage and all preceding equipment, and align the scroll position with that stage so scrolling continues from there. Escape shows the complete overview.
- Hover, projected hotspots, dragging to rotate, and pointer parallax remain available. Future equipment hotspots appear with their corresponding geometry; all seven HTML controls remain available.
- Reduced motion and very short phone landscape viewports use a complete scene with controls in normal document flow.

## Rendering

Instanced Three.js / React Three Fiber geometry, shared source materials, procedural roughness, environment lighting, and shadows. The graphics bundle loads near the viewport. A matching static poster covers loading and graphics failure. Rendering suspends outside the viewport and when the tab is hidden; pixel density adapts to slow frames. No external models or textures are downloaded.

## Verification

The scroll update passes TypeScript, focused ESLint, formatting, six campus tests, and production static export. Tests cover all seven stage boundaries, equipment completeness, button selection, deterministic geometry, and reversible assembly. Browser checks verify forward and reverse scrolling, stage selection, a paused construction state, and a 390×844 phone layout without horizontal overflow or clipped controls. The selected marker contrast is also corrected.

The earlier graphics-failure and reduced-motion checks remain applicable. Physical phone frame rate and a manual touch-drag pass remain unverified. Existing unrelated repository lint/format findings are tracked separately from focused checks. No public deployment was performed.


## September 5 equipment and interaction refinement

This is a compact architectural illustration, not a construction or permitting design. It does not certify capacity, tier, clearances, fire separation, redundancy, or site-specific thermal performance. Real layouts depend on the site and engineering design. The front service apron is wider; the campus footprint remains intentionally compressed for legibility.

Research-informed changes:

- Two rack rows per hall, paired around a contained exhaust aisle, with translucent canopies and end doors; rack faces now look into aisles. [Vertiv containment guidance](https://www.vertiv.com/en-ca/insights/articles/educational-articles/data-center-containment-strategies-for-high-density-environments/).
- Primary chilled-water supply/return headers, pump/valve details and CDU cabinets with distinct secondary distribution. These represent a hybrid cooled facility; they do not claim that every server is liquid cooled. [Vertiv chilled-water overview](https://www.vertiv.com/en-us/campaigns/chilled-water-solutions/), [CDU explanation](https://www.vertiv.com/en-latam/insights/articles/educational-articles/understanding-coolant-distribution-units-cdus-for-liquid-cooling/).
- UPS modules near the switchboard and overhead distribution trays. [Schneider Electric power-train reference](https://blog.se.com/datacenter/2019/10/31/high-performance-standardized-power-train-for-colocation-providers/).
- Generator fuel bases, enclosure doors, radiator louvers, silencers and exhaust outlets. Standby sets do not animate or emit exhaust. [Caterpillar enclosure reference](https://www.cat.com/en_US/products/new/attachments/electric-power-genset-enclosures/enclosures/101840.html).
- Transformer containment curbs, oil conservators, service access covers, drainage grilles and bollards.

Hover/tap inspections preserve the existing per-equipment camera angles. Clicking equipment completes the campus without moving the page; subsequent deliberate scrolling resumes the construction story. Roof, zoom and reset controls are 44px targets. The scene also supports left/right arrows, +/- and Home when focused. Roofs use a short lift/fade; reduced motion applies the final composition immediately. Hidden scenes render only when invalidated, rather than continuously. Shared instanced meshes and procedural materials introduce no remote model or texture downloads.


Validation: eight campus checks, scoped ESLint/Prettier, TypeScript, and production static export pass. Browser checks covered 1512px desktop, 390×844 and 320×700 phone layouts, equipment selection, roof closure, zoom and keyboard reset. All view controls have 44px hit targets; neither phone layout overflowed horizontally. The desktop browser reported about 120 fps after shadow caching (this is not a physical-phone benchmark). Whole-repository lint still reports 22 errors and 3 warnings in unrelated files; the formatting check reports 76 unrelated files. No public deployment was made.


## Direct manipulation refinement

Removed the roof/zoom/reset toolbar and the keyboard zoom shortcuts. The interior composition stays consistent. The entire scene is a grab surface with a grabbing cursor, pointer capture after drag intent, unlimited horizontal rotation, and a touch gesture that preserves vertical page scrolling. Dragging keeps its inspection angle. Home/Escape still reset the view; the equipment legend and numbered hotspots remain.

The camera now fits all eight corners of a conservative campus bounding volume, including raised construction pieces, for the current screen aspect ratio. The fit is applied to both the destination and every interpolated camera angle, preventing the slab from clipping during orbit or subsystem transitions. Projection tests cover 972 combinations of aspect ratio, target, elevation and rotation with a margin around the model.


## Gesture zoom and tighter composition

The button-free viewer now supports double-click/double-tap to toggle a closer view, two-finger pinch on touch screens, +/- keys, and wheel/trackpad zoom while the scene has focus. Regular page scrolling remains available before engagement and outside the scene. Zoom is bounded by the full campus silhouette, preserving the no-clipping requirement.

Grouped equipment bounds replace the oversized global box for rendering. The low slab no longer inherits a distant roof's full height. Those bounds include assembly offsets and rotated part extents, and are built once from the geometry. Tests independently project actual equipment corners through Three.js cameras at maximum zoom. High-density rendering now allows up to 2× resolution, with the existing slow-frame fallback.


## Brand color refinement

Campus materials and light now use warm graphite, champagne metal, Meridian gold (#d4af37), pale gold (#f3d97a), and ivory (#f7f2e6). The blue-gray fill light and blue glass tint were removed. Gold remains strongest on trim, selected equipment and explanatory flow paths; graphite equipment retains physical shading. The section background, legend, focus treatment and hotspot badges use the existing global CSS palette. Geometry, gestures, framing and text are unchanged.
