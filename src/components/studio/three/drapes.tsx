"use client";

import {
  getDrapeColorHex,
  type StudioDesignJson,
  type StudioDrapeRun,
} from "@/data/studio";
import {
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { StudioSelection } from "../studio-types";

const SCALE = 1 / 12;

function CurtainSurface({
  run,
  wall,
  bounds,
  selected,
  onSelect,
}: {
  run: StudioDrapeRun;
  wall: StudioWallSegment;
  bounds: StudioBounds;
  selected: boolean;
  onSelect: () => void;
}) {
  const geometry = useMemo(() => {
    const runLength = Math.max(1, run.endOffset - run.startOffset);
    const horizontalSteps = Math.min(
      52,
      Math.max(14, Math.round(runLength / 8))
    );
    const verticalSteps = 7;
    const positions: number[] = [];
    const indices: number[] = [];
    const normalX = -Math.sin(wall.angle);
    const normalZ = Math.cos(wall.angle);
    const wallDeltaX = wall.end.x - wall.start.x;
    const wallDeltaZ = wall.end.z - wall.start.z;

    for (let row = 0; row <= verticalSteps; row += 1) {
      const yProgress = row / verticalSteps;
      for (let column = 0; column <= horizontalSteps; column += 1) {
        const progress = column / horizontalSteps;
        const offset = run.startOffset + runLength * progress;
        const wallProgress =
          wall.length <= 0
            ? 0
            : Math.min(1, Math.max(0, offset / wall.length));
        const pointX = wall.start.x + wallDeltaX * wallProgress;
        const pointZ = wall.start.z + wallDeltaZ * wallProgress;
        const folds = Math.max(3, Math.round((runLength / 24) * run.fullness));
        const wave =
          Math.sin(progress * Math.PI * 2 * folds) *
          0.11 *
          Math.sin(yProgress * Math.PI * 0.9 + 0.25);
        positions.push(
          (pointX - bounds.centerX) * SCALE + normalX * (0.13 + wave),
          run.height * SCALE * yProgress,
          (pointZ - bounds.centerZ) * SCALE + normalZ * (0.13 + wave)
        );
      }
    }

    const rowLength = horizontalSteps + 1;
    for (let row = 0; row < verticalSteps; row += 1) {
      for (let column = 0; column < horizontalSteps; column += 1) {
        const a = row * rowLength + column;
        const b = a + 1;
        const c = a + rowLength;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    next.setIndex(indices);
    next.computeVertexNormals();
    return next;
  }, [
    bounds.centerX,
    bounds.centerZ,
    run.endOffset,
    run.fullness,
    run.height,
    run.startOffset,
    wall.angle,
    wall.end.x,
    wall.end.z,
    wall.length,
    wall.start.x,
    wall.start.z,
  ]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <meshStandardMaterial
        color={selected ? "#d4af55" : getDrapeColorHex(run.color)}
        roughness={run.fabric === "velvet" || run.fabric === "velour" ? 0.94 : 0.72}
        metalness={selected ? 0.08 : 0}
        emissive={selected ? "#5f4715" : "#000000"}
        emissiveIntensity={selected ? 0.18 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function StudioDrapes({
  design,
  bounds,
  selection,
  onSelect,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
}) {
  const walls = useMemo(
    () => getWallSegments(design.room.floor),
    [design.room.floor]
  );

  return (
    <group>
      {design.drapeRuns.map((run) => {
        const wall = walls[run.wallIndex];
        if (!wall) return null;
        return (
          <CurtainSurface
            key={run.id}
            run={run}
            wall={wall}
            bounds={bounds}
            selected={selection?.kind === "drape" && selection.id === run.id}
            onSelect={() => onSelect({ kind: "drape", id: run.id })}
          />
        );
      })}
    </group>
  );
}
