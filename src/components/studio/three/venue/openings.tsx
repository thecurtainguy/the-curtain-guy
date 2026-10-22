"use client";

import type { StudioLightingMood, StudioOpeningStyle } from "@/data/studio";
import { getOpeningStyle } from "@/data/studio-openings";
import type { StudioBounds } from "@/lib/studio-geometry";
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { memo, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { StudioSelection } from "../../studio-types";
import type { WallFinishAppearance } from "../scene-finishes";
import { disposeLater } from "./dispose-later";
import {
  getDaylightTexture,
  getFoyerTexture,
  getRadialFadeTexture,
  type DaylightTone,
} from "./textures";
import {
  ARCH_CROWN_IN,
  SCALE,
  wallPointWorld,
  wallYaw,
  type OpeningSpan,
  type WallFrame,
} from "./wall-geometry";

const IN = SCALE;
const noRaycast = () => null;

/** Shared unit primitives, scaled per mesh. Module lifetime — never disposed. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_RING = new THREE.TorusGeometry(1, 0.12, 8, 32);

export function daylightToneFor(mood: StudioLightingMood): DaylightTone {
  if (mood === "warm_gala" || mood === "candlelight") return "golden";
  if (mood === "dark_venue" || mood === "twilight_blue") return "dusk";
  return "day";
}

export type OpeningMaterials = ReturnType<typeof createOpeningMaterials>;

function createOpeningMaterials(
  appearance: WallFinishAppearance,
  envMap: THREE.Texture,
  tone: DaylightTone
) {
  const poolColor = tone === "day" ? "#cfe2ff" : tone === "golden" ? "#ffcf8a" : "#6f7ab8";
  return {
    casing: new THREE.MeshPhysicalMaterial({
      color: appearance.casing,
      roughness: 0.42,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
    }),
    door: new THREE.MeshPhysicalMaterial({
      color: appearance.door,
      roughness: 0.36,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
      envMap,
      envMapIntensity: 0.55,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: "#c9a24f",
      metalness: 1,
      roughness: 0.26,
      envMap,
      envMapIntensity: 1.2,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: "#c4c6c8",
      metalness: 1,
      roughness: 0.34,
      envMap,
      envMapIntensity: 1,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#d4e5ec",
      roughness: 0.03,
      metalness: 0,
      transparent: true,
      opacity: 0.18,
      ior: 1.5,
      specularIntensity: 1,
      envMap,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    frame: new THREE.MeshPhysicalMaterial({
      color: "#2d2925",
      metalness: 0.45,
      roughness: 0.42,
      clearcoat: 0.3,
      envMap,
      envMapIntensity: 0.6,
    }),
    stone: new THREE.MeshPhysicalMaterial({
      color: "#dcd6cb",
      roughness: 0.22,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    }),
    plan: new THREE.MeshBasicMaterial({
      color: "#e8bd55",
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    daylight: new THREE.MeshBasicMaterial({
      map: getDaylightTexture(tone),
      color: tone === "day" ? "#ffffff" : tone === "golden" ? "#d8bf9c" : "#8f97bb",
      toneMapped: false,
      fog: false,
    }),
    foyer: new THREE.MeshBasicMaterial({ map: getFoyerTexture() }),
    foyerSide: new THREE.MeshBasicMaterial({ map: getFoyerTexture(), color: "#6a6a6a" }),
    foyerFloor: new THREE.MeshBasicMaterial({ color: "#20170f" }),
    pool: new THREE.MeshBasicMaterial({
      color: poolColor,
      map: getRadialFadeTexture(),
      transparent: true,
      opacity: tone === "dusk" ? 0.05 : 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    highlight: new THREE.MeshBasicMaterial({
      color: "#e8bd55",
      transparent: true,
      opacity: 0.16,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
    hover: new THREE.MeshBasicMaterial({
      color: "#f3d68c",
      transparent: true,
      opacity: 0.08,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  };
}

export function useOpeningMaterials(
  appearance: WallFinishAppearance,
  envMap: THREE.Texture,
  tone: DaylightTone
): OpeningMaterials {
  const materials = useMemo(
    () => createOpeningMaterials(appearance, envMap, tone),
    [appearance, envMap, tone]
  );
  useEffect(() => () => disposeLater(Object.values(materials)), [materials]);
  return materials;
}

type Vec3 = [number, number, number];

function Box({
  size,
  position,
  material,
  rotation,
  cast = false,
}: {
  size: Vec3;
  position: Vec3;
  material: THREE.Material;
  rotation?: Vec3;
  cast?: boolean;
}) {
  if (size[0] <= 0.001 || size[1] <= 0.001 || size[2] <= 0.001) return null;
  return (
    <mesh
      geometry={UNIT_BOX}
      scale={size}
      position={position}
      rotation={rotation}
      material={material}
      castShadow={cast}
      receiveShadow
    />
  );
}

/** Cylinder along local Y unless rotated. */
function Rod({
  radius,
  length,
  position,
  rotation,
  material,
}: {
  radius: number;
  length: number;
  position: Vec3;
  rotation?: Vec3;
  material: THREE.Material;
}) {
  return (
    <mesh
      geometry={UNIT_ROD}
      scale={[radius * 2, length, radius * 2]}
      position={position}
      rotation={rotation}
      material={material}
    />
  );
}

function Pane({
  width,
  height,
  position,
  rotation,
  material,
  pickable = true,
}: {
  width: number;
  height: number;
  position: Vec3;
  rotation?: Vec3;
  material: THREE.Material;
  pickable?: boolean;
}) {
  if (width <= 0.01 || height <= 0.01) return null;
  return (
    <mesh
      geometry={UNIT_PLANE}
      scale={[width, height, 1]}
      position={position}
      rotation={rotation}
      material={material}
      raycast={pickable ? undefined : noRaycast}
    />
  );
}

function ExtrudedShape({
  build,
  depth,
  z,
  material,
  cast = false,
}: {
  build: () => THREE.Shape;
  depth: number;
  z: number;
  material: THREE.Material;
  cast?: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(build(), {
      depth,
      bevelEnabled: false,
      curveSegments: 20,
    });
    geo.translate(0, 0, z);
    return geo;
  }, [build, depth, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow={cast} receiveShadow />;
}

/**
 * Wall-material infill (arch spandrel) whose faces line up with the wall
 * prism: +Z face → interior group, −Z face → exterior group, sides → cap,
 * with face UVs in the wall's along/height feet space.
 */
function WallInfill({
  build,
  thickness,
  uOffset,
  uSign,
  materials,
}: {
  build: () => THREE.Shape;
  thickness: number;
  uOffset: number;
  uSign: number;
  materials: THREE.Material[];
}) {
  const geometry = useMemo(() => {
    const src = new THREE.ExtrudeGeometry(build(), {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 20,
    });
    src.translate(0, 0, -thickness);
    const srcGeo = src.index ? src.toNonIndexed() : src;
    const pos = srcGeo.getAttribute("position");
    const nor = srcGeo.getAttribute("normal");
    const uv = srcGeo.getAttribute("uv");
    const buckets = [0, 1, 2].map(() => ({ p: [] as number[], n: [] as number[], u: [] as number[] }));
    for (let i = 0; i < pos.count; i += 3) {
      const nz = nor.getZ(i);
      const group = nz > 0.5 ? 0 : nz < -0.5 ? 1 : 2;
      const b = buckets[group];
      for (let k = i; k < i + 3; k++) {
        b.p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
        b.n.push(nor.getX(k), nor.getY(k), nor.getZ(k));
        if (group === 2) b.u.push(uv.getX(k), uv.getY(k));
        else b.u.push(uOffset + uSign * pos.getX(k), pos.getY(k));
      }
    }
    if (srcGeo !== src) srcGeo.dispose();
    src.dispose();
    const geo = new THREE.BufferGeometry();
    let start = 0;
    buckets.forEach((b, index) => {
      const count = b.p.length / 3;
      geo.addGroup(start, count, index);
      start += count;
    });
    geo.setAttribute("position", new THREE.Float32BufferAttribute(buckets.flatMap((b) => b.p), 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(buckets.flatMap((b) => b.n), 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(buckets.flatMap((b) => b.u), 2));
    geo.computeBoundingSphere();
    return geo;
  }, [build, thickness, uOffset, uSign]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={materials} receiveShadow />;
}

/* ------------------------------------------------------------------ */
/* Arch shapes (feet, opening-local: x across, y up)                    */
/* ------------------------------------------------------------------ */

/** Circular arch springing at ±halfW on `spring`, apex `rise` above it. */
type ArchDims = { halfW: number; spring: number; rise: number };

function archCircle({ halfW, spring, rise }: ArchDims) {
  const r = (halfW * halfW + rise * rise) / (2 * rise);
  return { cy: spring + rise - r, r };
}

/** Half-chord and angle where the circle (0, cy, r) crosses height `y`. */
function crossing(cy: number, r: number, y: number) {
  const dy = y - cy;
  const x = Math.sqrt(Math.max(0, r * r - dy * dy));
  return { x, a: Math.atan2(dy, x) };
}

/** Region above `base` under the arch grown concentrically by `grow`. */
function archHeadShape(dims: ArchDims, grow: number, base: number): THREE.Shape {
  const { cy, r } = archCircle(dims);
  const radius = Math.max(0.01, r + grow);
  const c = crossing(cy, radius, base);
  const s = new THREE.Shape();
  s.moveTo(-c.x, base);
  s.lineTo(c.x, base);
  s.absarc(0, cy, radius, c.a, Math.PI - c.a, false);
  s.closePath();
  return s;
}

/** Band between two concentric arch offsets (`inner` < `outer`), cut flat at the spring. */
function archBandShape(dims: ArchDims, inner: number, outer: number): THREE.Shape {
  const { cy, r } = archCircle(dims);
  const o = crossing(cy, r + outer, dims.spring);
  const i = crossing(cy, r + inner, dims.spring);
  const s = new THREE.Shape();
  s.moveTo(o.x, dims.spring);
  s.absarc(0, cy, r + outer, o.a, Math.PI - o.a, false);
  s.lineTo(-i.x, dims.spring);
  s.absarc(0, cy, r + inner, Math.PI - i.a, i.a, true);
  s.closePath();
  return s;
}

/** Wall left between the rectangular cut (up to `top`) and the arch. */
function spandrelShape(dims: ArchDims, top: number): THREE.Shape {
  const { halfW, spring } = dims;
  const { cy, r } = archCircle(dims);
  const a = Math.atan2(spring - cy, halfW);
  const s = new THREE.Shape();
  s.moveTo(-halfW, spring);
  s.lineTo(-halfW, top);
  s.lineTo(halfW, top);
  s.lineTo(halfW, spring);
  s.absarc(0, cy, r, a, Math.PI - a, false);
  s.closePath();
  return s;
}

function ArchSpandrel({
  halfW,
  spring,
  rise,
  top,
  thickness,
  uOffset,
  uSign,
  materials,
}: ArchDims & {
  top: number;
  thickness: number;
  uOffset: number;
  uSign: number;
  materials: THREE.Material[];
}) {
  const build = useMemo(
    () => () => spandrelShape({ halfW, spring, rise }, top + 0.01),
    [halfW, spring, rise, top]
  );
  return (
    <WallInfill build={build} thickness={thickness} uOffset={uOffset} uSign={uSign} materials={materials} />
  );
}

function ArchBand({
  halfW,
  spring,
  rise,
  inner,
  outer,
  depth,
  z,
  material,
}: ArchDims & { inner: number; outer: number; depth: number; z: number; material: THREE.Material }) {
  const build = useMemo(
    () => () => archBandShape({ halfW, spring, rise }, inner, outer),
    [halfW, spring, rise, inner, outer]
  );
  return <ExtrudedShape build={build} depth={depth} z={z} material={material} />;
}

function ArchGlass({
  halfW,
  spring,
  rise,
  grow,
  z,
  material,
}: ArchDims & { grow: number; z: number; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(archHeadShape({ halfW, spring, rise }, grow, spring), 24);
    geo.translate(0, 0, z);
    return geo;
  }, [halfW, spring, rise, grow, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} />;
}

/** Fan of radial glazing bars from the spring centre, plus a half-round hub. */
function ArchFan({
  halfW,
  spring,
  rise,
  grow,
  count,
  bar,
  depth,
  z,
  material,
}: ArchDims & {
  grow: number;
  count: number;
  bar: number;
  depth: number;
  z: number;
  material: THREE.Material;
}) {
  const { cy, r } = archCircle({ halfW, spring, rise });
  const radius = r + grow;
  const a = crossing(cy, radius, spring).a;
  const hub = Math.min(0.32, radius * 0.22);
  const hubBuild = useMemo(
    () => () => archHeadShape({ halfW: hub, spring, rise: hub }, 0, spring),
    [hub, spring]
  );
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const angle = a + ((Math.PI - 2 * a) * (index + 1)) / (count + 1);
        const dx = radius * Math.cos(angle);
        const dy = cy + radius * Math.sin(angle) - spring;
        return (
          <Box
            key={index}
            size={[bar, Math.hypot(dx, dy), depth]}
            position={[dx / 2, spring + dy / 2, z]}
            rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]}
            material={material}
          />
        );
      })}
      <ExtrudedShape build={hubBuild} depth={depth * 1.2} z={z - depth * 0.6} material={material} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared assembly parts                                              */
/* ------------------------------------------------------------------ */

type AssemblyProps = {
  style: StudioOpeningStyle;
  /** Feet. */
  width: number;
  bottom: number;
  top: number;
  /** Current top of the wall (feet); the assembly is clipped to it. */
  wallTop: number;
  thickness: number;
  clipped: boolean;
  detailed: boolean;
  materials: OpeningMaterials;
  /** Wall prism materials [interior, exterior, cap]. */
  wallMaterials: THREE.Material[];
  /** Wall-UV along offset (feet) of the opening centre and local-X sign. */
  uOffset: number;
  uSign: number;
  /** Visible arched head (feet), null for a flat or clipped head. */
  arch: ArchDims | null;
  /** Camera stands inside the room (enables the vestibule backdrop). */
  inside: boolean;
};

type FrameProps = Pick<AssemblyProps, "width" | "bottom" | "top" | "wallTop" | "thickness" | "clipped">;

type Cornice = "none" | "simple" | "grand";

const CORNICE_HEIGHT: Record<Cornice, number> = { none: 0, simple: 1.4 * IN, grand: 5.5 * IN };

/** Side casings + head (optional cornice) on both wall faces. */
function Casings({
  width,
  bottom,
  top,
  wallTop,
  thickness,
  clipped,
  material,
  casingWidth,
  casingDepth,
  cornice,
  head = true,
  plinth = false,
}: FrameProps & {
  material: THREE.Material;
  casingWidth: number;
  casingDepth: number;
  cornice: Cornice;
  head?: boolean;
  plinth?: boolean;
}) {
  const headFits =
    head && !clipped && top + casingWidth + CORNICE_HEIGHT[cornice] <= wallTop + 0.001;
  const legTop = headFits ? top : Math.min(top, wallTop);
  const legH = legTop - bottom;
  const legX = width / 2 + casingWidth / 2 - 0.25 * IN;
  const headW = width + casingWidth * 2 - 0.5 * IN;
  const crown = top + casingWidth;
  const plinthH = Math.min(7 * IN, legH);
  const faces: [number, number][] = [
    [casingDepth / 2, 1],
    [-thickness - casingDepth / 2, -1],
  ];
  return (
    <>
      {faces.map(([z, s]) => (
        <group key={s}>
          {[-legX, legX].map((x) => (
            <group key={x}>
              <Box size={[casingWidth, legH, casingDepth]} position={[x, bottom + legH / 2, z]} material={material} />
              {plinth ? (
                <Box
                  size={[casingWidth + 0.5 * IN, plinthH, casingDepth + 0.4 * IN]}
                  position={[x, bottom + plinthH / 2, z + s * 0.2 * IN]}
                  material={material}
                />
              ) : null}
            </group>
          ))}
          {headFits ? (
            <>
              <Box size={[headW, casingWidth, casingDepth]} position={[0, top + casingWidth / 2, z]} material={material} />
              {cornice === "simple" ? (
                <Box
                  size={[headW + 1.7 * IN, 1.4 * IN, casingDepth + 0.8 * IN]}
                  position={[0, crown + 0.7 * IN, z + s * 0.4 * IN]}
                  material={material}
                />
              ) : null}
              {cornice === "grand" ? (
                <>
                  <Box
                    size={[headW, 3 * IN, casingDepth + 0.3 * IN]}
                    position={[0, crown + 1.5 * IN, z + s * 0.15 * IN]}
                    material={material}
                  />
                  <Box
                    size={[headW + 1.5 * IN, 0.9 * IN, casingDepth + 0.9 * IN]}
                    position={[0, crown + 3.45 * IN, z + s * 0.45 * IN]}
                    material={material}
                  />
                  <Box
                    size={[headW + 3.5 * IN, 1.6 * IN, casingDepth + 1.8 * IN]}
                    position={[0, crown + 4.7 * IN, z + s * 0.9 * IN]}
                    material={material}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </group>
      ))}
    </>
  );
}

/** Jamb linings through the wall; `head` adds the head lining. */
function Jambs({
  width,
  bottom,
  top,
  wallTop,
  thickness,
  head,
  material,
}: Omit<FrameProps, "clipped"> & { head: boolean; material: THREE.Material }) {
  const j = 0.75 * IN;
  const h = Math.min(top, wallTop) - bottom;
  return (
    <>
      <Box size={[j, h, thickness + 0.2 * IN]} position={[-width / 2 + j / 2, bottom + h / 2, -thickness / 2]} material={material} />
      <Box size={[j, h, thickness + 0.2 * IN]} position={[width / 2 - j / 2, bottom + h / 2, -thickness / 2]} material={material} />
      {head ? (
        <Box size={[width, j, thickness + 0.2 * IN]} position={[0, top - j / 2, -thickness / 2]} material={material} />
      ) : null}
    </>
  );
}

function Threshold({ width, thickness, material }: { width: number; thickness: number; material: THREE.Material }) {
  return (
    <Box size={[width, 0.5 * IN, thickness + 1 * IN]} position={[0, 0.25 * IN, -thickness / 2]} material={material} />
  );
}

/** Classical pilasters with plinths and capitals, under an entablature or an archivolt. */
function PilasterSurround({
  width,
  top,
  wallTop,
  thickness,
  clipped,
  materials,
  arch,
}: AssemblyProps) {
  const pw = 5 * IN;
  const pd = 1.25 * IN;
  const legTop = arch ? arch.spring : top;
  const legH = Math.min(legTop, wallTop);
  const legX = width / 2 + pw / 2;
  const capFits = !clipped && legTop + 4 * IN <= wallTop;
  const headW = width + pw * 2;
  const flatHead = !arch && !clipped && top + pw + 3 * IN <= wallTop;
  const apex = arch ? arch.spring + arch.rise : 0;
  const archTrim = arch !== null && apex + pw + 0.5 * IN <= wallTop;
  const m = materials.casing;
  return (
    <>
      {(
        [
          [pd / 2, 1],
          [-thickness - pd / 2, -1],
        ] as const
      ).map(([z, s]) => (
        <group key={s}>
          {[-legX, legX].map((x) => (
            <group key={x}>
              <Box size={[pw, legH, pd]} position={[x, legH / 2, z]} material={m} />
              <Box
                size={[pw + 0.6 * IN, Math.min(7 * IN, legH), pd + 0.5 * IN]}
                position={[x, Math.min(7 * IN, legH) / 2, z + s * 0.25 * IN]}
                material={m}
              />
              {capFits ? (
                <Box
                  size={[pw + 1 * IN, 4 * IN, pd + 0.7 * IN]}
                  position={[x, legTop - 2 * IN, z + s * 0.35 * IN]}
                  material={m}
                />
              ) : null}
            </group>
          ))}
          {flatHead ? (
            <>
              <Box size={[headW, pw, pd]} position={[0, top + pw / 2, z]} material={m} />
              <Box
                size={[headW + 1.5 * IN, 1 * IN, pd + 0.8 * IN]}
                position={[0, top + pw + 0.5 * IN, z + s * 0.4 * IN]}
                material={m}
              />
              <Box
                size={[headW + 4 * IN, 2 * IN, pd + 2 * IN]}
                position={[0, top + pw + 2 * IN, z + s * 1 * IN]}
                material={m}
              />
            </>
          ) : null}
          {arch && archTrim ? (
            <>
              <ArchBand {...arch} inner={0} outer={pw} depth={pd} z={s > 0 ? 0 : -thickness - pd} material={m} />
              <Box
                size={[Math.min(0.55, width * 0.07), pw + 2 * IN, pd + 0.6 * IN]}
                position={[0, apex + pw / 2, z + s * 0.3 * IN]}
                material={m}
              />
            </>
          ) : null}
        </group>
      ))}
    </>
  );
}

const FOYER_DEPTH_FT = 4.5;

/**
 * Dim, warm vestibule behind doors and entrances so the in-room view looks
 * through into a lit hallway rather than the void. Only rendered while the
 * camera is inside the room.
 */
function Foyer({ width, top, thickness, materials }: AssemblyProps) {
  const w = width + 3;
  const h = top + 1.5;
  const back = -thickness - FOYER_DEPTH_FT;
  const mid = -thickness - FOYER_DEPTH_FT / 2;
  return (
    <group>
      <Pane width={w} height={h} position={[0, h / 2, back]} material={materials.foyer} pickable={false} />
      {[-1, 1].map((s) => (
        <Pane
          key={s}
          width={FOYER_DEPTH_FT}
          height={h}
          position={[(s * w) / 2, h / 2, mid]}
          rotation={[0, (-s * Math.PI) / 2, 0]}
          material={materials.foyerSide}
          pickable={false}
        />
      ))}
      <Pane
        width={w}
        height={FOYER_DEPTH_FT}
        position={[0, 0.005, mid]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.foyerFloor}
        pickable={false}
      />
    </group>
  );
}

/** Sky backdrop outside glazing plus a soft light pool on the room floor. */
function Daylight({ width, bottom, top, thickness, materials }: AssemblyProps) {
  const y0 = bottom - 0.5;
  const y1 = top + 0.6;
  const h = top - bottom;
  return (
    <>
      <Pane
        width={width + 1.2}
        height={y1 - y0}
        position={[0, (y0 + y1) / 2, -thickness - 1.1]}
        material={materials.daylight}
        pickable={false}
      />
      <Pane
        width={width * 1.5 + 1}
        height={Math.min(9, 2 + h * 1.2)}
        position={[0, 0.012, Math.min(4.5, 1 + h * 0.6)]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.pool}
        pickable={false}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Door leaves                                                        */
/* ------------------------------------------------------------------ */

type LeafFinish = "panel" | "raised" | "porthole";
type LeafHardware = "lever" | "pull" | "push";

const LEAF_T = 1.75 * IN;

/** Stepped raised fields: tall upper panel, slim frieze panel, lower panel. */
function RaisedPanels({ width, height, cx, material }: { width: number; height: number; cx: number; material: THREE.Material }) {
  const m = Math.min(0.42, width * 0.15);
  const rail = m * 0.8;
  const pw = width - m * 2;
  const low = height * 0.25;
  const mid = height * 0.09;
  const high = height - m * 2 - rail * 2 - low - mid;
  const bevel = Math.min(0.2, pw * 0.13);
  const panels: [number, number][] = [
    [m + low / 2, low],
    [m + low + rail + mid / 2, mid],
    [height - m - high / 2, high],
  ];
  return (
    <>
      {panels.map(([y, h], index) => (
        <group key={index}>
          <Box size={[pw, h, LEAF_T + 0.35 * IN]} position={[cx, y, 0]} material={material} />
          <Box size={[pw - bevel * 2, h - bevel * 2, LEAF_T + 0.9 * IN]} position={[cx, y, 0]} material={material} />
        </group>
      ))}
    </>
  );
}

/** Flat slab with a real round hole for the porthole glass. */
function PortholeSlab({
  width,
  height,
  side,
  cy,
  radius,
  material,
}: {
  width: number;
  height: number;
  side: 1 | -1;
  cy: number;
  radius: number;
  material: THREE.Material;
}) {
  const build = useMemo(
    () => () => {
      const x0 = side > 0 ? 0 : -width;
      const s = new THREE.Shape();
      s.moveTo(x0, 0);
      s.lineTo(x0 + width, 0);
      s.lineTo(x0 + width, height);
      s.lineTo(x0, height);
      s.closePath();
      const hole = new THREE.Path();
      hole.absarc((side * width) / 2, cy, radius, 0, Math.PI * 2, true);
      s.holes.push(hole);
      return s;
    },
    [width, height, side, cy, radius]
  );
  return <ExtrudedShape build={build} depth={LEAF_T} z={-LEAF_T / 2} material={material} cast />;
}

function LeafHardwareSet({
  kind,
  width,
  side,
  materials,
}: {
  kind: LeafHardware;
  width: number;
  side: 1 | -1;
  materials: OpeningMaterials;
}) {
  const t = LEAF_T;
  if (kind === "pull") {
    const x = side * (width - 0.3);
    const len = 1.7;
    const y = 3.7;
    return (
      <>
        {[1, -1].map((face) => (
          <group key={face}>
            <Rod radius={0.045} length={len} position={[x, y, face * (t / 2 + 0.2)]} material={materials.brass} />
            {[-1, 1].map((end) => (
              <Rod
                key={end}
                radius={0.028}
                length={0.2}
                position={[x, y + end * (len / 2 - 0.14), face * (t / 2 + 0.1)]}
                rotation={[Math.PI / 2, 0, 0]}
                material={materials.brass}
              />
            ))}
          </group>
        ))}
      </>
    );
  }
  if (kind === "push") {
    const x = side * (width - 0.4);
    return (
      <>
        <Box size={[0.34, 1.2, 0.08 * IN]} position={[x, 4, t / 2 + 0.04 * IN]} material={materials.steel} />
        <Rod radius={0.035} length={0.85} position={[x, 3.6, -(t / 2 + 0.2)]} material={materials.steel} />
        {[-1, 1].map((end) => (
          <Rod
            key={end}
            radius={0.022}
            length={0.2}
            position={[x, 3.6 + end * 0.33, -(t / 2 + 0.1)]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materials.steel}
          />
        ))}
        {[1, -1].map((face) => (
          <Box
            key={face}
            size={[width - 2 * IN, 10 * IN, 0.06 * IN]}
            position={[(side * width) / 2, 5 * IN, face * (t / 2 + 0.03 * IN)]}
            material={materials.steel}
          />
        ))}
      </>
    );
  }
  const handleX = side * (width - 0.24);
  return (
    <>
      <Rod radius={0.085} length={t + 0.12} position={[handleX, 3.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass} />
      {[1, -1].map((face) => (
        <Box
          key={face}
          size={[0.38, 0.055, 0.055]}
          position={[handleX - side * 0.15, 3.25, face * (t / 2 + 0.09)]}
          material={materials.brass}
        />
      ))}
    </>
  );
}

function DoorLeaf({
  width,
  height,
  hingeX,
  side,
  angle,
  finish,
  hardware,
  detailed,
  materials,
}: {
  width: number;
  height: number;
  hingeX: number;
  side: 1 | -1;
  angle: number;
  finish: LeafFinish;
  hardware: LeafHardware;
  detailed: boolean;
  materials: OpeningMaterials;
}) {
  const t = LEAF_T;
  const cx = (side * width) / 2;
  const margin = Math.min(0.36, width * 0.17);
  const lower = height * 0.24;
  const upper = height - lower - margin * 3;
  const portholeR = Math.min(width * 0.2, 6.5 * IN);
  const portholeY = Math.min(height * 0.68, 5.1);
  return (
    <group position={[hingeX, 0.5 * IN, -t / 2 - 0.4 * IN]} rotation={[0, -side * angle, 0]}>
      {finish === "porthole" ? (
        <>
          <PortholeSlab
            width={width}
            height={height}
            side={side}
            cy={portholeY}
            radius={portholeR}
            material={materials.door}
          />
          <Rod
            radius={portholeR}
            length={t * 0.3}
            position={[cx, portholeY, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materials.glass}
          />
          {[1, -1].map((face) => (
            <mesh
              key={face}
              geometry={UNIT_RING}
              scale={[portholeR + 0.4 * IN, portholeR + 0.4 * IN, portholeR + 0.4 * IN]}
              position={[cx, portholeY, (face * t) / 2]}
              material={materials.steel}
            />
          ))}
        </>
      ) : (
        <Box size={[width, height, t]} position={[cx, height / 2, 0]} material={materials.door} cast />
      )}
      {detailed && finish === "panel" ? (
        <>
          <Box
            size={[width - margin * 2, upper, t + 0.5 * IN]}
            position={[cx, height - margin - upper / 2, 0]}
            material={materials.door}
          />
          <Box
            size={[width - margin * 2, lower, t + 0.5 * IN]}
            position={[cx, margin + lower / 2, 0]}
            material={materials.door}
          />
        </>
      ) : null}
      {detailed && finish === "raised" ? (
        <RaisedPanels width={width} height={height} cx={cx} material={materials.door} />
      ) : null}
      <LeafHardwareSet kind={hardware} width={width} side={side} materials={materials} />
    </group>
  );
}

/** Floor-plan door marks shown when the wall is cut below the door head. */
function SwingPlan({
  kind,
  width,
  leafW,
  thickness,
  material,
}: {
  kind: "single" | "pair" | "slider";
  width: number;
  leafW: number;
  thickness: number;
  material: THREE.Material;
}) {
  if (kind === "slider") {
    const len = width * 0.56;
    return (
      <>
        {(
          [
            [-width / 2 + len / 2, -thickness * 0.68],
            [width / 2 - len / 2, -thickness * 0.32],
          ] as const
        ).map(([x, z]) => (
          <Pane
            key={z}
            width={len}
            height={0.07}
            position={[x, 0.02, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={material}
            pickable={false}
          />
        ))}
      </>
    );
  }
  const hinges: [number, number][] =
    kind === "pair"
      ? [
          [-width / 2, -Math.PI / 2],
          [width / 2, Math.PI],
        ]
      : [[-width / 2, -Math.PI / 2]];
  return (
    <>
      {hinges.map(([x, start]) => (
        <group key={x} position={[x, 0.02, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={material} raycast={noRaycast}>
            <ringGeometry args={[leafW - 0.035, leafW, 32, 1, start, Math.PI / 2]} />
          </mesh>
          <Pane
            width={0.07}
            height={leafW}
            position={[0, 0, leafW / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={material}
            pickable={false}
          />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Assemblies                                                         */
/* ------------------------------------------------------------------ */

/** Hinged doors: single, wide, service (porthole) and the paired entrances. */
function DoorAssembly(props: AssemblyProps) {
  const { style, width, top, thickness, clipped, materials, detailed } = props;
  const pair = style === "double_door" || style === "grand_entrance";
  const grand = style === "grand_entrance";
  const service = style === "service_door";
  const j = 0.75 * IN;
  const clear = width - j * 2;
  const leafW = pair ? clear / 2 : clear;
  const leaf = {
    width: leafW,
    height: top - j - 0.5 * IN,
    finish: (grand ? "raised" : service ? "porthole" : "panel") as LeafFinish,
    hardware: (grand ? "pull" : service ? "push" : "lever") as LeafHardware,
    detailed,
    materials,
  };
  const [angleA, angleB] = grand ? [0.24, 0.16] : pair ? [0.3, 0.2] : service ? [0.14, 0] : [0.38, 0];
  return (
    <>
      {props.inside && !clipped ? <Foyer {...props} /> : null}
      <Jambs {...props} head={!clipped} material={materials.casing} />
      {grand ? (
        <PilasterSurround {...props} arch={null} />
      ) : (
        <Casings
          {...props}
          material={materials.casing}
          casingWidth={service ? 2.5 * IN : 3.5 * IN}
          casingDepth={service ? 0.75 * IN : 1 * IN}
          cornice={service ? "none" : "simple"}
          plinth={!service && detailed}
        />
      )}
      <Threshold width={width} thickness={thickness} material={materials.stone} />
      {!clipped ? (
        <>
          <DoorLeaf {...leaf} hingeX={-width / 2 + j} side={1} angle={angleA} />
          {pair ? <DoorLeaf {...leaf} hingeX={width / 2 - j} side={-1} angle={angleB} /> : null}
        </>
      ) : (
        <SwingPlan
          kind={pair ? "pair" : "single"}
          width={width}
          leafW={leafW}
          thickness={thickness}
          material={materials.plan}
        />
      )}
    </>
  );
}

/** Grand arched entrance: pilasters + archivolt, fanlight over a raised-panel pair. */
function ArchedEntranceAssembly(props: AssemblyProps) {
  const { width, top, thickness, clipped, materials, detailed, arch } = props;
  const j = 0.75 * IN;
  const transomH = 2.5 * IN;
  const leafW = (width - j * 2) / 2;
  const headY = arch ? arch.spring - transomH : top - j;
  const leaf = {
    width: leafW,
    height: headY - 0.5 * IN,
    finish: "raised" as const,
    hardware: "pull" as const,
    detailed,
    materials,
  };
  const zc = -thickness / 2;
  return (
    <>
      {props.inside && !clipped ? <Foyer {...props} /> : null}
      <Jambs {...props} top={arch ? arch.spring : top} head={!clipped && !arch} material={materials.casing} />
      <PilasterSurround {...props} />
      <Threshold width={width} thickness={thickness} material={materials.stone} />
      {arch ? (
        <>
          <ArchSpandrel
            {...arch}
            top={top}
            thickness={thickness}
            uOffset={props.uOffset}
            uSign={props.uSign}
            materials={props.wallMaterials}
          />
          <ArchBand
            {...arch}
            inner={-j}
            outer={0}
            depth={thickness + 0.2 * IN}
            z={-thickness - 0.1 * IN}
            material={materials.casing}
          />
          <Box
            size={[width, transomH, thickness * 0.55]}
            position={[0, arch.spring - transomH / 2, zc]}
            material={materials.casing}
          />
          <ArchGlass {...arch} grow={-j} z={zc} material={materials.glass} />
          <ArchFan
            {...arch}
            grow={-j}
            count={arch.halfW > 2.5 ? 5 : 3}
            bar={1.1 * IN}
            depth={1.2 * IN}
            z={zc}
            material={materials.casing}
          />
        </>
      ) : null}
      {!clipped ? (
        <>
          <DoorLeaf {...leaf} hingeX={-width / 2 + j} side={1} angle={0.24} />
          <DoorLeaf {...leaf} hingeX={width / 2 - j} side={-1} angle={0.16} />
        </>
      ) : (
        <SwingPlan kind="pair" width={width} leafW={leafW} thickness={thickness} material={materials.plan} />
      )}
    </>
  );
}

function SliderPanel({
  x0,
  x1,
  bottom,
  height,
  z,
  handle,
  materials,
}: {
  x0: number;
  x1: number;
  bottom: number;
  height: number;
  z: number;
  handle: boolean;
  materials: OpeningMaterials;
}) {
  const stile = 1.75 * IN;
  const railB = 3 * IN;
  const railT = 1.75 * IN;
  const d = 1.5 * IN;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const glassH = height - railB - railT;
  return (
    <>
      <Box size={[stile, height, d]} position={[x0 + stile / 2, bottom + height / 2, z]} material={materials.frame} />
      <Box size={[stile, height, d]} position={[x1 - stile / 2, bottom + height / 2, z]} material={materials.frame} />
      <Box size={[w - stile * 2, railB, d]} position={[cx, bottom + railB / 2, z]} material={materials.frame} />
      <Box size={[w - stile * 2, railT, d]} position={[cx, bottom + height - railT / 2, z]} material={materials.frame} />
      <Pane
        width={w - stile * 2}
        height={glassH}
        position={[cx, bottom + railB + glassH / 2, z]}
        material={materials.glass}
      />
      {handle ? (
        <Box
          size={[0.6 * IN, 1.1, 1 * IN]}
          position={[x0 + stile / 2, bottom + 3.3, z + d / 2 + 0.5 * IN]}
          material={materials.frame}
        />
      ) : null}
    </>
  );
}

/** Patio slider: fixed outer panel + offset sliding inner panel on dark metal tracks. */
function SliderAssembly(props: AssemblyProps) {
  const { width, top, thickness, clipped, materials } = props;
  const j = 0.75 * IN;
  const zc = -thickness / 2;
  const clear = width - j * 2;
  const panelW = clear / 2 + 1 * IN;
  const trackH = 0.75 * IN;
  const panelBottom = 0.5 * IN + trackH;
  const panelH = top - j - 0.25 * IN - panelBottom;
  const open = panelW * 0.32;
  return (
    <>
      {!clipped ? <Daylight {...props} /> : null}
      <Jambs {...props} head={!clipped} material={materials.frame} />
      <Casings
        {...props}
        material={materials.casing}
        casingWidth={3 * IN}
        casingDepth={0.75 * IN}
        cornice="none"
      />
      <Threshold width={width} thickness={thickness} material={materials.stone} />
      <Box size={[width, trackH, 3.6 * IN]} position={[0, 0.5 * IN + trackH / 2, zc]} material={materials.frame} />
      {!clipped ? (
        <>
          <Box size={[width, 1.5 * IN, 3.6 * IN]} position={[0, top - j - 0.75 * IN, zc]} material={materials.frame} />
          <SliderPanel
            x0={clear / 2 - panelW}
            x1={clear / 2}
            bottom={panelBottom}
            height={panelH}
            z={zc - 0.85 * IN}
            handle={false}
            materials={materials}
          />
          <SliderPanel
            x0={-clear / 2 + open}
            x1={-clear / 2 + open + panelW}
            bottom={panelBottom}
            height={panelH}
            z={zc + 0.85 * IN}
            handle
            materials={materials}
          />
        </>
      ) : (
        <SwingPlan kind="slider" width={width} leafW={panelW} thickness={thickness} material={materials.plan} />
      )}
    </>
  );
}

function windowFrameWidth(style: StudioOpeningStyle): number {
  if (style === "floor_to_ceiling") return 1.5 * IN;
  return style === "standard_window" ? 2.25 * IN : 2 * IN;
}

/**
 * Glazing bars per window style. `structural` bars (mullions) show at every
 * quality; decorative muntins only when detailed.
 */
function windowLayout(style: StudioOpeningStyle, glassW: number, glassH: number) {
  switch (style) {
    case "picture_window":
      return { bar: 0.8 * IN, barDepth: 1 * IN, cols: 1, rows: 1, meeting: false, structural: false };
    case "floor_to_ceiling":
      return {
        bar: 1.25 * IN,
        barDepth: 2.4 * IN,
        cols: Math.max(1, Math.round(glassW / 2.2)),
        rows: 1,
        meeting: false,
        structural: true,
      };
    case "transom":
      return { bar: 1 * IN, barDepth: 1.4 * IN, cols: 3, rows: 1, meeting: false, structural: true };
    case "arched_window":
      return {
        bar: 0.8 * IN,
        barDepth: 1 * IN,
        cols: Math.max(1, Math.round(glassW / 1.5)),
        rows: Math.max(1, Math.round(glassH / 1.5)),
        meeting: false,
        structural: false,
      };
    default:
      return {
        bar: 0.8 * IN,
        barDepth: 1 * IN,
        cols: Math.max(1, Math.round(glassW / 1.9)),
        rows: Math.max(1, Math.round(glassH / 1.6)),
        meeting: glassH > 3,
        structural: false,
      };
  }
}

function WindowAssembly(props: AssemblyProps) {
  const { style, width, bottom, top, wallTop, thickness, clipped, materials, detailed, arch } = props;
  const visibleTop = Math.min(top, wallTop);
  const slim = style === "floor_to_ceiling";
  const fd = slim ? 3 * IN : 3.5 * IN;
  const zc = -thickness / 2;
  const f = windowFrameWidth(style);
  const glassW = width - f * 2;
  const glassBottom = bottom + f;
  const glassTop = arch ? arch.spring : clipped ? visibleTop : top - f;
  const glassH = glassTop - glassBottom;
  const layout = windowLayout(style, glassW, glassH);
  const sideTop = arch ? arch.spring : visibleTop;
  const sideH = sideTop - bottom;
  const cw = slim ? 2.5 * IN : 3 * IN;
  const casingDepth = 0.9 * IN;
  const meeting = layout.meeting && !clipped ? glassBottom + glassH * 0.5 : null;
  const transomY = slim && !clipped && glassH > 9 ? glassBottom + 7.5 : null;
  const stool = bottom > 0.2 && style !== "floor_to_ceiling" && style !== "transom";
  const apex = arch ? arch.spring + arch.rise : 0;
  const archTrim = arch !== null && apex + cw + 1 * IN <= wallTop;
  const children: ReactNode[] = [];

  if (layout.structural || (detailed && !clipped)) {
    for (let c = 1; c < layout.cols; c++) {
      const x = -glassW / 2 + (glassW * c) / layout.cols;
      children.push(
        <Box
          key={`v${c}`}
          size={[layout.bar, glassH, layout.barDepth]}
          position={[x, glassBottom + glassH / 2, zc]}
          material={materials.frame}
        />
      );
    }
    for (let r = 1; r < layout.rows; r++) {
      const y = glassBottom + (glassH * r) / layout.rows;
      if (meeting !== null && Math.abs(y - meeting) < 0.2) continue;
      children.push(
        <Box key={`h${r}`} size={[glassW, layout.bar, layout.barDepth]} position={[0, y, zc]} material={materials.frame} />
      );
    }
  }

  return (
    <>
      <Box size={[f, sideH, fd]} position={[-width / 2 + f / 2, bottom + sideH / 2, zc]} material={materials.frame} />
      <Box size={[f, sideH, fd]} position={[width / 2 - f / 2, bottom + sideH / 2, zc]} material={materials.frame} />
      <Box size={[width, f, fd]} position={[0, bottom + f / 2, zc]} material={materials.frame} />
      {arch ? (
        <>
          <ArchSpandrel
            {...arch}
            top={top}
            thickness={thickness}
            uOffset={props.uOffset}
            uSign={props.uSign}
            materials={props.wallMaterials}
          />
          <ArchBand {...arch} inner={-f} outer={0} depth={fd} z={zc - fd / 2} material={materials.frame} />
          <Box size={[glassW, 1.5 * IN, fd * 0.7]} position={[0, arch.spring, zc]} material={materials.frame} />
          <ArchGlass {...arch} grow={-f} z={zc} material={materials.glass} />
          <ArchFan
            {...arch}
            grow={-f}
            count={arch.halfW > 2 ? 5 : 3}
            bar={0.9 * IN}
            depth={1 * IN}
            z={zc}
            material={materials.frame}
          />
          {archTrim ? (
            <>
              <ArchBand {...arch} inner={-0.25 * IN} outer={cw - 0.25 * IN} depth={casingDepth} z={0} material={materials.casing} />
              <ArchBand
                {...arch}
                inner={-0.25 * IN}
                outer={cw - 0.25 * IN}
                depth={casingDepth}
                z={-thickness - casingDepth}
                material={materials.casing}
              />
              <Box
                size={[cw * 1.3, cw + 1 * IN, casingDepth + 0.4 * IN]}
                position={[0, apex + cw / 2 + 0.25 * IN, casingDepth / 2 + 0.2 * IN]}
                material={materials.casing}
              />
            </>
          ) : null}
        </>
      ) : (
        <Box
          size={[width, clipped ? 0.75 * IN : f, fd]}
          position={[0, clipped ? visibleTop - 0.375 * IN : top - f / 2, zc]}
          material={materials.frame}
        />
      )}
      {meeting !== null ? (
        <Box size={[glassW, 1.75 * IN, 1.6 * IN]} position={[0, meeting, zc]} material={materials.frame} />
      ) : null}
      {transomY !== null ? (
        <Box size={[glassW, 1.75 * IN, layout.barDepth]} position={[0, transomY, zc]} material={materials.frame} />
      ) : null}
      {children}
      {glassH > 0.05 ? (
        <Pane width={glassW} height={glassH} position={[0, glassBottom + glassH / 2, zc]} material={materials.glass} />
      ) : null}
      {bottom > 0.2 ? (
        <>
          {stool ? (
            <>
              <Box
                size={[width + cw * 2 + 1.5 * IN, 1 * IN, thickness / 2 + 1.75 * IN]}
                position={[0, bottom - 0.5 * IN, (-thickness / 2 + 1.75 * IN) / 2]}
                material={materials.casing}
              />
              <Box
                size={[width + cw * 2 - 0.5 * IN, 3 * IN, 0.75 * IN]}
                position={[0, bottom - 2.5 * IN, 0.375 * IN]}
                material={materials.casing}
              />
            </>
          ) : null}
          <Box
            size={[width + 2 * IN, 1.5 * IN, 2.5 * IN]}
            position={[0, bottom - 0.75 * IN, -thickness - 1 * IN]}
            rotation={[-0.12, 0, 0]}
            material={materials.stone}
          />
        </>
      ) : null}
      <Casings
        {...props}
        top={arch ? arch.spring : top}
        head={!arch}
        material={materials.casing}
        casingWidth={cw}
        casingDepth={casingDepth}
        cornice="none"
      />
      {!clipped ? <Daylight {...props} /> : null}
    </>
  );
}

export const VenueOpening = memo(function VenueOpening({
  span,
  frame,
  bounds,
  wallTopIn,
  thicknessIn,
  detailed,
  materials,
  wallMaterials,
  highlight,
  inside = false,
  onSelect,
  onHover,
}: {
  span: OpeningSpan;
  frame: WallFrame;
  bounds: StudioBounds;
  wallTopIn: number;
  thicknessIn: number;
  detailed: boolean;
  materials: OpeningMaterials;
  wallMaterials: THREE.Material[];
  highlight: "selected" | "hovered" | null;
  inside?: boolean;
  onSelect: (selection: StudioSelection) => void;
  onHover?: (id: string | null) => void;
}) {
  const { opening } = span;
  if (span.bottom >= wallTopIn - 1) return null;
  const style = getOpeningStyle(opening);
  const width = (span.end - span.start) * IN;
  const [x, z] = wallPointWorld(frame, (span.start + span.end) / 2, bounds);
  const clipped = span.top > wallTopIn + 0.01;
  const rise = span.archRise ?? 0;
  const props: AssemblyProps = {
    style,
    width,
    bottom: span.bottom * IN,
    top: span.top * IN,
    wallTop: wallTopIn * IN,
    thickness: thicknessIn * IN,
    clipped,
    detailed,
    materials,
    wallMaterials,
    uOffset: ((span.start + span.end) / 2) * IN,
    uSign: frame.interiorSign === 1 ? 1 : -1,
    arch:
      rise > 0 && !clipped
        ? { halfW: width / 2, rise: rise * IN, spring: (span.top - ARCH_CROWN_IN - rise) * IN }
        : null,
    inside,
  };
  const visibleTop = Math.min(props.top, props.wallTop);
  const hlHeight = visibleTop - props.bottom + 0.5;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect({ kind: "opening", id: opening.id });
  };

  return (
    <group
      position={[x, 0, z]}
      rotation={[0, wallYaw(frame), 0]}
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover?.(opening.id);
      }}
      onPointerOut={() => onHover?.(null)}
    >
      {opening.type === "window" ? (
        <WindowAssembly {...props} />
      ) : style === "glass_slider" ? (
        <SliderAssembly {...props} />
      ) : style === "grand_arched" ? (
        <ArchedEntranceAssembly {...props} />
      ) : (
        <DoorAssembly {...props} />
      )}
      {highlight ? (
        <mesh
          position={[0, props.bottom + hlHeight / 2 - 0.25, -props.thickness / 2]}
          renderOrder={20}
          material={highlight === "selected" ? materials.highlight : materials.hover}
          raycast={noRaycast}
        >
          <boxGeometry args={[width + 0.5, hlHeight, props.thickness + 0.4]} />
          <Edges
            threshold={15}
            color={highlight === "selected" ? "#ffe09a" : "#f3d68c"}
            lineWidth={highlight === "selected" ? 2.2 : 1.4}
            depthTest={false}
            renderOrder={21}
          />
        </mesh>
      ) : null}
    </group>
  );
});
