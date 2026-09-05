"use client";

/* Three.js owns these mutable GPU objects; useFrame updates them outside React rendering. */
/* eslint-disable react-hooks/immutability */

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildCampus, campusFramingPoints, type Finish, type Part } from "./campus-geometry";
import {
  EQUIPMENT,
  CAMPUS_PALETTE as BRAND,
  campusView,
  campusFitDistance,
  assemblyProgress,
  BUILD_DURATION,
  type EquipmentId,
} from "./campus-config";

export type SceneProps = {
  selected: EquipmentId | null;
  hovered: EquipmentId | null;
  inspected: EquipmentId | null;
  zoom: number;
  cutaway: boolean;
  dragging: boolean;
  markerLock: RefObject<{ id: EquipmentId; x: number; y: number } | null>;
  onHover: (id: EquipmentId | null) => void;
  pointer: RefObject<{ x: number; y: number; orbit: number }>;
  storyProgress: RefObject<number>;
  onSelect: (id: EquipmentId) => void;
  reducedMotion: boolean;
  active: boolean;
  markers: RefObject<(HTMLButtonElement | null)[]>;
  onReady: () => void;
  onError: () => void;
};

const PARTS = buildCampus();
const FRAME_POINTS = campusFramingPoints(PARTS);
const FINISHED_FRAME_POINTS = campusFramingPoints(PARTS, false);
const GROUPS = Object.entries(PARTS).flatMap(([id, parts]) => {
  const batches = new Map<string, Part[]>();
  for (const part of parts) {
    const key = `${part.shape ?? "box"}:${part.finish}`;
    const batch = batches.get(key) ?? [];
    batch.push(part);
    batches.set(key, batch);
  }
  return [...batches.entries()].map(([key, items]) => ({
    id: id as EquipmentId | "site",
    key,
    items,
  }));
});

function makeMaterials() {
  const standard = (color: string, roughness: number, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const materials: Record<Finish, THREE.MeshStandardMaterial> = {
    concrete: standard("#27251f", 0.94),
    asphalt: standard("#0d0c09", 0.97),
    wall: standard("#181713", 0.46, 0.46),
    edge: standard("#9a8d70", 0.3, 0.72),
    metal: standard("#45433b", 0.38, 0.72),
    dark: standard("#090907", 0.33, 0.55),
    vent: standard("#060604", 0.72, 0.3),
    glass: standard("#393326", 0.14, 0.65),
    ivory: standard(BRAND.ivory, 0.65, 0.08),
    gold: standard(BRAND.gold, 0.22, 0.86),
    led: standard(BRAND.ivory, 0.38),
    flexLed: standard(BRAND.highlight, 0.38),
    roof: standard("#25241e", 0.42, 0.58),
    cover: standard("#25241e", 0.42, 0.58),
  };
  materials.glass.transparent = true;
  materials.glass.opacity = 0.24;
  materials.glass.depthWrite = false;
  materials.cover.transparent = true;
  materials.cover.opacity = 0;
  materials.led.emissive.set(BRAND.ivory);
  materials.led.emissiveIntensity = 1.5;
  materials.flexLed.emissive.set(BRAND.highlight);
  materials.flexLed.emissiveIntensity = 1.5;
  // A small deterministic roughness map prevents large surfaces from looking plastic.
  const data = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < 64 * 64; i++) {
    const value = 160 + ((i * 73 + Math.floor(i / 64) * 19) % 70);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, 64, 64);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.needsUpdate = true;
  materials.concrete.roughnessMap = texture;
  materials.wall.roughnessMap = texture;
  return { materials, texture };
}

