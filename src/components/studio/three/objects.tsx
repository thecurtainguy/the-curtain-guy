"use client";

import type {
  DanceFloorFinish,
  GenericStudioObjectFinish,
  StudioDesignJson,
  StudioObject,
  StudioObjectType,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import type { StudioSelection } from "../studio-types";

const SCALE = 1 / 12;
const GOLD = "#d4af55";

const objectColors: Record<StudioObjectType, string> = {
  stage: "#55483a",
  dance_floor: "#f1eee7",
  entrance_marker: "#b68b3f",
  round_table: "#89745b",
  rectangle_table: "#89745b",
  cocktail_table: "#8b7861",
  table_area: "#8f806c",
  dj_booth: "#3e4650",
  bar: "#5c4534",
  lounge_area: "#756a69",
};

const genericFinishColors: Record<GenericStudioObjectFinish, string> = {
  natural_wood: "#89705a",
  painted_white: "#e8e4dc",
  painted_black: "#242321",
  metal: "#7f8588",
  upholstered: "#76666a",
  custom: "#9a7847",
};

const danceAppearance: Record<
  DanceFloorFinish,
  {
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
  }
> = {
  white_gloss: { color: "#f4f2ed", roughness: 0.16, metalness: 0.06 },
  black_gloss: { color: "#171717", roughness: 0.14, metalness: 0.12 },
  checkerboard: { color: "#ffffff", roughness: 0.3, metalness: 0.02 },
  warm_parquet: { color: "#a26e3d", roughness: 0.7, metalness: 0 },
  oak: { color: "#bd9360", roughness: 0.72, metalness: 0 },
  dark_wood: { color: "#4c3428", roughness: 0.76, metalness: 0 },
  neutral_event_carpet: { color: "#81796e", roughness: 0.98, metalness: 0 },
  led_starlit: {
    color: "#0e1422",
    roughness: 0.3,
    metalness: 0.08,
    emissive: "#315b88",
    emissiveIntensity: 0.5,
  },
  custom_wrap_monogram: {
    color: "#e7ddca",
    roughness: 0.42,
    metalness: 0.02,
  },
};

const textureCache = new Map<DanceFloorFinish, THREE.DataTexture>();

function getDanceTexture(finish: DanceFloorFinish) {
  if (
    finish === "white_gloss" ||
    finish === "black_gloss" ||
    finish === "neutral_event_carpet"
  ) {
    return undefined;
  }
  const cached = textureCache.get(finish);
  if (cached) return cached;
  const size = 16;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      let color: [number, number, number] = [235, 226, 208];
      if (finish === "checkerboard") {
        color = (Math.floor(x / 4) + Math.floor(y / 4)) % 2
          ? [28, 28, 28]
          : [242, 239, 232];
      } else if (
        finish === "warm_parquet" ||
        finish === "oak" ||
        finish === "dark_wood"
      ) {
        const dark = x % 4 === 0 || y % 8 === 0;
        const base =
          finish === "warm_parquet"
            ? [157, 104, 59]
            : finish === "oak"
              ? [190, 149, 96]
              : [70, 47, 37];
        color = dark
          ? [base[0] * 0.68, base[1] * 0.68, base[2] * 0.68]
          : [base[0], base[1], base[2]];
      } else if (finish === "led_starlit") {
        const star = (x * 11 + y * 7) % 23 === 0;
        color = star ? [255, 224, 126] : [12, 20, 35];
      } else if (finish === "custom_wrap_monogram") {
        const stripe = (x + y) % 8 < 2;
        color = stripe ? [183, 139, 63] : [235, 226, 208];
      }
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  textureCache.set(finish, texture);
  return texture;
}

function finishColor(object: StudioObject) {
  if (object.type === "dance_floor") return objectColors.dance_floor;
  const finish = object.finish as GenericStudioObjectFinish | undefined;
  return finish ? genericFinishColors[finish] ?? objectColors[object.type] : objectColors[object.type];
}

function SelectionOutline({
  width,
  depth,
  height,
}: {
  width: number;
  depth: number;
  height: number;
}) {
  const markerWidth = width + 0.24;
  const markerDepth = depth + 0.24;
  const ringRadius = Math.max(width, depth) * 0.62 + 0.12;
  return (
    <>
      <mesh
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={20}
      >
        <planeGeometry args={[markerWidth, markerDepth]} />
        <meshBasicMaterial
          color={GOLD}
          side={THREE.DoubleSide}
          transparent
          opacity={0.24}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[0, Math.max(0.1, height) / 2 + 0.04]}
        renderOrder={21}
      >
        <boxGeometry
          args={[
            markerWidth,
            Math.max(0.18, height + 0.2),
            markerDepth,
          ]}
        />
        <meshBasicMaterial
          color={GOLD}
          side={THREE.DoubleSide}
          transparent
          opacity={0.16}
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
      <mesh
        position={[0, 0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={22}
      >
        <ringGeometry args={[ringRadius, ringRadius + 0.09, 48]} />
        <meshBasicMaterial
          color="#ffe09a"
          side={THREE.DoubleSide}
          transparent
          opacity={0.96}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[0, Math.max(0.1, height) + 0.62, 0]}
        rotation={[0, 0, Math.PI / 4]}
        renderOrder={23}
      >
        <octahedronGeometry args={[0.34, 0]} />
        <meshBasicMaterial
          color="#ffe09a"
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

function DanceFloor({
  object,
  width,
  depth,
}: {
  object: StudioObject;
  width: number;
  depth: number;
}) {
  const finish = (object.finish ?? "white_gloss") as DanceFloorFinish;
  const appearance = danceAppearance[finish] ?? danceAppearance.white_gloss;
  const texture = getDanceTexture(finish);
  return (
    <mesh position={[0, 0.055, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.1, depth]} />
      <meshStandardMaterial
        color={appearance.color}
        map={texture}
        roughness={appearance.roughness}
        metalness={appearance.metalness}
        emissive={appearance.emissive ?? "#000000"}
        emissiveMap={finish === "led_starlit" ? texture : undefined}
        emissiveIntensity={appearance.emissiveIntensity ?? 0}
      />
    </mesh>
  );
}

function CircularTable({
  object,
  width,
  height,
}: {
  object: StudioObject;
  width: number;
  height: number;
}) {
  const color = finishColor(object);
  const topThickness = 0.16;
  const topY = Math.max(0.28, height);
  return (
    <>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[width / 2, width / 2, topThickness, 32]} />
        <meshStandardMaterial color={color} roughness={0.64} metalness={0.03} />
      </mesh>
      <mesh position={[0, topY / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, topY, 14]} />
        <meshStandardMaterial color="#62584d" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.055, 0]} receiveShadow>
        <cylinderGeometry args={[Math.min(width * 0.22, 0.7), Math.min(width * 0.22, 0.7), 0.1, 24]} />
        <meshStandardMaterial color="#514a43" roughness={0.5} metalness={0.28} />
      </mesh>
    </>
  );
}

