import type { EquipmentId, Vec3 } from "./campus-config";

export type Finish =
  | "concrete"
  | "asphalt"
  | "wall"
  | "edge"
  | "metal"
  | "dark"
  | "vent"
  | "glass"
  | "ivory"
  | "gold"
  | "led"
  | "flexLed"
  | "roof"
  | "cover";
export type Part = {
  at: Vec3;
  size: Vec3;
  finish: Finish;
  shape?: "box" | "cylinder";
  turn?: Vec3;
  spin?: boolean;
  build?: { delay: number; duration: number; offset: Vec3; grow: "x" | "y" | "z" | "all" };
};
export type CampusParts = Record<EquipmentId | "site", Part[]>;

// Representative meter-scale equipment, composed as an architectural cutaway, not a site plan.
// Repeated parts are instanced by finish and shape in the renderer.
export function buildCampus(): CampusParts {
  const parts: CampusParts = {
    site: [],
    grid: [],
    meter: [],
    firm: [],
    flex: [],
    cooling: [],
    backup: [],
    battery: [],
  };
  const box = (group: keyof CampusParts, at: Vec3, size: Vec3, finish: Finish, turn?: Vec3) =>
    parts[group].push({ at, size, finish, turn });
  const cyl = (group: keyof CampusParts, at: Vec3, size: Vec3, finish: Finish, turn?: Vec3) =>
    parts[group].push({ at, size, finish, shape: "cylinder", turn });

  // Sectioned slab pours and paving bays assemble in a diagonal wave.
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) {
      box(
        "site",
        [-14.5 + ((col + 0.5) * 29) / 6, -0.3, -10 + (row + 0.5) * 5],
        [29 / 6 - 0.015, 0.6, 4.985],
        "concrete",
      );
      box(
        "site",
        [-14.35 + ((col + 0.5) * 28.7) / 6, 0.02, -9.85 + ((row + 0.5) * 19.7) / 4],
        [28.7 / 6 - 0.012, 0.08, 19.7 / 4 - 0.012],
        "asphalt",
      );
    }
  // Foundation ribs and utility runs are visible before the paving settles over them.
  for (const x of [-10, -5, 0, 5, 10]) box("site", [x, -0.67, 0], [0.3, 0.25, 19.2], "concrete");
  for (const z of [-6, 0, 6]) box("site", [0, -0.67, z], [28.2, 0.25, 0.3], "concrete");
  for (const z of [-2, -1.6])
    cyl("site", [0, -0.02, z], [0.055, 27, 0.055], "gold", [0, 0, Math.PI / 2]);
  for (let i = 0; i < 9; i++) box("site", [-12 + i * 3, 0.07, 8.2], [2.99, 0.02, 2.65], "dark");
  for (let x = -13; x < 14; x += 1.8) box("site", [x, 0.08, 8.2], [0.65, 0.018, 0.04], "ivory");
  // Perimeter kerbs, segmented concrete, and sparse service lighting establish scale.
  for (const z of [-9.7, 9.7]) box("site", [0, 0.12, z], [29, 0.2, 0.15], "edge");
  for (const x of [-14.3, 14.3]) box("site", [x, 0.12, 0], [0.15, 0.2, 19.5], "edge");
  for (const x of [-13, 12.8])
    for (const z of [-8.5, 7.5]) {
      cyl("site", [x, 1.65, z], [0.06, 3.2, 0.06], "metal");
      box("site", [x + 0.17, 3.24, z], [0.5, 0.08, 0.22], "metal");
      box("site", [x + 0.17, 3.19, z], [0.35, 0.03, 0.16], "led");
    }

  for (const [id, x, width] of [
    ["firm", -2.8, 7.8],
    ["flex", 5, 6.7],
  ] as const) {
    box(id, [x, 0.18, -0.5], [width + 0.45, 0.3, 9], "concrete");
    box(id, [x, 0.39, -0.5], [width, 0.1, 8.7], "edge");
    // Back and side walls remain physical; the near facade is cut below rack height.
    box(id, [x, 1.9, -4.8], [width, 3, 0.18], "wall");
    box(id, [x - width / 2 + 0.1, 1.9, -0.5], [0.18, 3, 8.7], "wall");
    box(id, [x + width / 2 - 0.1, 1.9, -0.5], [0.18, 3, 8.7], "wall");
    box(id, [x, 0.8, 3.8], [width, 0.85, 0.18], "wall");
    box(id, [x, 1.26, 3.8], [width, 0.06, 0.23], "edge");
    for (let z = -4.4; z < 4; z += 0.65) {
      box(id, [x + width / 2, 1.9, z], [0.035, 2.95, 0.035], "edge");
    }
    // A roof with a generous permanent viewing aperture keeps the opening frame understandable.
    box(id, [x, 3.48, -3.9], [width + 0.12, 0.19, 1.95], "roof");
    box(id, [x - width / 2 + 0.48, 3.48, 0.15], [0.92, 0.19, 6.2], "roof");
    box(id, [x + width / 2 - 0.48, 3.48, 0.15], [0.92, 0.19, 6.2], "roof");
    // Paired rows face the service aisles; their backs exhaust into a contained hot aisle.
    // Rack depth is across X, rack width along Z. The faces now look into aisles, not each other’s sides.
    for (let row = 0; row < 2; row++) {
      const rx = x + [-1.15, 1.15][row];
      const front = row % 2 === 0 ? -1 : 1;
      box(id, [rx, 0.49, -0.55], [0.97, 0.1, 6.6], "dark");
      for (let rack = 0; rack < 8; rack++) {
        const z = -3.15 + rack * 0.75;
        box(id, [rx, 1.59, z], [0.94, 2.12, 0.69], "dark");
        for (const side of [-1, 1]) {
          box(id, [rx + side * 0.48, 1.59, z], [0.025, 1.96, 0.62], "vent");
          box(id, [rx + side * 0.5, 1.53, z + 0.25], [0.024, 0.22, 0.027], "edge");
        }
        for (let slot = 0; slot < 8; slot++) {
          box(id, [rx + front * 0.5, 0.79 + slot * 0.22, z], [0.02, 0.025, 0.56], "metal");
          box(
            id,
            [rx + front * 0.516, 0.82 + slot * 0.22, z + 0.21],
            [0.018, 0.023, 0.024],
            id === "firm" ? "led" : "flexLed",
          );
        }
        // Rear rack PDUs and liquid manifolds are distinct from the overhead cable trays.
        box(id, [rx - front * 0.5, 1.57, z - 0.24], [0.05, 1.84, 0.045], "metal");
      }
      for (const dx of [-0.19, 0.19]) box(id, [rx + dx, 2.98, -0.55], [0.035, 0.12, 6.8], "metal");
      for (let z = -3.7; z < 2.9; z += 0.42) box(id, [rx, 2.94, z], [0.42, 0.03, 0.05], "edge");
      box(id, [rx, 3.05, -0.55], [0.1, 0.035, 6.7], "dark");
      box(id, [rx + front * 0.53, 3.13, -0.55], [0.025, 0.035, 6.7], "led");
    }
    for (const aisle of [0]) {
      // Translucent containment canopy and framed end doors leave the racks readable.
      box(id, [x + aisle, 2.75, -0.55], [1.34, 0.035, 6.6], "glass");
      for (const z of [-3.9, 2.8]) {
        box(id, [x + aisle, 1.6, z], [1.28, 2.22, 0.035], "glass");
        for (const dx of [-0.67, 0.67])
          box(id, [x + aisle + dx, 1.6, z], [0.04, 2.24, 0.055], "edge");
        box(id, [x + aisle, 2.73, z], [1.38, 0.045, 0.06], "edge");
      }
    }
    // Removable roof infill lets visitors switch between the finished envelope and cutaway.
    for (let tile = 0; tile < 8; tile++)
      box(id, [x, 3.48, -2.57 + tile * 0.77], [width - 1.84, 0.17, 0.755], "cover");
    // The cut face closes with the roof; side access doors remain part of the real envelope.
    box(id, [x, 2.34, 3.8], [width, 2.14, 0.18], "cover");
    const doorX = x + width / 2 + 0.045;
    box(id, [doorX, 1.51, 2.75], [0.055, 2.16, 0.92], "dark");
    for (const z of [2.27, 3.23]) box(id, [doorX + 0.03, 1.51, z], [0.045, 2.2, 0.04], "edge");
    box(id, [doorX + 0.06, 1.44, 2.4], [0.055, 0.05, 0.24], "metal");
    box(id, [doorX + 0.12, 2.76, 2.75], [0.26, 0.06, 0.65], "metal");
    // Structural mullions and mechanical housings.
    for (let n = 0; n < 5; n++)
      box(id, [x - width / 2 + (n * width) / 4, 1.94, -4.7], [0.09, 3.2, 0.22], "metal");
    for (let n = 0; n < 3; n++) {
      box(id, [x - 2.2 + n * 2.15, 3.86, -4], [1.5, 0.62, 1.25], "metal");
      cyl(id, [x - 2.2 + n * 2.15, 4.19, -4], [0.86, 0.06, 0.86], "vent");
    }
  }

  // Utility switchyard: transformers with radiator fins, bushings, gantries, and busbars.
  box("grid", [-10.5, 0.2, -2.8], [6, 0.25, 9], "concrete");
  for (const z of [-5, -1]) {
    box("grid", [-10.6, 0.5, z], [2.5, 0.3, 2.3], "edge");
    box("grid", [-10.6, 1.24, z], [1.9, 1.4, 1.5], "metal");
    for (const side of [-1, 1])
      for (let fin = 0; fin < 9; fin++)
        box("grid", [-10.6 + side * 1.05, 1.13, z - 0.7 + fin * 0.17], [0.3, 1.2, 0.06], "edge");
    for (const dx of [-0.55, 0, 0.55]) {
      cyl("grid", [-10.6 + dx, 2.2, z], [0.12, 0.65, 0.12], "ivory");
      for (let n = 0; n < 5; n++)
        cyl("grid", [-10.6 + dx, 2 + n * 0.095, z], [0.2, 0.025, 0.2], "ivory");
    }
  }
  for (const z of [-6.4, 0.4]) {
    for (const x of [-12.9, -8.1]) box("grid", [x, 1.9, z], [0.12, 3.6, 0.12], "edge");
    box("grid", [-10.5, 3.65, z], [4.9, 0.13, 0.15], "edge");
  }
  for (const x of [-11.1, -10.5, -9.9])
    cyl("grid", [x, 3.3, -3], [0.045, 6.8, 0.045], "metal", [Math.PI / 2, 0, 0]);
  // Protective mesh fencing in repeated sections.
  for (let z = -7; z <= 1; z += 1) box("grid", [-13.35, 0.95, z], [0.05, 1.65, 0.05], "metal");
  for (const y of [0.5, 1, 1.5]) box("grid", [-13.35, y, -3], [0.025, 0.025, 8], "metal");

  for (let i = 0; i < 5; i++) {
    const x = -8.3 + i * 0.55;
    box("meter", [x, 1.03, 4.8], [0.51, 1.8, 0.8], "wall");
    box("meter", [x, 1.5, 5.215], [0.2, 0.21, 0.03], "glass");
    box("meter", [x + 0.13, 1.04, 5.22], [0.03, 0.22, 0.025], "metal");
  }

  for (let i = 0; i < 4; i++) {
    const x = -3.6 + i * 2.6;
    box("cooling", [x, 0.3, 5.85], [2.25, 0.4, 2.4], "concrete");
    box("cooling", [x, 0.97, 5.85], [2.1, 1.1, 2.2], "metal");
    for (const z of [5.35, 6.36]) {
      cyl("cooling", [x, 1.55, z], [0.87, 0.1, 0.87], "dark");
      cyl("cooling", [x, 1.62, z], [0.2, 0.08, 0.2], "edge");
      for (let a = 0; a < 5; a++)
        box("cooling", [x, 1.6, z], [0.72, 0.025, 0.075], "edge", [0, (a * Math.PI) / 5, 0]);
    }
    for (let n = 0; n < 9; n++)
      box("cooling", [x, 0.63 + n * 0.08, 6.97], [1.85, 0.018, 0.018], "dark");
  }
  for (const z of [4.05, 4.3])
    cyl("cooling", [0.6, 0.42, z], [0.12, 13.4, 0.12], "metal", [0, 0, Math.PI / 2]);

  for (let i = 0; i < 4; i++) {
    const x = -4.6 + i * 3.3;
    box("backup", [x, 0.25, -7.25], [2.9, 0.35, 1.9], "concrete");
    box("backup", [x, 1.02, -7.25], [2.7, 1.2, 1.6], "wall");
    box("backup", [x + 0.8, 1.03, -6.425], [0.8, 0.9, 0.035], "vent");
    cyl("backup", [x - 0.8, 1.96, -7.25], [0.1, 0.65, 0.1], "metal");
    for (let n = 0; n < 8; n++)
      box("backup", [x - 1.1 + n * 0.18, 1.02, -6.43], [0.05, 0.85, 0.03], "edge");
  }

  for (let i = 0; i < 5; i++) {
    const x = 8.1 + i * 0.96;
    box("battery", [x, 0.21, 5.55], [0.95, 0.25, 2.2], "concrete");
    box("battery", [x, 1.08, 5.55], [0.83, 1.65, 1.9], "wall");
    box("battery", [x, 1.11, 6.52], [0.68, 1.4, 0.035], "edge");
    box("battery", [x, 1.56, 6.55], [0.18, 0.13, 0.025], "glass");
    box("battery", [x - 0.2, 1.13, 6.55], [0.035, 0.19, 0.025], "metal");
    for (let n = 0; n < 5; n++)
      box("battery", [x, 0.57 + n * 0.05, 6.55], [0.48, 0.016, 0.02], "vent");
  }
  // Champagne reveals, illuminated thresholds, and dark profiled cladding.
  for (const [id, x, width] of [
    ["firm", -2.8, 7.8],
    ["flex", 5, 6.7],
  ] as const) {
    for (const z of [-4.91, 3.92]) {
      box(id, [x, z < 0 ? 3.38 : 1.19, z], [width + 0.1, 0.075, 0.065], "gold");
    }
    for (const side of [-1, 1]) {
      const sx = x + (side * width) / 2;
      box(id, [sx, 3.4, -0.5], [0.08, 0.08, 8.8], "gold");
      box(id, [sx, 0.55, -0.5], [0.08, 0.06, 8.8], "gold");
      for (let z = -4.5; z < 3.5; z += 0.32)
        box(id, [sx + side * 0.035, 1.94, z], [0.06, 2.8, 0.045], "dark");
    }
  }
  // Recessed perimeter reveal gives the campus the weight of an architectural plinth.
  for (const z of [-9.96, 9.96]) {
    box("site", [0, -0.32, z], [28.6, 0.035, 0.028], "gold");
    box("site", [0, -0.5, z], [28.6, 0.12, 0.028], "dark");
  }
  for (const x of [-14.46, 14.46]) box("site", [x, -0.32, 0], [0.028, 0.035, 19.9], "gold");
  for (let i = 0; i < 5; i++) {
    const x = 8.1 + i * 0.96;
    box("battery", [x - 0.37, 1.1, 6.56], [0.045, 1.48, 0.04], "gold");
    box("battery", [x, 1.8, 6.56], [0.65, 0.045, 0.04], "gold");
    box("battery", [x, 1.57, 6.58], [0.1, 0.025, 0.018], "flexLed");
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.6 + i * 2.6;
    box("cooling", [x, 1.49, 6.99], [2.1, 0.045, 0.04], "gold");
    for (const dx of [-0.98, 0.98])
      box("cooling", [x + dx, 1.0, 6.99], [0.055, 0.95, 0.04], "edge");
  }
  for (let x = -8.3; x < -5.8; x += 0.55)
    box("meter", [x, 1.89, 5.22], [0.46, 0.035, 0.025], "gold");
  for (const part of parts.cooling) {
    if (part.turn && part.size[1] === 0.025) part.spin = true;
  }
  // Civil details: service apron drainage, utility access, bollards and entry thresholds.
  for (const x of [-11.5, -4.5, 3.5, 10.5]) {
    box("site", [x, 0.086, 9.35], [0.9, 0.03, 0.22], "vent");
    for (let n = 0; n < 7; n++)
      box("site", [x - 0.36 + n * 0.12, 0.107, 9.35], [0.03, 0.012, 0.21], "metal");
  }
  for (const x of [-12.1, 10.6]) {
    cyl("site", [x, 0.095, 2.6], [0.62, 0.04, 0.62], "metal");
    cyl("site", [x, 0.119, 2.6], [0.49, 0.012, 0.49], "dark");
  }
  for (const x of [-8.9, -5.5, 7.3, 12.6]) {
    cyl("site", [x, 0.47, 6.8], [0.12, 0.8, 0.12], "metal");
    cyl("site", [x, 0.72, 6.8], [0.125, 0.12, 0.125], "ivory");
  }
  for (const [id, x] of [
    ["firm", -2.8],
    ["flex", 5],
  ] as const) {
    box(id, [x, 0.53, 3.84], [0.95, 0.08, 0.25], "ivory");
    // A/B busways enter from the electrical side on separate supports.
    for (const dx of [-0.2, 0.2]) {
      box(id, [x + dx, 3.19, 0], [0.09, 0.09, 7.2], "metal");
      box(id, [x + dx, 3.245, 0], [0.035, 0.02, 7.2], "gold");
    }
    for (let z = -3.4; z < 3; z += 1.6) box(id, [x, 3.25, z], [0.7, 0.035, 0.06], "edge");
  }
  // UPS modules and maintenance bypass next to the switchboard, before rack distribution.
  box("meter", [-7.6, 0.24, 2.65], [2.2, 0.3, 1.45], "concrete");
  for (let i = 0; i < 3; i++) {
    const x = -8.28 + i * 0.68;
    box("meter", [x, 1.28, 2.65], [0.61, 1.8, 1.02], "wall");
    box("meter", [x, 1.3, 3.175], [0.5, 1.59, 0.025], "metal");
    box("meter", [x, 1.79, 3.2], [0.24, 0.13, 0.025], "glass");
    for (let n = 0; n < 5; n++)
      box("meter", [x, 0.62 + n * 0.075, 3.2], [0.4, 0.023, 0.02], "vent");
  }
  // Transformer containment curbs, oil conservators and cable termination boxes.
  for (const z of [-5, -1]) {
    for (const dx of [-1.43, 1.43])
      box("grid", [-10.6 + dx, 0.46, z], [0.12, 0.22, 2.8], "concrete");
    for (const dz of [-1.4, 1.4])
      box("grid", [-10.6, 0.46, z + dz], [2.98, 0.22, 0.12], "concrete");
    cyl("grid", [-10.6, 2.08, z - 0.56], [0.4, 1.45, 0.4], "metal", [0, 0, Math.PI / 2]);
    box("grid", [-9.45, 0.91, z + 0.3], [0.5, 0.65, 0.66], "wall");
  }
  // Chilled-water primary supply/return, isolation valves, pumps, and secondary-loop CDUs.
  for (const z of [4.05, 4.3]) {
    for (let x = -4.7; x < 6; x += 2.1)
      box("cooling", [x, 0.24, z], [0.23, 0.27, 0.23], "concrete");
    for (const x of [-3.6, -1, 1.6, 4.2]) {
      cyl("cooling", [x, 0.72, z], [0.13, 0.6, 0.13], "metal");
      cyl("cooling", [x, 1.02, (z + 4.8) / 2], [0.13, 4.8 - z, 0.13], "metal", [Math.PI / 2, 0, 0]);
      cyl("cooling", [x, 0.64, z], [0.21, 0.06, 0.21], "edge");
      cyl("cooling", [x + 0.13, 0.75, z], [0.2, 0.025, 0.2], "gold", [0, 0, Math.PI / 2]);
    }
  }
  for (const x of [-5.65, 6.5]) {
    box("cooling", [x, 1.12, 2.75], [0.63, 1.5, 0.85], "metal");
    box("cooling", [x, 1.53, 3.2], [0.33, 0.19, 0.025], "glass");
    for (const dx of [-0.12, 0.12]) {
      cyl("cooling", [x + dx, 0.73, 3.6], [0.1, 1.6, 0.1], "metal", [Math.PI / 2, 0, 0]);
      cyl("cooling", [x + dx, 1.75, 2.38], [0.075, 1.5, 0.075], "metal");
      cyl("cooling", [x + dx, 2.5, -0.45], [0.075, 5.7, 0.075], "metal", [Math.PI / 2, 0, 0]);
    }
  }
  // Packaged standby sets: integral fuel bases, rear radiator louvers, access doors and silenced exhaust.
  for (let i = 0; i < 4; i++) {
    const x = -4.6 + i * 3.3;
    box("backup", [x, 0.48, -7.25], [2.72, 0.25, 1.65], "dark");
    box("backup", [x, 1.05, -8.08], [2.4, 0.96, 0.025], "metal");
    for (let n = 0; n < 9; n++)
      box("backup", [x + 0.78, 0.68 + n * 0.085, -8.11], [0.65, 0.032, 0.04], "vent");
    for (const dx of [-0.83, -0.2]) {
      box("backup", [x + dx, 1.06, -8.11], [0.56, 0.85, 0.025], "wall");
      box("backup", [x + dx + 0.2, 1.03, -8.135], [0.025, 0.16, 0.025], "edge");
    }
    cyl("backup", [x - 0.8, 2.02, -7.25], [0.27, 0.64, 0.27], "metal", [Math.PI / 2, 0, 0]);
    cyl("backup", [x - 0.8, 2.22, -7.5], [0.09, 0.46, 0.09], "dark");
    box("backup", [x - 0.8, 2.46, -7.5], [0.15, 0.03, 0.15], "metal");
    // No smoke or running animation: generation stays on standby in this example.
  }
  // Construction phases are generated once; the renderer only interpolates matrices.
  for (const [id, group] of Object.entries(parts))
    for (const part of group) {
      const [x, y, z] = part.at;
      const [w, h, d] = part.size;
      const wave = ((x + 15) / 30) * 0.55 + ((z + 10) / 20) * 0.45;
      let phase = 0.2;
      let spread = 0.13;
      let offset: Vec3 = [0, 0.7, 0];
      let grow: "x" | "y" | "z" | "all" = "y";
      if (id === "site") {
        phase =
          y < -0.5
            ? 0
            : part.finish === "concrete"
              ? 0.1
              : part.finish === "asphalt"
                ? 0.37
                : y > 0.5
                  ? 0.65
                  : 0.55;
        spread = part.finish === "concrete" || part.finish === "asphalt" ? 0.26 : 0.1;
        offset = [0, y < 0 ? -0.8 : 0.4, 0];
      } else if (part.finish === "concrete" || y < 0.5) {
        phase = 0.02;
        offset = [0, -0.35, 0];
      } else if ((id === "firm" || id === "flex") && part.finish === "metal" && h > 2.5) {
        phase = 0.08;
        offset = [0, 0.5, 0];
      } else if (part.finish === "roof" || part.finish === "cover") {
        phase = 0.68;
        spread = 0.06;
        offset = [0, 2.2, 0];
        grow = "all";
      } else if (part.finish === "led" || part.finish === "flexLed" || part.finish === "glass") {
        phase = 0.7;
        spread = 0.05;
        offset = [0, 0.15, 0];
        grow = "all";
      } else if (part.finish === "vent" || (h < 0.12 && y > 0.6)) {
        phase = 0.48;
        offset = [0, 0.5, 0];
        grow = "all";
      } else if ((id === "firm" || id === "flex") && part.finish === "dark" && h > 1.5) {
        phase = 0.24;
        spread = 0.22;
        offset = [0, 1.2, 0];
      } else if (part.finish === "wall") {
        phase = 0.13;
        offset = [x > 0 ? 0.5 : -0.5, 0, 0];
      }
      if (h < 0.3 && (w > 4 || d > 4)) grow = w > d ? "x" : "z";
      part.build = {
        delay: phase + Math.max(0, Math.min(1, wave)) * spread,
        duration: 0.2,
        offset,
        grow,
      };
    }
  return parts;
}

