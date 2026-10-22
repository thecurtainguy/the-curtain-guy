/**
 * Builds every fabric surface of one ceiling design in world space (feet),
 * merged into one geometry per colour so a design costs one draw call per
 * material. Resolution is scaled down to a per-quality vertex budget so very
 * large designs (48-spoke starbursts in big rooms) stay interactive.
 */
import type { DrapeColor, StudioCeilingDrape, StudioPoint } from "@/data/studio";
import { getCeilingLayout, type CeilingLayout } from "@/lib/studio-ceiling";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { FabricQuality } from "../../fabric/materials";
import { hashSeed } from "../../texture-utils";
import { SCALE } from "../frame";
import { buildCascade, estimateCascadeVertices } from "./cascades";
import { buildPerimeterSwags, buildValance } from "./edges";
import {
  buildRadialWeb,
  RADIAL_GATHER_RADIUS_IN,
  radialResolution,
} from "./radial";
import { buildRunPanel, estimateRunVertices, type PanelKind } from "./runs";
import {
  createGatherTie,
  dropY,
  placeAlong,
  worldX,
  worldZ,
  type CeilingFrame,
} from "./surface";

const VERTEX_BUDGET: Record<FabricQuality, number> = {
  draft: 60_000,
  high: 230_000,
  ultra: 520_000,
};

export type CeilingFabricPiece = {
  color: DrapeColor;
  geometry: THREE.BufferGeometry;
};

export type CeilingHub = {
  /** World position of the fabric gather, feet. */
  x: number;
  y: number;
  z: number;
  /** Room span (feet) for scaling hub décor. */
  span: number;
  /** Feet the fabric falls per foot away from the hub (negative = rises). */
  slope: number;
};

export type CeilingFabricBuild = {
  pieces: CeilingFabricPiece[];
  hub: CeilingHub | null;
  /** Top of the room interior (just under the ceiling), feet. */
  ceilingY: number;
};

type GeometryFields = Pick<
  StudioCeilingDrape,
  | "id"
  | "type"
  | "coverage"
  | "x"
  | "z"
  | "width"
  | "depth"
  | "rotation"
  | "inset"
  | "hubX"
  | "hubZ"
  | "edgeDrop"
  | "hubDrop"
  | "sag"
  | "count"
  | "panelWidth"
  | "scallops"
  | "color"
  | "accentColor"
  | "fullness"
  | "perimeterValance"
  | "hubDecor"
>;

/** Only the fields that change fabric geometry, as a stable memo key. */
export function ceilingGeometryKey(drape: StudioCeilingDrape) {
  const fields: GeometryFields = {
    id: drape.id,
    type: drape.type,
    coverage: drape.coverage,
    x: drape.x,
    z: drape.z,
    width: drape.width,
    depth: drape.depth,
    rotation: drape.rotation,
    inset: drape.inset,
    hubX: drape.hubX,
    hubZ: drape.hubZ,
    edgeDrop: drape.edgeDrop,
    hubDrop: drape.hubDrop,
    sag: drape.sag,
    count: drape.count,
    panelWidth: drape.panelWidth,
    scallops: drape.scallops,
    color: drape.color,
    accentColor: drape.accentColor,
    fullness: drape.fullness,
    perimeterValance: drape.perimeterValance,
    hubDecor: drape.hubDecor,
  };
  return JSON.stringify(fields);
}

/** Design rebuilt from a geometry key; non-geometry fields are neutral. */
export function ceilingDrapeFromKey(key: string): StudioCeilingDrape {
  const fields = JSON.parse(key) as GeometryFields;
  return {
    ...fields,
    label: "",
    notes: "",
    fabric: "chiffon",
    lights: "none",
    lightColor: "ivory",
    uplightColor: null,
  };
}

function panelKind(drape: StudioCeilingDrape): PanelKind {
  switch (drape.type) {
    case "starburst":
      return "spoke";
    case "billow_rows":
      return "billow";
    case "stretch_panels":
      return "stretch";
    default:
      return "swag";
  }
}

function estimateVertices(drape: StudioCeilingDrape, layout: CeilingLayout, quality: FabricQuality) {
  switch (drape.type) {
    case "canopy":
    case "tent": {
      const res = radialResolution(layout, drape, { quality, density: 1 });
      return (res.perimeterFt * res.columnsPerFoot + layout.perimeter.length * 2) * (res.rows + 1);
    }
    case "cascades":
      return layout.drops.length * estimateCascadeVertices(drape, quality);
    case "perimeter_swag":
      return layout.runs.length * 4000;
    default: {
      const kind = panelKind(drape);
      return layout.runs.reduce(
        (total, run) => total + estimateRunVertices(run, drape.fullness, kind, quality),
        0
      );
    }
  }
}