function RectangleTable({
  object,
  width,
  depth,
  height,
}: {
  object: StudioObject;
  width: number;
  depth: number;
  height: number;
}) {
  const topY = Math.max(0.28, height);
  const legX = Math.max(0, width / 2 - 0.22);
  const legZ = Math.max(0, depth / 2 - 0.22);
  return (
    <>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial color={finishColor(object)} roughness={0.66} />
      </mesh>
      {([-1, 1] as const).flatMap((xSign) =>
        ([-1, 1] as const).map((zSign) => (
          <mesh
            key={`${xSign}-${zSign}`}
            position={[xSign * legX, topY / 2, zSign * legZ]}
            castShadow
          >
            <boxGeometry args={[0.12, topY, 0.12]} />
            <meshStandardMaterial color="#5d554c" roughness={0.48} metalness={0.22} />
          </mesh>
        ))
      )}
    </>
  );
}

function ObjectGeometry({
  object,
  width,
  depth,
  height,
}: {
  object: StudioObject;
  width: number;
  depth: number;
  height: number;
}) {
  if (object.type === "dance_floor") {
    return <DanceFloor object={object} width={width} depth={depth} />;
  }
  if (object.type === "round_table" || object.type === "cocktail_table") {
    return <CircularTable object={object} width={width} height={height} />;
  }
  if (object.type === "rectangle_table") {
    return <RectangleTable object={object} width={width} depth={depth} height={height} />;
  }
  if (object.type === "table_area" || object.type === "lounge_area") {
    return (
      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial
          color={finishColor(object)}
          roughness={0.88}
          transparent
          opacity={0.34}
          depthWrite={false}
        />
      </mesh>
    );
  }
  if (object.type === "entrance_marker") {
    const postHeight = Math.max(1, height);
    return (
      <>
        {([-1, 1] as const).map((sign) => (
          <mesh key={sign} position={[sign * (width / 2 - 0.08), postHeight / 2, 0]} castShadow>
            <boxGeometry args={[0.14, postHeight, Math.min(depth, 0.3)]} />
            <meshStandardMaterial color={finishColor(object)} roughness={0.48} metalness={0.18} />
          </mesh>
        ))}
        <mesh position={[0, postHeight - 0.08, 0]} castShadow>
          <boxGeometry args={[width, 0.16, Math.min(depth, 0.3)]} />
          <meshStandardMaterial color={finishColor(object)} roughness={0.48} metalness={0.18} />
        </mesh>
      </>
    );
  }
  return (
    <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={finishColor(object)} roughness={0.72} metalness={0.03} />
    </mesh>
  );
}

export function StudioObjects({
  design,
  bounds,
  selection,
  onSelect,
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
        const width = Math.max(0.08, object.width * SCALE);
        const depth = Math.max(0.08, object.depth * SCALE);
        const height = Math.max(0.08, object.height * SCALE);
        return (
          <group
            key={object.id}
            position={[
              (object.x - bounds.centerX) * SCALE,
              0,
              (object.z - bounds.centerZ) * SCALE,
            ]}
            rotation={[0, (-object.rotation * Math.PI) / 180, 0]}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ kind: "object", id: object.id });
            }}
          >
            <ObjectGeometry
              object={object}
              width={width}
              depth={depth}
              height={height}
            />
            {selected ? (
              <SelectionOutline width={width} depth={depth} height={height} />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
