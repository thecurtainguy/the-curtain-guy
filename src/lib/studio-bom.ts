/**
 * Studio design → bill of materials. Pure and deterministic so it can run on
 * the server, in the quote preview, and in throwaway scripts.
 *
 * Quantities follow what the Studio renders: drape runs use their HUNG length
 * (door gaps removed), chairs come from the seating layout, uplight counts use
 * the same spacing as the 3D light rig, ceiling fabric uses the ceiling
 * estimator. Nothing here knows about prices — see `studio-quote-converter`.
 */
import {
  CEILING_DRAPE_STYLES,
  CEILING_HUB_DECOR,
  CEILING_LIGHT_STYLES,
  DANCE_FLOOR_FINISHES,
  DEFAULT_DANCE_FLOOR_FINISH,
  DRAPE_COLORS,
  DRAPE_FABRICS,
  DRAPE_HARDWARE,
  GENERIC_OBJECT_FINISHES,
  LINEN_OBJECT_TYPES,
  SEATED_OBJECT_TYPES,
  STUDIO_CHAIR_STYLES,
  STUDIO_FRAME_FINISHES,
  getCeilingDrapes,
  getDrapeColorHex,
  getStudioMaterials,
  getStudioObjectOption,
  type DrapeColor,
  type DrapeFabric,
  type DrapeHardware,
  type StudioChairStyle,
  type StudioDesignJson,
  type StudioObject,
  type StudioObjectType,
  type StudioOpening,
  type StudioTreatment,
} from "@/data/studio";
import {
  clusterTables,
  layoutSeating,
  resolveChairStyle,
} from "@/components/studio/three/objects/layout";
import { ceilingUsesHub, estimateCeilingFabric } from "@/lib/studio-ceiling";
import { getDrapeRunSegments } from "@/lib/studio-door-gaps";
import { getWallSegments, inchesToFeetLabel } from "@/lib/studio-geometry";
import { STUDIO_TREATMENT_TYPE_LABELS } from "@/lib/studio-treatments";

export const STUDIO_BOM_SECTIONS = [
  "drapery",
  "hardware",
  "treatments",
  "ceiling",
  "lighting",
  "furniture",
  "services",
] as const;
export type StudioBomSection = (typeof STUDIO_BOM_SECTIONS)[number];

export const STUDIO_BOM_SECTION_LABELS: Record<StudioBomSection, string> = {
  drapery: "Drapery",
  hardware: "Hardware",
  treatments: "Treatments",
  ceiling: "Ceiling",
  lighting: "Lighting",
  furniture: "Furniture & decor",
  services: "Services",
};

/** Units a BOM quantity can be expressed in; mirrors `PRODUCT_UNIT_LABELS`. */
export type StudioBomUnit = "linear ft" | "each" | "panel" | "set" | "event";

export type StudioBomFlag = "needs_measurement" | "needs_venue_confirmation";

/** Pipe & drape bay as rendered (`maxBay`) and as the drape products' formula segment. */
export const PIPE_AND_DRAPE_BAY_FEET = 10;

export type PipeAndDrapeComponents = {
  /** Crossbar bays. */
  spans: number;
  uprights: number;
  bases: number;
  crossbars: number;
};

export type StudioBomHardwareGroup = PipeAndDrapeComponents & {
  /** BOM id of the drape line this hardware holds up. */
  drapeLineId: string;
  linearFeet: number;
};

export type StudioBomMetadata = {
  fabric?: DrapeFabric;
  color?: DrapeColor;
  /** Human colour name, used to match product colour variants. */
  colorLabel?: string;
  accentColor?: DrapeColor | null;
  heightInches?: number;
  fullness?: number;
  hardware?: DrapeHardware;
  walls?: number[];
  freestandingCount?: number;
  puddle?: boolean;
  hungInches?: number;
  /** Hardware lines: per-drape-line breakdown so formula-priced drapes can be netted out. */
  hardwareGroups?: StudioBomHardwareGroup[];
  components?: PipeAndDrapeComponents;
  ceilingStyle?: string;
  linearYards?: number;
  pieces?: number;
  riggingPoints?: number;
  coveredSqFt?: number;
  objectType?: StudioObjectType;
  finish?: string;
  chairStyle?: StudioChairStyle;
  widthInches?: number;
  depthInches?: number;
  uplightsBySource?: Partial<Record<"perimeter" | "drape" | "treatment" | "object", number>>;
  [key: string]: unknown;
};

export type StudioBomLine = {
  /** Stable within one build; used to link hardware to its drape line. */
  id: string;
  section: StudioBomSection;
  /** Primary mapping key, shown on the pricing page. */
  mappingKey: string;
  /** Keys tried in order when pricing, most specific first. */
  mappingKeys: string[];
  /** What it is, without the product name ("Ivory velvet drape"). */
  title: string;
  /** Design specifics appended after the title or product name. */
  details: string[];
  /** `title · details` — the description used when no product is mapped. */
  description: string;
  quantity: number;
  unit: StudioBomUnit;
  /** The same scope in other units a product might be priced by. */
  altQuantities: Partial<Record<StudioBomUnit, number>>;
  metadata: StudioBomMetadata;
  flag: StudioBomFlag | null;
  flagReason: string | null;
  /** Design item ids this line came from. */
  sourceIds: string[];
};

