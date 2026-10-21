"use client";

import type {
  StudioDesignJson,
  StudioLightingMood,
  StudioWallDisplay,
  StudioWallFinish,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { Edges } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { StudioSelection } from "../studio-types";
import {
  WALL_FINISHES,
  getWallTextures,
  type VenueQuality,
} from "./scene-finishes";
import {
  CUTAWAY_WALL_HEIGHT_IN,
  LOW_WALL_HEIGHT_IN,
  getCutawayWalls,
  setCutawayWalls,
  useCutawayWalls,
} from "./venue/cutaway-store";
import { getVenueEnvironment } from "./venue/environment";
import {
  VenueOpening,
  daylightToneFor,
  useOpeningMaterials,
} from "./venue/openings";
import { VenueTrim, type TrimWall } from "./venue/trim";
import { applyWallShading } from "./venue/wall-shading";
import {
  SCALE,
  WALL_THICKNESS_IN,
  buildWallGeometry,
  computeWallPieces,
  getOpeningSpan,
  getWallFrames,
  type OpeningSpan,
} from "./venue/wall-geometry";

const SELF_FINISHED: StudioWallFinish[] = ["exposed_brick", "wood_panel", "tent_canvas", "black_box"];

function useWallMaterials(
  finish: StudioWallFinish,
  quality: VenueQuality,
  glass: boolean,
  envMap: THREE.Texture,
  topFt: number
): THREE.Material[] {
  const materials = useMemo(() => {
    const appearance = WALL_FINISHES[finish];
    if (glass) {
      const pane = new THREE.MeshPhysicalMaterial({
        color: "#e3ecef",
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.13,
        envMap,
        envMapIntensity: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const cap = new THREE.MeshStandardMaterial({
        color: appearance.cap,
        roughness: 0.5,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      return [pane, pane, cap];
    }
    const textures = getWallTextures(finish, quality);
    const normalScale = new THREE.Vector2(appearance.normalScale, appearance.normalScale);
    const interior = applyWallShading(
      appearance.sheen
        ? new THREE.MeshPhysicalMaterial({
            ...textures,
            normalScale,
            roughness: 1,
            sheen: appearance.sheen,
            sheenColor: new THREE.Color("#fff7e8"),
            sheenRoughness: 0.7,
          })
        : new THREE.MeshStandardMaterial({ ...textures, normalScale, roughness: 1 }),
      { topFt, strength: 1 }
    );
    const exterior = applyWallShading(
      new THREE.MeshStandardMaterial({
        ...textures,
        normalScale,
        roughness: 1,
        color: SELF_FINISHED.includes(finish) ? "#e6e2dc" : "#d6d0c6",
      }),
      { topFt, strength: 0.35 }
    );
    const cap = new THREE.MeshStandardMaterial({ color: appearance.cap, roughness: 0.75 });
    return [interior, exterior, cap];
  }, [finish, quality, glass, envMap, topFt]);
  useEffect(
    () => () => new Set(materials).forEach((m) => m.dispose()),
    [materials]
  );
  return materials;
}

export function StudioWalls({
  design,
  bounds,
  selection,
  onSelect,
  display,
  finish,
  lighting,
  quality = "high",
  showOpenings = true,
  selectedIds,
  hoveredId,
  onHoverOpening,
  cameraInside = false,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  display: StudioWallDisplay;
  finish: StudioWallFinish;
  lighting: StudioLightingMood;
  quality?: VenueQuality;
  showOpenings?: boolean;
  selectedIds?: string[];
  hoveredId?: string | null;
  onHoverOpening?: (id: string | null) => void;
  /** Camera stands inside the room (see `useCameraInsideRoom`). */
  cameraInside?: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const envMap = useMemo(() => getVenueEnvironment(gl), [gl]);
  const floor = design.room.floor;
  const fullTop = design.room.wallHeight;
  const glass = display === "glass";
  const appearance = WALL_FINISHES[finish];

  const frames = useMemo(() => getWallFrames(floor), [floor]);

  const spansByWall = useMemo(() => {
    const map = new Map<number, OpeningSpan[]>();
    if (!showOpenings) return map;
    for (const opening of design.openings) {
      if (opening.hidden || !frames[opening.wallIndex]) continue;
      const list = map.get(opening.wallIndex) ?? [];
      list.push(getOpeningSpan(opening, floor, fullTop));
      map.set(opening.wallIndex, list);
    }
    return map;
  }, [design.openings, frames, floor, fullTop, showOpenings]);

  const storeCut = useCutawayWalls();
  const cutKey = display === "cutaway" ? storeCut.join(",") : "";

  useFrame(({ camera }) => {
    if (display !== "cutaway") return;
    const previous = getCutawayWalls();
    const next: number[] = [];
    for (const frame of frames) {
      const cx = (frame.center.x - bounds.centerX) * SCALE;
      const cz = (frame.center.z - bounds.centerZ) * SCALE;
      const facing =
        (camera.position.x - cx) * -frame.inward.x +
        (camera.position.z - cz) * -frame.inward.z;
      const wasCut = previous.includes(frame.index);
      if (wasCut ? facing > -0.25 : facing > 0.5) next.push(frame.index);
    }
    setCutawayWalls(next);
  });

  useEffect(() => {
    if (display !== "cutaway") return;
    return () => setCutawayWalls([]);
  }, [display]);

  useEffect(() => {
    invalidate();
  }, [cutKey, invalidate]);

  const walls = useMemo(() => {
    const cut = new Set(cutKey ? cutKey.split(",").map(Number) : []);
    return frames.map((frame) => {
      const top =
        display === "low"
          ? Math.min(fullTop, LOW_WALL_HEIGHT_IN)
          : cut.has(frame.index)
            ? Math.min(fullTop, CUTAWAY_WALL_HEIGHT_IN)
            : fullTop;
      const spans = spansByWall.get(frame.index) ?? [];
      const pieces = computeWallPieces(frame.length, top, spans);
      const geometry = buildWallGeometry(frame, pieces, bounds);
      return {
        frame,
        top,
        spans,
        pieces,
        lowered: top < fullTop - 0.01,
        geometry,
        edges: display === "glass" ? new THREE.EdgesGeometry(geometry, 25) : null,
      };
    });
  }, [frames, display, cutKey, fullTop, spansByWall, bounds]);

  useEffect(
    () => () =>
      walls.forEach((wall) => {
        wall.geometry.dispose();
        wall.edges?.dispose();
      }),
    [walls]
  );

  const trimWalls = useMemo<TrimWall[]>(
    () =>
      walls.map(({ frame, pieces, top, lowered }) => ({ frame, pieces, top, lowered })),
    [walls]
  );

  const wallMaterials = useWallMaterials(finish, quality, glass, envMap, fullTop * SCALE);
  const openingMaterials = useOpeningMaterials(appearance, envMap, daylightToneFor(lighting));
  const selectedOpenings = useMemo(() => {
    const ids = new Set(selectedIds ?? []);
    if (selection?.kind === "opening") ids.add(selection.id);
    return ids;
  }, [selectedIds, selection]);

  return (
    <group>
      {walls.map(({ frame, geometry, edges }) => {
        const selected = selection?.kind === "wall" && selection.index === frame.index;
        return (
          <mesh
            key={frame.index}
            geometry={geometry}
            material={wallMaterials}
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ kind: "wall", index: frame.index });
            }}
          >
            {edges ? (
              <lineSegments geometry={edges} raycast={() => null}>
                <lineBasicMaterial color="#f1e2bb" transparent opacity={0.55} />
              </lineSegments>
            ) : null}
            {selected ? (
              <mesh geometry={geometry} renderOrder={20} raycast={() => null}>
                <meshBasicMaterial
                  color="#e8bd55"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={glass ? 0.3 : 0.18}
                  depthTest={false}
                  depthWrite={false}
                  toneMapped={false}
                />
                <Edges
                  threshold={20}
                  color="#ffe09a"
                  lineWidth={2.2}
                  depthTest={false}
                  renderOrder={21}
                />
              </mesh>
            ) : null}
          </mesh>
        );
      })}
      <VenueTrim
        walls={trimWalls}
        fullTop={fullTop}
        appearance={appearance}
        bounds={bounds}
        glass={glass}
      />
      {walls.map(({ frame, spans, top }) =>
        spans.map((span) => (
          <VenueOpening
            key={span.opening.id}
            span={span}
            frame={frame}
            bounds={bounds}
            wallTopIn={top}
            thicknessIn={WALL_THICKNESS_IN}
            detailed={quality !== "draft"}
            materials={openingMaterials}
            wallMaterials={wallMaterials}
            highlight={
              selectedOpenings.has(span.opening.id)
                ? "selected"
                : hoveredId === span.opening.id
                  ? "hovered"
                  : null
            }
            inside={cameraInside}
            onSelect={onSelect}
            onHover={onHoverOpening}
          />
        ))
      )}
    </group>
  );
}
