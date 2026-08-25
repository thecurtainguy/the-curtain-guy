"use client";

import type {
  StudioDesignJson,
  StudioWallFinish,
} from "@/data/studio";
import {
  clampOpeningToWall,
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { Edges } from "@react-three/drei";
import { Fragment, useMemo } from "react";
import * as THREE from "three";
import type { StudioSelection } from "../studio-types";
import { WALL_FINISHES } from "./scene-finishes";

const SCALE = 1 / 12;
const WALL_THICKNESS = 0.16;

type WallPiece = {
  start: number;
  end: number;
};

function getSolidPieces(
  wall: StudioWallSegment,
  design: StudioDesignJson
): WallPiece[] {
  const openings = design.openings
    .filter((opening) => opening.wallIndex === wall.index)
    .map((opening) => clampOpeningToWall(opening, design.room.floor))
    .map((opening) => ({
      start: opening.offset,
      end: opening.offset + opening.width,
    }))
    .sort((a, b) => a.start - b.start);

  const pieces: WallPiece[] = [];
  let cursor = 0;
  for (const opening of openings) {
    if (opening.start > cursor) pieces.push({ start: cursor, end: opening.start });
    cursor = Math.max(cursor, opening.end);
  }
  if (cursor < wall.length) pieces.push({ start: cursor, end: wall.length });
  return pieces;
}

export function StudioWalls({
  design,
  bounds,
  selection,
  onSelect,
  transparent,
  finish,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  transparent: boolean;
  finish: StudioWallFinish;
}) {
  const walls = useMemo(
    () => getWallSegments(design.room.floor),
    [design.room.floor]
  );
  const height = design.room.wallHeight * SCALE;
  const appearance = WALL_FINISHES[finish];
  const seamColor = finish === "black_box" ? "#5f5548" : "#8d7d69";

  return (
    <group key={transparent ? "glass-walls" : "solid-walls"}>
      {walls.map((wall) => {
        const selected =
          selection?.kind === "wall" && selection.index === wall.index;
        const pieces = getSolidPieces(wall, design);
        return (
          <Fragment key={wall.index}>
            {pieces.map((piece, pieceIndex) => {
              const length = Math.max(0.02, (piece.end - piece.start) * SCALE);
              const center = getPointAlongWall(
                wall,
                (piece.start + piece.end) / 2
              );
              return (
                <Fragment key={`${wall.index}-${pieceIndex}`}>
                  <mesh
                    position={[
                      (center.x - bounds.centerX) * SCALE,
                      height / 2,
                      (center.z - bounds.centerZ) * SCALE,
                    ]}
                    rotation={[0, -wall.angle, 0]}
                    receiveShadow
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "wall", index: wall.index });
                    }}
                  >
                    <boxGeometry args={[length, height, WALL_THICKNESS]} />
                    {selected ? (
                      <>
                        <mesh
                          scale={[1.008, 1.006, 1.08]}
                          renderOrder={20}
                        >
                          <boxGeometry
                            args={[length, height, WALL_THICKNESS]}
                          />
                          <meshBasicMaterial
                            color="#e8bd55"
                            side={THREE.DoubleSide}
                            transparent
                            opacity={transparent ? 0.32 : 0.2}
                            depthTest={false}
                            depthWrite={false}
                            toneMapped={false}
                          />
                          <Edges
                            threshold={15}
                            color="#ffe09a"
                            lineWidth={2.2}
                            depthTest={false}
                            renderOrder={21}
                          />
                        </mesh>
                      </>
                    ) : null}
                    <meshStandardMaterial
                      color={appearance.color}
                      roughness={appearance.roughness}
                      metalness={0}
                      emissive={selected ? "#3c2b0b" : "#000000"}
                      emissiveIntensity={selected ? 0.08 : 0}
                      transparent={transparent}
                      opacity={transparent ? 0.18 : 0.94}
                      depthWrite={!transparent}
                    />
                  </mesh>
                  <mesh
                    position={[
                      (center.x - bounds.centerX) * SCALE,
                      0.045,
                      (center.z - bounds.centerZ) * SCALE,
                    ]}
                    rotation={[0, -wall.angle, 0]}
                    receiveShadow
                  >
                    <boxGeometry
                      args={[length, 0.09, WALL_THICKNESS + 0.075]}
                    />
                    <meshStandardMaterial
                      color={seamColor}
                      roughness={0.72}
                      metalness={0.04}
                      transparent={transparent}
                      opacity={transparent ? 0.42 : 0.72}
                    />
                  </mesh>
                </Fragment>
              );
            })}
            {design.openings
              .filter((opening) => opening.wallIndex === wall.index)
              .map((opening) => {
                const safeOpening = clampOpeningToWall(
                  opening,
                  design.room.floor
                );
                const center = getPointAlongWall(
                  wall,
                  safeOpening.offset + safeOpening.width / 2
                );
                const openingWidth = safeOpening.width * SCALE;
                const markerHeight = Math.min(7, height);
                const lintelHeight = Math.max(0.08, height - markerHeight);
                return (
                  <group
                    key={opening.id}
                    position={[
                      (center.x - bounds.centerX) * SCALE,
                      0,
                      (center.z - bounds.centerZ) * SCALE,
                    ]}
                    rotation={[0, -wall.angle, 0]}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({ kind: "opening", id: opening.id });
                    }}
                  >
                    <mesh
                      position={[0, markerHeight + lintelHeight / 2, 0]}
                    >
                      <boxGeometry
                        args={[
                          openingWidth,
                          lintelHeight,
                          WALL_THICKNESS,
                        ]}
                      />
                      <meshStandardMaterial
                        color={appearance.color}
                        roughness={appearance.roughness}
                        transparent={transparent}
                        opacity={transparent ? 0.25 : 0.94}
                      />
                    </mesh>
                    <mesh position={[0, 0.06, 0]}>
                      <boxGeometry args={[openingWidth, 0.12, 0.34]} />
                      <meshStandardMaterial color="#d4af55" roughness={0.65} />
                    </mesh>
                  </group>
                );
              })}
          </Fragment>
        );
      })}
    </group>
  );
}
