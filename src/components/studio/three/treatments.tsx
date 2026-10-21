"use client";

import type {
  DrapeColor,
  DrapeFabric,
  DrapeHardware,
  StudioDesignJson,
  StudioTreatment,
} from "@/data/studio";
import {
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import { useMemo } from "react";
import type { StudioSelection } from "../studio-types";
import {
  assemblyFrontZ,
  DrapeAssembly,
  FabricMesh,
  interiorSign,
  SelectionFloorLine,
  useFabricEditorState,
  useFabricLayerVisible,
  wallStandoff,
  type FabricHighlight,
} from "./fabric/drape-assembly";
import { FloralArrangement } from "./fabric/florals";
import {
  bayBreaks,
  clampTieY,
  createJabotGeometry,
  createPleatedPanelGeometry,
  createSwagGeometry,
  foldDepth,
  pocketFrontZ,
  pocketTopY,
  tieBundleDepth,
  tieBundleWidth,
  tiebackAnchorX,
  type JabotOptions,
  type PleatedPanelOptions,
  type SwagOptions,
} from "./fabric/geometry";
import {
  ArchFrame,
  CeilingTrack,
  CROSSBAR_RADIUS,
  DecorativeRod,
  PipeAndDrapeHardware,
  UplightRow,
  uplightPositions,
  useDisposeGeometry,
} from "./fabric/hardware";
import {
  getFabricMaterial,
  type FabricQuality,
} from "./fabric/materials";
import { hashSeed } from "./texture-utils";

const SCALE = 1 / 12;
const ARCH_TUBE_RADIUS = 0.075;

type Look = {
  fabric: DrapeFabric;
  glow: DrapeColor | null;
  highlight: FabricHighlight;
  quality: FabricQuality;
};

function PanelMesh({
  options,
  color,
  look,
}: {
  options: Omit<PleatedPanelOptions, "quality">;
  color: DrapeColor;
  look: Look;
}) {
  const key = JSON.stringify(options);
  const geometry = useMemo(
    () =>
      createPleatedPanelGeometry({
        ...(JSON.parse(key) as PleatedPanelOptions),
        quality: look.quality,
      }),
    [key, look.quality]
  );
  useDisposeGeometry(geometry);
  return (
    <FabricMesh
      geometry={geometry}
      material={getFabricMaterial(look.fabric, color, look.glow)}
      highlight={look.highlight}
    />
  );
}

function SwagMesh({
  options,
  color,
  look,
  position,
}: {
  options: Omit<SwagOptions, "quality">;
  color: DrapeColor;
  look: Look;
  position: [number, number, number];
}) {
  const key = JSON.stringify(options);
  const geometry = useMemo(
    () =>
      createSwagGeometry({
        ...(JSON.parse(key) as SwagOptions),
        quality: look.quality,
      }),
    [key, look.quality]
  );
  useDisposeGeometry(geometry);
  return (
    <FabricMesh
      geometry={geometry}
      material={getFabricMaterial(look.fabric, color, look.glow)}
      highlight={look.highlight}
      position={position}
    />
  );
}

function JabotMesh({
  options,
  color,
  look,
  position,
}: {
  options: Omit<JabotOptions, "quality">;
  color: DrapeColor;
  look: Look;
  position: [number, number, number];
}) {
  const key = JSON.stringify(options);
  const geometry = useMemo(
    () =>
      createJabotGeometry({
        ...(JSON.parse(key) as JabotOptions),
        quality: look.quality,
      }),
    [key, look.quality]
  );
  useDisposeGeometry(geometry);
  return (
    <FabricMesh
      geometry={geometry}
      material={getFabricMaterial(look.fabric, color, look.glow)}
      highlight={look.highlight}
      position={position}
    />
  );
}

/** Row of overlapping swag scallops with rosettes at each gather point. */
function SwagRow({
  width,
  count,
  drop,
  y,
  z,
  color,
  rosetteColor,
  look,
  seed,
  overlap = 1.06,
  topSag = 0.06,
}: {
  width: number;
  count: number;
  drop: number;
  y: number;
  z: number;
  color: DrapeColor;
  rosetteColor: DrapeColor;
  look: Look;
  seed: number;
  overlap?: number;
  topSag?: number;
}) {
  const n = Math.max(1, Math.min(8, Math.round(count)));
  const scallop = width / n;
  const rosette = getFabricMaterial("satin", rosetteColor);
  return (
    <group>
      {Array.from({ length: n }, (_, index) => (
        <SwagMesh
          key={index}
          options={{
            width: scallop * overlap,
            drop,
            seed: seed + index * 131,
            topSag,
          }}
          color={color}
          look={look}
          position={[-width / 2 + (index + 0.5) * scallop, y, z + (index % 2) * 0.012]}
        />
      ))}
      {Array.from({ length: n + 1 }, (_, index) => (
        <mesh
          key={`rosette-${index}`}
          position={[-width / 2 + index * scallop, y - 0.04, z + 0.12]}
          scale={[1, 1, 0.6]}
          material={rosette}
          castShadow
        >
          <torusKnotGeometry args={[0.1, 0.045, 48, 8, 2, 5]} />
        </mesh>
      ))}
    </group>
  );
}

/** Fabric band cinched around a tieback bundle, with a hanging tassel. */
function TieBand({
  x,
  y,
  z,
  bundle,
  depth,
  color,
}: {
  x: number;
  y: number;
  z: number;
  bundle: number;
  depth: number;
  color: DrapeColor;
}) {
  const radius = bundle * 0.56 + 0.03;
  const material = getFabricMaterial("satin", color);
  return (
    <group position={[x, y, z]}>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, Math.max(0.5, (depth + 0.05) / radius), 1]}
        material={material}
        castShadow
      >
        <torusGeometry args={[radius, 0.042, 10, 28]} />
      </mesh>
      <group position={[0, -0.05, depth + 0.07]}>
        <mesh material={material} castShadow>
          <sphereGeometry args={[0.06, 14, 10]} />
        </mesh>
        <mesh position={[0, -0.24, 0]} material={material} castShadow>
          <coneGeometry args={[0.075, 0.38, 14, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

type HeaderHardware = DrapeHardware | "rod";

/** Top hardware for treatments that hang from a single header line. */
function HeaderHardware({
  kind,
  width,
  y,
  z,
}: {
  kind: HeaderHardware;
  width: number;
  y: number;
  z: number;
}) {
  if (kind === "pipe_and_drape") {
    return (
      <PipeAndDrapeHardware
        breaks={bayBreaks(width, 10)}
        crossbarY={y}
        crossbarZs={[z]}
        uprightZ={z}
      />
    );
  }
  if (kind === "ceiling_track") {
    return <CeilingTrack length={width} y={y + 0.03} z={z} />;
  }
  if (kind === "rod") return <DecorativeRod length={width} y={y} z={z} />;
  return null;
}

type AssemblyProps = {
  treatment: StudioTreatment;
  width: number;
  height: number;
  look: Look;
  seed: number;
};

function FullBackdrop({ treatment, width, height, look, seed }: AssemblyProps) {
  const hardware =
    treatment.hardware ?? (treatment.hasTopPipe ? "pipe_and_drape" : "wall_mount");
  const baseZ = wallStandoff(hardware);
  const front = assemblyFrontZ(hardware, baseZ);
  const amplitude = foldDepth(treatment.fullness);
  return (
    <group>
      <DrapeAssembly
        length={width}
        height={height}
        fabric={treatment.fabric}
        color={treatment.color}
        fullness={treatment.fullness}
        hardware={hardware}
        seed={seed}
        quality={look.quality}
        baseZ={baseZ}
        uplightColor={treatment.uplightColor}
        highlight={look.highlight}
      />
      {treatment.hasTopSwag ? (
        <SwagRow
          width={width}
          count={treatment.swagCount ?? Math.max(1, Math.round(width / 8))}
          drop={Math.max(0.4, treatment.swagDrop * SCALE)}
          y={height}
          z={front + amplitude * 0.6 + 0.05}
          color={treatment.secondaryColor}
          rosetteColor={treatment.secondaryColor}
          look={look}
          seed={seed + 17}
        />
      ) : null}
      {treatment.hasFloralHeader ? (
        <FloralArrangement
          spec={{
            kind: "band",
            x0: -width / 2 + 0.2,
            x1: width / 2 - 0.2,
            y: height - 0.3,
            z: front + amplitude * 0.8,
          }}
          color={treatment.secondaryColor}
          seed={seed + 3}
          quality={look.quality}
        />
      ) : null}
    </group>
  );
}

function SideTiebacks({ treatment, width, height, look, seed }: AssemblyProps) {
  const hardware = treatment.hardware ?? "pipe_and_drape";
  const pipe = hardware === "pipe_and_drape";
  const baseZ = treatment.hasBackdrop ? (pipe ? 0.9 : 0.55) : wallStandoff(hardware);
  const front = assemblyFrontZ(hardware, baseZ);
  const crossbarY = pipe ? height - CROSSBAR_RADIUS - 0.012 : height;
  const opening = Math.min(width * 0.9, Math.max(0.6, treatment.openingWidth * SCALE));
  const panelWidth = Math.max(0.6, (width - opening) / 2);
  const tieY = clampTieY(treatment.tiebackHeight * SCALE, height);
  const amplitude = foldDepth(treatment.fullness);
  const bundle = tieBundleWidth(panelWidth);
  const bundleDepth = tieBundleDepth(panelWidth, treatment.fullness);

  const panel = (side: -1 | 1) => {
    const x0 = side < 0 ? -width / 2 : width / 2 - panelWidth;
    return {
      x0,
      options: {
        width: panelWidth,
        x0,
        height: pipe ? pocketTopY(crossbarY, CROSSBAR_RADIUS) : height,
        fullness: treatment.fullness,
        seed: seed + (side < 0 ? 11 : 29),
        z: front,
        pipeRadius: pipe ? CROSSBAR_RADIUS : undefined,
        tieback: treatment.hasTiebacks ? { y: tieY, side } : undefined,
      } satisfies Omit<PleatedPanelOptions, "quality">,
    };
  };
  const left = panel(-1);
  const right = panel(1);

  return (
    <group>
      {treatment.hasBackdrop ? (
        <DrapeAssembly
          length={width}
          height={height}
          fabric={treatment.fabric}
          color={treatment.secondaryColor}
          fullness={treatment.fullness}
          hardware="wall_mount"
          seed={seed + 5}
          quality={look.quality}
          baseZ={0.28}
          highlight={look.highlight}
        />
      ) : null}
      <PanelMesh options={left.options} color={treatment.color} look={look} />
      <PanelMesh options={right.options} color={treatment.color} look={look} />
      <HeaderHardware kind={hardware} width={width} y={crossbarY} z={baseZ} />
      {treatment.hasTiebacks
        ? ([left, right] as const).map((item, index) => (
            <TieBand
              key={index}
              x={tiebackAnchorX(item.x0, panelWidth, index === 0 ? -1 : 1, bundle)}
              y={tieY}
              z={front + amplitude * 0.55 + 0.14}
              bundle={bundle}
              depth={bundleDepth}
              color={treatment.secondaryColor}
            />
          ))
        : null}
      {treatment.hasTopSwag ? (
        <SwagRow
          width={width}
          count={treatment.swagCount ?? 1}
          drop={Math.max(0.4, treatment.swagDrop * SCALE)}
          y={height}
          z={front + amplitude * 0.5 + 0.06}
          color={treatment.secondaryColor}
          rosetteColor={treatment.secondaryColor}
          look={look}
          seed={seed + 41}
        />
      ) : null}
      {treatment.hasFloralHeader ? (
        <FloralArrangement
          spec={{
            kind: "band",
            x0: -width / 2 + 0.2,
            x1: width / 2 - 0.2,
            y: height - 0.25,
            z: front + amplitude,
          }}
          color={treatment.secondaryColor}
          seed={seed + 3}
          quality={look.quality}
        />
      ) : null}
      {treatment.uplightColor ? (
        <UplightRow
          positions={[
            -width / 2 + panelWidth / 2,
            width / 2 - panelWidth / 2,
          ]}
          color={treatment.uplightColor}
          z={front + amplitude + 0.8}
          fabricZ={front + amplitude + 0.06}
          washHeight={Math.min(height, 9)}
        />
      ) : null}
      <SelectionFloorLine
        length={width}
        z={front + amplitude + 0.35}
        highlight={look.highlight}
      />
    </group>
  );
}

function headerKind(treatment: StudioTreatment): HeaderHardware {
  return treatment.hardware ?? "rod";
}

function TopSwagValance({ treatment, width, height, look, seed }: AssemblyProps) {
  const kind = headerKind(treatment);
  const z = kind === "pipe_and_drape" ? 0.66 : 0.42;
  const count = treatment.swagCount ?? 1;
  const drop = Math.max(0.4, treatment.swagDrop * SCALE);
  const cascade = count >= 2;
  return (
    <group>
      {treatment.hasBackdrop ? (
        <DrapeAssembly
          length={width}
          height={height}
          fabric={treatment.fabric}
          color={treatment.secondaryColor}
          fullness={treatment.fullness}
          hardware="wall_mount"
          seed={seed + 5}
          quality={look.quality}
          baseZ={0.24}
          highlight={look.highlight}
        />
      ) : null}
      <HeaderHardware kind={kind} width={width} y={height} z={z} />
      <SwagRow
        width={cascade ? width - 0.9 : width}
        count={count}
        drop={drop}
        y={height - 0.02}
        z={z + 0.08}
        color={treatment.color}
        rosetteColor={treatment.secondaryColor}
        look={look}
        seed={seed}
      />
      {cascade
        ? ([-1, 1] as const).map((side) => (
            <JabotMesh
              key={side}
              options={{
                width: 0.8,
                longLength: drop * 1.9,
                shortLength: drop * 0.7,
                side,
                seed: seed + side * 7,
              }}
              color={treatment.color}
              look={look}
              position={[side * (width / 2 - 0.4), height - 0.02, z + 0.06]}
            />
          ))
        : null}
      {treatment.hasFloralHeader ? (
        <FloralArrangement
          spec={{
            kind: "band",
            x0: -width / 2,
            x1: width / 2,
            y: height + 0.05,
            z: z + 0.05,
            thickness: 0.6,
          }}
          color={treatment.secondaryColor}
          seed={seed + 3}
          quality={look.quality}
        />
      ) : null}
      {treatment.uplightColor ? (
        <UplightRow
          positions={uplightPositions(width)}
          color={treatment.uplightColor}
          z={z + 1.1}
          fabricZ={z + 0.3}
          washHeight={Math.min(height, 9)}
        />
      ) : null}
      <SelectionFloorLine length={width} z={z + 0.5} highlight={look.highlight} />
    </group>
  );
}

function LayeredSwag({ treatment, width, height, look, seed }: AssemblyProps) {
  const kind = headerKind(treatment);
  const z = kind === "pipe_and_drape" ? 0.66 : 0.42;
  const count = Math.max(1, Math.min(8, treatment.swagCount ?? 3));
  const drop = Math.max(0.5, treatment.swagDrop * SCALE);
  const tailWidth = Math.min(1.6, Math.max(0.9, width * 0.1));
  const swagWidth = Math.max(1, width - tailWidth * 1.2);
  const scallop = swagWidth / count;
  const backCount = Math.max(1, count - 1);
  const backWidth = count === 1 ? swagWidth * 1.04 : scallop * backCount;
  return (
    <group>
      {treatment.hasBackdrop ? (
        <DrapeAssembly
          length={width}
          height={height}
          fabric={treatment.fabric}
          color={treatment.secondaryColor}
          fullness={treatment.fullness}
          hardware="wall_mount"
          seed={seed + 5}
          quality={look.quality}
          baseZ={0.24}
          highlight={look.highlight}
        />
      ) : null}
      <HeaderHardware kind={kind} width={width} y={height} z={z} />
      {/* Back layer: accent colour, offset half a scallop, deeper drop. */}
      <SwagRow
        width={backWidth}
        count={backCount}
        drop={drop * 1.22}
        y={height - 0.03}
        z={z + 0.02}
        color={treatment.secondaryColor}
        rosetteColor={treatment.secondaryColor}
        look={look}
        seed={seed + 61}
        overlap={1.12}
        topSag={0.04}
      />
      <SwagRow
        width={swagWidth}
        count={count}
        drop={drop}
        y={height - 0.01}
        z={z + 0.16}
        color={treatment.color}
        rosetteColor={treatment.secondaryColor}
        look={look}
        seed={seed}
      />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <JabotMesh
            options={{
              width: tailWidth,
              longLength: Math.min(height * 0.85, drop * 2.8),
              shortLength: drop * 0.9,
              side,
              seed: seed + side * 13,
            }}
            color={treatment.color}
            look={look}
            position={[side * (width / 2 - tailWidth / 2), height - 0.02, z + 0.22]}
          />
          <JabotMesh
            options={{
              width: tailWidth * 0.7,
              longLength: Math.min(height * 0.85, drop * 2.2),
              shortLength: drop * 0.7,
              side,
              seed: seed + side * 29,
            }}
            color={treatment.secondaryColor}
            look={look}
            position={[side * (width / 2 - tailWidth * 0.75), height - 0.02, z + 0.1]}
          />
        </group>
      ))}
      {treatment.hasFloralHeader ? (
        <FloralArrangement
          spec={{
            kind: "band",
            x0: -width / 2,
            x1: width / 2,
            y: height + 0.05,
            z: z + 0.1,
            thickness: 0.6,
          }}
          color={treatment.secondaryColor}
          seed={seed + 3}
          quality={look.quality}
        />
      ) : null}
      {treatment.uplightColor ? (
        <UplightRow
          positions={uplightPositions(width)}
          color={treatment.uplightColor}
          z={z + 1.2}
          fabricZ={z + 0.35}
          washHeight={Math.min(height, 9)}
        />
      ) : null}
      <SelectionFloorLine length={width} z={z + 0.6} highlight={look.highlight} />
    </group>
  );
}

