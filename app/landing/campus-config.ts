// The same palette as app/globals.css, shared by the physical scene and its overlays.
export const CAMPUS_PALETTE = {
  background: "#050403",
  surface: "#0d0b07",
  gold: "#d4af37",
  highlight: "#f3d97a",
  bronze: "#8f7420",
  ivory: "#f7f2e6",
} as const;

export type EquipmentId = "grid" | "meter" | "firm" | "flex" | "cooling" | "backup" | "battery";
export type Vec3 = [number, number, number];

export const EQUIPMENT: {
  id: EquipmentId;
  name: string;
  detail: string;
  anchor: Vec3;
  bounds: [number, number, number, number];
}[] = [
  {
    id: "grid",
    name: "Switchyard",
    detail: "Grid conditions, watched ahead.",
    anchor: [-10.3, 2.2, -3.7],
    bounds: [-13.6, -7.4, -7.6, 1.8],
  },
  {
    id: "meter",
    name: "Meter & switchgear",
    detail: "The demand the grid sees.",
    anchor: [-7.2, 1.9, 4.6],
    bounds: [-8.8, -5.7, 4.2, 5.4],
  },
  {
    id: "firm",
    name: "Firm hall",
    detail: "Critical computing stays protected.",
    anchor: [-2.5, 3.2, -0.4],
    bounds: [-7, 1.4, -5.2, 4],
  },
  {
    id: "flex",
    name: "Flexible hall",
    detail: "Earn money from Meridian.",
    anchor: [5.1, 3.2, -0.4],
    bounds: [1.4, 8.7, -5.2, 4],
  },
  {
    id: "cooling",
    name: "Cooling",
    detail: "Every response respects thermal limits.",
    anchor: [1, 1.6, 6.1],
    bounds: [-6.1, 7, 2.2, 7.3],
  },
  {
    id: "backup",
    name: "Backup generation",
    detail: "On standby. Ready when needed.",
    anchor: [0, 2.25, -7.35],
    bounds: [-6.2, 6.9, -8.5, -6],
  },
  {
    id: "battery",
    name: "Battery",
    detail: "Stored power, used within site limits.",
    anchor: [9.1, 1.8, 5],
    bounds: [7.4, 12.8, 4.2, 6.9],
  },
];

export function campusView(
  selected: EquipmentId | null,
  inspect = false,
): {
  camera: Vec3;
  target: Vec3;
  roof: number;
  flexLevel: number;
} {
  const views: Record<EquipmentId, { camera: Vec3; target: Vec3 }> = {
    grid: { camera: [17, 22, 35], target: [-2, 0, -1] },
    meter: { camera: [18, 19, 36], target: [-1.5, 0, 1] },
    firm: { camera: [20, 23, 33], target: [-1, 0.2, 0] },
    flex: { camera: [23, 22, 31], target: [1, 0.2, 0] },
    cooling: { camera: [20, 18, 35], target: [0, 0, 1] },
    backup: { camera: [21, 33, 24], target: [0, 0, -1] },
    battery: { camera: [24, 20, 32], target: [1, 0, 1] },
  };
  // Approach from the equipment's exposed side, keeping the surrounding campus in view.
  const closeups: Record<EquipmentId, { camera: Vec3; target: Vec3 }> = {
    grid: { camera: [-30, 23, 22], target: [-7, 1, -2.5] },
    meter: { camera: [-19, 15, 29], target: [-5, 1, 3] },
    firm: { camera: [-14, 27, 26], target: [-2.8, 1, 0] },
    flex: { camera: [19, 27, 26], target: [4, 1, 0] },
    cooling: { camera: [7, 16, 32], target: [0, 0.8, 4] },
    backup: { camera: [17, 24, -31], target: [0, 1, -5.5] },
    battery: { camera: [28, 16, 24], target: [6.5, 1, 3.5] },
  };
  const view = selected
    ? (inspect ? closeups : views)[selected]
    : { camera: [21, 18, 34] as Vec3, target: [0, 0, 0] as Vec3 };
  return {
    ...view,
    roof: selected === "firm" || selected === "flex" ? 1 : 0,
    flexLevel: selected === "flex" ? 0.55 : 1,
  };
}

export function chapterFromProgress(progress: number): number {
  return Math.max(1, Math.min(7, Math.floor(progress * 8)));
}

// Keep assembled equipment in place when the visitor scrolls back through the section.
export function advanceCampusProgress(previous: number, scrollProgress: number): number {
  return Math.max(previous, Math.max(0, Math.min(1, scrollProgress)));
}

export type CampusShot = { camera: Vec3; target: Vec3; padding: number };

