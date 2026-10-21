"use client";

import type { StudioLightingMood } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { StudioSelection } from "../../studio-types";
import type { WallFinishAppearance } from "../scene-finishes";
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
  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials]
  );
  return materials;
}

function Box({
  size,
  position,
  material,
  rotation,
  cast = false,
}: {
  size: [number, number, number];
  position: [number, number, number];
  material: THREE.Material;
  rotation?: [number, number, number];
  cast?: boolean;
}) {
  if (size[0] <= 0.001 || size[1] <= 0.001 || size[2] <= 0.001) return null;
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function ExtrudedShape({
  build,
  depth,
  z,
  material,
}: {
  build: () => THREE.Shape;
  depth: number;
  z: number;
  material: THREE.Material;
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
  return <mesh geometry={geometry} material={material} receiveShadow />;
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

type AssemblyProps = {
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
  /** Entrance arch rise (feet), 0 for a flat head. */
  archRise: number;
  /** Camera stands inside the room (enables the vestibule backdrop). */
  inside: boolean;
};

/** Side casings + head on both wall faces. */
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
}: Omit<AssemblyProps, "materials" | "wallMaterials" | "uOffset" | "uSign" | "detailed" | "inside"> & {
  material: THREE.Material;
  casingWidth: number;
  casingDepth: number;
  cornice: boolean;
}) {
  const headFits = !clipped && top + casingWidth + (cornice ? 1.4 * IN : 0) <= wallTop + 0.001;
  const legTop = headFits ? top : Math.min(top, wallTop);
  const legH = legTop - bottom;
  const legX = width / 2 + casingWidth / 2 - 0.25 * IN;
  const faces: [number, number][] = [
    [casingDepth / 2, 1],
    [-thickness - casingDepth / 2, -1],
  ];
  return (
    <>
      {faces.map(([z, s]) => (
        <group key={s}>
          <Box size={[casingWidth, legH, casingDepth]} position={[-legX, bottom + legH / 2, z]} material={material} />
          <Box size={[casingWidth, legH, casingDepth]} position={[legX, bottom + legH / 2, z]} material={material} />
          {headFits ? (
            <>
              <Box
                size={[width + casingWidth * 2 - 0.5 * IN, casingWidth, casingDepth]}
                position={[0, top + casingWidth / 2, z]}
                material={material}
              />
              {cornice ? (
                <Box
                  size={[width + casingWidth * 2 + 1.2 * IN, 1.4 * IN, casingDepth + 0.8 * IN]}
                  position={[0, top + casingWidth + 0.7 * IN, z + s * 0.4 * IN]}
                  material={material}
                />
              ) : null}
            </>
          ) : null}
        </group>
      ))}
    </>
  );
}

function Jambs({
  width,
  bottom,
  top,
  wallTop,
  thickness,
  clipped,
  material,
}: Omit<AssemblyProps, "materials" | "wallMaterials" | "uOffset" | "uSign" | "detailed" | "inside"> & {
  material: THREE.Material;
}) {
  const j = 0.75 * IN;
  const h = Math.min(top, wallTop) - bottom;
  return (
    <>
      <Box size={[j, h, thickness + 0.2 * IN]} position={[-width / 2 + j / 2, bottom + h / 2, -thickness / 2]} material={material} />
      <Box size={[j, h, thickness + 0.2 * IN]} position={[width / 2 - j / 2, bottom + h / 2, -thickness / 2]} material={material} />
      {!clipped ? (
        <Box size={[width, j, thickness + 0.2 * IN]} position={[0, top - j / 2, -thickness / 2]} material={material} />
      ) : null}
    </>
  );
}

function DoorLeaf({
  width,
  height,
  hingeX,
  side,
  angle,
  detailed,
  materials,
}: {
  width: number;
  height: number;
  hingeX: number;
  side: 1 | -1;
  angle: number;
  detailed: boolean;
  materials: OpeningMaterials;
}) {
  const t = 1.75 * IN;
  const margin = Math.min(0.36, width * 0.17);
  const lower = height * 0.24;
  const upper = height - lower - margin * 3;
  const cx = (side * width) / 2;
  const handleX = side * (width - 0.24);
  return (
    <group position={[hingeX, 0.5 * IN, -t / 2 - 0.4 * IN]} rotation={[0, -side * angle, 0]}>
      <Box size={[width, height, t]} position={[cx, height / 2, 0]} material={materials.door} cast />
      {detailed ? (
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
      <mesh position={[handleX, 3.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass}>
        <cylinderGeometry args={[0.085, 0.085, t + 0.12, 18]} />
      </mesh>
      {[1, -1].map((face) => (
        <Box
          key={face}
          size={[0.38, 0.055, 0.055]}
          position={[handleX - side * 0.15, 3.25, face * (t / 2 + 0.09)]}
          material={materials.brass}
        />
      ))}
    </group>
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
      <mesh position={[0, h / 2, back]} material={materials.foyer} raycast={noRaycast}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(s * w) / 2, h / 2, mid]}
          rotation={[0, (-s * Math.PI) / 2, 0]}
          material={materials.foyerSide}
          raycast={noRaycast}
        >
          <planeGeometry args={[FOYER_DEPTH_FT, h]} />
        </mesh>
      ))}
      <mesh
        position={[0, 0.005, mid]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.foyerFloor}
        raycast={noRaycast}
      >
        <planeGeometry args={[w, FOYER_DEPTH_FT]} />
      </mesh>
    </group>
  );
}