function CeremonyArch({ treatment, width, height, look, seed }: AssemblyProps) {
  const wood = treatment.frameFinish === "wood";
  const frameWidth = Math.max(2, width - 0.4);
  const archZ = 1.6;
  const tubeRadius = wood ? 0.2 : ARCH_TUBE_RADIUS;
  const headerY = wood ? height + 0.12 : height;
  const front = pocketFrontZ(0, tubeRadius);
  const panelWidth = Math.min(3.5, Math.max(1, frameWidth * 0.34));
  const tieY = clampTieY(treatment.tiebackHeight * SCALE, height);
  const amplitude = foldDepth(treatment.fullness);
  const bundle = tieBundleWidth(panelWidth);
  const bundleDepth = tieBundleDepth(panelWidth, treatment.fullness);
  const drop = Math.max(0.5, treatment.swagDrop * SCALE);

  const panelFor = (side: -1 | 1) => {
    const x0 = side < 0 ? -frameWidth / 2 - 0.25 : frameWidth / 2 + 0.25 - panelWidth;
    return {
      x0,
      options: {
        width: panelWidth,
        x0,
        height: pocketTopY(headerY, tubeRadius),
        fullness: treatment.fullness,
        seed: seed + (side < 0 ? 3 : 19),
        z: front,
        pipeRadius: tubeRadius,
        tieback: treatment.hasTiebacks ? { y: tieY, side } : undefined,
      } satisfies Omit<PleatedPanelOptions, "quality">,
    };
  };
  const left = panelFor(-1);
  const right = panelFor(1);

  return (
    <group position={[0, 0, archZ]}>
      <ArchFrame width={frameWidth} height={height} finish={treatment.frameFinish} />
      {treatment.hasBackdrop ? (
        <PanelMesh
          options={{
            width: frameWidth - 0.2,
            height: height - 0.05,
            fullness: treatment.fullness,
            seed: seed + 51,
            z: -0.3,
          }}
          color={treatment.secondaryColor}
          look={look}
        />
      ) : null}
      <PanelMesh options={left.options} color={treatment.color} look={look} />
      <PanelMesh options={right.options} color={treatment.color} look={look} />
      {treatment.hasTiebacks
        ? ([left, right] as const).map((item, index) => (
            <TieBand
              key={index}
              x={tiebackAnchorX(item.x0, panelWidth, index === 0 ? -1 : 1, bundle)}
              y={tieY}
              z={front + amplitude * 0.55 + 0.14}
              bundle={bundle}
              depth={bundleDepth}
              color={treatment.secondaryColor}
            />
          ))
        : null}
      {treatment.hasTopSwag ? (
        <SwagMesh
          options={{
            width: frameWidth * 0.94,
            drop,
            seed: seed + 7,
            topSag: 0.03,
          }}
          color={treatment.color}
          look={look}
          position={[0, headerY + tubeRadius, front + 0.02]}
        />
      ) : null}
      {treatment.hasFloralHeader ? (
        <>
          <FloralArrangement
            spec={{
              kind: "cluster",
              x: -frameWidth / 2 + 0.35,
              y: headerY,
              z: front + 0.1,
              radius: 1.15,
            }}
            color={treatment.secondaryColor}
            seed={seed + 3}
            quality={look.quality}
          />
          <FloralArrangement
            spec={{
              kind: "cluster",
              x: frameWidth / 2,
              y: height * 0.62,
              z: front + 0.12,
              radius: 0.6,
            }}
            color={treatment.secondaryColor}
            seed={seed + 9}
            quality={look.quality}
          />
        </>
      ) : null}
      {treatment.uplightColor ? (
        <UplightRow
          positions={[-frameWidth / 2, frameWidth / 2]}
          color={treatment.uplightColor}
          z={front + 0.9}
          fabricZ={front + amplitude + 0.08}
          washHeight={Math.min(height, 9)}
        />
      ) : null}
      <SelectionFloorLine
        length={frameWidth + 1}
        z={front + 0.7}
        highlight={look.highlight}
      />
    </group>
  );
}

