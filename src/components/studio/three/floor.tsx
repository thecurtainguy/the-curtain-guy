"use client";

import type { StudioFloorFinish, StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FLOOR_FINISHES, getFloorTexture } from "./scene-finishes";

const SCALE = 1 / 12;

export function StudioFloor({
  floor,
  bounds,
  finish,
  onClearSelection,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  finish: StudioFloorFinish;
  onClearSelection: () => void;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    floor.forEach((point, index) => {
      const x = (point.x - bounds.centerX) * SCALE;
      const y = -(point.z - bounds.centerZ) * SCALE;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [bounds.centerX, bounds.centerZ, floor]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  const appearance = FLOOR_FINISHES[finish];
  const texture = getFloorTexture(finish);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        onClearSelection();
      }}
    >
      <meshStandardMaterial
        color={appearance.color}
        map={texture}
        roughness={appearance.roughness}
        metalness={appearance.metalness}
      />
    </mesh>
  );
}