function roomSpanFt(outline: StudioPoint[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return Math.max(1, Math.min(maxX - minX, maxZ - minZ) * SCALE);
}

export function buildCeilingFabric(
  drape: StudioCeilingDrape,
  floor: StudioPoint[],
  wallHeight: number,
  centerX: number,
  centerZ: number,
  quality: FabricQuality
): CeilingFabricBuild {
  const layout = getCeilingLayout(drape, floor);
  const estimate = estimateVertices(drape, layout, quality);
  const density = Math.min(1, Math.sqrt(VERTEX_BUDGET[quality] / Math.max(1, estimate)));
  const frame: CeilingFrame = { centerX, centerZ, wallHeight, quality, density };
  const seed = hashSeed(drape.id);
  const parts = new Map<DrapeColor, THREE.BufferGeometry[]>();
  const add = (color: DrapeColor, geometry: THREE.BufferGeometry | null) => {
    if (!geometry) return;
    const list = parts.get(color) ?? [];
    list.push(geometry);
    parts.set(color, list);
  };

  let hub: CeilingHub | null = null;
  if (layout.hub) {
    const center = layout.hub;
    const reaches = layout.runs.map((run) => {
      const end = run.points[run.points.length - 1];
      return Math.hypot(end.x - center.x, end.z - center.z);
    });
    const reach = reaches.length ? reaches.reduce((a, b) => a + b, 0) / reaches.length : 1;
    const nearHub = drape.sag * (drape.type === "starburst" ? 1 : 0.25) * 4;
    hub = {
      x: worldX(frame, center.x),
      y: dropY(frame, drape.hubDrop),
      z: worldZ(frame, center.z),
      span: roomSpanFt(layout.outline),
      slope: (drape.edgeDrop - drape.hubDrop + nearHub) / Math.max(12, reach),
    };
  }

  switch (drape.type) {
    case "canopy":
    case "tent":
      add(drape.color, buildRadialWeb(drape, layout, frame, seed));
      break;
    case "perimeter_swag":
      for (const piece of buildPerimeterSwags(drape, layout.runs, layout.outline, frame, seed).byColor) {
        add(piece.color, piece.geometry);
      }
      break;
    case "cascades":
      layout.drops.forEach((point, index) => {
        for (const geometry of buildCascade(drape, point, frame, seed + index * 7919)) {
          add(drape.color, geometry);
        }
      });
      break;
    default: {
      const kind = panelKind(drape);
      layout.runs.forEach((run, index) => {
        const offsetIn =
          kind === "spoke"
            ? (index % 2) * 0.7
            : run.key.startsWith("cross-b")
              ? 1.6
              : 0;
        const panel = buildRunPanel({
          drape,
          run,
          frame,
          kind,
          seed: seed + index * 7919,
          offsetIn,
        });
        if (!panel) return;
        add(run.color, panel.geometry);
        panel.trims.forEach((trim) => add(run.color, trim));
      });
      break;
    }
  }

  // Fabric gather where radial panels meet the hub.
  if (hub && (drape.type === "starburst" || drape.hubDecor !== "medallion")) {
    const radius =
      drape.type === "starburst"
        ? Math.min(0.42, Math.max(0.2, drape.panelWidth * 0.08 * SCALE + 0.12))
        : RADIAL_GATHER_RADIUS_IN * SCALE + 0.06;
    const ring = createGatherTie(radius, 0.32, quality);
    add(
      drape.color,
      placeAlong(ring, new THREE.Vector3(hub.x, hub.y - 0.06, hub.z), new THREE.Vector3(0, 1, 0))
    );
  }

  if (drape.perimeterValance && drape.type !== "perimeter_swag") {
    add(drape.color, buildValance(drape, layout.outline, frame, seed ^ 0x9e3779b9));
  }

  const pieces: CeilingFabricPiece[] = [];
  parts.forEach((geometries, color) => {
    const merged =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (merged && merged !== geometries[0]) geometries.forEach((geometry) => geometry.dispose());
    if (!merged) {
      geometries.forEach((geometry) => {
        geometry.computeBoundingSphere();
        pieces.push({ color, geometry });
      });
      return;
    }
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    pieces.push({ color, geometry: merged });
  });

  return { pieces, hub, ceilingY: wallHeight * SCALE };
}

export function disposeCeilingFabric(build: CeilingFabricBuild) {
  build.pieces.forEach((piece) => piece.geometry.dispose());
}
