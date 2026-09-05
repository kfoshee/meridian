import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { PerspectiveCamera, Vector3, Matrix4, Quaternion, Euler } from "three";

async function loadSource(name) {
  const source = await readFile(new URL(`../app/landing/${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const {
  chapterFromProgress,
  campusView,
  EQUIPMENT,
  assemblyProgress,
  progressForChapter,
  BUILD_DURATION,
  CAMPUS_FRAME,
  campusFitDistance,
} = await loadSource("campus-config");
const { buildCampus, campusFramingPoints } = await loadSource("campus-geometry");

test("scrolling clamps outside the section and reverses through the same chapters", () => {
  const positions = [-1, 0, 0.25, 0.5, 0.875, 1, 2];
  assert.deepEqual(positions.map(chapterFromProgress), [1, 1, 2, 4, 7, 7, 7]);
  assert.deepEqual([...positions].reverse().map(chapterFromProgress), [7, 7, 7, 4, 2, 1, 1]);
});

test("every selectable subsystem has finite geometry, a marker, and a valid selection boundary", () => {
  const campus = buildCampus();
  assert.equal(new Set(EQUIPMENT.map((item) => item.id)).size, 7);
  for (const equipment of EQUIPMENT) {
    assert.ok(campus[equipment.id].length > 0, equipment.id);
    assert.ok(equipment.anchor.every(Number.isFinite));
    const [left, right, back, front] = equipment.bounds;
    assert.ok(left < right && back < front);
  }
  for (const part of Object.values(campus).flat()) {
    assert.ok(part.at.every(Number.isFinite));
    assert.ok(part.size.every((value) => Number.isFinite(value) && value > 0));
  }
});

test("scene construction is repeatable and hall cutaways preserve the complete campus", () => {
  assert.deepEqual(buildCampus(), buildCampus());
  assert.equal(campusView("firm").roof, 1);
  assert.equal(campusView("flex").roof, 1);
  assert.equal(campusView(null).roof, 0);
  for (const id of [null, ...EQUIPMENT.map((item) => item.id)]) {
    const view = campusView(id);
    assert.ok(view.camera.every(Number.isFinite));
    assert.ok(view.flexLevel > 0 && view.flexLevel <= 1);
  }
});

test("assembly starts empty, completes every part, and reverses deterministically", () => {
  const campus = buildCampus();
  const groups = ["site", ...EQUIPMENT.map((item) => item.id)];
  groups.forEach((id, order) => {
    for (const part of campus[id]) {
      assert.equal(assemblyProgress(0, order, part.at[1]), 0);
      assert.equal(assemblyProgress(BUILD_DURATION, order, part.at[1]), 1);
      const samples = [0, 1, 2, 3, 4, 5, 6, BUILD_DURATION].map((time) =>
        assemblyProgress(time, order, part.at[1]),
      );
      assert.deepEqual(
        samples,
        [...samples].sort((a, b) => a - b),
      );
    }
  });
});

test("each scroll stage builds only its own equipment and preserves completed stages", () => {
  const parts = buildCampus();
  EQUIPMENT.forEach((item, index) => {
    const stage = index + 1;
    assert.equal(chapterFromProgress((stage + 0.5) / 8), stage);
    const position = progressForChapter(stage) * BUILD_DURATION;
    for (const part of parts[item.id])
      assert.equal(assemblyProgress(position, stage, part.at[1]), 1);
    if (stage < 7) assert.equal(assemblyProgress(position, stage + 1), 0);
    assert.equal(assemblyProgress(position, 0, 3.24), 1);
  });
  assert.equal(progressForChapter(0), 1);
});

test("foundation panels and equipment subassemblies complete within their own stage", () => {
  const parts = buildCampus();
  assert.ok(parts.site.filter((part) => part.finish === "concrete").length >= 24);
  assert.ok(parts.site.filter((part) => part.finish === "asphalt").length >= 24);
  const groups = ["site", ...EQUIPMENT.map((item) => item.id)];
  for (const [stage, id] of groups.entries())
    for (const part of parts[id]) {
      assert.ok(part.build);
      const { delay, duration, offset } = part.build;
      assert.ok(delay >= 0 && duration > 0 && delay + duration <= 0.96);
      assert.ok(offset.every(Number.isFinite));
      assert.equal(assemblyProgress(stage, stage, part.at[1], delay, duration), 0);
      assert.equal(assemblyProgress(stage + 0.96, stage, part.at[1], delay, duration), 1);
      const middle = stage + delay + duration / 2;
      assert.ok(
        Math.abs(assemblyProgress(middle, stage, part.at[1], delay, duration) - 0.5) < 1e-10,
      );
    }
});

test("inspection frames each system from an exposed side and aims inside its footprint", () => {
  for (const equipment of EQUIPMENT) {
    const view = campusView(equipment.id, true);
    assert.ok([...view.camera, ...view.target].every(Number.isFinite));
    assert.notDeepEqual(view.camera, campusView(equipment.id).camera);
    // The inspection target stays near the system, with space for campus context.
    assert.ok(
      Math.hypot(view.target[0] - equipment.anchor[0], view.target[2] - equipment.anchor[2]) < 5,
    );
    assert.ok(view.camera[1] > view.target[1] + 10);
  }
  // The hall must not occlude the switchyard or the rear generators.
  assert.ok(campusView("grid", true).camera[0] < -13.6);
  assert.ok(campusView("backup", true).camera[2] < -8.5);
  assert.deepEqual(campusView(null, true), campusView(null));
});

test("both halls have paired rack rows, aisle containment and removable roof infill", () => {
  const campus = buildCampus();
  for (const id of ["firm", "flex"]) {
    const racks = campus[id].filter((part) => part.finish === "dark" && part.size[1] === 2.12);
    assert.equal(racks.length, 16);
    assert.equal(new Set(racks.map((part) => part.at[0])).size, 2);
    const covers = campus[id].filter((part) => part.finish === "cover");
    assert.equal(covers.length, 9);
    assert.ok(campus[id].some((part) => part.finish === "glass" && part.size[1] > 2));
  }
  assert.ok(campus.meter.some((part) => part.at[2] < 4 && part.size[1] > 1.5));
  assert.ok(campus.cooling.some((part) => part.at[2] < 0 && part.shape === "cylinder"));
  assert.equal(campus.backup.filter((part) => part.spin).length, 0);
});

test("the complete campus fits at every orbit angle on phone, tablet and desktop", () => {
  const corners = [];
  for (const x of [CAMPUS_FRAME[0][0], CAMPUS_FRAME[1][0]])
    for (const y of [CAMPUS_FRAME[0][1], CAMPUS_FRAME[1][1]])
      for (const z of [CAMPUS_FRAME[0][2], CAMPUS_FRAME[1][2]]) corners.push(new Vector3(x, y, z));
  for (const aspect of [0.85, 1.5, 2.4])
    for (const target of [
      [-2, 0.8, -2],
      [0, 0.8, 0],
      [2, 0.8, 2],
    ])
      for (const pitch of [0.3, 0.6, 0.95])
        for (let step = 0; step < 36; step++) {
          const angle = (step * Math.PI) / 18;
          const direction = [
            Math.sin(angle) * Math.cos(pitch),
            Math.sin(pitch),
            Math.cos(angle) * Math.cos(pitch),
          ];
          const distance = campusFitDistance(direction, target, aspect);
          const camera = new PerspectiveCamera(30, aspect, 0.1, 220);
          camera.position.fromArray(target).addScaledVector(new Vector3(...direction), distance);
          camera.lookAt(new Vector3(...target));
          camera.updateMatrixWorld();
          for (const corner of corners) {
            const projected = corner.clone().project(camera);
            assert.ok(
              Math.abs(projected.x) <= 1 / 1.1 + 1e-9,
              `horizontal clipping at aspect ${aspect}, angle ${angle}`,
            );
            assert.ok(
              Math.abs(projected.y) <= 1 / 1.1 + 1e-9,
              `vertical clipping at aspect ${aspect}, angle ${angle}`,
            );
            assert.ok(projected.z > -1 && projected.z < 1);
          }
        }
});

test("tight framing contains the actual equipment at full gesture zoom", () => {
  const parts = buildCampus();
  const frame = campusFramingPoints(parts);
  assert.ok(frame.length < 300, "keep per-frame fitting lightweight");
  const vertices = [];
  for (const part of Object.values(parts).flat()) {
    if (part.finish === "cover") continue;
    for (const progress of [0, 1]) {
      const position = new Vector3(...part.at).addScaledVector(
        new Vector3(...part.build.offset),
        1 - progress,
      );
      const matrix = new Matrix4().compose(
        position,
        new Quaternion().setFromEuler(new Euler(...(part.turn ?? [0, 0, 0]))),
        new Vector3(...part.size),
      );
      for (const x of [-0.5, 0.5])
        for (const y of [-0.5, 0.5])
          for (const z of [-0.5, 0.5]) vertices.push(new Vector3(x, y, z).applyMatrix4(matrix));
    }
  }
  for (const aspect of [1.2, 1.5, 2.4])
    for (const angle of [0, 0.8, 1.7, 3.8]) {
      const direction = [Math.sin(angle) * 0.8, 0.6, Math.cos(angle) * 0.8];
      const target = [0, 0.8, 0];
      const near = campusFitDistance(direction, target, aspect, 30, frame, 1.027);
      const overview = campusFitDistance(direction, target, aspect, 30, frame, 1.216);
      assert.ok(near < overview, "zoom actually moves closer");
      const camera = new PerspectiveCamera(30, aspect, 0.1, 220);
      camera.position.fromArray(target).addScaledVector(new Vector3(...direction), near);
      camera.lookAt(new Vector3(...target));
      camera.updateMatrixWorld();
      for (const point of vertices) {
        const projected = point.clone().project(camera);
        assert.ok(
          Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
          "equipment must remain visible",
        );
      }
    }
});
