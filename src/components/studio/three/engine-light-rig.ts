/**
 * Pure placement math for the Studio's dynamic lighting: perimeter uplights,
 * drape / treatment uplights, uplight objects and chandeliers, plus the
 * light-budget allocator that clusters fixtures onto a limited pool of real
 * SpotLights. Inputs are design inches; outputs are world feet.
 */
import {
  getDrapeColorHex,
  getStudioMaterials,
  type StudioDesignJson,
  type StudioObject,
} from "@/data/studio";
import {
  clampOpeningToWall,
  getPointAlongWall,
  getWallSegments,
  type StudioBounds,
  type StudioWallSegment,
} from "@/lib/studio-geometry";
import * as THREE from "three";
import type { StudioLayerKey } from "../editor/studio-editor-context";

const SCALE = 1 / 12;

/** Feet in front of the wall centreline where each lit surface sits. */
export const WALL_WASH_OFFSET = 0.1;
export const DRAPE_WASH_OFFSET = 0.62;
export const TREATMENT_WASH_OFFSET = 0.68;
/** Feet from the wall centreline to the uplight can. */
const PERIMETER_CAN_OFFSET = 1.25;
const DRAPE_CAN_OFFSET = 1.3;
const TREATMENT_CAN_OFFSET = 1.45;
/** Object uplights within this many inches of a wall wash that wall. */
const OBJECT_WALL_REACH = 60;

export type Vec3 = [number, number, number];

export type StudioWash = {
  position: Vec3;
  /** Yaw so the plane's +Z normal faces into the room. */
  rotationY: number;
  width: number;
  height: number;
};

export type StudioUplightSource = "object" | "treatment" | "drape" | "perimeter";

export type StudioUplightFixture = {
  key: string;
  source: StudioUplightSource;
  groupKey: string;
  /** Emitted light colour, `#rrggbb`. */
  color: string;
  /** Can position on the floor. */
  position: Vec3;
  aim: Vec3;
  /** Yaw so a can's local +Z faces the lit surface. */
  yaw: number;
  wash: StudioWash | null;
  /** False when another layer (objects) already renders the fixture body. */
  renderCan: boolean;
  /** Fixture spacing along the surface in feet. */
  spacing: number;
  /** Distance along the group's line, for contiguous clustering. */
  along: number;
};

export type StudioPracticalLight = {
  key: string;
  /** Raw light colour before mood warmth is blended in. */
  color: string;
  position: Vec3;
  /** Fixture diameter in feet. */
  size: number;
};

export type StudioSpotAssignment = {
  key: string;
  color: string;
  position: Vec3;
  target: Vec3;
  angle: number;
  penumbra: number;
  /** Relative strength; scene code multiplies by candela and mood. */
  strength: number;
};

const lightHexCache = new Map<string, string>();

/**
 * Converts a drape palette colour (a fabric swatch) into a believable emitted
 * LED colour: neutrals become tinted whites, hues are saturated and lifted.
 */
export function getStudioLightHex(color: string): string {
  const cached = lightHexCache.get(color);
  if (cached) return cached;
  const swatch = new THREE.Color(getDrapeColorHex(color));
  const hsl = { h: 0, s: 0, l: 0 };
  swatch.getHSL(hsl);
  const max = Math.max(swatch.r, swatch.g, swatch.b);
  const min = Math.min(swatch.r, swatch.g, swatch.b);
  const chroma = max - min;
  const light = new THREE.Color();
  if (hsl.l < 0.12 && chroma < 0.08) {
    light.setHSL(hsl.h, 0.1, 0.16);
  } else if (chroma < 0.12) {
    light.setHSL(hsl.h, Math.min(hsl.s, 0.55), 0.38 + hsl.l * 0.46);
  } else {
    light.setHSL(
      hsl.h,
      Math.min(1, hsl.s * 1.35 + 0.18),
      Math.min(0.64, Math.max(0.52, hsl.l))
    );
  }
  const hex = `#${light.getHexString()}`;
  lightHexCache.set(color, hex);
  return hex;
}

