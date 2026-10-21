"use client";

import { Line } from "@react-three/drei";
import type { StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  GOLD,
  GOLD_BRIGHT,
  toWorld,
  type FloorRect,
  type GuideLine,
} from "./drag-math";

const FLOOR_Y = 0.03;

function toFloorPoints(
  bounds: StudioBounds,
  points: StudioPoint[],
  y = FLOOR_Y,
  closed = false
): [number, number, number][] {
  const result = points.map((point) => {
    const [x, z] = toWorld(bounds, point);
    return [x, y, z] as [number, number, number];
  });
  if (closed && result.length > 0) result.push(result[0]);
  return result;
}

/** Translucent footprint of where an item was when the drag began. */
export function GhostFootprint({
  bounds,
  corners,
}: {
  bounds: StudioBounds;
  corners: StudioPoint[];
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    corners.forEach((corner, index) => {
      const [x, z] = toWorld(bounds, corner);
      // Shape lives in XY; rotated -90° about X, so plan z maps to -y.
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [bounds, corners]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y - 0.01, 0]}
        renderOrder={24}
      >
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Line
        points={toFloorPoints(bounds, corners, FLOOR_Y, true)}
        color={GOLD}
        lineWidth={1.4}
        dashed
        dashSize={0.35}
        gapSize={0.22}
        transparent
        opacity={0.7}
        depthTest={false}
        renderOrder={25}
      />
    </group>
  );
}

/** Solid gold outline of a footprint on the floor (selection / hover). */
export function FootprintOutline({
  bounds,
  corners,
  opacity = 0.9,
  lineWidth = 1.8,
}: {
  bounds: StudioBounds;
  corners: StudioPoint[];
  opacity?: number;
  lineWidth?: number;
}) {
  return (
    <Line
      points={toFloorPoints(bounds, corners, FLOOR_Y, true)}
      color={GOLD}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      depthTest={false}
      renderOrder={26}
    />
  );
}

/** Dashed gold rectangle around a multi-selection. */
export function SelectionBox({
  bounds,
  rect,
  padding = 6,
}: {
  bounds: StudioBounds;
  rect: FloorRect;
  padding?: number;
}) {
  const corners: StudioPoint[] = [
    { x: rect.minX - padding, z: rect.minZ - padding },
    { x: rect.maxX + padding, z: rect.minZ - padding },
    { x: rect.maxX + padding, z: rect.maxZ + padding },
    { x: rect.minX - padding, z: rect.maxZ + padding },
  ];
  return (
    <Line
      points={toFloorPoints(bounds, corners, FLOOR_Y + 0.06, true)}
      color={GOLD_BRIGHT}
      lineWidth={2}
      dashed
      dashSize={0.6}
      gapSize={0.35}
      transparent
      opacity={0.95}
      renderOrder={27}
    />
  );
}

/** Smart-guide lines drawn across the floor. */
export function GuideLines({
  bounds,
  guides,
}: {
  bounds: StudioBounds;
  guides: GuideLine[];
}) {
  return (
    <group>
      {guides.map((guide, index) => (
        <Line
          key={index}
          points={toFloorPoints(bounds, [guide.from, guide.to], FLOOR_Y + 0.01)}
          color={GOLD_BRIGHT}
          lineWidth={1.6}
          dashed
          dashSize={0.5}
          gapSize={0.25}
          depthTest={false}
          renderOrder={28}
          />
      ))}
    </group>
  );
}

/** Gold line hugging a wall at floor level (wall-slide target / ghost). */
export function WallSpanLine({
  bounds,
  from,
  to,
  ghost = false,
}: {
  bounds: StudioBounds;
  from: StudioPoint;
  to: StudioPoint;
  ghost?: boolean;
}) {
  return (
    <Line
      points={toFloorPoints(bounds, [from, to], FLOOR_Y + 0.015)}
      color={ghost ? GOLD : GOLD_BRIGHT}
      lineWidth={ghost ? 2 : 3.2}
      dashed={ghost}
      dashSize={0.35}
      gapSize={0.22}
      transparent
      opacity={ghost ? 0.6 : 0.95}
      depthTest={false}
      renderOrder={28}
    />
  );
}
