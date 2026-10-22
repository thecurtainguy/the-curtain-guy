"use client";

import type { StudioDesignJson, StudioDrapeRun } from "@/data/studio";
import { getDrapeRunSegments, type DrapeSegment } from "@/lib/studio-door-gaps";
import {
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { memo, useMemo } from "react";
import type { StudioSelection } from "../studio-types";
import {
  DrapeAssembly,
  interiorSign,
  useFabricEditorState,
  useFabricLayerVisible,
  wallStandoff,
} from "./fabric/drape-assembly";
import { hashSeed } from "./texture-utils";

const SCALE = 1 / 12;

/**
 * Hung spans as a primitive key, so a run only re-renders when its own spans
 * change — not when a door moves on another wall.
 */
function segmentsKey(segments: DrapeSegment[]): string {
  return segments.map((segment) => `${segment.start}:${segment.end}`).join("|");
}

function parseSegmentsKey(key: string): DrapeSegment[] {
  if (!key) return [];
  return key.split("|").map((pair) => {
    const [start, end] = pair.split(":").map(Number);
    return { start, end };
  });
}

const DrapeRunModel = memo(function DrapeRunModel({
  run,
  spans,
  wall,
  bounds,
  inward,
  selected,
}: {
  run: StudioDrapeRun;
  /** `segmentsKey` of the run's hung spans, inches from wall start. */
  spans: string;
  wall: StudioWallSegment;
  bounds: StudioBounds;
  inward: 1 | -1;
  selected: boolean;
}) {
  const { highlight, quality } = useFabricEditorState(run.id, selected);
  const hardware = run.hardware ?? "pipe_and_drape";
  const height = Math.max(0.5, run.height * SCALE);
  const pieces = useMemo(
    () =>
      parseSegmentsKey(spans).map((segment, index) => ({
        center: getPointAlongWall(wall, (segment.start + segment.end) / 2),
        length: Math.max(1, segment.end - segment.start) * SCALE,
        // The first piece keeps the run's seed so door-free runs fold as before.
        seed: hashSeed(index === 0 ? run.id : `${run.id}:${index}`),
      })),
    [run.id, spans, wall]
  );

  return (
    <>
      {pieces.map((piece, index) => (
        <group
          key={`${run.id}:${index}`}
          position={[
            (piece.center.x - bounds.centerX) * SCALE,
            0,
            (piece.center.z - bounds.centerZ) * SCALE,
          ]}
          rotation={[0, -wall.angle, 0]}
          scale={[1, 1, inward]}
        >
          <DrapeAssembly
            length={piece.length}
            height={height}
            fabric={run.fabric}
            color={run.color}
            fullness={run.fullness}
            hardware={hardware}
            puddle={Boolean(run.puddle)}
            seed={piece.seed}
            quality={quality}
            baseZ={wallStandoff(hardware)}
            uplightColor={run.uplightColor ?? null}
            highlight={highlight}
          />
        </group>
      ))}
    </>
  );
});

export function StudioDrapes({
  design,
  bounds,
  selection,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
}) {
  const visible = useFabricLayerVisible("drapes");
  const walls = useMemo(
    () => getWallSegments(design.room.floor),
    [design.room.floor]
  );
  const inward = useMemo(
    () => interiorSign(design.room.floor),
    [design.room.floor]
  );
  const spansById = useMemo(
    () =>
      new Map(
        design.drapeRuns.map((run) => [
          run.id,
          segmentsKey(getDrapeRunSegments(run, design.openings)),
        ])
      ),
    [design.drapeRuns, design.openings]
  );
  if (!visible) return null;

  return (
    <group>
      {design.drapeRuns.map((run) => {
        const wall = walls[run.wallIndex];
        const spans = spansById.get(run.id);
        if (!wall || run.hidden || !spans) return null;
        return (
          <DrapeRunModel
            key={run.id}
            run={run}
            spans={spans}
            wall={wall}
            bounds={bounds}
            inward={inward}
            selected={selection?.kind === "drape" && selection.id === run.id}
          />
        );
      })}
    </group>
  );
}
