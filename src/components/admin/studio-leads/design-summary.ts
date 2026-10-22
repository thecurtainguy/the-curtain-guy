import {
  CEILING_DRAPE_STYLES,
  CEILING_HUB_DECOR,
  CEILING_LIGHT_STYLES,
  DRAPE_COLORS,
  DRAPE_FABRICS,
  DRAPE_HARDWARE,
  STUDIO_CEILING_FINISHES,
  STUDIO_FLOOR_FINISHES,
  STUDIO_FRAME_FINISHES,
  STUDIO_LIGHTING_MOODS,
  STUDIO_WALL_FINISHES,
  getCeilingDrapes,
  getStudioMaterials,
  getStudioObjectOption,
  type DrapeRunType,
  type StudioDesignJson,
  type StudioDrapeRun,
  type StudioOpening,
  type StudioPoint,
} from "@/data/studio";
import { getOpeningStylePreset } from "@/data/studio-openings";
import { estimateCeilingFabric } from "@/lib/studio-ceiling";
import { getDrapeRunSegments } from "@/lib/studio-door-gaps";
import {
  calculateDrapeLength,
  calculateRoomAreaSquareFeet,
  getStudioBounds,
  getWallSegments,
  inchesToFeetLabel,
} from "@/lib/studio-geometry";
import { STUDIO_TREATMENT_TYPE_LABELS } from "@/lib/studio-treatments";
import type { StudioPlanThumbData } from "./studio-leads-shared";

const RUN_TYPE_LABELS: Record<DrapeRunType, string> = {
  wall_drape: "Full wall",
  partial_drape: "Partial wall",
  backdrop: "Backdrop",
  divider: "Divider",
};

type Swatch = { label: string; hex: string };

