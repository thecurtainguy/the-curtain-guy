"use client";

import type { StudioLightingMood, StudioPoint, StudioWallFinish } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LIGHTING_MOODS } from "../lighting-moods";
import { getWallTextures, type VenueQuality } from "../scene-finishes";
import {
  distanceToOutline,
  edgeInward,
  offsetPolygon,
  pointInPolygon,
  signedArea,
  type Vec2,
} from "./polygon";
import { getGlowFadeTexture, getHaloTexture } from "./textures";
import { SCALE } from "./wall-geometry";

const noRaycast = () => null;

/** Tray geometry (inches). */
const TRAY_DROP_IN = 14;
const TRAY_LIP_IN = 3;
const TRAY_LEDGE_IN = 6;
const COVE_WASH_IN = 42;
const CAN_RADIUS_FT = 0.27;
const MAX_CANS = 64;

function ceilingFinishFor(walls: StudioWallFinish): StudioWallFinish {
  if (walls === "tent_canvas" || walls === "black_box") return walls;
  return "white_plaster";
}

const CEILING_TINT: Partial<Record<StudioWallFinish, string>> = {
  white_plaster: "#756d64",
  black_box: "#ffffff",
  tent_canvas: "#d9d1c2",
};

type Buffers = { pos: number[]; nor: number[]; uv: number[] };

const emptyBuffers = (): Buffers => ({ pos: [], nor: [], uv: [] });