/** Tight grouped bounds: the slab does not inherit the height of a distant roof or light pole. */
export function campusFramingPoints(parts: CampusParts, includeAssembly = true): Vec3[] {
  const bounds = new Map<string, [Vec3, Vec3]>();
  for (const [group, items] of Object.entries(parts))
    for (const part of items) {
      // Roof infill remains hidden in this interior composition.
      if (part.finish === "cover") continue;
      const key =
        group === "site" && part.at[1] + part.size[1] / 2 > 0.5
          ? `site-${Math.round(part.at[0] / 3)}-${Math.round(part.at[2] / 3)}`
          : group;
      if (!bounds.has(key))
        bounds.set(key, [
          [Infinity, Infinity, Infinity],
          [-Infinity, -Infinity, -Infinity],
        ]);
      const extent = bounds.get(key)!;
      const [rx, ry, rz] = part.turn ?? [0, 0, 0];
      for (const progress of includeAssembly ? [0, 1] : [1])
        for (const dx of [-0.5, 0.5])
          for (const dy of [-0.5, 0.5])
            for (const dz of [-0.5, 0.5]) {
              const x = dx * part.size[0],
                y = dy * part.size[1],
                z = dz * part.size[2];
              const zx = x * Math.cos(rz) - y * Math.sin(rz);
              const zy = x * Math.sin(rz) + y * Math.cos(rz);
              const yx = zx * Math.cos(ry) + z * Math.sin(ry);
              const yz = -zx * Math.sin(ry) + z * Math.cos(ry);
              const vertex = [
                yx,
                zy * Math.cos(rx) - yz * Math.sin(rx),
                zy * Math.sin(rx) + yz * Math.cos(rx),
              ];
              for (let axis = 0; axis < 3; axis++) {
                const value =
                  vertex[axis] + part.at[axis] + (1 - progress) * (part.build?.offset[axis] ?? 0);
                extent[0][axis] = Math.min(extent[0][axis], value - 0.08);
                extent[1][axis] = Math.max(extent[1][axis], value + 0.08);
              }
            }
    }
  return [...bounds.values()].flatMap(([min, max]) =>
    [min[0], max[0]].flatMap((x) =>
      [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z] as Vec3)),
    ),
  );
}