/** +1 when the floor polygon winds so the room is on each wall's local +Z. */
export function getInteriorSign(floor: StudioDesignJson["room"]["floor"]): 1 | -1 {
  let doubledArea = 0;
  for (let index = 0; index < floor.length; index += 1) {
    const current = floor[index];
    const next = floor[(index + 1) % floor.length];
    doubledArea += current.x * next.z - next.x * current.z;
  }
  return doubledArea >= 0 ? 1 : -1;
}

/** Unit interior normal of a wall in plan space (x, z). */
export function getWallInteriorNormal(
  wall: Pick<StudioWallSegment, "angle">,
  sign: 1 | -1
): { x: number; z: number } {
  return { x: -Math.sin(wall.angle) * sign, z: Math.cos(wall.angle) * sign };
}

type WallFrame = {
  wall: StudioWallSegment;
  normal: { x: number; z: number };
  /** World point (feet) `inward` feet in front of the wall at `offset` inches. */
  at: (offset: number, inward: number, y: number) => Vec3;
  /** Yaw so a plane's +Z faces into the room. */
  faceRoom: number;
  /** Yaw so a can's +Z faces the wall. */
  faceWall: number;
};

function createWallFrame(
  wall: StudioWallSegment,
  sign: 1 | -1,
  bounds: StudioBounds
): WallFrame {
  const normal = getWallInteriorNormal(wall, sign);
  return {
    wall,
    normal,
    at(offset, inward, y) {
      const point = getPointAlongWall(wall, offset);
      return [
        (point.x - bounds.centerX) * SCALE + normal.x * inward,
        y,
        (point.z - bounds.centerZ) * SCALE + normal.z * inward,
      ];
    },
    faceRoom: Math.atan2(normal.x, normal.z),
    faceWall: Math.atan2(-normal.x, -normal.z),
  };
}

function evenOffsets(start: number, end: number, count: number): number[] {
  const span = end - start;
  return Array.from(
    { length: count },
    (_, index) => start + ((index + 0.5) * span) / count
  );
}

function treatmentOffsets(start: number, end: number): number[] {
  const spanFeet = (end - start) * SCALE;
  if (spanFeet < 4) return [(start + end) / 2];
  if (spanFeet <= 10) {
    return [start + (end - start) * 0.18, start + (end - start) * 0.82];
  }
  return evenOffsets(start, end, Math.max(2, Math.round(spanFeet / 5)));
}

type BuildInput = {
  design: StudioDesignJson;
  bounds: StudioBounds;
  layers: Record<StudioLayerKey, boolean>;
};

export type StudioLightRig = {
  fixtures: StudioUplightFixture[];
  practicals: StudioPracticalLight[];
};