export type StudioBomTotals = {
  drapeLinearFeet: number;
  treatmentCount: number;
  ceilingCount: number;
  chairCount: number;
  uplightCount: number;
  tableCount: number;
  objectCount: number;
};

export type StudioBillOfMaterials = {
  lines: StudioBomLine[];
  totals: StudioBomTotals;
  /** True when the design has nothing billable (services are not added). */
  isEmpty: boolean;
};

export type StudioBomOptions = {
  /** Shown on the delivery line, e.g. "Laval". */
  cityArea?: string | null;
  /** Skip delivery / installation / teardown lines. */
  omitServices?: boolean;
};

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export function drapeFabricLabel(fabric: DrapeFabric): string {
  return DRAPE_FABRICS.find((option) => option.value === fabric)?.label ?? fabric;
}

export function drapeColorLabel(color: DrapeColor): string {
  return DRAPE_COLORS.find((option) => option.value === color)?.label ?? color;
}

function lower(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function chairStyleLabel(style: StudioChairStyle): string {
  return STUDIO_CHAIR_STYLES.find((option) => option.value === style)?.label ?? style;
}

function objectLabel(type: StudioObjectType): string {
  return getStudioObjectOption(type)?.label ?? capitalize(type.replaceAll("_", " "));
}

function finishLabel(type: StudioObjectType, finish: string | undefined): string | null {
  if (!finish) return null;
  const options = type === "dance_floor" ? DANCE_FLOOR_FINISHES : GENERIC_OBJECT_FINISHES;
  return options.find((option) => option.value === finish)?.label ?? null;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-CA")} ${count === 1 ? one : many}`;
}

/** "Wall 2", "Walls 1–4", "Walls 1, 3 & 5" — wall indexes are 0-based. */
export function formatWallList(wallIndexes: readonly number[]): string {
  const walls = [...new Set(wallIndexes)].sort((a, b) => a - b).map((index) => index + 1);
  if (walls.length === 0) return "";
  if (walls.length === 1) return `Wall ${walls[0]}`;
  const ranges: string[] = [];
  let start = walls[0];
  let previous = walls[0];
  for (const wall of [...walls.slice(1), Number.NaN]) {
    if (wall === previous + 1) {
      previous = wall;
      continue;
    }
    ranges.push(
      start === previous
        ? String(start)
        : previous === start + 1
          ? `${start}, ${previous}`
          : `${start}–${previous}`
    );
    start = wall;
    previous = wall;
  }
  const joined =
    ranges.length > 1
      ? `${ranges.slice(0, -1).join(", ")} & ${ranges[ranges.length - 1]}`
      : ranges[0];
  return `Walls ${joined}`;
}

function fullnessLabel(values: readonly number[]): string {
  const unique = [...new Set(values.map((value) => Math.round(value * 10) / 10))].sort(
    (a, b) => a - b
  );
  if (unique.length === 0) return "";
  if (unique.length === 1) return `${unique[0]}× fullness`;
  return `${unique[0]}–${unique[unique.length - 1]}× fullness`;
}

function feetFromInches(inches: number): number {
  return Math.max(0, Math.ceil(inches / 12 - 1e-6));
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

type DrapeGroup = {
  id: string;
  fabric: DrapeFabric;
  color: DrapeColor;
  heightInches: number;
  hardware: DrapeHardware;
  fullness: number[];
  walls: number[];
  freestandingCount: number;
  puddle: boolean;
  hungInches: number;
  components: PipeAndDrapeComponents;
  sourceIds: string[];
};

type HungSegment = {
  groupId: string;
  wallIndex: number;
  start: number;
  end: number;
};

function emptyComponents(): PipeAndDrapeComponents {
  return { spans: 0, uprights: 0, bases: 0, crossbars: 0 };
}

/** One free-standing pipe & drape line: N bays need N crossbars and N + 1 uprights. */
function componentsForSpan(inches: number): PipeAndDrapeComponents {
  const spans = Math.max(1, Math.ceil(inches / 12 / PIPE_AND_DRAPE_BAY_FEET - 1e-6));
  return { spans, uprights: spans + 1, bases: spans + 1, crossbars: spans };
}

function addComponents(target: PipeAndDrapeComponents, add: PipeAndDrapeComponents) {
  target.spans += add.spans;
  target.uprights += add.uprights;
  target.bases += add.bases;
  target.crossbars += add.crossbars;
}

function drapeGroupKey(
  fabric: DrapeFabric,
  color: DrapeColor,
  heightInches: number,
  hardware: DrapeHardware
): string {
  return `drape:${fabric}:${color}:${Math.round(heightInches)}:${hardware}`;
}

function buildDrapery(
  design: StudioDesignJson,
  lines: StudioBomLine[]
): { hungInches: number } {
  const groups = new Map<string, DrapeGroup>();
  const segments: HungSegment[] = [];
  const openings: StudioOpening[] = design.openings ?? [];

  const groupFor = (
    fabric: DrapeFabric,
    color: DrapeColor,
    heightInches: number,
    hardware: DrapeHardware
  ) => {
    const id = drapeGroupKey(fabric, color, heightInches, hardware);
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        fabric,
        color,
        heightInches,
        hardware,
        fullness: [],
        walls: [],
        freestandingCount: 0,
        puddle: false,
        hungInches: 0,
        components: emptyComponents(),
        sourceIds: [],
      };
      groups.set(id, group);
    }
    return group;
  };

  for (const run of design.drapeRuns ?? []) {
    if (run.hidden) continue;
    const hardware = run.hardware ?? "pipe_and_drape";
    const runSegments = getDrapeRunSegments(run, openings);
    const hung = runSegments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
    if (hung <= 0) continue;
    const group = groupFor(run.fabric, run.color, run.height, hardware);
    group.fullness.push(run.fullness);
    group.walls.push(run.wallIndex);
    group.puddle ||= Boolean(run.puddle);
    group.hungInches += hung;
    group.sourceIds.push(run.id);
    if (hardware === "pipe_and_drape") {
      for (const segment of runSegments) {
        addComponents(group.components, componentsForSpan(segment.end - segment.start));
        segments.push({
          groupId: group.id,
          wallIndex: run.wallIndex,
          start: segment.start,
          end: segment.end,
        });
      }
    }
  }

  for (const object of design.objects ?? []) {
    if (object.hidden || object.type !== "drape_backdrop") continue;
    const option = getStudioObjectOption("drape_backdrop");
    const fabric = object.fabric ?? option?.fabric ?? "velvet";
    const color = object.drapeColor ?? option?.drapeColor ?? "ivory";
    const group = groupFor(fabric, color, object.height, "pipe_and_drape");
    group.fullness.push(object.fullness ?? option?.fullness ?? 2);
    group.freestandingCount += 1;
    group.hungInches += object.width;
    group.sourceIds.push(object.id);
    addComponents(group.components, componentsForSpan(object.width));
  }

  // Runs meeting in a room corner share the corner upright and base.
  const walls = getWallSegments(design.room.floor);
  const wallCount = walls.length;
  for (const segment of segments) {
    if (segment.start > 1 || wallCount < 3) continue;
    const previousWall = (segment.wallIndex - 1 + wallCount) % wallCount;
    const previousLength = walls[previousWall]?.length ?? 0;
    const meetsCorner = segments.some(
      (other) =>
        other.wallIndex === previousWall && other.end >= previousLength - 1
    );
    if (!meetsCorner) continue;
    const group = groups.get(segment.groupId);
    if (group && group.components.uprights > 1) {
      group.components.uprights -= 1;
      group.components.bases -= 1;
    }
  }

  const hardwareGroups = new Map<DrapeHardware, StudioBomHardwareGroup[]>();
  let totalHung = 0;

  for (const group of groups.values()) {
    const feet = feetFromInches(group.hungInches);
    if (feet <= 0) continue;
    totalHung += group.hungInches;
    const colorLabel = drapeColorLabel(group.color);
    const locations = [
      formatWallList(group.walls),
      group.freestandingCount > 0
        ? plural(group.freestandingCount, "freestanding backdrop")
        : "",
    ].filter(Boolean);
    const tooTall = group.heightInches > design.room.wallHeight + 0.5;
    const details = [
      `${inchesToFeetLabel(group.heightInches)} high`,
      fullnessLabel(group.fullness),
      locations.join(" + "),
      group.puddle ? "puddled hem" : "",
    ].filter(Boolean);
    const title = `${colorLabel} ${lower(drapeFabricLabel(group.fabric))} drape`;
    lines.push({
      id: group.id,
      section: "drapery",
      mappingKey: `drape_fabric:${group.fabric}`,
      mappingKeys: [`drape:${group.fabric}_${group.color}`, `drape_fabric:${group.fabric}`],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: feet,
      unit: "linear ft",
      altQuantities: { "linear ft": feet },
      metadata: {
        fabric: group.fabric,
        color: group.color,
        colorLabel,
        heightInches: group.heightInches,
        fullness: Math.max(...group.fullness),
        hardware: group.hardware,
        walls: [...new Set(group.walls)].sort((a, b) => a - b),
        freestandingCount: group.freestandingCount,
        puddle: group.puddle,
        hungInches: Math.round(group.hungInches),
      },
      flag: tooTall ? "needs_measurement" : null,
      flagReason: tooTall
        ? `Drape is taller than the ${inchesToFeetLabel(design.room.wallHeight)} wall height — confirm on site.`
        : null,
      sourceIds: group.sourceIds,
    });

    const list = hardwareGroups.get(group.hardware) ?? [];
    list.push({
      drapeLineId: group.id,
      linearFeet: feet,
      ...(group.hardware === "pipe_and_drape" ? group.components : emptyComponents()),
    });
    hardwareGroups.set(group.hardware, list);
  }

  for (const hardware of DRAPE_HARDWARE) {
    const list = hardwareGroups.get(hardware.value);
    if (!list?.length) continue;
    const feet = list.reduce((sum, item) => sum + item.linearFeet, 0);
    const components = emptyComponents();
    for (const item of list) addComponents(components, item);
    const maxHeight = Math.max(
      ...lines
        .filter((line) => list.some((item) => item.drapeLineId === line.id))
        .map((line) => line.metadata.heightInches ?? 0)
    );
    const isPipe = hardware.value === "pipe_and_drape";
    const details = [
      ...(isPipe
        ? [
            plural(components.uprights, "upright"),
            plural(components.bases, "base plate"),
            plural(components.crossbars, "crossbar"),
          ]
        : []),
      maxHeight > 0 ? `up to ${inchesToFeetLabel(maxHeight)} high` : "",
    ].filter(Boolean);
    const title =
      hardware.value === "pipe_and_drape"
        ? "Pipe & drape hardware"
        : hardware.value === "ceiling_track"
          ? "Ceiling track"
          : "Concealed wall mount";
    lines.push({
      id: `hardware:${hardware.value}`,
      section: "hardware",
      mappingKey: `drape_hardware:${hardware.value}`,
      mappingKeys: [`drape_hardware:${hardware.value}`],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: feet,
      unit: "linear ft",
      altQuantities: { "linear ft": feet },
      metadata: {
        hardware: hardware.value,
        heightInches: maxHeight,
        hardwareGroups: list,
        components: isPipe ? components : undefined,
      },
      flag: isPipe ? null : "needs_venue_confirmation",
      flagReason: isPipe
        ? null
        : "Mounting to the venue ceiling or walls needs venue approval.",
      sourceIds: lines
        .filter((line) => list.some((item) => item.drapeLineId === line.id))
        .flatMap((line) => line.sourceIds),
    });
  }

  return { hungInches: totalHung };
}