function DoorAssembly(props: AssemblyProps) {
  const { width, top, thickness, clipped, materials, detailed } = props;
  const j = 0.75 * IN;
  const clear = width - j * 2;
  const double = width >= 4;
  const leafW = double ? clear / 2 : clear;
  const leafH = top - j - 0.5 * IN;
  const casing = { ...props, material: materials.casing, casingWidth: 3.5 * IN, casingDepth: 1 * IN, cornice: true };
  return (
    <>
      {props.inside && !clipped ? <Foyer {...props} /> : null}
      <Jambs {...props} material={materials.casing} />
      <Casings {...casing} />
      <Box
        size={[width, 0.5 * IN, thickness + 1 * IN]}
        position={[0, 0.25 * IN, -thickness / 2]}
        material={materials.stone}
      />
      {!clipped ? (
        <>
          <DoorLeaf
            width={leafW}
            height={leafH}
            hingeX={-width / 2 + j}
            side={1}
            angle={double ? 0.3 : 0.38}
            detailed={detailed}
            materials={materials}
          />
          {double ? (
            <DoorLeaf
              width={leafW}
              height={leafH}
              hingeX={width / 2 - j}
              side={-1}
              angle={0.2}
              detailed={detailed}
              materials={materials}
            />
          ) : null}
        </>
      ) : (
        <SwingPlan width={width} leafW={leafW} double={double} material={materials.plan} />
      )}
    </>
  );
}