export function buildStudioLightRig({
  design,
  bounds,
  layers,
}: BuildInput): StudioLightRig {
  const floor = design.room.floor;
  const walls = getWallSegments(floor);
  const sign = getInteriorSign(floor);
  const frames = walls.map((wall) => createWallFrame(wall, sign, bounds));
  const wallHeight = design.room.wallHeight * SCALE;
  const materials = getStudioMaterials(design);
  const fixtures: StudioUplightFixture[] = [];

  const visibleRuns = layers.drapes
    ? design.drapeRuns.filter((run) => !run.hidden)
    : [];

  /* Drape runs with their own uplighting */
  for (const run of visibleRuns) {
    const frame = frames[run.wallIndex];
    if (!frame || !run.uplightColor) continue;
    const color = getStudioLightHex(run.uplightColor);
    const start = Math.max(0, run.startOffset);
    const end = Math.min(frame.wall.length, run.endOffset);
    if (end <= start) continue;
    const spanFeet = (end - start) * SCALE;
    const count = Math.max(1, Math.round(spanFeet / 6));
    const spacing = spanFeet / count;
    const surfaceHeight = Math.min(run.height, design.room.wallHeight) * SCALE;
    evenOffsets(start, end, count).forEach((offset, index) => {
      fixtures.push({
        key: `drape:${run.id}:${index}`,
        source: "drape",
        groupKey: `drape:${run.id}`,
        color,
        position: frame.at(offset, DRAPE_CAN_OFFSET, 0),
        aim: frame.at(offset, DRAPE_WASH_OFFSET - 0.2, surfaceHeight * 0.62),
        yaw: frame.faceWall,
        wash: {
          position: frame.at(offset, DRAPE_WASH_OFFSET, (surfaceHeight * 0.96) / 2),
          rotationY: frame.faceRoom,
          width: Math.min(spacing * 1.4, 9),
          height: surfaceHeight * 0.96,
        },
        renderCan: true,
        spacing,
        along: offset * SCALE,
      });
    });
  }

  /* Treatments with uplighting */
  if (layers.treatments) {
    for (const treatment of design.treatments) {
      if (treatment.hidden || !treatment.uplightColor) continue;
      const frame = frames[treatment.anchor.wallIndex];
      if (!frame) continue;
      const color = getStudioLightHex(treatment.uplightColor);
      const start = Math.max(0, treatment.anchor.startOffset);
      const end = Math.min(frame.wall.length, treatment.anchor.endOffset);
      if (end <= start) continue;
      const offsets = treatmentOffsets(start, end);
      const spacing = ((end - start) * SCALE) / offsets.length;
      const surfaceHeight =
        Math.min(treatment.height, design.room.wallHeight) * SCALE;
      offsets.forEach((offset, index) => {
        fixtures.push({
          key: `treatment:${treatment.id}:${index}`,
          source: "treatment",
          groupKey: `treatment:${treatment.id}`,
          color,
          position: frame.at(offset, TREATMENT_CAN_OFFSET, 0),
          aim: frame.at(offset, TREATMENT_WASH_OFFSET - 0.2, surfaceHeight * 0.6),
          yaw: frame.faceWall,
          wash: {
            position: frame.at(
              offset,
              TREATMENT_WASH_OFFSET,
              (surfaceHeight * 0.96) / 2
            ),
            rotationY: frame.faceRoom,
            width: Math.min(Math.max(spacing * 1.3, 4), 8),
            height: surfaceHeight * 0.96,
          },
          renderCan: true,
          spacing,
          along: offset * SCALE,
        });
      });
    }
  }

  /* Perimeter uplighting along every wall */
  if (materials.uplightColor) {
    const color = getStudioLightHex(materials.uplightColor);
    const blockedOpenings = design.openings
      .filter((opening) => !opening.hidden)
      .map((opening) => clampOpeningToWall(opening, floor));
    for (const frame of frames) {
      const { wall } = frame;
      const lengthFeet = wall.length * SCALE;
      if (lengthFeet < 2) continue;
      const count = Math.max(1, Math.round(lengthFeet / 9));
      const spacing = lengthFeet / count;
      evenOffsets(0, wall.length, count).forEach((offset, index) => {
        const nearOpening = blockedOpenings.some(
          (opening) =>
            opening.wallIndex === wall.index &&
            offset > opening.offset - 12 &&
            offset < opening.offset + opening.width + 12
        );
        if (nearOpening) return;
        const run = visibleRuns.find(
          (candidate) =>
            candidate.wallIndex === wall.index &&
            offset >= candidate.startOffset &&
            offset <= candidate.endOffset
        );
        if (run?.uplightColor) return;
        const surfaceOffset = run ? DRAPE_WASH_OFFSET : WALL_WASH_OFFSET;
        const washHeight = wallHeight * 0.94;
        fixtures.push({
          key: `perimeter:${wall.index}:${index}`,
          source: "perimeter",
          groupKey: `perimeter:${wall.index}`,
          color,
          position: frame.at(
            offset,
            PERIMETER_CAN_OFFSET + (run ? 0.15 : 0),
            0
          ),
          aim: frame.at(offset, surfaceOffset - 0.1, wallHeight * 0.58),
          yaw: frame.faceWall,
          wash: {
            position: frame.at(offset, surfaceOffset, washHeight / 2),
            rotationY: frame.faceRoom,
            width: Math.min(spacing * 1.35, 11),
            height: washHeight,
          },
          renderCan: true,
          spacing,
          along: offset * SCALE,
        });
      });
    }
  }

  const practicals: StudioPracticalLight[] = [];
  if (layers.objects) {
    for (const object of design.objects) {
      if (object.hidden) continue;
      if (object.type === "uplight") {
        fixtures.push(
          buildObjectUplight(object, frames, bounds, wallHeight, design)
        );
      } else if (object.type === "chandelier") {
        const elevation = object.elevation ?? 96;
        practicals.push({
          key: `chandelier:${object.id}`,
          color: getStudioLightHex(object.lightColor ?? "champagne"),
          position: [
            (object.x - bounds.centerX) * SCALE,
            (elevation + object.height * 0.42) * SCALE,
            (object.z - bounds.centerZ) * SCALE,
          ],
          size: Math.max(object.width, object.depth) * SCALE,
        });
      }
    }
  }

  return { fixtures, practicals };
}