function treatmentDetails(treatment: StudioTreatment): string[] {
  const width = treatment.anchor.endOffset - treatment.anchor.startOffset;
  const swagTypes = new Set(["top_swag_valance", "layered_swag", "ceremony_arch"]);
  const frame =
    treatment.type === "ceremony_arch"
      ? STUDIO_FRAME_FINISHES.find((option) => option.value === treatment.frameFinish)
          ?.label
      : null;
  return [
    `${drapeColorLabel(treatment.color)} ${lower(drapeFabricLabel(treatment.fabric))}`,
    treatment.secondaryColor !== treatment.color &&
    (swagTypes.has(treatment.type) || treatment.hasTopSwag)
      ? `${lower(drapeColorLabel(treatment.secondaryColor))} accent`
      : "",
    `${inchesToFeetLabel(width)} wide × ${inchesToFeetLabel(treatment.height)} high`,
    `${treatment.fullness}× fullness`,
    treatment.type !== "top_swag_valance" && treatment.hasTopSwag ? "top swag" : "",
    treatment.hasTiebacks ? "tiebacks" : "",
    frame ? `${lower(frame)} frame` : "",
    formatWallList([treatment.anchor.wallIndex]),
  ].filter(Boolean);
}

/** Mirrors `treatmentOffsets` in the 3D light rig. */
function treatmentUplightCount(treatment: StudioTreatment): number {
  const spanFeet = (treatment.anchor.endOffset - treatment.anchor.startOffset) / 12;
  if (spanFeet <= 0) return 0;
  if (spanFeet < 4) return 1;
  if (spanFeet <= 10) return 2;
  return Math.max(2, Math.round(spanFeet / 5));
}

