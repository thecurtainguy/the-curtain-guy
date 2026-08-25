"use client";

import type { StudioDesignJson, StudioObjectType } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import type { StudioSelection } from "../studio-types";

const SCALE = 1 / 12;

const objectColors: Record<StudioObjectType, string> = {
  stage: "#4f4233",
  dance_floor: "#b99b67",
  entrance_marker: "#b68b3f",
  table_area: "#766c5e",
};

export function StudioObjects({
  design,
  bounds,
  selection,
  onSelect,
  darkTheme,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  darkTheme: boolean;
}) {
  return (
    <group>
      {design.objects.map((object) => {
        const selected =
          selection?.kind === "object" && selection.id === object.id;
        const height = Math.max(0.08, object.height * SCALE);
        return (
          <mesh
            key={object.id}
            position={[
              (object.x - bounds.centerX) * SCALE,
              height / 2 + 0.02,
              (object.z - bounds.centerZ) * SCALE,
            ]}
            rotation={[0, (-object.rotation * Math.PI) / 180, 0]}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ kind: "object", id: object.id });
            }}
          >
            <boxGeometry
              args={[
                Math.max(0.08, object.width * SCALE),
                height,
                Math.max(0.08, object.depth * SCALE),
              ]}
            />
            <meshStandardMaterial
              color={
                selected
                  ? "#d4af55"
                  : darkTheme
                    ? objectColors[object.type]
                    : object.type === "stage"
                      ? "#75634f"
                      : objectColors[object.type]
              }
              roughness={0.78}
              metalness={selected ? 0.08 : 0.01}
              emissive={selected ? "#58400e" : "#000000"}
              emissiveIntensity={selected ? 0.22 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
