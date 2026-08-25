"use client";

import {
  getDrapeColorHex,
  type StudioDesignJson,
  type StudioDrapeRun,
} from "@/data/studio";
import {
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { StudioSelection } from "../studio-types";

const SCALE = 1 / 12;
const CURTAIN_WALL_OFFSET = 0.3;
const CURTAIN_THICKNESS = 0.045;

function addGridIndices(
  indices: number[],
  horizontalSteps: number,
  verticalSteps: number,
  offset: number,
  reverse: boolean
) {
  const rowLength = horizontalSteps + 1;
  for (let row = 0; row < verticalSteps; row += 1) {
    for (let column = 0; column < horizontalSteps; column += 1) {
      const a = offset + row * rowLength + column;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      if (reverse) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
}

function createCurtainGeometry(run: StudioDrapeRun): THREE.BufferGeometry {
  const runLength = Math.max(1, run.endOffset - run.startOffset) * SCALE;
  const height = Math.max(0.1, run.height * SCALE);
  const foldCount = Math.min(
    36,
    Math.max(4, Math.round((run.endOffset - run.startOffset) / 24 * run.fullness))
  );
  const horizontalSteps = foldCount * 4;
  const verticalSteps = 9;
  const rowLength = horizontalSteps + 1;
  const layerVertexCount = rowLength * (verticalSteps + 1);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const foldAmplitude = Math.min(0.24, 0.095 + run.fullness * 0.038);

  for (const layer of [0, 1]) {
    for (let row = 0; row <= verticalSteps; row += 1) {
      const yProgress = row / verticalSteps;
      const lowerEase = 0.82 + (1 - yProgress) * 0.18;
      for (let column = 0; column <= horizontalSteps; column += 1) {
        const progress = column / horizontalSteps;
        const phase = progress * Math.PI * 2 * foldCount;
        const primaryFold = Math.sin(phase);
        const softenedCrease = Math.sin(phase * 2 + 0.35) * 0.16;
        const wave = (primaryFold + softenedCrease) * foldAmplitude * lowerEase;
        const bottomRipple =
          row === 0 ? (0.5 + 0.5 * Math.cos(phase)) * 0.028 : 0;
        const frontDepth = CURTAIN_WALL_OFFSET + wave;
        positions.push(
          -runLength / 2 + progress * runLength,
          0.018 + height * yProgress + bottomRipple,
          frontDepth - layer * CURTAIN_THICKNESS
        );
        uvs.push(progress, yProgress);
      }
    }
  }

  addGridIndices(indices, horizontalSteps, verticalSteps, 0, false);
  addGridIndices(
    indices,
    horizontalSteps,
    verticalSteps,
    layerVertexCount,
    true
  );

  for (let row = 0; row < verticalSteps; row += 1) {
    const frontLeft = row * rowLength;
    const nextFrontLeft = (row + 1) * rowLength;
    const backLeft = frontLeft + layerVertexCount;
    const nextBackLeft = nextFrontLeft + layerVertexCount;
    indices.push(
      frontLeft,
      nextFrontLeft,
      backLeft,
      backLeft,
      nextFrontLeft,
      nextBackLeft
    );

    const frontRight = frontLeft + horizontalSteps;
    const nextFrontRight = nextFrontLeft + horizontalSteps;
    const backRight = frontRight + layerVertexCount;
    const nextBackRight = nextFrontRight + layerVertexCount;
    indices.push(
      frontRight,
      backRight,
      nextFrontRight,
      backRight,
      nextBackRight,
      nextFrontRight
    );
  }

  for (let column = 0; column < horizontalSteps; column += 1) {
    const frontBottom = column;
    const nextFrontBottom = column + 1;
    const backBottom = frontBottom + layerVertexCount;
    const nextBackBottom = nextFrontBottom + layerVertexCount;
    indices.push(
      frontBottom,
      backBottom,
      nextFrontBottom,
      backBottom,
      nextBackBottom,
      nextFrontBottom
    );

    const frontTop = verticalSteps * rowLength + column;
    const nextFrontTop = frontTop + 1;
    const backTop = frontTop + layerVertexCount;
    const nextBackTop = nextFrontTop + layerVertexCount;
    indices.push(
      frontTop,
      nextFrontTop,
      backTop,
      backTop,
      nextFrontTop,
      nextBackTop
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function getFabricAppearance(run: StudioDrapeRun) {
  if (run.fabric === "sheer") {
    return {
      roughness: 0.62,
      sheen: 0.55,
      sheenRoughness: 0.72,
      opacity: 0.42,
    };
  }
  if (run.fabric === "velvet" || run.fabric === "velour") {
    return {
      roughness: run.fabric === "velvet" ? 0.9 : 0.84,
      sheen: 0.78,
      sheenRoughness: 0.82,
      opacity: 1,
    };
  }
  return {
    roughness: 0.74,
    sheen: 0.48,
    sheenRoughness: 0.68,
    opacity: 1,
  };
}

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
  const geometry = useMemo(
    () => createCurtainGeometry(run),
    [run]
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  const center = getPointAlongWall(
    wall,
    (run.startOffset + run.endOffset) / 2
  );
  const runLength = Math.max(1, run.endOffset - run.startOffset) * SCALE;
  const height = Math.max(0.1, run.height * SCALE);
  const appearance = getFabricAppearance(run);
  const sheer = run.fabric === "sheer";
  const color = getDrapeColorHex(run.color);

  return (
    <group
      position={[
        (center.x - bounds.centerX) * SCALE,
        0,
        (center.z - bounds.centerZ) * SCALE,
      ]}
      rotation={[0, -wall.angle, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        renderOrder={sheer ? 2 : 0}
      >
        <meshPhysicalMaterial
          color={color}
          roughness={appearance.roughness}
          metalness={0}
          sheen={appearance.sheen}
          sheenRoughness={appearance.sheenRoughness}
          sheenColor={color}
          clearcoat={0}
          transparent={sheer}
          opacity={appearance.opacity}
          depthWrite={!sheer}
          side={sheer ? THREE.FrontSide : THREE.DoubleSide}
          forceSinglePass={sheer}
        />
      </mesh>

      {selected ? (
        <mesh
          geometry={geometry}
          scale={[1.006, 1.004, 1.025]}
          renderOrder={4}
        >
          <meshBasicMaterial
            color="#d4af55"
            side={THREE.BackSide}
            transparent
            opacity={0.58}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <mesh
        position={[0, height + 0.085, CURTAIN_WALL_OFFSET - 0.045]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.055, 0.055, runLength + 0.18, 12]} />
        <meshStandardMaterial
          color={selected ? "#c7a34e" : "#4a4035"}
          roughness={0.36}
          metalness={0.58}
        />
      </mesh>

      <mesh
        position={[0, 0.012, CURTAIN_WALL_OFFSET + 0.015]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[runLength, 0.48]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.09}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
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