function buildTreatments(design: StudioDesignJson, lines: StudioBomLine[]): number {
  let count = 0;
  const floral: StudioTreatment[] = [];
  // Identical treatments (same type, fabric, colours, size, extras) share one line.
  const groups = new Map<string, { treatment: StudioTreatment; items: StudioTreatment[] }>();
  for (const treatment of design.treatments ?? []) {
    if (treatment.hidden) continue;
    count += 1;
    const specs = treatmentDetails(treatment).slice(0, -1);
    const key = [treatment.type, treatment.hardware ?? "", ...specs].join("|");
    const group = groups.get(key) ?? { treatment, items: [] };
    group.items.push(treatment);
    groups.set(key, group);
    if (treatment.hasFloralHeader) floral.push(treatment);
  }

  for (const { treatment, items } of groups.values()) {
    const widthInches = treatment.anchor.endOffset - treatment.anchor.startOffset;
    const totalFeet = items.reduce(
      (sum, item) => sum + feetFromInches(item.anchor.endOffset - item.anchor.startOffset),
      0
    );
    const walls = [...new Set(items.map((item) => item.anchor.wallIndex))].sort((a, b) => a - b);
    const title = STUDIO_TREATMENT_TYPE_LABELS[treatment.type] ?? treatment.label;
    const details = [...treatmentDetails(treatment).slice(0, -1), formatWallList(walls)];
    lines.push({
      id: `treatment:${treatment.id}`,
      section: "treatments",
      mappingKey: `treatment:${treatment.type}`,
      mappingKeys: [`treatment:${treatment.type}`],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: items.length,
      unit: "each",
      altQuantities: { each: items.length, "linear ft": totalFeet },
      metadata: {
        fabric: treatment.fabric,
        color: treatment.color,
        colorLabel: drapeColorLabel(treatment.color),
        accentColor: treatment.secondaryColor,
        heightInches: treatment.height,
        fullness: treatment.fullness,
        hardware: treatment.hardware,
        walls,
        widthInches,
      },
      flag: null,
      flagReason: null,
      sourceIds: items.map((item) => item.id),
    });
  }

  if (floral.length > 0) {
    const title = "Floral header";
    const details = [
      `${floral.length} ${floral.length === 1 ? "treatment" : "treatments"}`,
      formatWallList(floral.map((treatment) => treatment.anchor.wallIndex)),
    ];
    const feet = floral.reduce(
      (sum, treatment) =>
        sum + feetFromInches(treatment.anchor.endOffset - treatment.anchor.startOffset),
      0
    );
    lines.push({
      id: "treatment_addon:floral_header",
      section: "treatments",
      mappingKey: "treatment_addon:floral_header",
      mappingKeys: ["treatment_addon:floral_header"],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: floral.length,
      unit: "each",
      altQuantities: { each: floral.length, "linear ft": feet },
      metadata: {},
      flag: null,
      flagReason: null,
      sourceIds: floral.map((treatment) => treatment.id),
    });
  }
  return count;
}