function buildObjectUplight(
  object: StudioObject,
  frames: WallFrame[],
  bounds: StudioBounds,
  wallHeight: number,
  design: StudioDesignJson
): StudioUplightFixture {
  const color = getStudioLightHex(object.lightColor ?? "gold");
  const x = (object.x - bounds.centerX) * SCALE;
  const z = (object.z - bounds.centerZ) * SCALE;
  const y = (object.elevation ?? 0) * SCALE;
  let nearest: { frame: WallFrame; offset: number; distance: number } | null =
    null;
  for (const frame of frames) {
    const { wall } = frame;
    if (wall.length <= 0) continue;
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const t = Math.min(
      1,
      Math.max(
        0,
        ((object.x - wall.start.x) * dx + (object.z - wall.start.z) * dz) /
          (wall.length * wall.length)
      )
    );
    const px = wall.start.x + dx * t;
    const pz = wall.start.z + dz * t;
    const distance = Math.hypot(object.x - px, object.z - pz);
    const inFront =
      (object.x - px) * frame.normal.x + (object.z - pz) * frame.normal.z >= 0;
    if (inFront && distance <= OBJECT_WALL_REACH && (!nearest || distance < nearest.distance)) {
      nearest = { frame, offset: t * wall.length, distance };
    }
  }

  if (!nearest) {
    return {
      key: `object:${object.id}`,
      source: "object",
      groupKey: `object:${object.id}`,
      color,
      position: [x, y, z],
      aim: [x, Math.max(y + 4, wallHeight), z],
      yaw: 0,
      wash: null,
      renderCan: false,
      spacing: 4,
      along: 0,
    };
  }

  const { frame, offset } = nearest;
  const covered = design.drapeRuns.some(
    (run) =>
      !run.hidden &&
      run.wallIndex === frame.wall.index &&
      offset >= run.startOffset &&
      offset <= run.endOffset
  );
  const surface = covered ? DRAPE_WASH_OFFSET : WALL_WASH_OFFSET;
  const washHeight = wallHeight * 0.9;
  return {
    key: `object:${object.id}`,
    source: "object",
    groupKey: `object:${object.id}`,
    color,
    position: [x, y, z],
    aim: frame.at(offset, surface - 0.1, wallHeight * 0.6),
    yaw: frame.faceWall,
    wash: {
      position: frame.at(offset, surface, washHeight / 2),
      rotationY: frame.faceRoom,
      width: Math.min(5 + nearest.distance * SCALE * 0.8, 9),
      height: washHeight,
    },
    renderCan: false,
    spacing: 4,
    along: 0,
  };
}

const SOURCE_PRIORITY: Record<StudioUplightSource, number> = {
  object: 0,
  treatment: 1,
  drape: 2,
  perimeter: 3,
};

/**
 * Spreads `budget` real SpotLights across fixture groups. Every group gets one
 * light before any group gets two; extra lights go to the most crowded groups.
 * A light serving several fixtures sits at their centre with a wider beam.
 */