function Batch({
  items,
  geometry,
  material,
  id,
  timeline,
  highlighted,
  reducedMotion,
  cutaway,
  onSelect,
  onHover,
}: {
  items: Part[];
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  id: EquipmentId | "site";
  timeline: RefObject<number>;
  highlighted: boolean;
  reducedMotion: boolean;
  cutaway: boolean;
  onSelect: SceneProps["onSelect"];
  onHover: SceneProps["onHover"];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  const localMaterial = useMemo(() => material.clone(), [material]);
  const order = id === "site" ? 0 : EQUIPMENT.findIndex((item) => item.id === id) + 1;
  const lastPosition = useRef(-1);
  const cover = items[0].finish === "cover";
  const fanAngle = useRef(0);
  const hasFans = items.some((part) => part.spin);
  useEffect(() => () => localMaterial.dispose(), [localMaterial]);
  useFrame((_, delta) => {
    if (!mesh.current) return;

    if (!reducedMotion && hasFans)
      fanAngle.current += Math.min(delta, 0.05) * (highlighted ? 4 : 1.2);
    if (lastPosition.current !== timeline.current || hasFans) {
      items.forEach((part, i) => {
        const build = part.build;
        const t = reducedMotion
          ? 1
          : assemblyProgress(timeline.current, order, part.at[1], build?.delay, build?.duration);
        const offset = build?.offset ?? [0, 1, 0];
        object.position.set(
          part.at[0] + offset[0] * (1 - t),
          part.at[1] + offset[1] * (1 - t),
          part.at[2] + offset[2] * (1 - t),
        );
        const grow = build?.grow ?? "all";
        const scale = Math.max(0.00001, t);
        object.scale.set(
          part.size[0] * (grow === "x" || grow === "all" ? scale : t > 0 ? 1 : 0.00001),
          part.size[1] * (grow === "y" || grow === "all" ? scale : t > 0 ? 1 : 0.00001),
          part.size[2] * (grow === "z" || grow === "all" ? scale : t > 0 ? 1 : 0.00001),
        );
        if (grow === "y") object.position.y -= part.size[1] * (1 - t) * 0.5;
        object.rotation.set(...(part.turn ?? [0, 0, 0]));
        if (part.spin) object.rotation.y += fanAngle.current;
        object.updateMatrix();
        mesh.current!.setMatrixAt(i, object.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
      lastPosition.current = timeline.current;
    }
    const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    mesh.current.position.y = THREE.MathUtils.lerp(
      mesh.current.position.y,
      cover && cutaway ? 1.3 : 0,
      k,
    );
    if (cover) {
      localMaterial.opacity = THREE.MathUtils.lerp(localMaterial.opacity, cutaway ? 0 : 1, k);
      mesh.current.visible = localMaterial.opacity > 0.015;
      localMaterial.depthWrite = localMaterial.opacity > 0.95;
    }
    if (items[0].finish === "flexLed") localMaterial.emissiveIntensity = highlighted ? 0.85 : 1.5;
    if (!["led", "flexLed"].includes(items[0].finish)) {
      localMaterial.emissive.set(BRAND.gold);
      localMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        localMaterial.emissiveIntensity,
        highlighted
          ? ["edge", "gold"].includes(items[0].finish)
            ? 0.18
            : 0.025
          : items[0].finish === "gold"
            ? 0.035
            : 0,
        k,
      );
    }
  });
  const enter = (event: ThreeEvent<PointerEvent>) => {
    if (id === "site" || event.pointerType === "touch") return;
    event.stopPropagation();
    onHover(id);
  };
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, localMaterial, items.length]}
      frustumCulled={false}
      castShadow={!["led", "flexLed", "glass"].includes(items[0].finish)}
      receiveShadow
      onPointerOver={enter}
      onPointerOut={() => {
        if (id !== "site") onHover(null);
      }}
      onClick={(event) => {
        if (id !== "site") {
          event.stopPropagation();
          onSelect(id);
        }
      }}
    />
  );
}

function EnergyRoute({
  points,
  lit,
  reducedMotion,
  timeline,
  stage,
  color = BRAND.gold,
}: {
  color?: string;
  timeline: RefObject<number>;
  stage: number;
  points: THREE.Vector3[];
  lit: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const bead = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "centripetal"), [points]);
  const time = useRef(0);
  useFrame((_, delta) => {
    const visible = lit && (reducedMotion || timeline.current >= stage + 0.7);
    if (group.current) group.current.visible = visible;
    if (!bead.current || !visible) return;
    time.current += Math.min(delta, 0.05);
    bead.current.position.copy(curve.getPointAt(reducedMotion ? 0.5 : (time.current * 0.11) % 1));
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <tubeGeometry args={[curve, 40, 0.05, 5, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} />
      </mesh>
      <mesh ref={bead}>
        <sphereGeometry args={[0.075, 8, 8]} />
        <meshBasicMaterial color={BRAND.ivory} />
      </mesh>
    </group>
  );
}

const ROUTES = [
  [
    [-13, 0.3, -3],
    [-10.4, 0.3, -3],
    [-8.1, 0.3, 2.8],
    [-7.3, 0.3, 4.5],
  ],
  [
    [-7.3, 0.3, 4.5],
    [-5.3, 0.3, 4.5],
    [-2.8, 0.5, 3.5],
    [-2.8, 0.5, -0.5],
  ],
  [
    [-7.3, 0.3, 4.5],
    [-5.2, 0.3, 4.5],
    [4.2, 0.3, 4.5],
    [5, 0.5, 3.1],
    [5, 0.5, -0.5],
  ],
  [
    [10, 0.3, 5.4],
    [10, 0.3, 4.5],
    [5.2, 0.3, 4.5],
  ],
].map((route) => route.map((p) => new THREE.Vector3(...p)));

function SelectionOutline({ selected }: { selected: EquipmentId | null }) {
  const item = EQUIPMENT.find((entry) => entry.id === selected);
  const geometry = useMemo(() => {
    if (!item) return null;
    const [x0, x1, z0, z1] = item.bounds;
    const y = 0.34;
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x0, y, z0),
      new THREE.Vector3(x1, y, z0),
      new THREE.Vector3(x1, y, z1),
      new THREE.Vector3(x0, y, z1),
      new THREE.Vector3(x0, y, z0),
    ]);
  }, [item]);
  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );
  if (!geometry) return null;
  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={BRAND.highlight} transparent opacity={0.75} depthTest={true} />
    </lineLoop>
  );
}