function buildCeiling(design: StudioDesignJson, lines: StudioBomLine[]): number {
  const ceilings = getCeilingDrapes(design).filter((drape) => !drape.hidden);
  const ceilingObjects = (design.objects ?? []).filter(
    (object) => !object.hidden && object.type === "ceiling_drape"
  );
  let riggingPoints = 0;
  const riggingSources: string[] = [];
  const lights = new Map<string, { count: number; colors: DrapeColor[]; ids: string[] }>();
  const hubs = new Map<string, { count: number; ids: string[] }>();
  const washes: Array<{ id: string; color: DrapeColor }> = [];

  for (const drape of ceilings) {
    const estimate = estimateCeilingFabric(drape, design.room.floor);
    const style = CEILING_DRAPE_STYLES.find((option) => option.value === drape.type);
    const title = `${style?.label ?? drape.type} ceiling drape`;
    const linearFeet = Math.ceil(estimate.linearYards * 3);
    const details = [
      `${drapeColorLabel(drape.color)} ${lower(drapeFabricLabel(drape.fabric))}${
        drape.accentColor ? ` with ${lower(drapeColorLabel(drape.accentColor))}` : ""
      }`,
      `≈ ${estimate.linearYards.toLocaleString("en-CA")} yd fabric`,
      estimate.pieces > 0 ? plural(estimate.pieces, "panel") : "",
      estimate.coveredSqFt > 0
        ? `${estimate.coveredSqFt.toLocaleString("en-CA")} ft² covered`
        : "",
      drape.perimeterValance ? "perimeter valance" : "",
    ].filter(Boolean);
    lines.push({
      id: `ceiling:${drape.id}`,
      section: "ceiling",
      mappingKey: `ceiling_style:${drape.type}`,
      mappingKeys: [`ceiling_style:${drape.type}`],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: 1,
      unit: "each",
      altQuantities: {
        each: 1,
        ...(estimate.pieces > 0 ? { panel: estimate.pieces } : {}),
        ...(linearFeet > 0 ? { "linear ft": linearFeet } : {}),
      },
      metadata: {
        fabric: drape.fabric,
        color: drape.color,
        colorLabel: drapeColorLabel(drape.color),
        accentColor: drape.accentColor,
        fullness: drape.fullness,
        ceilingStyle: drape.type,
        linearYards: estimate.linearYards,
        pieces: estimate.pieces,
        riggingPoints: estimate.riggingPoints,
        coveredSqFt: estimate.coveredSqFt,
      },
      flag: null,
      flagReason: null,
      sourceIds: [drape.id],
    });

    riggingPoints += estimate.riggingPoints;
    riggingSources.push(drape.id);

    if (drape.lights !== "none") {
      const entry = lights.get(drape.lights) ?? { count: 0, colors: [], ids: [] };
      entry.count += 1;
      entry.colors.push(drape.lightColor);
      entry.ids.push(drape.id);
      lights.set(drape.lights, entry);
    }
    if (drape.hubDecor !== "none" && ceilingUsesHub(drape.type)) {
      const entry = hubs.get(drape.hubDecor) ?? { count: 0, ids: [] };
      entry.count += 1;
      entry.ids.push(drape.id);
      hubs.set(drape.hubDecor, entry);
    }
    if (drape.uplightColor) washes.push({ id: drape.id, color: drape.uplightColor });
  }

  if (ceilingObjects.length > 0) {
    const title = "Ceiling canopy";
    const sizes = ceilingObjects.map(
      (object) => `${inchesToFeetLabel(object.width)} × ${inchesToFeetLabel(object.depth)}`
    );
    const colors = [
      ...new Set(
        ceilingObjects.map((object) =>
          drapeColorLabel(object.drapeColor ?? getStudioObjectOption("ceiling_drape")?.drapeColor ?? "white")
        )
      ),
    ];
    const details = [colors.join(", "), [...new Set(sizes)].join(", ")].filter(Boolean);
    const first = ceilingObjects[0];
    lines.push({
      id: "object:ceiling_drape",
      section: "ceiling",
      mappingKey: "object:ceiling_drape",
      mappingKeys: ["object:ceiling_drape"],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: ceilingObjects.length,
      unit: "each",
      altQuantities: { each: ceilingObjects.length },
      metadata: {
        objectType: "ceiling_drape",
        fabric: first.fabric,
        color: first.drapeColor,
        colorLabel: first.drapeColor ? drapeColorLabel(first.drapeColor) : undefined,
      },
      flag: null,
      flagReason: null,
      sourceIds: ceilingObjects.map((object) => object.id),
    });
    riggingSources.push(...ceilingObjects.map((object) => object.id));
  }

  for (const [style, entry] of lights) {
    const label = CEILING_LIGHT_STYLES.find((option) => option.value === style)?.label ?? style;
    const title = `${label} in ceiling drape`;
    const colors = [...new Set(entry.colors.map((color) => lower(drapeColorLabel(color))))];
    const details = [
      plural(entry.count, "ceiling design"),
      colors.length ? `${colors.join(", ")} tone` : "",
    ].filter(Boolean);
    lines.push({
      id: `ceiling_lights:${style}`,
      section: "ceiling",
      mappingKey: `ceiling_lights:${style}`,
      mappingKeys: [`ceiling_lights:${style}`],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: entry.count,
      unit: "each",
      altQuantities: { each: entry.count, set: entry.count },
      metadata: {},
      flag: null,
      flagReason: null,
      sourceIds: entry.ids,
    });
  }

  for (const [decor, entry] of hubs) {
    const label = CEILING_HUB_DECOR.find((option) => option.value === decor)?.label ?? decor;
    const title = `${label} at ceiling hub`;
    lines.push({
      id: `ceiling_hub:${decor}`,
      section: "ceiling",
      mappingKey: `ceiling_hub:${decor}`,
      mappingKeys: [`ceiling_hub:${decor}`],
      title,
      details: [],
      description: title,
      quantity: entry.count,
      unit: "each",
      altQuantities: { each: entry.count },
      metadata: {},
      flag: null,
      flagReason: null,
      sourceIds: entry.ids,
    });
  }

  if (washes.length > 0) {
    const title = "Ceiling uplight wash";
    const colors = [...new Set(washes.map((wash) => lower(drapeColorLabel(wash.color))))];
    lines.push({
      id: "lighting:ceiling_wash",
      section: "lighting",
      mappingKey: "lighting:ceiling_wash",
      mappingKeys: ["lighting:ceiling_wash"],
      title,
      details: [plural(washes.length, "ceiling design"), colors.join(", ")],
      description: [title, plural(washes.length, "ceiling design"), colors.join(", ")].join(" · "),
      quantity: washes.length,
      unit: "each",
      altQuantities: { each: washes.length, set: washes.length },
      metadata: { color: washes[0].color, colorLabel: drapeColorLabel(washes[0].color) },
      flag: null,
      flagReason: null,
      sourceIds: washes.map((wash) => wash.id),
    });
  }

  if (riggingSources.length > 0) {
    const title = "Ceiling rigging";
    const details = [
      riggingPoints > 0 ? `≈ ${plural(riggingPoints, "rigging point")}` : "",
      plural(ceilings.length + ceilingObjects.length, "ceiling design"),
    ].filter(Boolean);
    // Canopy objects carry no rigging estimate; price those per event.
    const perPoint = riggingPoints > 0;
    lines.push({
      id: "service:ceiling_rigging",
      section: "ceiling",
      mappingKey: "service:ceiling_rigging",
      mappingKeys: ["service:ceiling_rigging"],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: perPoint ? riggingPoints : 1,
      unit: perPoint ? "each" : "event",
      altQuantities: perPoint ? { each: riggingPoints, event: 1 } : { event: 1 },
      metadata: { riggingPoints },
      flag: "needs_measurement",
      flagReason: "Rigging depends on the venue ceiling — confirm points on a site visit.",
      sourceIds: riggingSources,
    });
  }

  return ceilings.length + ceilingObjects.length;
}

