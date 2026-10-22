"use client";

import {
  getDrapeColorHex,
  type CeilingHubDecor,
  type DrapeColor,
  type StudioCeilingDrape,
  type StudioObject,
} from "@/data/studio";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { FloralArrangement } from "../../fabric/florals";
import { getHardwareMaterial, type FabricQuality } from "../../fabric/materials";
import { ChandelierModel } from "../../objects/decor";
import { hashSeed, rng } from "../../texture-utils";
import type { CeilingHub } from "./build";
import { getCeilingFabricMaterial } from "./materials";
import { GridSurface, TAU } from "./surface";

const noRaycast = () => null;

/** Strips raycasting from everything under the group (reused object models). */
function NoRaycast({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.raycast = noRaycast;
    });
  });
  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/* Fabric rosette                                                      */
/* ------------------------------------------------------------------ */

/** Gathered fabric rosette bulging downward (local y < 0). */
function createRosetteGeometry(radius: number, seed: number, quality: FabricQuality) {
  const rand = rng(seed);
  const phase = rand() * TAU;
  const columns = quality === "draft" ? 72 : quality === "ultra" ? 220 : 140;
  const rows = quality === "draft" ? 16 : quality === "ultra" ? 48 : 30;
  const surface = new GridSurface(columns, rows, true);
  for (let row = 0; row <= rows; row++) {
    const rr = Math.max(0.02, row / rows);
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const theta = u * TAU;
      const edge = 1 + 0.07 * Math.sin(7 * theta + phase) + 0.03 * Math.sin(13 * theta - phase);
      const r = rr * radius * edge;
      const dome = -radius * 0.34 * (1 - rr * rr);
      const swirl =
        radius *
        (0.075 * Math.sin(9 * theta + rr * 11 + phase) * (0.3 + rr) +
          0.035 * Math.sin(17 * theta - rr * 7) * rr);
      const petals = radius * 0.06 * Math.abs(Math.sin(Math.PI * 3.5 * rr + 0.4 * Math.sin(5 * theta)));
      surface.put(
        Math.cos(theta) * r,
        dome + swirl + petals,
        Math.sin(theta) * r,
        Math.cos(theta) * r,
        Math.sin(theta) * r
      );
    }
  }
  return surface.finish();
}