export function allocateStudioSpots(
  fixtures: StudioUplightFixture[],
  budget: number
): StudioSpotAssignment[] {
  if (budget <= 0 || fixtures.length === 0) return [];
  const groups = new Map<string, StudioUplightFixture[]>();
  for (const fixture of fixtures) {
    const group = groups.get(fixture.groupKey);
    if (group) group.push(fixture);
    else groups.set(fixture.groupKey, [fixture]);
  }
  const ordered = [...groups.values()]
    .map((members) => ({
      members: [...members].sort((a, b) => a.along - b.along),
      spots: 0,
    }))
    .sort(
      (a, b) =>
        SOURCE_PRIORITY[a.members[0].source] -
          SOURCE_PRIORITY[b.members[0].source] ||
        b.members.length - a.members.length
    );

  let remaining = budget;
  for (const group of ordered) {
    if (remaining <= 0) break;
    group.spots = 1;
    remaining -= 1;
  }
  while (remaining > 0) {
    let best: (typeof ordered)[number] | null = null;
    for (const group of ordered) {
      if (group.spots === 0 || group.spots >= group.members.length) continue;
      if (
        !best ||
        group.members.length / group.spots > best.members.length / best.spots
      ) {
        best = group;
      }
    }
    if (!best) break;
    best.spots += 1;
    remaining -= 1;
  }

  const assignments: StudioSpotAssignment[] = [];
  for (const group of ordered) {
    const count = group.members.length;
    for (let index = 0; index < group.spots; index += 1) {
      const chunk = group.members.slice(
        Math.floor((index * count) / group.spots),
        Math.floor(((index + 1) * count) / group.spots)
      );
      if (chunk.length === 0) continue;
      const position = averageVec(chunk.map((fixture) => fixture.position));
      const target = averageVec(chunk.map((fixture) => fixture.aim));
      const first = chunk[0];
      const last = chunk[chunk.length - 1];
      const freestanding = first.source === "object" && !first.wash;
      let strength = Math.pow(chunk.length, 0.72);
      let angle = freestanding ? 0.46 : 0.56;
      let lift = 0.35;
      if (chunk.length > 1 && first.wash) {
        /* One light standing in for several cans: back it off the wall so
           its beam spreads across the whole span instead of hot-spotting
           the gap between two cans. */
        const span =
          Math.hypot(
            last.position[0] - first.position[0],
            last.position[2] - first.position[2]
          ) + first.spacing;
        const towardX = target[0] - position[0];
        const towardZ = target[2] - position[2];
        const towardLength = Math.hypot(towardX, towardZ) || 1;
        angle = 0.72;
        const pullback = Math.min(
          16,
          Math.max(0, (span * 0.42) / Math.tan(angle) - towardLength)
        );
        const before = Math.hypot(towardLength, target[1] - position[1]);
        position[0] -= (towardX / towardLength) * pullback;
        position[2] -= (towardZ / towardLength) * pullback;
        const after = Math.hypot(
          towardLength + pullback,
          target[1] - position[1]
        );
        strength *= Math.min(1.7, (after / before) ** 2);
        /* Below the floor plane the floor faces away from it, so the wide
           beam lights the wall without spilling a pool mid-room. */
        if (pullback > 0) lift = -1.2;
      }
      assignments.push({
        key: `${first.key}~${chunk.length}`,
        color: first.color,
        position: [position[0], position[1] + lift, position[2]],
        target,
        angle,
        penumbra: 0.9,
        strength,
      });
    }
  }
  return assignments;
}

function averageVec(points: Vec3[]): Vec3 {
  const sum: Vec3 = [0, 0, 0];
  for (const point of points) {
    sum[0] += point[0];
    sum[1] += point[1];
    sum[2] += point[2];
  }
  return [
    sum[0] / points.length,
    sum[1] / points.length,
    sum[2] / points.length,
  ];
}

/** Rounds a light count up to a bucket so shader recompiles stay rare. */
export function bucketLightCount(count: number, step: number, max: number): number {
  if (count <= 0) return 0;
  return Math.min(max, Math.ceil(count / step) * step);
}