/** Uplight fixtures, counted with the same spacing the 3D light rig uses. */
function countUplights(design: StudioDesignJson) {
  const bySource = { perimeter: 0, drape: 0, treatment: 0, object: 0 };
  const colors = new Map<DrapeColor, number>();
  const ids: string[] = [];
  const addColor = (color: DrapeColor, count: number) =>
    colors.set(color, (colors.get(color) ?? 0) + count);
  const openings = design.openings ?? [];
  const visibleRuns = (design.drapeRuns ?? []).filter((run) => !run.hidden);

  for (const run of visibleRuns) {
    if (!run.uplightColor) continue;
    let count = 0;
    for (const segment of getDrapeRunSegments(run, openings)) {
      const spanFeet = (segment.end - segment.start) / 12;
      if (spanFeet <= 0) continue;
      count += Math.max(1, Math.round(spanFeet / 6));
    }
    if (count > 0) {
      bySource.drape += count;
      addColor(run.uplightColor, count);
      ids.push(run.id);
    }
  }

  for (const treatment of design.treatments ?? []) {
    if (treatment.hidden || !treatment.uplightColor) continue;
    const count = treatmentUplightCount(treatment);
    bySource.treatment += count;
    addColor(treatment.uplightColor, count);
    ids.push(treatment.id);
  }

  const perimeterColor = getStudioMaterials(design).uplightColor;
  if (perimeterColor) {
    const visibleOpenings = openings.filter((opening) => !opening.hidden);
    for (const wall of getWallSegments(design.room.floor)) {
      const lengthFeet = wall.length / 12;
      if (lengthFeet < 2) continue;
      const count = Math.max(1, Math.round(lengthFeet / 9));
      for (let index = 0; index < count; index += 1) {
        const offset = ((index + 0.5) * wall.length) / count;
        const nearOpening = visibleOpenings.some(
          (opening) =>
            opening.wallIndex === wall.index &&
            offset > opening.offset - 12 &&
            offset < opening.offset + opening.width + 12
        );
        if (nearOpening) continue;
        const litRun = visibleRuns.find(
          (run) =>
            run.wallIndex === wall.index &&
            run.uplightColor &&
            offset >= run.startOffset &&
            offset <= run.endOffset
        );
        if (litRun) continue;
        bySource.perimeter += 1;
        addColor(perimeterColor, 1);
      }
    }
  }

  for (const object of design.objects ?? []) {
    if (object.hidden || object.type !== "uplight") continue;
    bySource.object += 1;
    addColor(object.lightColor ?? getStudioObjectOption("uplight")?.lightColor ?? "gold", 1);
    ids.push(object.id);
  }

  return { bySource, colors, ids };
}