function FabricRosette({
  hub,
  radius,
  drape,
  quality,
}: {
  hub: CeilingHub;
  radius: number;
  drape: StudioCeilingDrape;
  quality: FabricQuality;
}) {
  const geometry = useMemo(
    () => createRosetteGeometry(radius, hashSeed(drape.id), quality),
    [drape.id, quality, radius]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = getCeilingFabricMaterial(
    drape.fabric,
    drape.accentColor ?? drape.color,
    drape.uplightColor,
    quality
  );
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[hub.x, hub.y - 0.04 - belowFabric(hub, radius), hub.z]}
      renderOrder={material.transparent ? 3 : 0}
      raycast={noRaycast}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Gold ceiling medallion                                              */
/* ------------------------------------------------------------------ */

let medallionMaterial: THREE.MeshPhysicalMaterial | null = null;

function getMedallionMaterial() {
  // Gilded plaster rather than mirror metal: it sits in the dark overhead and
  // would otherwise only reflect the black ceiling.
  medallionMaterial ??= new THREE.MeshPhysicalMaterial({
    color: "#d8b468",
    metalness: 0.55,
    roughness: 0.38,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    emissive: new THREE.Color("#5a4319"),
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  return medallionMaterial;
}

/** Ornate medallion facing down: stepped rings, acanthus lobes, centre finial. */
function createMedallionGeometry(radius: number, quality: FabricQuality) {
  const R = radius;
  const profile: Array<[number, number]> = [
    [0, -0.5],
    [0.03, -0.46],
    [0.07, -0.39],
    [0.05, -0.33],
    [0.09, -0.3],
    [0.16, -0.27],
    [0.25, -0.22],
    [0.33, -0.2],
    [0.37, -0.17],
    [0.44, -0.16],
    [0.52, -0.155],
    [0.6, -0.12],
    [0.7, -0.085],
    [0.78, -0.1],
    [0.84, -0.1],
    [0.88, -0.07],
    [0.94, -0.065],
    [0.98, -0.04],
    [1, -0.01],
    [1, 0],
  ];
  const segments = quality === "draft" ? 48 : quality === "ultra" ? 160 : 96;
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r * R, y * R * 0.55)),
    segments
  );
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const r = Math.hypot(x, z) / R;
    const angle = Math.atan2(z, x);
    // Acanthus leaves in the middle band, beading on the rim.
    const band = Math.max(0, 1 - Math.pow((r - 0.62) / 0.2, 2));
    const leaf = Math.pow(Math.max(0, Math.cos(8 * angle)), 2) * band;
    const bead = r > 0.9 ? 0.02 * Math.cos(36 * angle) : 0;
    const scale = 1 + bead;
    position.setXYZ(i, x * scale, y - leaf * R * 0.07, z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function GoldMedallion({ hub, radius, quality }: { hub: CeilingHub; radius: number; quality: FabricQuality }) {
  const geometry = useMemo(() => createMedallionGeometry(radius, quality), [quality, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      material={getMedallionMaterial()}
      position={[hub.x, hub.y + 0.02 - belowFabric(hub, radius), hub.z]}
      raycast={noRaycast}
    />
  );
}

/** Drop that keeps a disc of `radius` under fabric falling away from the hub. */
function belowFabric(hub: CeilingHub, radius: number) {
  return Math.max(0, hub.slope) * radius * 0.9;
}

/* ------------------------------------------------------------------ */
/* Floral ring                                                         */
/* ------------------------------------------------------------------ */

function FloralRing({
  hub,
  radius,
  color,
  quality,
}: {
  hub: CeilingHub;
  radius: number;
  color: DrapeColor;
  quality: FabricQuality;
}) {
  const clusters = Math.max(6, Math.round((TAU * radius) / 0.9));
  return (
    <group position={[hub.x, hub.y - 0.18 - belowFabric(hub, radius), hub.z]}>
      {Array.from({ length: clusters }, (_, index) => {
        const angle = (index / clusters) * TAU;
        return (
          <group
            key={index}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            rotation={[Math.PI / 2, 0, angle]}
          >
            <FloralArrangement
              spec={{ kind: "cluster", x: 0, y: 0, z: 0, radius: 0.55 }}
              color={color}
              seed={1 + (index % 4)}
              quality={quality}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Blooms in the design colours, falling back to ivory when those are too dark to read. */
function bloomColor(drape: StudioCeilingDrape): DrapeColor {
  for (const color of [drape.accentColor, drape.color]) {
    if (color && new THREE.Color(getDrapeColorHex(color)).getHSL({ h: 0, s: 0, l: 0 }).l > 0.3) {
      return color;
    }
  }
  return "ivory";
}

/* ------------------------------------------------------------------ */
/* Hub décor                                                           */
/* ------------------------------------------------------------------ */

/** Steel suspension cable from the hub to the ceiling. */
function HubCable({ hub, ceilingY }: { hub: CeilingHub; ceilingY: number }) {
  const length = ceilingY - hub.y;
  if (length < 0.15) return null;
  return (
    <mesh
      position={[hub.x, hub.y + length / 2, hub.z]}
      material={getHardwareMaterial("pipe")}
      raycast={noRaycast}
    >
      <cylinderGeometry args={[0.012, 0.012, length, 6]} />
    </mesh>
  );
}

export function CeilingHubDecor({
  drape,
  hub,
  ceilingY,
  quality,
  decor,
}: {
  drape: StudioCeilingDrape;
  hub: CeilingHub;
  ceilingY: number;
  quality: FabricQuality;
  decor: CeilingHubDecor;
}) {
  const scale = Math.min(1.35, Math.max(0.8, hub.span / 30));
  switch (decor) {
    case "chandelier": {
      const diameter = 3.2 * scale;
      const height = diameter * 0.85;
      // About 18″ below the gather (where the ceiling light rig puts its source), never through it.
      const bottom = Math.min(hub.y - 1.5 - height / 2, hub.y - 0.15 - height);
      const object = {
        id: `${drape.id}:chandelier`,
        type: "chandelier",
        label: "Hub chandelier",
        x: 0,
        z: 0,
        width: diameter * 12,
        depth: diameter * 12,
        height: height * 12,
        rotation: 0,
        elevation: bottom * 12,
        lightColor: drape.lightColor,
      } as StudioObject;
      return (
        <NoRaycast>
          <group position={[hub.x, 0, hub.z]}>
            <ChandelierModel
              object={object}
              w={diameter}
              d={diameter}
              h={height}
              quality={quality}
              wallHeight={ceilingY}
            />
          </group>
        </NoRaycast>
      );
    }
    case "floral_ring":
      return (
        <NoRaycast>
          <HubCable hub={hub} ceilingY={ceilingY} />
          <FloralRing
            hub={hub}
            radius={1.15 * scale}
            color={bloomColor(drape)}
            quality={quality}
          />
        </NoRaycast>
      );
    case "rosette":
      return (
        <>
          <HubCable hub={hub} ceilingY={ceilingY} />
          <FabricRosette hub={hub} radius={0.95 * scale} drape={drape} quality={quality} />
        </>
      );
    case "medallion":
      return (
        <>
          <HubCable hub={hub} ceilingY={ceilingY} />
          <GoldMedallion hub={hub} radius={1.25 * scale} quality={quality} />
        </>
      );
    default:
      return <HubCable hub={hub} ceilingY={ceilingY} />;
  }
}