/** Floor-plan door swing arcs shown when the wall is cut below the door head. */
function SwingPlan({
  width,
  leafW,
  double,
  material,
}: {
  width: number;
  leafW: number;
  double: boolean;
  material: THREE.Material;
}) {
  const hinges: [number, number][] = double
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
          <mesh position={[0, 0, leafW / 2]} rotation={[-Math.PI / 2, 0, 0]} material={material} raycast={noRaycast}>
            <planeGeometry args={[0.07, leafW]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function EntranceAssembly(props: AssemblyProps) {
  const { width, top, wallTop, thickness, clipped, materials, wallMaterials, uOffset, uSign } = props;
  const pw = 5 * IN;
  const pd = 1.25 * IN;
  const rise = props.archRise;
  const archTop = top - ARCH_CROWN_IN * IN;
  const spring = archTop - rise;
  const arch = rise > 0 && !clipped;
  const legTop = arch ? spring : top;
  const legClipTop = Math.min(legTop, wallTop);
  const legH = legClipTop;
  const legX = width / 2 + pw / 2;
  const capFits = !clipped && legTop + 4 * IN <= wallTop;
  const flatHead = !arch && !clipped && top + pw + 1.4 * IN <= wallTop;

  const spandrel = useMemo(
    () => () => {
      const s = new THREE.Shape();
      s.moveTo(-width / 2, spring);
      s.lineTo(-width / 2, top + 0.01);
      s.lineTo(width / 2, top + 0.01);
      s.lineTo(width / 2, spring);
      s.absellipse(0, spring, width / 2, Math.max(rise, 0.01), 0, Math.PI, false, 0);
      s.closePath();
      return s;
    },
    [width, spring, top, rise]
  );
  const archivolt = useMemo(
    () => () => {
      const s = new THREE.Shape();
      s.moveTo(width / 2 + pw, spring);
      s.absellipse(0, spring, width / 2 + pw, rise + pw, 0, Math.PI, false, 0);
      s.lineTo(-width / 2, spring);
      s.absellipse(0, spring, width / 2, rise, Math.PI, 0, true, 0);
      s.closePath();
      return s;
    },
    [width, spring, rise, pw]
  );

  return (
    <>
      {props.inside && !clipped ? <Foyer {...props} /> : null}
      <Jambs {...props} top={arch ? spring : top} clipped={clipped || arch} material={materials.casing} />
      <Box size={[width, 0.5 * IN, thickness + 1 * IN]} position={[0, 0.25 * IN, -thickness / 2]} material={materials.stone} />
      {(
        [
          [pd / 2, 1],
          [-thickness - pd / 2, -1],
        ] as const
      ).map(([z, s]) => (
        <group key={s}>
          {[-legX, legX].map((x) => (
            <group key={x}>
              <Box size={[pw, legH, pd]} position={[x, legH / 2, z]} material={materials.casing} />
              <Box
                size={[pw + 0.6 * IN, Math.min(7 * IN, legH), pd + 0.5 * IN]}
                position={[x, Math.min(7 * IN, legH) / 2, z + s * 0.25 * IN]}
                material={materials.casing}
              />
              {capFits ? (
                <Box
                  size={[pw + 1 * IN, 4 * IN, pd + 0.7 * IN]}
                  position={[x, legTop - 2 * IN, z + s * 0.35 * IN]}
                  material={materials.casing}
                />
              ) : null}
            </group>
          ))}
          {flatHead ? (
            <>
              <Box size={[width + pw * 2, pw, pd]} position={[0, top + pw / 2, z]} material={materials.casing} />
              <Box
                size={[width + pw * 2 + 1.5 * IN, 1.4 * IN, pd + 0.9 * IN]}
                position={[0, top + pw + 0.7 * IN, z + s * 0.45 * IN]}
                material={materials.casing}
              />
            </>
          ) : null}
          {arch ? (
            <>
              <ExtrudedShape
                build={archivolt}
                depth={pd}
                z={s > 0 ? 0 : -thickness - pd}
                material={materials.casing}
              />
              <Box
                size={[0.5, pw + 2 * IN, pd + 0.6 * IN]}
                position={[0, archTop + pw / 2, z + s * 0.3 * IN]}
                material={materials.casing}
              />
            </>
          ) : null}
        </group>
      ))}
      {arch ? (
        <WallInfill
          build={spandrel}
          thickness={thickness}
          uOffset={uOffset}
          uSign={uSign}
          materials={wallMaterials}
        />
      ) : null}
    </>
  );
}

function WindowAssembly(props: AssemblyProps) {
  const { width, bottom, top, wallTop, thickness, clipped, materials, detailed } = props;
  const visibleTop = Math.min(top, wallTop);
  const h = visibleTop - bottom;
  const f = 2.25 * IN;
  const fd = 3.5 * IN;
  const zc = -thickness / 2;
  const glassW = width - f * 2;
  const glassBottom = bottom + f;
  const glassTop = clipped ? visibleTop : top - f;
  const glassH = glassTop - glassBottom;
  const cols = Math.max(1, Math.round(glassW / 1.9));
  const rows = Math.max(1, Math.round(glassH / 1.6));
  const meeting = !clipped && glassH > 3 ? glassBottom + glassH * 0.5 : null;
  const cw = 3 * IN;
  const bar = 0.8 * IN;
  const children: ReactNode[] = [];

  if (detailed && !clipped) {
    for (let c = 1; c < cols; c++) {
      const x = -glassW / 2 + (glassW * c) / cols;
      children.push(
        <Box key={`v${c}`} size={[bar, glassH, 1 * IN]} position={[x, glassBottom + glassH / 2, zc]} material={materials.frame} />
      );
    }
    for (let r = 1; r < rows; r++) {
      const y = glassBottom + (glassH * r) / rows;
      if (meeting !== null && Math.abs(y - meeting) < 0.2) continue;
      children.push(
        <Box key={`h${r}`} size={[glassW, bar, 1 * IN]} position={[0, y, zc]} material={materials.frame} />
      );
    }
  }

  return (
    <>
      <Box size={[f, h, fd]} position={[-width / 2 + f / 2, bottom + h / 2, zc]} material={materials.frame} />
      <Box size={[f, h, fd]} position={[width / 2 - f / 2, bottom + h / 2, zc]} material={materials.frame} />
      <Box size={[width, f, fd]} position={[0, bottom + f / 2, zc]} material={materials.frame} />
      <Box
        size={[width, clipped ? 0.75 * IN : f, fd]}
        position={[0, clipped ? visibleTop - 0.375 * IN : top - f / 2, zc]}
        material={materials.frame}
      />
      {meeting !== null ? (
        <Box size={[glassW, 1.75 * IN, 1.6 * IN]} position={[0, meeting, zc]} material={materials.frame} />
      ) : null}
      {children}
      {glassH > 0.05 ? (
        <mesh position={[0, glassBottom + glassH / 2, zc]} material={materials.glass}>
          <planeGeometry args={[glassW, glassH]} />
        </mesh>
      ) : null}
      {bottom > 0.2 ? (
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
        material={materials.casing}
        casingWidth={cw}
        casingDepth={0.9 * IN}
        cornice={false}
      />
      {!clipped ? (
        <mesh
          position={[0, (bottom - 0.5 + top + 0.6) / 2, -thickness - 1.1]}
          material={materials.daylight}
          raycast={noRaycast}
        >
          <planeGeometry args={[width + 1.2, top + 0.6 - (bottom - 0.5)]} />
        </mesh>
      ) : null}
      {!clipped ? (
        <mesh
          position={[0, 0.012, Math.min(4.5, 1 + h * 0.6)]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={materials.pool}
          raycast={noRaycast}
        >
          <planeGeometry args={[width * 1.5 + 1, Math.min(9, 2 + h * 1.2)]} />
        </mesh>
      ) : null}
    </>
  );
}

export function VenueOpening({
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
  const width = (span.end - span.start) * IN;
  const [x, z] = wallPointWorld(frame, (span.start + span.end) / 2, bounds);
  const props: AssemblyProps = {
    width,
    bottom: span.bottom * IN,
    top: span.top * IN,
    wallTop: wallTopIn * IN,
    thickness: thicknessIn * IN,
    clipped: span.top > wallTopIn + 0.01,
    detailed,
    materials,
    wallMaterials,
    uOffset: ((span.start + span.end) / 2) * IN,
    uSign: frame.interiorSign === 1 ? 1 : -1,
    archRise: (span.archRise ?? 0) * IN,
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
      ) : opening.type === "entrance" ? (
        <EntranceAssembly {...props} />
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
}