function buildLighting(design: StudioDesignJson, lines: StudioBomLine[]): number {
  const { bySource, colors, ids } = countUplights(design);
  const total = bySource.perimeter + bySource.drape + bySource.treatment + bySource.object;
  if (total > 0) {
    const title = "LED uplights";
    const sourceLabels: Array<[keyof typeof bySource, string]> = [
      ["perimeter", "perimeter"],
      ["drape", "on drapery"],
      ["treatment", "on treatments"],
      ["object", "freestanding"],
    ];
    const breakdown = sourceLabels
      .filter(([key]) => bySource[key] > 0)
      .map(([key, label]) => `${bySource[key]} ${label}`)
      .join(", ");
    const colorList = [...colors.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => lower(drapeColorLabel(color)));
    const dominant = [...colors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const details = [
      plural(total, "fixture"),
      breakdown,
      colorList.length ? `${colorList.join(", ")} wash` : "",
    ].filter(Boolean);
    lines.push({
      id: "lighting:uplight",
      section: "lighting",
      mappingKey: "lighting:uplight",
      mappingKeys: ["lighting:uplight"],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: total,
      unit: "each",
      altQuantities: { each: total },
      metadata: {
        uplightsBySource: bySource,
        color: dominant,
        colorLabel: dominant ? drapeColorLabel(dominant) : undefined,
      },
      flag: null,
      flagReason: null,
      sourceIds: ids,
    });
  }

  const chandeliers = (design.objects ?? []).filter(
    (object) => !object.hidden && object.type === "chandelier"
  );
  if (chandeliers.length > 0) {
    const title = "Chandelier";
    const sizes = [
      ...new Set(chandeliers.map((object) => `${inchesToFeetLabel(object.width)} wide`)),
    ];
    lines.push({
      id: "object:chandelier",
      section: "lighting",
      mappingKey: "object:chandelier",
      mappingKeys: ["object:chandelier"],
      title,
      details: sizes,
      description: [title, ...sizes].join(" · "),
      quantity: chandeliers.length,
      unit: "each",
      altQuantities: { each: chandeliers.length },
      metadata: { objectType: "chandelier" },
      flag: null,
      flagReason: null,
      sourceIds: chandeliers.map((object) => object.id),
    });
  }
  return total;
}

/** Object types rendered as their own furniture/decor line. */
const FURNITURE_SKIP = new Set<StudioObjectType>([
  "drape_backdrop",
  "ceiling_drape",
  "uplight",
  "chandelier",
  // Seats only — chairs are counted from the layout.
  "ceremony_seating",
  "chair",
  // Venue architecture, not a rental.
  "column",
]);

function buildFurniture(
  design: StudioDesignJson,
  lines: StudioBomLine[]
): { chairs: number; tables: number; objects: number } {
  type Entry = { objects: StudioObject[]; finish?: string };
  const groups = new Map<string, Entry>();
  let objectCount = 0;
  let tableCount = 0;

  for (const object of design.objects ?? []) {
    if (object.hidden || FURNITURE_SKIP.has(object.type)) continue;
    objectCount += 1;
    const finish = object.type === "dance_floor"
      ? object.finish ?? DEFAULT_DANCE_FLOOR_FINISH
      : object.finish;
    const key = `${object.type}:${Math.round(object.width)}x${Math.round(object.depth)}:${finish ?? ""}`;
    const entry = groups.get(key) ?? { objects: [], finish };
    entry.objects.push(object);
    groups.set(key, entry);
  }

  for (const [key, entry] of groups) {
    const first = entry.objects[0];
    const type = first.type;
    const isTableArea = type === "table_area";
    const quantity = isTableArea
      ? entry.objects.reduce((sum, object) => sum + clusterTables(object).length, 0)
      : entry.objects.length;
    if (quantity <= 0) continue;
    if (LINEN_OBJECT_TYPES.includes(type) || isTableArea) tableCount += quantity;
    const title = isTableArea ? "Round guest table (seating zone)" : objectLabel(type);
    const finish = finishLabel(type, entry.finish);
    const details = [
      isTableArea
        ? plural(entry.objects.length, "zone")
        : `${inchesToFeetLabel(first.width)} × ${inchesToFeetLabel(first.depth)}`,
      type === "stage" ? `${inchesToFeetLabel(first.height)} high` : "",
      finish ? lower(finish) : "",
    ].filter(Boolean);
    const mappingKeys =
      type === "dance_floor" && entry.finish
        ? [`dance_floor:${entry.finish}`, "object:dance_floor"]
        : isTableArea
          ? ["object:table_area", "object:round_table"]
          : [`object:${type}`];
    lines.push({
      id: `object:${key}`,
      section: "furniture",
      mappingKey: `object:${type}`,
      mappingKeys,
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity,
      unit: "each",
      altQuantities: { each: quantity },
      metadata: {
        objectType: type,
        finish: entry.finish,
        widthInches: first.width,
        depthInches: first.depth,
      },
      flag: null,
      flagReason: null,
      sourceIds: entry.objects.map((object) => object.id),
    });
  }

  // Linens: one per dressed table, grouped by table type + colour.
  const linens = new Map<string, { type: StudioObjectType; color: DrapeColor; ids: string[] }>();
  for (const object of design.objects ?? []) {
    if (object.hidden || !LINEN_OBJECT_TYPES.includes(object.type)) continue;
    const color =
      object.linenColor === undefined
        ? getStudioObjectOption(object.type)?.linenColor ?? null
        : object.linenColor;
    if (!color) continue;
    const key = `${object.type}:${color}`;
    const entry = linens.get(key) ?? { type: object.type, color, ids: [] };
    entry.ids.push(object.id);
    linens.set(key, entry);
  }
  for (const [key, entry] of linens) {
    const title = `${drapeColorLabel(entry.color)} linen`;
    const details = [`for ${lower(objectLabel(entry.type))}`];
    lines.push({
      id: `linen:${key}`,
      section: "furniture",
      mappingKey: `linen:${entry.type}`,
      mappingKeys: [`linen:${entry.type}`],
      title,
      details,
      description: [title, ...details].join(" · "),
      quantity: entry.ids.length,
      unit: "each",
      altQuantities: { each: entry.ids.length },
      metadata: {
        objectType: entry.type,
        color: entry.color,
        colorLabel: drapeColorLabel(entry.color),
      },
      flag: null,
      flagReason: null,
      sourceIds: entry.ids,
    });
  }

  // Chairs: exactly what the seating layout places.
  const chairs = new Map<StudioChairStyle, { count: number; ids: string[] }>();
  for (const object of design.objects ?? []) {
    if (object.hidden) continue;
    if (object.type !== "chair" && !SEATED_OBJECT_TYPES.includes(object.type)) continue;
    const style = resolveChairStyle(object);
    if (style === "none") continue;
    const count = layoutSeating(object).chairs.length;
    if (count <= 0) continue;
    const entry = chairs.get(style) ?? { count: 0, ids: [] };
    entry.count += count;
    entry.ids.push(object.id);
    chairs.set(style, entry);
  }
  let chairTotal = 0;
  for (const [style, entry] of chairs) {
    chairTotal += entry.count;
    const title = `${chairStyleLabel(style)} chair`;
    lines.push({
      id: `chair:${style}`,
      section: "furniture",
      mappingKey: `chair:${style}`,
      mappingKeys: [`chair:${style}`],
      title,
      details: [plural(entry.count, "seat")],
      description: [title, plural(entry.count, "seat")].join(" · "),
      quantity: entry.count,
      unit: "each",
      altQuantities: { each: entry.count },
      metadata: { chairStyle: style },
      flag: null,
      flagReason: null,
      sourceIds: entry.ids,
    });
  }

  return { chairs: chairTotal, tables: tableCount, objects: objectCount };
}

function buildServices(
  lines: StudioBomLine[],
  totals: StudioBomTotals,
  options: StudioBomOptions
) {
  const city = options.cityArea?.trim();
  const scope = [
    totals.drapeLinearFeet > 0 ? `${totals.drapeLinearFeet.toLocaleString("en-CA")} ft of drapery` : "",
    totals.treatmentCount > 0 ? plural(totals.treatmentCount, "treatment") : "",
    totals.ceilingCount > 0 ? plural(totals.ceilingCount, "ceiling design") : "",
  ].filter(Boolean);
  const service = (
    key: "delivery" | "installation" | "teardown",
    title: string,
    details: string[]
  ): StudioBomLine => ({
    id: `service:${key}`,
    section: "services",
    mappingKey: `service:${key}`,
    mappingKeys: [`service:${key}`],
    title,
    details,
    description: [title, ...details].join(" · "),
    quantity: 1,
    unit: "event",
    altQuantities: { event: 1, each: 1, set: 1 },
    metadata: {},
    flag: null,
    flagReason: null,
    sourceIds: [],
  });
  lines.push(
    service("delivery", "Delivery & pickup", city ? [city] : []),
    service("installation", "On-site installation", scope),
    service("teardown", "Teardown after the event", [])
  );
}

export function buildStudioBillOfMaterials(
  design: StudioDesignJson,
  options: StudioBomOptions = {}
): StudioBillOfMaterials {
  const lines: StudioBomLine[] = [];
  const { hungInches } = buildDrapery(design, lines);
  const treatmentCount = buildTreatments(design, lines);
  const ceilingCount = buildCeiling(design, lines);
  const uplightCount = buildLighting(design, lines);
  const furniture = buildFurniture(design, lines);

  const totals: StudioBomTotals = {
    drapeLinearFeet: feetFromInches(hungInches),
    treatmentCount,
    ceilingCount,
    chairCount: furniture.chairs,
    uplightCount,
    tableCount: furniture.tables,
    objectCount: furniture.objects,
  };
  const isEmpty = lines.length === 0;
  if (!isEmpty && !options.omitServices) buildServices(lines, totals, options);

  const order = new Map(STUDIO_BOM_SECTIONS.map((section, index) => [section, index]));
  const sorted = lines
    .map((line, index) => ({ line, index }))
    .sort(
      (a, b) =>
        (order.get(a.line.section) ?? 0) - (order.get(b.line.section) ?? 0) ||
        a.index - b.index
    )
    .map(({ line }) => line);

  return { lines: sorted, totals, isEmpty };
}

/** Swatch hex for a BOM line's colour, when it has one. */
export function studioBomLineSwatch(line: Pick<StudioBomLine, "metadata">): string | null {
  return line.metadata.color ? getDrapeColorHex(line.metadata.color) : null;
}