function TreatmentAssembly({
  treatment,
  wall,
  bounds,
  inward,
  selected,
}: {
  treatment: StudioTreatment;
  wall: StudioWallSegment;
  bounds: StudioBounds;
  inward: 1 | -1;
  selected: boolean;
}) {
  const { highlight, quality } = useFabricEditorState(treatment.id, selected);
  const seed = useMemo(() => hashSeed(treatment.id), [treatment.id]);
  const center = getPointAlongWall(
    wall,
    (treatment.anchor.startOffset + treatment.anchor.endOffset) / 2
  );
  const width =
    Math.max(1, treatment.anchor.endOffset - treatment.anchor.startOffset) * SCALE;
  const height = Math.max(1, treatment.height * SCALE);
  const look: Look = {
    fabric: treatment.fabric,
    glow: treatment.uplightColor,
    highlight,
    quality,
  };
  const props: AssemblyProps = { treatment, width, height, look, seed };

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
      {treatment.type === "full_pleated_backdrop" ? <FullBackdrop {...props} /> : null}
      {treatment.type === "side_tieback_panels" ? <SideTiebacks {...props} /> : null}
      {treatment.type === "top_swag_valance" ? <TopSwagValance {...props} /> : null}
      {treatment.type === "layered_swag" ? <LayeredSwag {...props} /> : null}
      {treatment.type === "ceremony_arch" ? <CeremonyArch {...props} /> : null}
    </group>
  );
}

export function StudioTreatments({
  design,
  bounds,
  selection,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
}) {
  const visible = useFabricLayerVisible("treatments");
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
      {design.treatments.map((treatment) => {
        const wall = walls[treatment.anchor.wallIndex];
        if (!wall || treatment.hidden) return null;
        return (
          <TreatmentAssembly
            key={treatment.id}
            treatment={treatment}
            wall={wall}
            bounds={bounds}
            inward={inward}
            selected={
              selection?.kind === "treatment" && selection.id === treatment.id
            }
          />
        );
      })}
    </group>
  );
}
