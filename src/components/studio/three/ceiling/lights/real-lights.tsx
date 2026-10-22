"use client";

import { useState } from "react";
import * as THREE from "three";
import type { Vec3 } from "./plan";

export type CeilingPointRequest = {
  key: string;
  position: Vec3;
  color: string;
  /** Candela. */
  intensity: number;
};

export type CeilingSpotRequest = CeilingPointRequest & {
  target: Vec3;
  /** Half-angle, radians. */
  angle: number;
};

export type CeilingLightAllocation = {
  points: CeilingPointRequest[];
  spots: CeilingSpotRequest[];
  /** Request keys that got a real light (the rest rely on emissive / glow fallbacks). */
  lit: ReadonlySet<string>;
};

const byIntensity = (a: CeilingPointRequest, b: CeilingPointRequest) =>
  b.intensity - a.intensity;

/** Strongest requests first, within the quality preset's ceiling share. */
export function allocateCeilingLights(
  points: CeilingPointRequest[],
  spots: CeilingSpotRequest[],
  pointBudget: number,
  spotBudget: number
): CeilingLightAllocation {
  const litPoints = [...points].sort(byIntensity).slice(0, pointBudget);
  const litSpots = [...spots].sort(byIntensity).slice(0, spotBudget);
  const lit = new Set<string>();
  for (const light of litPoints) lit.add(light.key);
  for (const light of litSpots) lit.add(light.key);
  return { points: litPoints, spots: litSpots, lit };
}

function PooledPoint({ light, reach }: { light: CeilingPointRequest | null; reach: number }) {
  return (
    <pointLight
      position={light?.position ?? [0, -10, 0]}
      color={light?.color ?? "#ffffff"}
      intensity={light?.intensity ?? 0}
      decay={2}
      distance={reach}
    />
  );
}

function PooledSpot({ light, reach }: { light: CeilingSpotRequest | null; reach: number }) {
  const [target] = useState(() => new THREE.Object3D());
  return (
    <>
      <primitive object={target} position={light?.target ?? [0, 0, 0]} />
      <spotLight
        target={target}
        position={light?.position ?? [0, -10, 0]}
        color={light?.color ?? "#ffffff"}
        intensity={light?.intensity ?? 0}
        angle={light?.angle ?? 0.5}
        penumbra={0.85}
        decay={2}
        distance={reach}
      />
    </>
  );
}

/**
 * Shadowless real lights for every ceiling design. Each pool is either empty
 * or the full tier budget (unused slots at intensity 0), so adding, removing
 * or editing designs only changes the scene's light count (which recompiles
 * every lit shader) when the first / last request of that kind appears.
 */
export function CeilingRealLights({
  allocation,
  pointBudget,
  spotBudget,
  reach,
}: {
  allocation: CeilingLightAllocation;
  pointBudget: number;
  spotBudget: number;
  /** Cut-off distance, feet. */
  reach: number;
}) {
  const pointPool = allocation.points.length > 0 ? pointBudget : 0;
  const spotPool = allocation.spots.length > 0 ? spotBudget : 0;
  return (
    <>
      {Array.from({ length: pointPool }, (_, index) => (
        <PooledPoint
          key={`point-${index}`}
          light={allocation.points[index] ?? null}
          reach={reach}
        />
      ))}
      {Array.from({ length: spotPool }, (_, index) => (
        <PooledSpot
          key={`spot-${index}`}
          light={allocation.spots[index] ?? null}
          reach={reach}
        />
      ))}
    </>
  );
}
