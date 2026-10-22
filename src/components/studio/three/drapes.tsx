"use client";

import type { StudioDesignJson, StudioDrapeRun } from "@/data/studio";
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

const DrapeRunModel = memo(function DrapeRunModel({
  run,
  wall,
  bounds,
  inward,
  selected,
}: {
  run: StudioDrapeRun;
  wall: StudioWallSegment;
  bounds: StudioBounds;
  inward: 1 | -1;
  selected: boolean;
}) {
  const { highlight, quality } = useFabricEditorState(run.id, selected);
  const hardware = run.hardware ?? "pipe_and_drape";
  const center = getPointAlongWall(wall, (run.startOffset + run.endOffset) / 2);
  const length = Math.max(1, run.endOffset - run.startOffset) * SCALE;
  const height = Math.max(0.5, run.height * SCALE);
  const seed = useMemo(() => hashSeed(run.id), [run.id]);

  return (
    <group
      position={[
        (center.x - bounds.centerX) * SCALE,
        0,
        (center.z - bounds.centerZ) * SCALE,
      ]}
      rotation={[0, -wall.angle, 0]}
      scale={[1, 1, inward]}
    >
      <DrapeAssembly
        length={length}
        height={height}
        fabric={run.fabric}
        color={run.color}
        fullness={run.fullness}
        hardware={hardware}
        puddle={Boolean(run.puddle)}
        seed={seed}
        quality={quality}
        baseZ={wallStandoff(hardware)}
        uplightColor={run.uplightColor ?? null}
        highlight={highlight}
      />
    </group>
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
  if (!visible) return null;

  return (
    <group>
      {design.drapeRuns.map((run) => {
        const wall = walls[run.wallIndex];
        if (!wall || run.hidden) return null;
        return (
          <DrapeRunModel
            key={run.id}
            run={run}
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