// Facility supply and return are separate paths; no generator dispatch is illustrated.
const COOLING_ROUTES = [
  [
    [-3.6, 1.04, 5.2],
    [-3.6, 1.04, 4.05],
    [-5.65, 1.04, 4.05],
    [-5.65, 1.04, 2.75],
    [-5.65, 2.5, 2.4],
    [-5.65, 2.5, -3.2],
  ],
  [
    [6.62, 2.5, -3.2],
    [6.62, 2.5, 2.4],
    [6.62, 1.04, 2.75],
    [6.62, 1.04, 4.3],
    [4.2, 1.04, 4.3],
    [4.2, 1.04, 5.2],
  ],
].map((points) => points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));

function SiteSurvey({ timeline }: { timeline: RefObject<number> }) {
  const line = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (const x of [-14.5, 14.5])
      for (const z of [-10, 10]) {
        points.push(
          new THREE.Vector3(x, -0.82, z),
          new THREE.Vector3(x - Math.sign(x) * 3, -0.82, z),
        );
        points.push(
          new THREE.Vector3(x, -0.82, z),
          new THREE.Vector3(x, -0.82, z - Math.sign(z) * 3),
        );
      }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!line.current) return;
    line.current.visible = timeline.current < 0.85;
    (line.current.material as THREE.LineBasicMaterial).opacity =
      Math.max(0, 1 - timeline.current / 0.85) * 0.32;
  });
  return (
    <lineSegments ref={line} geometry={geometry}>
      <lineBasicMaterial color={BRAND.bronze} transparent opacity={0.32} />
    </lineSegments>
  );
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.52;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene]);
  return null;
}

