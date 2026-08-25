"use client";

import {
  getDrapeColorHex,
  type DrapeFabric,
  type StudioDesignJson,
  type StudioTreatment,
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
const PANEL_DEPTH = 0.52;

function createPanelGeometry({
  width,
  height,
  fullness,
  pinchSide = 0,
  tiebackHeight = 0,
  depth = PANEL_DEPTH,
}: {
  width: number;
  height: number;
  fullness: number;
  pinchSide?: -1 | 0 | 1;
  tiebackHeight?: number;
  depth?: number;
}) {
  const horizontalSteps = Math.min(
    48,
    Math.max(8, Math.round(width * fullness * 2.2))
  );
  const verticalSteps = pinchSide === 0 ? 8 : 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const foldCount = Math.min(18, Math.max(3, Math.round(width * fullness)));
  const tieY = Math.min(height, Math.max(0, tiebackHeight));

  for (let row = 0; row <= verticalSteps; row += 1) {
    const yProgress = row / verticalSteps;
    const y = yProgress * height;
    const tieDistance = height > 0 ? Math.abs(y - tieY) / height : 1;
    const pinch = pinchSide === 0 ? 0 : Math.exp(-tieDistance * tieDistance * 42);
    const widthScale = 1 - pinch * 0.48;
    const centerShift = pinchSide * pinch * width * 0.24;
    for (let column = 0; column <= horizontalSteps; column += 1) {
      const progress = column / horizontalSteps;
      const phase = progress * Math.PI * 2 * foldCount;
      const x =
        (progress - 0.5) * width * widthScale +
        centerShift;
      const fold =
        Math.sin(phase) *
        Math.min(0.2, 0.075 + fullness * 0.035) *
        (0.82 + yProgress * 0.18);
      positions.push(x, 0.018 + y, depth + fold);
      uvs.push(progress, yProgress);
    }
  }

  const rowLength = horizontalSteps + 1;
  for (let row = 0; row < verticalSteps; row += 1) {
    for (let column = 0; column < horizontalSteps; column += 1) {
      const a = row * rowLength + column;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
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

function createSwagGeometry(width: number, drop: number, depth = 0.82) {
  const steps = 28;
  const verticalSteps = 5;
  const fabricDepth = Math.min(1.85, Math.max(0.95, drop * 0.82));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    const x = -width / 2 + progress * width;
    const hang = Math.sin(progress * Math.PI);
    const topCurve = hang * drop * 0.12;
    const edgeTaper = 0.14 + hang * 0.86;
    for (let row = 0; row <= verticalSteps; row += 1) {
      const verticalProgress = row / verticalSteps;
      const pleat =
        Math.sin(progress * Math.PI * 12) *
        0.085 *
        hang *
        (0.25 + verticalProgress * 0.75);
      positions.push(
        x,
        -topCurve -
          fabricDepth * edgeTaper * verticalProgress -
          Math.sin(progress * Math.PI * 8) *
            0.025 *
            hang *
            verticalProgress,
        depth +
          pleat +
          Math.sin(verticalProgress * Math.PI) * 0.075 +
          verticalProgress * 0.035
      );
      uvs.push(progress, 1 - verticalProgress);
    }
  }
  const rowLength = verticalSteps + 1;
  for (let index = 0; index < steps; index += 1) {
    for (let row = 0; row < verticalSteps; row += 1) {
      const a = index * rowLength + row;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
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

function FabricMaterial({
  color,
  fabric,
}: {
  color: string;
  fabric: DrapeFabric;
}) {
  const sheer = fabric === "sheer";
  const velvet = fabric === "velvet" || fabric === "velour";
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={velvet ? 0.88 : sheer ? 0.62 : 0.74}
      metalness={0}
      sheen={velvet ? 0.76 : 0.5}
      sheenRoughness={0.76}
      sheenColor={color}
      transparent={sheer}
      opacity={sheer ? 0.48 : 1}
      depthWrite={!sheer}
      side={THREE.DoubleSide}
      forceSinglePass={sheer}
    />
  );
}

function FabricPanel({
  width,
  height,
  fullness,
  color,
  fabric,
  position,
  pinchSide = 0,
  tiebackHeight = 0,
  depth,
}: {
  width: number;
  height: number;
  fullness: number;
  color: string;
  fabric: DrapeFabric;
  position?: [number, number, number];
  pinchSide?: -1 | 0 | 1;
  tiebackHeight?: number;
  depth?: number;
}) {
  const geometry = useMemo(
    () =>
      createPanelGeometry({
        width,
        height,
        fullness,
        pinchSide,
        tiebackHeight,
        depth,
      }),
    [depth, fullness, height, pinchSide, tiebackHeight, width]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <FabricMaterial color={color} fabric={fabric} />
    </mesh>
  );
}

function SwagBand({
  width,
  drop,
  height,
  color,
  fabric,
}: {
  width: number;
  drop: number;
  height: number;
  color: string;
  fabric: DrapeFabric;
}) {
  const geometry = useMemo(
    () => createSwagGeometry(width, drop),
    [drop, width]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, height, 0]} castShadow>
      <FabricMaterial color={color} fabric={fabric} />
    </mesh>
  );
}

function frameColor(finish: StudioTreatment["frameFinish"]) {
  if (finish === "gold") return "#b98b3d";
  if (finish === "black") return "#211f1c";
  if (finish === "white") return "#ece8df";
  return "#7d5534";
}

function TreatmentAssembly({
  treatment,
  wall,
  bounds,
  selected,
  onSelect,
}: {
  treatment: StudioTreatment;
  wall: StudioWallSegment;
  bounds: StudioBounds;
  selected: boolean;
  onSelect: () => void;
}) {
  const center = getPointAlongWall(
    wall,
    (treatment.anchor.startOffset + treatment.anchor.endOffset) / 2
  );
  const width =
    Math.max(1, treatment.anchor.endOffset - treatment.anchor.startOffset) *
    SCALE;
  const height = Math.max(0.1, treatment.height * SCALE);
  const opening = Math.min(
    width * 0.82,
    Math.max(0.6, treatment.openingWidth * SCALE)
  );
  const panelWidth = Math.max(0.45, (width - opening) / 2);
  const primary = getDrapeColorHex(treatment.color);
  const accent = getDrapeColorHex(treatment.secondaryColor);
  const tiebackHeight = Math.min(height, treatment.tiebackHeight * SCALE);
  const swagDrop = Math.min(height * 0.55, treatment.swagDrop * SCALE);
  const archPost = 0.16;

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
      {treatment.type === "full_pleated_backdrop" ? (
        <>
          <FabricPanel
            width={width}
            height={height}
            fullness={treatment.fullness}
            color={primary}
            fabric={treatment.fabric}
          />
          {treatment.hasTopPipe ? (
            <mesh
              position={[0, height + 0.08, PANEL_DEPTH - 0.04]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.055, 0.055, width + 0.18, 10]} />
              <meshStandardMaterial
                color="#4a4035"
                roughness={0.36}
                metalness={0.58}
              />
            </mesh>
          ) : null}
        </>
      ) : null}

      {treatment.type === "side_tieback_panels" ? (
        <>
          {treatment.hasBackdrop ? (
            <FabricPanel
              width={width}
              height={height}
              fullness={treatment.fullness}
              color={accent}
              fabric={treatment.fabric}
              depth={0.32}
            />
          ) : null}
          <FabricPanel
            width={panelWidth}
            height={height}
            fullness={treatment.fullness}
            color={primary}
            fabric={treatment.fabric}
            position={[-width / 2 + panelWidth / 2, 0, 0]}
            pinchSide={treatment.hasTiebacks ? 1 : 0}
            tiebackHeight={tiebackHeight}
          />
          <FabricPanel
            width={panelWidth}
            height={height}
            fullness={treatment.fullness}
            color={primary}
            fabric={treatment.fabric}
            position={[width / 2 - panelWidth / 2, 0, 0]}
            pinchSide={treatment.hasTiebacks ? -1 : 0}
            tiebackHeight={tiebackHeight}
          />
          {treatment.hasTiebacks ? (
            <>
              <TieBand
                x={-opening / 2}
                y={tiebackHeight}
                color={accent}
              />
              <TieBand x={opening / 2} y={tiebackHeight} color={accent} />
            </>
          ) : null}
          {treatment.hasTopSwag ? (
            <SwagBand
              width={width}
              drop={swagDrop}
              height={height}
              color={accent}
              fabric={treatment.fabric}
            />
          ) : null}
        </>
      ) : null}

      {treatment.type === "top_swag_valance" ? (
        <SwagBand
          width={width}
          drop={swagDrop}
          height={height}
          color={primary}
          fabric={treatment.fabric}
        />
      ) : null}

      {treatment.type === "ceremony_arch" ? (
        <>
          <FramePiece
            position={[-width / 2, height / 2, 0.36]}
            size={[archPost, height, archPost]}
            color={frameColor(treatment.frameFinish)}
          />
          <FramePiece
            position={[width / 2, height / 2, 0.36]}
            size={[archPost, height, archPost]}
            color={frameColor(treatment.frameFinish)}
          />
          <FramePiece
            position={[0, height, 0.36]}
            size={[width + archPost, archPost, archPost]}
            color={frameColor(treatment.frameFinish)}
          />
          <FabricPanel
            width={Math.min(2.2, width * 0.24)}
            height={height * 0.96}
            fullness={treatment.fullness}
            color={primary}
            fabric={treatment.fabric}
            position={[-width / 2 + Math.min(1.1, width * 0.12), 0, 0]}
            pinchSide={treatment.hasTiebacks ? 1 : 0}
            tiebackHeight={tiebackHeight}
          />
          <FabricPanel
            width={Math.min(2.2, width * 0.24)}
            height={height * 0.96}
            fullness={treatment.fullness}
            color={primary}
            fabric={treatment.fabric}
            position={[width / 2 - Math.min(1.1, width * 0.12), 0, 0]}
            pinchSide={treatment.hasTiebacks ? -1 : 0}
            tiebackHeight={tiebackHeight}
          />
          {treatment.hasTopSwag ? (
            <SwagBand
              width={width * 0.92}
              drop={swagDrop}
              height={height}
              color={primary}
              fabric={treatment.fabric}
            />
          ) : null}
        </>
      ) : null}

      {selected ? (
        <mesh position={[0, height / 2, 0.48]}>
          <boxGeometry args={[width + 0.32, height + 0.28, 0.34]} />
          <meshBasicMaterial
            color="#d4af55"
            wireframe
            transparent
            opacity={0.68}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function TieBand({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <mesh position={[x, y, PANEL_DEPTH + 0.14]} castShadow>
      <boxGeometry args={[0.28, 0.18, 0.18]} />
      <meshStandardMaterial color={color} roughness={0.52} metalness={0.06} />
    </mesh>
  );
}

function FramePiece({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.42}
        metalness={color === "#b98b3d" ? 0.42 : 0.08}
      />
    </mesh>
  );
}

export function StudioTreatments({
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
      {design.treatments.map((treatment) => {
        const wall = walls[treatment.anchor.wallIndex];
        if (!wall) return null;
        return (
          <TreatmentAssembly
            key={treatment.id}
            treatment={treatment}
            wall={wall}
            bounds={bounds}
            selected={
              selection?.kind === "treatment" &&
              selection.id === treatment.id
            }
            onSelect={() =>
              onSelect({ kind: "treatment", id: treatment.id })
            }
          />
        );
      })}
    </group>
  );
}