// Scroll is the editor: each system gets a distinct angle and dolly distance.
const CAMPUS_SHOTS: {
  at: number;
  yaw: number;
  elevation: number;
  target: Vec3;
  padding: number;
}[] = [
  { at: 0, yaw: -18, elevation: 42, target: [0, 0.8, 0], padding: 1.42 },
  { at: 0.24, yaw: -58, elevation: 29, target: [-2.5, 0.8, -1], padding: 1.065 },
  { at: 0.365, yaw: -34, elevation: 25, target: [-1.8, 0.8, 1], padding: 1.11 },
  { at: 0.49, yaw: -8, elevation: 49, target: [-1, 1.2, -0.5], padding: 1.04 },
  { at: 0.615, yaw: 27, elevation: 44, target: [1.4, 1.2, 0], padding: 1.055 },
  { at: 0.74, yaw: 42, elevation: 25, target: [0, 0.8, 1.6], padding: 1.045 },
  { at: 0.865, yaw: 118, elevation: 38, target: [0, 1, -1.5], padding: 1.095 },
  { at: 0.955, yaw: 54, elevation: 27, target: [2, 0.8, 1], padding: 1.04 },
  { at: 1, yaw: 32, elevation: 34, target: [0, 0.8, 0], padding: 1.19 },
];

export function campusCinematicView(
  progress: number,
  shot: CampusShot = { camera: [0, 0, 0], target: [0, 0, 0], padding: 1 },
): CampusShot {
  const p = Math.max(0, Math.min(1, progress));
  const index = CAMPUS_SHOTS.findIndex((frame) => frame.at >= p);
  const end = CAMPUS_SHOTS[Math.max(1, index)];
  const start = CAMPUS_SHOTS[Math.max(0, index - 1)];
  const t = (p - start.at) / (end.at - start.at);
  // Quintic easing gives every shot a gentle arrival and departure.
  const ease = t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a: number, b: number) => a + (b - a) * ease;
  const yaw = (mix(start.yaw, end.yaw) * Math.PI) / 180;
  const elevation = (mix(start.elevation, end.elevation) * Math.PI) / 180;
  for (let axis = 0; axis < 3; axis++)
    shot.target[axis] = mix(start.target[axis], end.target[axis]);
  shot.camera[0] = shot.target[0] + Math.sin(yaw) * Math.cos(elevation) * 40;
  shot.camera[1] = shot.target[1] + Math.sin(elevation) * 40;
  shot.camera[2] = shot.target[2] + Math.cos(yaw) * Math.cos(elevation) * 40;
  shot.padding = mix(start.padding, end.padding);
  return shot;
}

// Buttons reveal the chosen stage; the next deliberate scroll resumes the scroll position.
export function progressForChapter(chapter: number): number {
  return chapter <= 0 || chapter >= 7 ? 1 : (chapter + 0.96) / 8;
}

// Timeline units represent stages, never elapsed time: foundation + seven systems.
export const BUILD_DURATION = 8;

export function campusPlayback(progress: number, reducedMotion: boolean, active: boolean) {
  return {
    position: (reducedMotion ? 1 : Math.max(0, Math.min(1, progress))) * BUILD_DURATION,
    animate: active && !reducedMotion,
  };
}

export function assemblyProgress(
  position: number,
  group: number,
  height = 0,
  delay?: number,
  duration = 0.7,
): number {
  const t = Math.max(
    0,
    Math.min(1, (position - group - (delay ?? Math.max(0, height) * 0.05)) / duration),
  );
  return t * t * (3 - 2 * t);
}

// Include the slab edges, light poles and the raised construction pieces.
export const CAMPUS_FRAME: [Vec3, Vec3] = [
  [-14.8, -1.6, -10.2],
  [14.8, 7.2, 10.2],
];

const DEFAULT_FRAME_POINTS = [CAMPUS_FRAME[0][0], CAMPUS_FRAME[1][0]].flatMap((x) =>
  [CAMPUS_FRAME[0][1], CAMPUS_FRAME[1][1]].flatMap((y) =>
    [CAMPUS_FRAME[0][2], CAMPUS_FRAME[1][2]].map((z) => [x, y, z] as Vec3),
  ),
);

/** Minimum perspective distance that contains every campus corner with breathing room. */
export function campusFitDistance(
  direction: Vec3,
  target: Vec3,
  aspect: number,
  fov = 30,
  points: Vec3[] = DEFAULT_FRAME_POINTS,
  padding = 1.1,
): number {
  const length = Math.hypot(...direction) || 1;
  const back = direction.map((value) => value / length) as Vec3;
  const horizontal = Math.hypot(back[0], back[2]) || 1;
  const right: Vec3 = [back[2] / horizontal, 0, -back[0] / horizontal];
  const up: Vec3 = [
    back[1] * right[2],
    back[2] * right[0] - back[0] * right[2],
    -back[1] * right[0],
  ];
  const tanV = Math.tan((fov * Math.PI) / 360) / padding;
  const tanH = tanV * Math.max(0.1, aspect);
  let distance = 1;
  for (const [x, y, z] of points) {
    const v: Vec3 = [x - target[0], y - target[1], z - target[2]];
    const dot = (axis: Vec3) => v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
    distance = Math.max(
      distance,
      dot(back) + Math.max(Math.abs(dot(right)) / tanH, Math.abs(dot(up)) / tanV),
    );
  }
  return distance;
}
