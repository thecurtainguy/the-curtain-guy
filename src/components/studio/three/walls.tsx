"use client";

import type { StudioDesignJson } from "@/data/studio";
import {
  clampOpeningToWall,
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { Fragment, useMemo } from "react";
import type { StudioSelection } from "../studio-types";

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
  darkTheme,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  transparent: boolean;
  darkTheme: boolean;
}) {
  const walls = useMemo(
    () => getWallSegments(design.room.floor),
    [design.room.floor]
  );
  const height = design.room.wallHeight * SCALE;

  return (
    <group>
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
                <mesh
                  key={`${wall.index}-${pieceIndex}`}
                  position={[
                    (center.x - bounds.centerX) * SCALE,
                    height / 2,
                    (center.z - bounds.centerZ) * SCALE,
                  ]}
                  rotation={[0, -wall.angle, 0]}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect({ kind: "wall", index: wall.index });
                  }}
                >
                  <boxGeometry args={[length, height, WALL_THICKNESS]} />
                  <meshStandardMaterial
                    color={
                      selected
                        ? "#d4af55"
                        : darkTheme
                          ? "#d9d2c5"
                          : "#f2ede3"
                    }
                    roughness={0.88}
                    transparent={transparent}
                    opacity={transparent ? 0.24 : 0.78}
                    depthWrite={!transparent}
                  />
                </mesh>
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
                        color="#c6a054"
                        roughness={0.72}
                        transparent={transparent}
                        opacity={transparent ? 0.4 : 0.9}
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