function World({
  selected,
  hovered,
  inspected,
  zoom,
  cutaway,
  dragging,
  markerLock,
  onHover,
  pointer,
  storyProgress,
  onSelect,
  reducedMotion,
  active,
  markers,
  onReady,
}: SceneProps) {
  const { camera, size, gl, invalidate, setDpr } = useThree();
  const resources = useMemo(
    () => ({
      ...makeMaterials(),
      box: new RoundedBoxGeometry(1, 1, 1, 1, 0.045),
      simple: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    }),
    [],
  );
  const timeline = useRef(0);
  const lastShadowBuild = useRef(-1);
  const shadowTime = useRef(1.2);
  const effective = inspected ?? hovered ?? selected;
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));
  const project = useMemo(() => new THREE.Vector3(), []);
  const markerPositions = useMemo(() => EQUIPMENT.map(() => ({ x: 0, y: 0 })), []);
  const wantedPosition = useMemo(() => new THREE.Vector3(), []);
  const wantedTarget = useMemo(() => new THREE.Vector3(), []);
  const fittedOffset = useMemo(() => new THREE.Vector3(), []);
  const config = campusView(inspected ?? selected, inspected !== null);
  const selectedPart = EQUIPMENT.find((item) => item.id === effective);
  const frameCount = useRef(0);
  const slowFrames = useRef(0);
  const ready = useRef(false);
  const metrics = useRef({ time: 0, frames: 0 });

  useEffect(() => {
    shadowTime.current = 1.2;
    invalidate();
  }, [
    selected,
    hovered,
    inspected,
    zoom,
    cutaway,
    dragging,
    reducedMotion,
    active,
    size,
    invalidate,
  ]);

  useEffect(
    () => () => {
      Object.values(resources.materials).forEach((material) => material.dispose());
      resources.texture.dispose();
      resources.box.dispose();
      resources.simple.dispose();
      resources.cylinder.dispose();
    },
    [resources],
  );

  useFrame((_, delta) => {
    const k = reducedMotion || !active ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 4.2);
    const target = reducedMotion ? BUILD_DURATION : storyProgress.current * BUILD_DURATION;
    timeline.current =
      Math.abs(target - timeline.current) < 0.001
        ? target
        : THREE.MathUtils.lerp(
            timeline.current,
            target,
            reducedMotion || !active ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 12),
          );
    // Cache fixed architectural shadows once assembly and roof transitions settle.
    // Fans are small enough to retain their stationary shadows during inspection.
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate =
      lastShadowBuild.current !== timeline.current || shadowTime.current > 0;
    lastShadowBuild.current = timeline.current;
    shadowTime.current = Math.max(0, shadowTime.current - Math.min(delta, 0.05));
    gl.domElement.dataset.build = String(Math.round((timeline.current / BUILD_DURATION) * 100));
    gl.domElement.dataset.view = inspected ?? "story";
    gl.domElement.dataset.zoom = String(zoom);
    gl.domElement.dataset.cutaway = String(cutaway || inspected === "firm" || inspected === "flex");
    wantedPosition.set(...config.camera);
    // Keep attention near the system without pushing the rest of the campus offscreen.
    wantedTarget.set(config.target[0] * 0.3, 0.8, config.target[2] * 0.3);
    if (!reducedMotion && !inspected && !dragging) {
      wantedPosition.x += pointer.current.x * 0.8;
      wantedPosition.y += pointer.current.y * 0.4;
    }
    wantedPosition.sub(wantedTarget);
    wantedPosition.applyAxisAngle(THREE.Object3D.DEFAULT_UP, pointer.current.orbit);
    const fov = (camera as THREE.PerspectiveCamera).fov;
    const framePoints =
      timeline.current >= BUILD_DURATION - 0.001 ? FINISHED_FRAME_POINTS : FRAME_POINTS;
    wantedPosition.setLength(
      campusFitDistance(
        wantedPosition.toArray(),
        wantedTarget.toArray(),
        size.width / size.height,
        fov,
        framePoints,
        1.72 - 0.42 * zoom,
      ),
    );
    wantedPosition.add(wantedTarget);
    camera.position.lerp(wantedPosition, k);
    currentTarget.current.lerp(wantedTarget, k);
    // Also fit the intermediate angle: transitions and dragging can never clip the slab.
    fittedOffset.copy(camera.position).sub(currentTarget.current);
    const safeDistance = campusFitDistance(
      fittedOffset.toArray(),
      currentTarget.current.toArray(),
      size.width / size.height,
      fov,
      framePoints,
      1.025,
    );
    if (fittedOffset.length() < safeDistance)
      camera.position.copy(currentTarget.current).add(fittedOffset.setLength(safeDistance));
    camera.lookAt(currentTarget.current);
    camera.updateMatrixWorld();
    gl.domElement.dataset.camera = camera.position
      .toArray()
      .map((value) => value.toFixed(1))
      .join(",");
    resources.materials.flexLed.emissiveIntensity = THREE.MathUtils.lerp(
      resources.materials.flexLed.emissiveIntensity,
      config.flexLevel * 1.5,
      k,
    );
    EQUIPMENT.forEach((item, i) => {
      const node = markers.current[i];
      if (!node) return;
      const reveal = reducedMotion ? 1 : assemblyProgress(timeline.current, i + 1, 2);
      node.hidden = reveal < 0.65;
      node.style.opacity = String(reveal);
      project.set(...item.anchor).project(camera);
      const rawY = (-project.y * 0.5 + 0.5) * size.height;
      let x = Math.max(23, Math.min(size.width - 23, (project.x * 0.5 + 0.5) * size.width));
      let y = Math.max(23, Math.min(size.height - 23, rawY));
      // Keep the 44px touch targets separate without moving the model itself.
      if (size.width < 600) {
        for (let pass = 0; pass < 2; pass++)
          for (let previous = 0; previous < i; previous++) {
            const other = markerPositions[previous];
            if (Math.abs(x - other.x) < 46 && Math.abs(y - other.y) < 46) {
              y = other.y - 47;
              if (y < 23) {
                y = 23;
                x = Math.min(size.width - 23, other.x + 47);
              }
            }
          }
      }
      // A moving hotspot must not leave the pointer and cancel its own camera preview.
      const lock = markerLock.current;
      const locked = lock?.id === item.id && inspected === item.id;
      if (locked) {
        x = Math.max(23, Math.min(size.width - 23, lock.x));
        y = Math.max(23, Math.min(size.height - 23, lock.y));
      }
      const rawX = (project.x * 0.5 + 0.5) * size.width;
      const dx = locked ? rawX - x : 0;
      const dy = rawY - y;
      node.style.setProperty("--stem-angle", `${-Math.atan2(dx, dy)}rad`);
      markerPositions[i] = { x, y };
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.setProperty("--stem", `${Math.max(0, (locked ? Math.hypot(dx, dy) : dy) - 11)}px`);
    });
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    // Measure only active settled frames. A lower DPR reduces work without removing content.
    metrics.current.time += Math.min(delta, 0.2);
    metrics.current.frames += 1;
    if (metrics.current.time >= 1) {
      gl.domElement.dataset.frames = String(frameCount.current);
      gl.domElement.dataset.fps = String(Math.round(metrics.current.frames / metrics.current.time));
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
      gl.domElement.dataset.triangles = String(gl.info.render.triangles);
      metrics.current = { time: 0, frames: 0 };
    }
    frameCount.current += 1;
    if (active && !reducedMotion && frameCount.current > 60) {
      slowFrames.current =
        delta > 1 / 35 ? slowFrames.current + 1 : Math.max(0, slowFrames.current - 1);
      if (slowFrames.current > 40 && gl.getPixelRatio() > 1) {
        setDpr(1);
        slowFrames.current = 0;
      }
    }
    if (active && (!reducedMotion || frameCount.current < 4)) invalidate();
  });

  return (
    <>
      <Environment />
      <SiteSurvey timeline={timeline} />
      <SelectionOutline selected={effective} />
      {selectedPart && (
        <pointLight
          position={[selectedPart.anchor[0], selectedPart.anchor[1] + 3, selectedPart.anchor[2]]}
          color={BRAND.highlight}
          intensity={35}
          distance={11}
          decay={2}
        />
      )}
      <ambientLight intensity={0.12} color={BRAND.ivory} />
      <hemisphereLight args={[BRAND.ivory, "#191408", 0.48]} />
      <directionalLight
        position={[-9, 19, 8]}
        intensity={3.1}
        color={BRAND.ivory}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={3}
      />
      <directionalLight position={[12, 10, -14]} intensity={1.9} color="#fff4da" />
      <directionalLight position={[2, 7, -10]} intensity={2.3} color={BRAND.highlight} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <shadowMaterial transparent opacity={0.32} />
      </mesh>
      {GROUPS.map((batch) => (
        <Batch
          key={`${batch.id}:${batch.key}`}
          items={batch.items}
          id={batch.id}
          geometry={
            batch.items[0].shape === "cylinder"
              ? resources.cylinder
              : ["led", "flexLed", "gold", "vent", "asphalt"].includes(batch.items[0].finish)
                ? resources.simple
                : resources.box
          }
          material={resources.materials[batch.items[0].finish]}
          timeline={timeline}
          highlighted={batch.id === effective}
          cutaway={cutaway || inspected === "firm" || inspected === "flex"}
          reducedMotion={reducedMotion || !active}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      {COOLING_ROUTES.map((points, index) => (
        <EnergyRoute
          key={`cooling-${index}`}
          points={points}
          timeline={timeline}
          stage={5}
          lit={effective === "cooling"}
          reducedMotion={reducedMotion}
          color={index === 0 ? BRAND.gold : BRAND.ivory}
        />
      ))}
      {ROUTES.map((points, index) => (
        <EnergyRoute
          key={index}
          points={points}
          timeline={timeline}
          stage={[1, 3, 4, 7][index]}
          lit={
            effective !== null &&
            effective !== "backup" &&
            effective !== "cooling" &&
            (index === 0 ||
              (index === 1 && ["meter", "firm"].includes(effective)) ||
              (index === 2 && ["meter", "flex"].includes(effective)) ||
              (index === 3 && effective === "battery"))
          }
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

export default function CampusScene(props: SceneProps) {
  const [contextLost, setContextLost] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const { onError } = props;
  useEffect(() => {
    const element = canvas.current;
    const lost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
      onError();
    };
    element?.addEventListener("webglcontextlost", lost);
    return () => element?.removeEventListener("webglcontextlost", lost);
  }, [onError]);
  if (contextLost) return null;
  return (
    <Canvas
      ref={canvas}
      shadows="percentage"
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [24, 24, 30], fov: 30, near: 0.1, far: 220 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      fallback={null}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.04;
      }}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
