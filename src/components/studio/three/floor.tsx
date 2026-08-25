"use client";

import type { StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const SCALE = 1 / 12;

export function StudioFloor({
  floor,
  bounds,
  darkTheme,
  onClearSelection,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  darkTheme: boolean;
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

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onClearSelection();
      }}
    >
      <meshStandardMaterial
        color={darkTheme ? "#5a5145" : "#c7baa5"}
        roughness={0.93}
        metalness={0.02}
      />
    </mesh>
  );
}