function labelOf<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
  fallback = "—"
): string {
  if (!value) return fallback;
  return options.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

function swatch(color: string | null | undefined): Swatch | null {
  if (!color) return null;
  const option = DRAPE_COLORS.find((entry) => entry.value === color);
  return { label: option?.label ?? color, hex: option?.hex ?? "#c9ab78" };
}

function wallLabel(index: number): string {
  return `Wall ${index + 1}`;
}

function fullnessLabel(value: number): string {
  if (!Number.isFinite(value)) return "Standard fullness";
  return `${Math.round(value * 10) / 10}× fullness`;
}

export type StudioRunSummary = {
  id: string;
  label: string;
  typeLabel: string;
  fabric: string;
  color: Swatch | null;
  hungLabel: string;
  heightLabel: string;
  hardware: string;
  fullness: string;
  puddle: boolean;
  doorGaps: boolean;
  gapCount: number;
  uplight: Swatch | null;
  notes: string | null;
};

export type StudioDesignSummary = {
  roomName: string;
  shapeLabel: string;
  widthFt: number;
  depthFt: number;
  areaSqFt: number;
  wallHeightLabel: string;
  drapeLinearFt: number;
  drapeLinearLabel: string;
  seats: number;
  walls: Array<{
    wallIndex: number;
    label: string;
    lengthLabel: string;
    runs: StudioRunSummary[];
  }>;
  treatments: Array<{
    id: string;
    label: string;
    typeLabel: string;
    wallLabel: string;
    widthLabel: string;
    heightLabel: string;
    fabric: string;
    color: Swatch | null;
    secondary: Swatch | null;
    frame: string;
    extras: string[];
  }>;
  ceilings: Array<{
    id: string;
    label: string;
    styleLabel: string;
    fabric: string;
    color: Swatch | null;
    accent: Swatch | null;
    lights: string;
    hub: string;
    yards: number;
  }>;
  openings: Array<{
    id: string;
    label: string;
    styleLabel: string;
    kind: "Door" | "Entrance" | "Window";
    wallLabel: string;
    sizeLabel: string;
  }>;
  objectGroups: Array<{ type: string; label: string; count: number; seats: number }>;
  objectCount: number;
  lighting: {
    mood: string;
    perimeterUplight: Swatch | null;
    uplightFixtures: number;
    chandeliers: number;
    litRuns: number;
  };
  finishes: { floor: string; walls: string; ceiling: string };
  notes: string;
};

function openingKind(opening: StudioOpening): "Door" | "Entrance" | "Window" {
  if (opening.type === "window") return "Window";
  return opening.type === "entrance" ? "Entrance" : "Door";
}

export function summarizeStudioDesign(design: StudioDesignJson): StudioDesignSummary {
  const floor = design.room.floor;
  const bounds = getStudioBounds(floor);
  const segments = getWallSegments(floor);
  const openings = design.openings ?? [];
  const runs = design.drapeRuns ?? [];
  const treatments = design.treatments ?? [];
  const objects = design.objects ?? [];
  const materials = getStudioMaterials(design);
  const drapeInches = calculateDrapeLength(runs, openings);

  const walls = segments
    .map((segment) => ({
      wallIndex: segment.index,
      label: wallLabel(segment.index),
      lengthLabel: inchesToFeetLabel(segment.length),
      runs: runs
        .filter((run) => run.wallIndex === segment.index && !run.hidden)
        .map((run): StudioRunSummary => {
          const pieces = getDrapeRunSegments(run, openings);
          const hung = pieces.reduce((sum, piece) => sum + (piece.end - piece.start), 0);
          return {
            id: run.id,
            label: run.label,
            typeLabel: RUN_TYPE_LABELS[run.type] ?? run.type,
            fabric: labelOf(DRAPE_FABRICS, run.fabric),
            color: swatch(run.color),
            hungLabel: inchesToFeetLabel(hung),
            heightLabel: inchesToFeetLabel(run.height),
            hardware: labelOf(DRAPE_HARDWARE, run.hardware ?? "pipe_and_drape"),
            fullness: fullnessLabel(run.fullness),
            puddle: Boolean(run.puddle),
            doorGaps: run.doorGaps !== false,
            gapCount: Math.max(0, pieces.length - 1),
            uplight: swatch(run.uplightColor),
            notes: run.notes?.trim() || null,
          };
        }),
    }))
    .filter((wall) => wall.runs.length > 0);

  const groups = new Map<string, { type: string; label: string; count: number; seats: number }>();
  for (const object of objects) {
    if (object.hidden) continue;
    const entry = groups.get(object.type) ?? {
      type: object.type,
      label: getStudioObjectOption(object.type)?.label ?? object.type.replaceAll("_", " "),
      count: 0,
      seats: 0,
    };
    entry.count += 1;
    entry.seats += object.seatingCount ?? 0;
    groups.set(object.type, entry);
  }

  return {
    roomName: design.room.name,
    shapeLabel:
      design.room.shape === "l_shape"
        ? "L-shape"
        : design.room.shape === "custom"
          ? "Custom outline"
          : "Rectangle",
    widthFt: Math.round(bounds.width / 12),
    depthFt: Math.round(bounds.depth / 12),
    areaSqFt: Math.round(calculateRoomAreaSquareFeet(floor)),
    wallHeightLabel: inchesToFeetLabel(design.room.wallHeight),
    drapeLinearFt: Math.round(drapeInches / 12),
    drapeLinearLabel: inchesToFeetLabel(drapeInches),
    seats: objects.reduce((sum, object) => sum + (object.seatingCount ?? 0), 0),
    walls,
    treatments: treatments
      .filter((treatment) => !treatment.hidden)
      .map((treatment) => ({
        id: treatment.id,
        label: treatment.label,
        typeLabel: STUDIO_TREATMENT_TYPE_LABELS[treatment.type] ?? treatment.type,
        wallLabel: wallLabel(treatment.anchor.wallIndex),
        widthLabel: inchesToFeetLabel(
          treatment.anchor.endOffset - treatment.anchor.startOffset
        ),
        heightLabel: inchesToFeetLabel(treatment.height),
        fabric: labelOf(DRAPE_FABRICS, treatment.fabric),
        color: swatch(treatment.color),
        secondary:
          treatment.secondaryColor && treatment.secondaryColor !== treatment.color
            ? swatch(treatment.secondaryColor)
            : null,
        frame: labelOf(STUDIO_FRAME_FINISHES, treatment.frameFinish),
        extras: [
          treatment.hasBackdrop ? "Backdrop" : null,
          treatment.hasTopSwag ? "Top swag" : null,
          treatment.hasTiebacks ? "Tiebacks" : null,
          treatment.hasFloralHeader ? "Floral header" : null,
          treatment.uplightColor ? "Uplit" : null,
        ].filter((value): value is string => Boolean(value)),
      })),
    ceilings: getCeilingDrapes(design)
      .filter((drape) => !drape.hidden)
      .map((drape) => ({
        id: drape.id,
        label: drape.label,
        styleLabel: labelOf(CEILING_DRAPE_STYLES, drape.type),
        fabric: labelOf(DRAPE_FABRICS, drape.fabric),
        color: swatch(drape.color),
        accent: swatch(drape.accentColor),
        lights: labelOf(CEILING_LIGHT_STYLES, drape.lights),
        hub: labelOf(CEILING_HUB_DECOR, drape.hubDecor),
        yards: Math.round(estimateCeilingFabric(drape, floor).linearYards * 10) / 10,
      })),
    openings: openings
      .filter((opening) => !opening.hidden)
      .map((opening) => ({
        id: opening.id,
        label: opening.label,
        styleLabel: getOpeningStylePreset(opening).label,
        kind: openingKind(opening),
        wallLabel: wallLabel(opening.wallIndex),
        sizeLabel: opening.openingHeight
          ? `${inchesToFeetLabel(opening.width)} × ${inchesToFeetLabel(opening.openingHeight)}`
          : inchesToFeetLabel(opening.width),
      })),
    objectGroups: [...groups.values()].sort((a, b) => b.count - a.count),
    objectCount: objects.filter((object) => !object.hidden).length,
    lighting: {
      mood: labelOf(STUDIO_LIGHTING_MOODS, materials.lighting),
      perimeterUplight: swatch(materials.uplightColor),
      uplightFixtures: objects.filter((object) => object.type === "uplight").length,
      chandeliers: objects.filter((object) => object.type === "chandelier").length,
      litRuns: runs.filter((run) => Boolean(run.uplightColor)).length,
    },
    finishes: {
      floor: labelOf(STUDIO_FLOOR_FINISHES, materials.floor),
      walls: labelOf(STUDIO_WALL_FINISHES, materials.walls),
      ceiling: labelOf(STUDIO_CEILING_FINISHES, materials.ceiling ?? "auto"),
    },
    notes: design.notes?.trim() ?? "",
  };
}

function isPoint(value: unknown): value is StudioPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    Number.isFinite((value as StudioPoint).x) &&
    Number.isFinite((value as StudioPoint).z)
  );
}