function toGeometry(b: Buffers) {
  if (!b.pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
  g.computeBoundingSphere();
  return g;
}

/** Two triangles with winding forced to face `n`. */
function pushQuad(b: Buffers, p: THREE.Vector3[], uv: [number, number][], n: THREE.Vector3) {
  const e1 = p[1].clone().sub(p[0]);
  const e2 = p[2].clone().sub(p[0]);
  const flip = e1.cross(e2).dot(n) < 0;
  const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
  for (const i of order) {
    b.pos.push(p[i].x, p[i].y, p[i].z);
    b.nor.push(n.x, n.y, n.z);
    b.uv.push(uv[i][0], uv[i][1]);
  }
}

/**
 * Event-venue ceiling seen from inside: a dark tray with a perimeter soffit,
 * a mood-tinted cove wash on the riser and central field, and recessed cans
 * whose lenses are HDR (> 1) so bloom catches them. Down-facing only, never
 * pickable, never casts or receives shadows; hidden when the camera rises
 * above it.
 */
export function VenueCeiling({
  floor,
  bounds,
  wallHeightIn,
  wallFinish,
  lighting,
  quality,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  wallHeightIn: number;
  wallFinish: StudioWallFinish;
  lighting: StudioLightingMood;
  quality: VenueQuality;
}) {
  const group = useRef<THREE.Group>(null);
  const height = wallHeightIn * SCALE;
  const finish = ceilingFinishFor(wallFinish);
  const tent = finish === "tent_canvas";
  const rig = LIGHTING_MOODS[lighting] ?? LIGHTING_MOODS.neutral;

  const parts = useMemo(() => {
    const outline: Vec2[] = floor.map((p) => ({ x: p.x, z: p.z }));
    const area = signedArea(outline);
    const minDim = Math.min(bounds.width, bounds.depth);
    const toW = (p: Vec2, yIn: number) =>
      new THREE.Vector3((p.x - bounds.centerX) * SCALE, yIn * SCALE, (p.z - bounds.centerZ) * SCALE);
    const down = new THREE.Vector3(0, -1, 0);

    const shape = new THREE.Shape();
    outline.forEach((p, i) => {
      const x = (p.x - bounds.centerX) * SCALE;
      const y = (p.z - bounds.centerZ) * SCALE;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    const slab = new THREE.ShapeGeometry(shape);

    const tray = !tent && minDim >= 180 && wallHeightIn >= 120 && Math.abs(area) > 1;
    const soffitIn = Math.min(48, Math.max(24, minDim * 0.1));
    const H = wallHeightIn;
    const ledgeLine = tray ? offsetPolygon(outline, soffitIn) : outline;
    const riserLine = tray ? offsetPolygon(outline, soffitIn - TRAY_LEDGE_IN) : outline;
    const washLine = offsetPolygon(riserLine, COVE_WASH_IN);

    const soffit = emptyBuffers();
    const glow = emptyBuffers();
    const led: THREE.BufferGeometry[] = [];

    const ring = (
      b: Buffers,
      outer: Vec2[],
      inner: Vec2[],
      yIn: number,
      mode: "world" | "fade"
    ) => {
      let run = 0;
      for (let i = 0; i < outer.length; i++) {
        const j = (i + 1) % outer.length;
        const quad = [toW(outer[i], yIn), toW(outer[j], yIn), toW(inner[j], yIn), toW(inner[i], yIn)];
        const len = Math.hypot(outer[j].x - outer[i].x, outer[j].z - outer[i].z) * SCALE;
        const uv: [number, number][] =
          mode === "world"
            ? quad.map((v) => [v.x, v.z] as [number, number])
            : [
                [run, 0],
                [run + len, 0],
                [run + len, 1],
                [run, 1],
              ];
        run += len;
        pushQuad(b, quad, uv, down);
      }
    };

    const strip = (b: Buffers, line: Vec2[], y0: number, y1: number, inset: number, fade: boolean) => {
      const a = signedArea(line);
      let run = 0;
      for (let i = 0; i < line.length; i++) {
        const j = (i + 1) % line.length;
        const n = edgeInward(line, i, a);
        const p0 = { x: line[i].x + n.x * inset, z: line[i].z + n.z * inset };
        const p1 = { x: line[j].x + n.x * inset, z: line[j].z + n.z * inset };
        const len = Math.hypot(p1.x - p0.x, p1.z - p0.z) * SCALE;
        const quad = [toW(p0, y0), toW(p1, y0), toW(p1, y1), toW(p0, y1)];
        const uv: [number, number][] = fade
          ? [
              [run, 0],
              [run + len, 0],
              [run + len, 1],
              [run, 1],
            ]
          : [
              [run, y0 * SCALE],
              [run + len, y0 * SCALE],
              [run + len, y1 * SCALE],
              [run, y1 * SCALE],
            ];
        run += len;
        pushQuad(b, quad, uv, new THREE.Vector3(n.x, 0, n.z));
      }
    };

    if (tray) {
      const soffitY = H - TRAY_DROP_IN;
      ring(soffit, outline, ledgeLine, soffitY, "world");
      strip(soffit, ledgeLine, soffitY, soffitY + TRAY_LIP_IN, 0, false);
      strip(soffit, riserLine, soffitY, H, 0, false);
      strip(glow, riserLine, soffitY + TRAY_LIP_IN, H, 0.15, true);
      const a = signedArea(riserLine);
      riserLine.forEach((p, i) => {
        const q = riserLine[(i + 1) % riserLine.length];
        const n = edgeInward(riserLine, i, a);
        const len = Math.hypot(q.x - p.x, q.z - p.z);
        const run = len - 2 * (TRAY_LEDGE_IN - 1.4);
        if (run < 2) return;
        const box = new THREE.BoxGeometry(run * SCALE, 0.6 * SCALE, 0.8 * SCALE);
        const mid = {
          x: (p.x + q.x) / 2 + n.x * (TRAY_LEDGE_IN - 1.4),
          z: (p.z + q.z) / 2 + n.z * (TRAY_LEDGE_IN - 1.4),
        };
        box.rotateY(-Math.atan2(q.z - p.z, q.x - p.x));
        const w = toW(mid, soffitY + 0.3);
        box.translate(w.x, w.y, w.z);
        led.push(box);
      });
    }
    ring(glow, riserLine, washLine, H - 0.15, "fade");

    const cans: THREE.BufferGeometry[] = [];
    const bezels: THREE.BufferGeometry[] = [];
    const halos: THREE.BufferGeometry[] = [];
    if (!tent) {
      const field = tray ? riserLine : outline;
      const spacing = Math.min(132, Math.max(84, Math.sqrt((bounds.width * bounds.depth) / 40)));
      const nx = Math.max(1, Math.round((bounds.width - soffitIn * 2) / spacing));
      const nz = Math.max(1, Math.round((bounds.depth - soffitIn * 2) / spacing));
      const sx = (bounds.width - soffitIn * 2) / nx;
      const sz = (bounds.depth - soffitIn * 2) / nz;
      for (let i = 0; i < nx; i++) {
        for (let k = 0; k < nz; k++) {
          if (cans.length >= MAX_CANS) break;
          const cx = bounds.minX + soffitIn + (i + 0.5) * sx;
          const cz = bounds.minZ + soffitIn + (k + 0.5) * sz;
          if (!pointInPolygon(field, cx, cz) || distanceToOutline(field, cx, cz) < 24) continue;
          const w = toW({ x: cx, z: cz }, H);
          const disc = new THREE.CircleGeometry(CAN_RADIUS_FT, 20);
          disc.rotateX(Math.PI / 2);
          disc.translate(w.x, w.y - 0.02, w.z);
          cans.push(disc);
          const bezel = new THREE.RingGeometry(CAN_RADIUS_FT, CAN_RADIUS_FT + 0.09, 24);
          bezel.rotateX(Math.PI / 2);
          bezel.translate(w.x, w.y - 0.025, w.z);
          bezels.push(bezel);
          const halo = new THREE.CircleGeometry(0.95, 24);
          halo.rotateX(Math.PI / 2);
          halo.translate(w.x, w.y - 0.012, w.z);
          halos.push(halo);
        }
      }
    }

    const merge = (list: THREE.BufferGeometry[]) => {
      if (!list.length) return null;
      const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
      const merged = mergeGeometries(flat, false);
      list.forEach((g) => g.dispose());
      flat.forEach((g) => g.dispose());
      return merged;
    };

    return {
      slab,
      soffit: toGeometry(soffit),
      glow: toGeometry(glow),
      led: merge(led),
      cans: merge(cans),
      bezels: merge(bezels),
      halos: merge(halos),
    };
  }, [floor, bounds, wallHeightIn, tent]);

  useEffect(
    () => () => {
      Object.values(parts).forEach((g) => g?.dispose());
    },
    [parts]
  );

  const textures = getWallTextures(finish, quality);
  const ceilingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: textures.map,
        normalMap: textures.normalMap,
        roughnessMap: textures.roughnessMap,
        roughness: 1,
        color: CEILING_TINT[finish] ?? "#ffffff",
      }),
    [textures, finish]
  );

  const accents = useMemo(() => {
    const boost = THREE.MathUtils.clamp(rig.uplightBoost, 0.5, 1.8);
    const cove = new THREE.Color(rig.environment.accent).lerp(new THREE.Color(rig.practicalWarmth), 0.35);
    const lens = new THREE.Color(rig.practicalWarmth).lerp(new THREE.Color("#ffffff"), 0.35);
    const fade = getGlowFadeTexture();
    const radial = getHaloTexture();
    const additive = {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    } as const;
    return {
      glow: new THREE.MeshBasicMaterial({
        ...additive,
        map: fade,
        color: cove.clone().multiplyScalar((tent ? 0.22 : 0.42) * boost),
      }),
      led: new THREE.MeshBasicMaterial({
        color: cove.clone().multiplyScalar(2.4 * boost),
        toneMapped: false,
      }),
      can: new THREE.MeshBasicMaterial({
        color: lens.clone().multiplyScalar(1.25 + 0.35 * rig.practicalBoost),
        toneMapped: false,
      }),
      bezel: new THREE.MeshStandardMaterial({
        color: finish === "black_box" ? "#1a1918" : "#d8d2c8",
        metalness: 0.4,
        roughness: 0.45,
      }),
      halo: new THREE.MeshBasicMaterial({
        ...additive,
        map: radial,
        color: lens.clone().multiplyScalar(0.16 * rig.practicalBoost),
      }),
    };
  }, [rig, tent, finish]);

  useEffect(
    () => () => {
      ceilingMaterial.dispose();
      Object.values(accents).forEach((m) => m.dispose());
    },
    [ceilingMaterial, accents]
  );

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const show = camera.position.y < height - 0.05;
    if (g.visible !== show) g.visible = show;
  });

  return (
    <group ref={group}>
      <mesh
        geometry={parts.slab}
        material={ceilingMaterial}
        position={[0, height, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        raycast={noRaycast}
      />
      {parts.soffit ? <mesh geometry={parts.soffit} material={ceilingMaterial} raycast={noRaycast} /> : null}
      {parts.glow ? (
        <mesh geometry={parts.glow} material={accents.glow} raycast={noRaycast} renderOrder={2} />
      ) : null}
      {parts.led ? <mesh geometry={parts.led} material={accents.led} raycast={noRaycast} /> : null}
      {parts.halos ? (
        <mesh geometry={parts.halos} material={accents.halo} raycast={noRaycast} renderOrder={2} />
      ) : null}
      {parts.bezels ? <mesh geometry={parts.bezels} material={accents.bezel} raycast={noRaycast} /> : null}
      {parts.cans ? <mesh geometry={parts.cans} material={accents.can} raycast={noRaycast} /> : null}
    </group>
  );
}
