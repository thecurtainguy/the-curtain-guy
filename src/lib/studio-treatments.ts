import {
  createStudioItemId,
  type StudioDesignJson,
  type StudioTreatment,
  type StudioTreatmentType,
} from "@/data/studio";
import {
  clampTreatmentToWall,
  getWallSegments,
} from "@/lib/studio-geometry";

export type StudioTreatmentPresetKey =
  | "full_backdrop"
  | "side_tiebacks"
  | "entrance_reveal"
  | "top_swag"
  | "ceremony_arch";

export type StudioTreatmentTool = {
  key: string;
  label: string;
  description: string;
  preset?: StudioTreatmentPresetKey;
};

export const STUDIO_TREATMENT_TOOLS: StudioTreatmentTool[] = [
  {
    key: "full_backdrop",
    label: "Full backdrop",
    description: "Pleated fabric wall",
    preset: "full_backdrop",
  },
  {
    key: "side_tiebacks",
    label: "Side tiebacks",
    description: "Paired panels and bands",
    preset: "side_tiebacks",
  },
  {
    key: "entrance_reveal",
    label: "Entrance reveal",
    description: "Open center treatment",
    preset: "entrance_reveal",
  },
  {
    key: "top_swag",
    label: "Top swag",
    description: "Curved valance band",
    preset: "top_swag",
  },
  {
    key: "ceremony_arch",
    label: "Ceremony arch",
    description: "Frame, panels, and swag",
    preset: "ceremony_arch",
  },
  {
    key: "door_window_surround",
    label: "Door/window surround",
    description: "Coming soon",
  },
  {
    key: "layered_swag",
    label: "Layered swag",
    description: "Coming soon",
  },
  {
    key: "floral_header",
    label: "Floral header",
    description: "Coming soon",
  },
  {
    key: "uplights",
    label: "Uplights",
    description: "Coming soon",
  },
];

export const STUDIO_TREATMENT_TYPE_LABELS: Record<
  StudioTreatmentType,
  string
> = {
  full_pleated_backdrop: "Full pleated backdrop",
  side_tieback_panels: "Side panels / entrance reveal",
  top_swag_valance: "Top swag / valance",
  ceremony_arch: "Ceremony arch / frame",
};

const PRESET_TYPES: Record<StudioTreatmentPresetKey, StudioTreatmentType> = {
  full_backdrop: "full_pleated_backdrop",
  side_tiebacks: "side_tieback_panels",
  entrance_reveal: "side_tieback_panels",
  top_swag: "top_swag_valance",
  ceremony_arch: "ceremony_arch",
};

function centeredSpan(wallLength: number, preferredWidth: number) {
  const width = Math.min(wallLength, preferredWidth);
  const startOffset = Math.max(0, (wallLength - width) / 2);
  return { startOffset, endOffset: startOffset + width };
}

export function createStudioTreatment(
  design: StudioDesignJson,
  wallIndex: number,
  preset: StudioTreatmentPresetKey
): StudioTreatment | null {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[wallIndex] ?? walls[0];
  if (!wall) return null;
  const fullWall = preset === "full_backdrop";
  const preferredWidth =
    preset === "ceremony_arch"
      ? 144
      : preset === "entrance_reveal"
        ? 180
        : 240;
  const span = fullWall
    ? { startOffset: 0, endOffset: wall.length }
    : centeredSpan(wall.length, preferredWidth);
  const entrance = preset === "entrance_reveal";
  const sidePanels = preset === "side_tiebacks" || entrance;
  const arch = preset === "ceremony_arch";
  const topSwag = preset === "top_swag";
  const treatment: StudioTreatment = {
    id: createStudioItemId("treatment"),
    type: PRESET_TYPES[preset],
    label:
      preset === "full_backdrop"
        ? `Wall ${wall.index + 1} pleated backdrop`
        : preset === "side_tiebacks"
          ? "Side panels with tiebacks"
          : preset === "entrance_reveal"
            ? "Entrance reveal"
            : preset === "top_swag"
              ? "Top swag valance"
              : "Ceremony arch",
    anchor: {
      kind: "wall",
      wallIndex: wall.index,
      ...span,
    },
    height: Math.min(design.room.wallHeight, arch ? 120 : 144),
    fabric: sidePanels || arch ? "sheer" : "velvet",
    color: sidePanels || arch ? "ivory" : "champagne",
    secondaryColor: "champagne",
    fullness: 2,
    tiebackHeight: 54,
    swagDrop: topSwag || arch ? 24 : 18,
    openingWidth: entrance ? 96 : sidePanels ? 72 : 0,
    hasBackdrop: preset === "side_tiebacks",
    hasTopSwag: arch,
    hasTiebacks: sidePanels || arch,
    hasTopPipe: preset === "full_backdrop",
    hasFloralHeader: false,
    uplightColor: null,
    frameFinish: arch ? "gold" : "black",
    notes: "",
  };
  return clampTreatmentToWall(treatment, design.room.floor);
}

export function replaceStudioTreatment(
  design: StudioDesignJson,
  treatment: StudioTreatment
): StudioDesignJson {
  const next = clampTreatmentToWall(treatment, design.room.floor);
  return {
    ...design,
    treatments: design.treatments.map((item) =>
      item.id === treatment.id ? next : item
    ),
  };
}