/**
 * Builds the compact plan payload from whatever subset of design_json was
 * loaded. Tolerates partial / legacy shapes so a bad row never breaks a list.
 */
export function toPlanThumbData(input: {
  floor: unknown;
  drapeRuns: unknown;
  openings: unknown;
}): StudioPlanThumbData | null {
  if (!Array.isArray(input.floor)) return null;
  const floor = input.floor.filter(isPoint).map((point) => ({ x: point.x, z: point.z }));
  if (floor.length < 3) return null;
  const openings = (Array.isArray(input.openings) ? input.openings : []).filter(
    (opening): opening is StudioOpening =>
      typeof opening === "object" &&
      opening !== null &&
      Number.isInteger((opening as StudioOpening).wallIndex) &&
      Number.isFinite((opening as StudioOpening).offset) &&
      Number.isFinite((opening as StudioOpening).width)
  );
  const runs = (Array.isArray(input.drapeRuns) ? input.drapeRuns : []).filter(
    (run): run is StudioDrapeRun =>
      typeof run === "object" &&
      run !== null &&
      Number.isInteger((run as StudioDrapeRun).wallIndex) &&
      Number.isFinite((run as StudioDrapeRun).startOffset) &&
      Number.isFinite((run as StudioDrapeRun).endOffset) &&
      !(run as StudioDrapeRun).hidden
  );
  return {
    floor,
    runs: runs.map((run) => ({
      wallIndex: run.wallIndex,
      color: swatch(run.color)?.hex ?? "#c9ab78",
      segments: getDrapeRunSegments(run, openings),
    })),
    openings: openings
      .filter((opening) => !opening.hidden)
      .map((opening) => ({
        wallIndex: opening.wallIndex,
        offset: opening.offset,
        width: opening.width,
        type: opening.type,
      })),
  };
}
