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
  | "ceremony_arch"
  | "door_window_surround"
  | "layered_swag"
  | "floral_header"
  | "uplights";

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
    description: "Scalloped valance with cascades",
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
    description: "Frames an opening with panels and swag",
    preset: "door_window_surround",
  },
  {
    key: "layered_swag",
    label: "Layered swag",
    description: "Two-tone scallops with jabot tails",
    preset: "layered_swag",
  },
  {
    key: "floral_header",
    label: "Floral header",
    description: "Backdrop crowned with a floral garland",
    preset: "floral_header",
  },
  {
    key: "uplights",
    label: "Uplights",
    description: "Backdrop washed in coloured light",
    preset: "uplights",
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
  layered_swag: "Layered swag",
};

const PRESET_TYPES: Record<StudioTreatmentPresetKey, StudioTreatmentType> = {
  full_backdrop: "full_pleated_backdrop",
  side_tiebacks: "side_tieback_panels",
  entrance_reveal: "side_tieback_panels",
  top_swag: "top_swag_valance",
  ceremony_arch: "ceremony_arch",
  door_window_surround: "side_tieback_panels",
  layered_swag: "layered_swag",
  floral_header: "full_pleated_backdrop",
  uplights: "full_pleated_backdrop",
};

const PRESET_LABELS: Record<StudioTreatmentPresetKey, string> = {
  full_backdrop: "Pleated backdrop",
  side_tiebacks: "Side panels with tiebacks",
  entrance_reveal: "Entrance reveal",
  top_swag: "Top swag valance",
  ceremony_arch: "Ceremony arch",
  door_window_surround: "Opening surround",
  layered_swag: "Layered swag",
  floral_header: "Floral header backdrop",
  uplights: "Uplit backdrop",
};

const PREFERRED_WIDTH: Partial<Record<StudioTreatmentPresetKey, number>> = {
  ceremony_arch: 144,
  entrance_reveal: 180,
  door_window_surround: 168,
  layered_swag: 192,
};

function centeredSpan(wallLength: number, preferredWidth: number) {
  const width = Math.min(wallLength, preferredWidth);
  const startOffset = Math.max(0, (wallLength - width) / 2);
  return { startOffset, endOffset: startOffset + width };
}

/** Span framing an opening with ~4′ of panel on each side. */
function surroundSpan(
  design: StudioDesignJson,
  wallIndex: number,
  wallLength: number
) {
  const opening = design.openings.find(
    (item) => item.wallIndex === wallIndex && !item.hidden
  );
  if (!opening) return null;
  const panel = 48;
  const startOffset = Math.max(0, opening.offset - panel);
  const endOffset = Math.min(wallLength, opening.offset + opening.width + panel);
  const top =
    (opening.sillHeight ?? (opening.type === "window" ? 36 : 0)) +
    (opening.openingHeight ?? (opening.type === "window" ? 60 : 84));
  return {
    span: { startOffset, endOffset },
    openingWidth: opening.width + 12,
    height: top + 24,
  };
}

export function createStudioTreatment(
  design: StudioDesignJson,
  wallIndex: number,
  preset: StudioTreatmentPresetKey
): StudioTreatment | null {
  const walls = getWallSegments(design.room.floor);
  const wall = walls[wallIndex] ?? walls[0];
  if (!wall) return null;
  const wallHeight = design.room.wallHeight;
  const surround =
    preset === "door_window_surround"
      ? surroundSpan(design, wall.index, wall.length)
      : null;
  const span =
    preset === "full_backdrop"
      ? { startOffset: 0, endOffset: wall.length }
      : (surround?.span ??
        centeredSpan(wall.length, PREFERRED_WIDTH[preset] ?? 240));

  const entrance = preset === "entrance_reveal";
  const surroundPreset = preset === "door_window_surround";
  const sidePanels = preset === "side_tiebacks" || entrance || surroundPreset;
  const arch = preset === "ceremony_arch";
  const swagPreset = preset === "top_swag" || preset === "layered_swag";
  const backdropPreset =
    preset === "full_backdrop" ||
    preset === "floral_header" ||
    preset === "uplights";

  const base: StudioTreatment = {
    id: createStudioItemId("treatment"),
    type: PRESET_TYPES[preset],
    label:
      preset === "full_backdrop"
        ? `Wall ${wall.index + 1} pleated backdrop`
        : PRESET_LABELS[preset],
    anchor: {
      kind: "wall",
      wallIndex: wall.index,
      ...span,
    },
    height: Math.min(wallHeight, arch ? 120 : 144),
    fabric: sidePanels || arch ? "sheer" : "velvet",
    color: sidePanels || arch ? "ivory" : "champagne",
    secondaryColor: "champagne",
    fullness: 2,
    tiebackHeight: 54,
    swagDrop: swagPreset || arch ? 24 : 18,
    openingWidth: entrance ? 96 : sidePanels ? 72 : 0,
    hasBackdrop: preset === "side_tiebacks",
    hasTopSwag: arch || surroundPreset,
    hasTiebacks: sidePanels || arch,
    hasTopPipe: backdropPreset,
    hasFloralHeader: false,
    uplightColor: null,
    frameFinish: arch ? "gold" : "black",
    notes: "",
  };

  const overrides: Partial<StudioTreatment> =
    preset === "top_swag"
      ? { swagCount: 3, fabric: "satin", color: "ivory", secondaryColor: "gold", height: Math.min(wallHeight, 120) }
      : preset === "layered_swag"
        ? {
            swagCount: 3,
            fabric: "chiffon",
            color: "ivory",
            secondaryColor: "champagne",
            height: Math.min(wallHeight, 120),
            swagDrop: 26,
          }
        : surroundPreset
          ? {
              fabric: "chiffon",
              color: "ivory",
              secondaryColor: "champagne",
              hardware: "wall_mount",
              swagCount: 1,
              ...(surround
                ? {
                    openingWidth: surround.openingWidth,
                    height: Math.min(wallHeight, Math.max(84, surround.height)),
                    tiebackHeight: Math.max(36, Math.min(54, surround.height * 0.45)),
                  }
                : { height: Math.min(wallHeight, 120), tiebackHeight: 48 }),
            }
          : preset === "floral_header"
            ? {
                fabric: "chiffon",
                color: "white",
                secondaryColor: "blush",
                hasFloralHeader: true,
                height: Math.min(wallHeight, 120),
                fullness: 2.5,
              }
            : preset === "uplights"
              ? {
                  fabric: "poly",
                  color: "ivory",
                  uplightColor: "lavender",
                  height: Math.min(wallHeight, 144),
                }
              : {};

  return clampTreatmentToWall({ ...base, ...overrides }, design.room.floor);
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
