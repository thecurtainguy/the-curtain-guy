import {
  createLShapeRoom,
  createRectangleRoom,
} from "@/lib/studio-geometry";

export const STUDIO_DESIGN_VERSION = 1 as const;
export const STUDIO_MAX_PAYLOAD_BYTES = 256 * 1024;
export const STUDIO_TITLE_MAX_LENGTH = 160;
export const STUDIO_LABEL_MAX_LENGTH = 160;
export const STUDIO_NOTES_MAX_LENGTH = 5000;
export const STUDIO_OBJECT_NOTES_MAX_LENGTH = 1000;
export const STUDIO_MAX_SEATING_COUNT = 10000;
export const STUDIO_MAX_OBJECTS = 400;

export const STUDIO_STATUSES = ["draft", "saved", "archived"] as const;
export type StudioDesignStatus = (typeof STUDIO_STATUSES)[number];

export const ROOM_SHAPES = ["rectangle", "l_shape", "custom"] as const;
export type StudioRoomShape = (typeof ROOM_SHAPES)[number];

export const STUDIO_FLOOR_FINISHES = [
  { value: "warm_wood", label: "Warm ballroom wood" },
  { value: "event_carpet", label: "Neutral event carpet" },
  { value: "polished_concrete", label: "Polished venue concrete" },
  { value: "black_event", label: "Black event floor" },
  { value: "light_neutral", label: "Light neutral floor" },
  { value: "white_marble", label: "White marble" },
  { value: "dark_oak", label: "Dark oak planks" },
  { value: "herringbone", label: "Herringbone parquet" },
  { value: "lawn", label: "Garden lawn (tent)" },
] as const;
export type StudioFloorFinish =
  (typeof STUDIO_FLOOR_FINISHES)[number]["value"];

export const STUDIO_WALL_FINISHES = [
  { value: "warm_ivory", label: "Warm ivory" },
  { value: "soft_grey", label: "Soft grey" },
  { value: "black_box", label: "Black box" },
  { value: "neutral_beige", label: "Neutral beige" },
  { value: "white_plaster", label: "White plaster" },
  { value: "exposed_brick", label: "Exposed brick" },
  { value: "wood_panel", label: "Wood panelling" },
  { value: "tent_canvas", label: "Tent canvas" },
] as const;
export type StudioWallFinish =
  (typeof STUDIO_WALL_FINISHES)[number]["value"];

export const STUDIO_LIGHTING_MOODS = [
  { value: "neutral", label: "Neutral" },
  { value: "warm_gala", label: "Warm gala" },
  { value: "dark_venue", label: "Dark venue" },
  { value: "bright_setup", label: "Bright setup" },
  { value: "candlelight", label: "Candlelight" },
  { value: "twilight_blue", label: "Twilight blue" },
  { value: "daylight", label: "Daylight" },
] as const;
export type StudioLightingMood =
  (typeof STUDIO_LIGHTING_MOODS)[number]["value"];

export type StudioMaterials = {
  floor: StudioFloorFinish;
  walls: StudioWallFinish;
  lighting: StudioLightingMood;
  /** Perimeter uplighting washed along every wall; null/undefined = off. */
  uplightColor?: DrapeColor | null;
  /** Ceiling architecture; undefined = "auto" (tray when the room allows). */
  ceiling?: StudioCeilingFinish;
};

export const DEFAULT_STUDIO_MATERIALS: StudioMaterials = {
  floor: "warm_wood",
  walls: "warm_ivory",
  lighting: "warm_gala",
};

export type StudioPoint = {
  x: number;
  z: number;
};

export const STUDIO_OPENING_TYPES = ["door", "entrance", "window"] as const;
export type StudioOpeningType = (typeof STUDIO_OPENING_TYPES)[number];

export type StudioOpening = {
  id: string;
  type: StudioOpeningType;
  wallIndex: number;
  offset: number;
  width: number;
  label: string;
  /** Inches from floor to the bottom of a window. Defaults: window 36, doors 0. */
  sillHeight?: number;
  /** Clear opening height in inches. Defaults: door 84, window 60. */
  openingHeight?: number;
  locked?: boolean;
  hidden?: boolean;
};

export const STUDIO_OBJECT_TYPES = [
  "stage",
  "dance_floor",
  "entrance_marker",
  "round_table",
  "rectangle_table",
  "cocktail_table",
  "table_area",
  "dj_booth",
  "bar",
  "lounge_area",
  "sweetheart_table",
  "head_table",
  "buffet_table",
  "cake_table",
  "ceremony_seating",
  "chair",
  "sofa",
  "photo_booth",
  "plant",
  "column",
  "uplight",
  "chandelier",
  "piano",
  "podium",
  "av_screen",
  "drape_backdrop",
  "ceiling_drape",
] as const;
export type StudioObjectType = (typeof STUDIO_OBJECT_TYPES)[number];

export const STUDIO_OBJECT_CATEGORIES = [
  { value: "tables", label: "Tables" },
  { value: "seating", label: "Seating" },
  { value: "drapery", label: "Drapery" },
  { value: "production", label: "Production" },
  { value: "decor", label: "Decor & lighting" },
  { value: "zones", label: "Zones & flow" },
] as const;
export type StudioObjectCategory =
  (typeof STUDIO_OBJECT_CATEGORIES)[number]["value"];

export const STUDIO_CHAIR_STYLES = [
  { value: "chiavari_gold", label: "Gold chiavari" },
  { value: "chiavari_silver", label: "Silver chiavari" },
  { value: "chiavari_white", label: "White chiavari" },
  { value: "ghost", label: "Ghost (clear)" },
  { value: "cross_back", label: "Cross-back wood" },
  { value: "folding_white", label: "White folding" },
  { value: "banquet", label: "Banquet upholstered" },
  { value: "none", label: "No chairs" },
] as const;
export type StudioChairStyle = (typeof STUDIO_CHAIR_STYLES)[number]["value"];
export const DEFAULT_CHAIR_STYLE: StudioChairStyle = "chiavari_gold";

/** Object types that render chairs from `seatingCount` + `chairStyle`. */
export const SEATED_OBJECT_TYPES: readonly StudioObjectType[] = [
  "round_table",
  "rectangle_table",
  "cocktail_table",
  "table_area",
  "lounge_area",
  "sweetheart_table",
  "head_table",
  "ceremony_seating",
];

/** Object types that can wear a table linen (`linenColor`). */
export const LINEN_OBJECT_TYPES: readonly StudioObjectType[] = [
  "round_table",
  "rectangle_table",
  "cocktail_table",
  "sweetheart_table",
  "head_table",
  "buffet_table",
  "cake_table",
];

/** Object types that emit light (`lightColor`). */
export const LIGHT_OBJECT_TYPES: readonly StudioObjectType[] = [
  "uplight",
  "chandelier",
];

/** Object types made of drape fabric (`fabric`, `drapeColor`, `fullness`). */
export const FABRIC_OBJECT_TYPES: readonly StudioObjectType[] = [
  "drape_backdrop",
  "ceiling_drape",
];

export const DANCE_FLOOR_FINISHES = [
  { value: "white_gloss", label: "White gloss" },
  { value: "black_gloss", label: "Black gloss" },
  { value: "checkerboard", label: "Checkerboard" },
  { value: "warm_parquet", label: "Warm parquet" },
  { value: "oak", label: "Oak" },
  { value: "dark_wood", label: "Dark wood" },
  { value: "neutral_event_carpet", label: "Neutral event carpet" },
  { value: "led_starlit", label: "LED / starlit (placeholder)" },
  {
    value: "custom_wrap_monogram",
    label: "Custom wrap / monogram (placeholder)",
  },
] as const;
export type DanceFloorFinish =
  (typeof DANCE_FLOOR_FINISHES)[number]["value"];
export const DEFAULT_DANCE_FLOOR_FINISH: DanceFloorFinish = "white_gloss";

export const GENERIC_OBJECT_FINISHES = [
  { value: "natural_wood", label: "Natural wood" },
  { value: "painted_white", label: "Painted white" },
  { value: "painted_black", label: "Painted black" },
  { value: "metal", label: "Metal" },
  { value: "upholstered", label: "Upholstered" },
  { value: "gold", label: "Polished gold" },
  { value: "acrylic", label: "Clear acrylic" },
  { value: "marble", label: "White marble" },
  { value: "custom", label: "Custom" },
] as const;
export type GenericStudioObjectFinish =
  (typeof GENERIC_OBJECT_FINISHES)[number]["value"];
export type StudioObjectFinish =
  | DanceFloorFinish
  | GenericStudioObjectFinish;

type StudioObjectBase = {
  id: string;
  label: string;
  /** Center of the footprint, inches. */
  x: number;
  z: number;
  /** Footprint along local X (before rotation), inches. */
  width: number;
  /** Footprint along local Z (before rotation), inches. */
  depth: number;
  height: number;
  /** Degrees. 2D plan rotates clockwise; 3D applies -rotation around Y. */
  rotation: number;
  notes?: string;
  seatingCount?: number;
  locked?: boolean;
  hidden?: boolean;
  /** Inches above the floor to the bottom of the object (chandeliers, ceiling drape). */
  elevation?: number;
  /** Optional custom tint, `#rrggbb`. Overrides the finish colour where meaningful. */
  color?: string;
  chairStyle?: StudioChairStyle;
  /** Table linen colour; null = bare table. Undefined = type default. */
  linenColor?: DrapeColor | null;
  lightColor?: DrapeColor;
  fabric?: DrapeFabric;
  drapeColor?: DrapeColor;
  fullness?: number;
};

export type StudioObjectFinishFor<T extends StudioObjectType> =
  T extends "dance_floor" ? DanceFloorFinish : GenericStudioObjectFinish;

export type StudioObject = {
  [T in StudioObjectType]: StudioObjectBase & {
    type: T;
    finish?: StudioObjectFinishFor<T>;
  };
}[StudioObjectType];

export type StudioObjectOfType<T extends StudioObjectType> = Extract<
  StudioObject,
  { type: T }
>;

export const DRAPE_RUN_TYPES = [
  "wall_drape",
  "partial_drape",
  "backdrop",
  "divider",
] as const;
export type DrapeRunType = (typeof DRAPE_RUN_TYPES)[number];

export const DRAPE_FABRICS = [
  { value: "velvet", label: "Velvet" },
  { value: "velour", label: "Velour" },
  { value: "poly", label: "Poly premier" },
  { value: "sheer", label: "Sheer" },
  { value: "satin", label: "Satin" },
  { value: "chiffon", label: "Chiffon" },
  { value: "sequin", label: "Sequin" },
] as const;
export type DrapeFabric = (typeof DRAPE_FABRICS)[number]["value"];

export const DRAPE_COLORS = [
  { value: "ivory", label: "Ivory", hex: "#eee6d7" },
  { value: "white", label: "White", hex: "#f4f2ed" },
  { value: "black", label: "Black", hex: "#171513" },
  { value: "champagne", label: "Champagne", hex: "#c9ab78" },
  { value: "gold", label: "Gold", hex: "#b98b3d" },
  { value: "navy", label: "Navy", hex: "#1d2a44" },
  { value: "burgundy", label: "Burgundy", hex: "#5a1f2b" },
  { value: "blush", label: "Blush", hex: "#c99b9e" },
  { value: "charcoal", label: "Charcoal", hex: "#343333" },
  { value: "silver", label: "Silver", hex: "#b9bbbd" },
  { value: "rose_gold", label: "Rose gold", hex: "#c99382" },
  { value: "taupe", label: "Taupe", hex: "#8b7d6b" },
  { value: "sage", label: "Sage", hex: "#9caf88" },
  { value: "emerald", label: "Emerald", hex: "#1f5a45" },
  { value: "dusty_blue", label: "Dusty blue", hex: "#7d93ab" },
  { value: "royal_blue", label: "Royal blue", hex: "#23408e" },
  { value: "lavender", label: "Lavender", hex: "#b7a6cf" },
  { value: "plum", label: "Plum", hex: "#4b2342" },
  { value: "red", label: "Red", hex: "#8e1b1f" },
  { value: "peach", label: "Peach", hex: "#e8b79a" },
] as const;
export type DrapeColor = (typeof DRAPE_COLORS)[number]["value"];

export const DRAPE_HARDWARE = [
  { value: "pipe_and_drape", label: "Pipe & drape uprights" },
  { value: "ceiling_track", label: "Ceiling track" },
  { value: "wall_mount", label: "Concealed wall mount" },
] as const;
export type DrapeHardware = (typeof DRAPE_HARDWARE)[number]["value"];

export type StudioDrapeRun = {
  id: string;
  type: DrapeRunType;
  wallIndex: number;
  startOffset: number;
  endOffset: number;
  height: number;
  fabric: DrapeFabric;
  color: DrapeColor;
  fullness: number;
  label: string;
  notes?: string;
  /** Defaults to pipe_and_drape. */
  hardware?: DrapeHardware;
  /** Floor uplights washing this run; null/undefined = none. */
  uplightColor?: DrapeColor | null;
  /** Extra fabric pooling on the floor. */
  puddle?: boolean;
  locked?: boolean;
  hidden?: boolean;
};

export const STUDIO_TREATMENT_TYPES = [
  "full_pleated_backdrop",
  "side_tieback_panels",
  "top_swag_valance",
  "ceremony_arch",
  "layered_swag",
] as const;
export type StudioTreatmentType = (typeof STUDIO_TREATMENT_TYPES)[number];

export const STUDIO_FRAME_FINISHES = [
  { value: "gold", label: "Gold" },
  { value: "black", label: "Black" },
  { value: "wood", label: "Wood look" },
  { value: "white", label: "White" },
] as const;
export type StudioFrameFinish =
  (typeof STUDIO_FRAME_FINISHES)[number]["value"];

export type StudioTreatment = {
  id: string;
  type: StudioTreatmentType;
  label: string;
  anchor: {
    kind: "wall";
    wallIndex: number;
    startOffset: number;
    endOffset: number;
  };
  height: number;
  fabric: DrapeFabric;
  color: DrapeColor;
  secondaryColor: DrapeColor;
  fullness: number;
  tiebackHeight: number;
  swagDrop: number;
  openingWidth: number;
  hasBackdrop: boolean;
  hasTopSwag: boolean;
  hasTiebacks: boolean;
  hasTopPipe: boolean;
  hasFloralHeader: boolean;
  uplightColor: DrapeColor | null;
  frameFinish: StudioFrameFinish;
  notes: string;
  /** Number of scallops for swag treatments (1–8). */
  swagCount?: number;
  hardware?: DrapeHardware;
  locked?: boolean;
  hidden?: boolean;
};

export const CEILING_DRAPE_STYLES = [
  { value: "starburst", label: "Starburst", description: "Panels radiating from a centre hub" },
  { value: "canopy", label: "Gathered canopy", description: "Fabric web gathered low at the hub" },
  { value: "tent", label: "Tented peak", description: "Continuous fabric rising to a peak" },
  { value: "swag_rows", label: "Swag rows", description: "Parallel panels sagging wall to wall" },
  { value: "billow_rows", label: "Billows", description: "Rows dipping between support lines" },
  { value: "stretch_panels", label: "Stretched panels", description: "Taut, near-flat fabric bands" },
  { value: "crisscross", label: "Criss-cross", description: "Diagonal swags crossing overhead" },
  { value: "perimeter_swag", label: "Perimeter swags", description: "Scallops framing the ceiling edge" },
  { value: "cascades", label: "Cascades", description: "Fabric falls dropping from the ceiling" },
] as const;
export type CeilingDrapeStyle = (typeof CEILING_DRAPE_STYLES)[number]["value"];

export const CEILING_LIGHT_STYLES = [
  { value: "none", label: "No lights" },
  { value: "fairy", label: "Fairy lights" },
  { value: "bistro", label: "Bistro bulbs" },
  { value: "starlight", label: "Starlight" },
] as const;
export type CeilingLightStyle = (typeof CEILING_LIGHT_STYLES)[number]["value"];

export const CEILING_HUB_DECOR = [
  { value: "none", label: "Bare hub" },
  { value: "chandelier", label: "Crystal chandelier" },
  { value: "floral_ring", label: "Floral ring" },
  { value: "rosette", label: "Fabric rosette" },
  { value: "medallion", label: "Gold medallion" },
] as const;
export type CeilingHubDecor = (typeof CEILING_HUB_DECOR)[number]["value"];

export const CEILING_COVERAGES = [
  { value: "room", label: "Whole room" },
  { value: "area", label: "Custom area" },
] as const;
export type CeilingCoverage = (typeof CEILING_COVERAGES)[number]["value"];

/**
 * A ceiling drape design. Plan coordinates are inches in the same space as
 * `room.floor`; heights are measured DOWN from the ceiling plane
 * (`room.wallHeight`), so 0 = flush to the ceiling.
 *
 * Field meaning per style is defined by `CEILING_STYLE_FIELDS` in
 * `@/lib/studio-ceiling` — the layout there is the single source of truth for
 * both the 2D plan and the 3D scene.
 */
export type StudioCeilingDrape = {
  id: string;
  type: CeilingDrapeStyle;
  label: string;
  /** "room" follows the room outline inset by `inset`; "area" uses the rectangle below. */
  coverage: CeilingCoverage;
  /** Area rectangle centre, inches. */
  x: number;
  z: number;
  /** Area rectangle size before rotation, inches. */
  width: number;
  depth: number;
  /** Degrees, same convention as objects (plan clockwise). Rotates the area and the run direction. */
  rotation: number;
  /** Distance kept from the walls when coverage is "room", inches. */
  inset: number;
  /** Hub point for radial styles, inches. */
  hubX: number;
  hubZ: number;
  /** Below-ceiling drop of the perimeter attachment line, inches. */
  edgeDrop: number;
  /** Below-ceiling drop of the hub, inches. */
  hubDrop: number;
  /** Extra belly / scallop / fall depth, inches (meaning per style). */
  sag: number;
  /** Spokes, rows, swags per direction, or cascade count (per style). */
  count: number;
  /** Fabric panel width as hung, inches. */
  panelWidth: number;
  /** Billows per row, or cascade rows (per style). */
  scallops: number;
  fabric: DrapeFabric;
  color: DrapeColor;
  /** Alternating panel colour; null = solid. */
  accentColor: DrapeColor | null;
  fullness: number;
  lights: CeilingLightStyle;
  lightColor: DrapeColor;
  hubDecor: CeilingHubDecor;
  /** Finishing valance where fabric meets the walls. */
  perimeterValance: boolean;
  /** Coloured wash on the fabric from below; null = none. */
  uplightColor: DrapeColor | null;
  notes: string;
  locked?: boolean;
  hidden?: boolean;
};

export const STUDIO_MAX_CEILING_DRAPES = 24;

export const STUDIO_CEILING_FINISHES = [
  { value: "auto", label: "Venue default" },
  { value: "flat", label: "Flat plaster" },
  { value: "tray", label: "Tray with cove" },
  { value: "coffered", label: "Coffered grid" },
  { value: "beams", label: "Exposed beams" },
  { value: "truss", label: "Industrial truss" },
  { value: "black", label: "Black-out" },
] as const;
export type StudioCeilingFinish =
  (typeof STUDIO_CEILING_FINISHES)[number]["value"];

export type StudioRoom = {
  shape: StudioRoomShape;
  name: string;
  wallHeight: number;
  floor: StudioPoint[];
  templateDimensions?: {
    width: number;
    length: number;
    originX?: number;
    originZ?: number;
    cutoutWidth?: number;
    cutoutDepth?: number;
  };
};

export type StudioDesignJson = {
  version: typeof STUDIO_DESIGN_VERSION;
  units: "inches";
  room: StudioRoom;
  openings: StudioOpening[];
  objects: StudioObject[];
  drapeRuns: StudioDrapeRun[];
  treatments: StudioTreatment[];
  /** Optional on disk; `normalizeStudioDesign` / validation always fill it. */
  ceilingDrapes?: StudioCeilingDrape[];
  view: {
    cameraMode: "orbit";
    /** Legacy glass-walls flag; `wallDisplay: "glass"` supersedes it. */
    transparentWalls?: boolean;
    wallDisplay?: StudioWallDisplay;
    showCeiling?: boolean;
  };
  materials?: StudioMaterials;
  notes: string;
};

export const STUDIO_WALL_DISPLAYS = [
  { value: "full", label: "Full walls" },
  { value: "cutaway", label: "Dollhouse cutaway" },
  { value: "low", label: "Low walls" },
  { value: "glass", label: "Glass walls" },
] as const;
export type StudioWallDisplay =
  (typeof STUDIO_WALL_DISPLAYS)[number]["value"];

export function getStudioWallDisplay(
  view: StudioDesignJson["view"]
): StudioWallDisplay {
  if (
    view.wallDisplay &&
    STUDIO_WALL_DISPLAYS.some((option) => option.value === view.wallDisplay)
  ) {
    return view.wallDisplay;
  }
  return view.transparentWalls ? "glass" : "full";
}

export type StudioDesignRow = {
  id: string;
  owner_user_id: string | null;
  created_by_user_id: string | null;
  estimate_request_id: string | null;
  quote_id: string | null;
  job_id: string | null;
  opportunity_ref: string | null;
  title: string;
  status: StudioDesignStatus;
  design_json: StudioDesignJson;
  preview_image_url: string | null;
  thumbnail_data_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StudioTemplateKey = "rectangle" | "l_shape" | "custom";

export const STUDIO_TEMPLATES: Record<StudioTemplateKey, StudioDesignJson> = {
  rectangle: {
    version: 1,
    units: "inches",
    room: {
      shape: "rectangle",
      name: "Main room",
      wallHeight: 144,
      floor: [
        { x: 0, z: 0 },
        { x: 720, z: 0 },
        { x: 720, z: 480 },
        { x: 0, z: 480 },
      ],
      templateDimensions: { width: 720, length: 480 },
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    treatments: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: { ...DEFAULT_STUDIO_MATERIALS },
    notes: "",
  },
  l_shape: {
    version: 1,
    units: "inches",
    room: {
      shape: "l_shape",
      name: "L-shaped room",
      wallHeight: 144,
      floor: [
        { x: 0, z: 0 },
        { x: 720, z: 0 },
        { x: 720, z: 240 },
        { x: 480, z: 240 },
        { x: 480, z: 480 },
        { x: 0, z: 480 },
      ],
      templateDimensions: {
        width: 720,
        length: 480,
        cutoutWidth: 240,
        cutoutDepth: 240,
      },
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    treatments: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: { ...DEFAULT_STUDIO_MATERIALS },
    notes: "",
  },
  custom: {
    version: 1,
    units: "inches",
    room: {
      shape: "custom",
      name: "Custom room",
      wallHeight: 144,
      floor: [
        { x: 0, z: 0 },
        { x: 600, z: 0 },
        { x: 600, z: 420 },
        { x: 0, z: 420 },
      ],
    },
    openings: [],
    objects: [],
    drapeRuns: [],
    treatments: [],
    view: { cameraMode: "orbit", transparentWalls: false },
    materials: { ...DEFAULT_STUDIO_MATERIALS },
    notes: "",
  },
};

export type StudioObjectOption = {
  type: StudioObjectType;
  label: string;
  description: string;
  category: StudioObjectCategory;
  width: number;
  depth: number;
  height: number;
  finish?: StudioObjectFinish;
  seatingCount?: number;
  elevation?: number;
  chairStyle?: StudioChairStyle;
  linenColor?: DrapeColor | null;
  lightColor?: DrapeColor;
  fabric?: DrapeFabric;
  drapeColor?: DrapeColor;
  fullness?: number;
};

export const STUDIO_OBJECT_OPTIONS: StudioObjectOption[] = [
  { type: "round_table", label: "Round table", description: "60\u2033 guest round", category: "tables", width: 60, depth: 60, height: 30, seatingCount: 8, chairStyle: DEFAULT_CHAIR_STYLE, linenColor: "ivory" },
  { type: "rectangle_table", label: "Banquet table", description: "8\u2032 rectangle", category: "tables", width: 96, depth: 36, height: 30, seatingCount: 8, chairStyle: DEFAULT_CHAIR_STYLE, linenColor: "ivory" },
  { type: "head_table", label: "Head table", description: "Long one-sided table", category: "tables", width: 192, depth: 30, height: 30, seatingCount: 8, chairStyle: DEFAULT_CHAIR_STYLE, linenColor: "ivory" },
  { type: "sweetheart_table", label: "Sweetheart table", description: "Couple's table", category: "tables", width: 60, depth: 30, height: 30, seatingCount: 2, chairStyle: DEFAULT_CHAIR_STYLE, linenColor: "champagne" },
  { type: "cocktail_table", label: "Cocktail table", description: "Draped high-top", category: "tables", width: 30, depth: 30, height: 42, seatingCount: 0, chairStyle: "none", linenColor: "ivory" },
  { type: "buffet_table", label: "Buffet table", description: "Skirted service line", category: "tables", width: 96, depth: 30, height: 30, linenColor: "white" },
  { type: "cake_table", label: "Cake table", description: "Round display table", category: "tables", width: 36, depth: 36, height: 30, linenColor: "ivory" },
  { type: "ceremony_seating", label: "Ceremony rows", description: "Rows with centre aisle", category: "seating", width: 288, depth: 216, height: 34, seatingCount: 96, chairStyle: "chiavari_white" },
  { type: "chair", label: "Single chair", description: "One accent chair", category: "seating", width: 18, depth: 18, height: 36, chairStyle: DEFAULT_CHAIR_STYLE },
  { type: "sofa", label: "Lounge sofa", description: "Three-seat sofa", category: "seating", width: 84, depth: 36, height: 32, finish: "upholstered" },
  { type: "lounge_area", label: "Lounge area", description: "Soft seating zone", category: "seating", width: 144, depth: 120, height: 36, seatingCount: 8 },
  { type: "drape_backdrop", label: "Freestanding backdrop", description: "Pipe & drape anywhere", category: "drapery", width: 120, depth: 24, height: 96, fabric: "velvet", drapeColor: "ivory", fullness: 2 },
  { type: "ceiling_drape", label: "Ceiling canopy", description: "Swagged ceiling fabric", category: "drapery", width: 240, depth: 240, height: 36, fabric: "chiffon", drapeColor: "white", fullness: 2 },
  { type: "stage", label: "Stage", description: "Skirted platform", category: "production", width: 240, depth: 96, height: 24, finish: "painted_black" },
  { type: "dance_floor", label: "Dance floor", description: "Nine finish presets", category: "production", width: 240, depth: 240, height: 2, finish: DEFAULT_DANCE_FLOOR_FINISH },
  { type: "dj_booth", label: "DJ booth", description: "Facade & decks", category: "production", width: 72, depth: 36, height: 42, finish: "painted_white" },
  { type: "bar", label: "Bar", description: "Service counter", category: "production", width: 96, depth: 30, height: 42, finish: "natural_wood" },
  { type: "photo_booth", label: "Photo booth", description: "Booth with backdrop", category: "production", width: 96, depth: 96, height: 96 },
  { type: "podium", label: "Podium", description: "Speaker lectern", category: "production", width: 24, depth: 20, height: 46, finish: "natural_wood" },
  { type: "av_screen", label: "AV screen", description: "Projection screen", category: "production", width: 120, depth: 24, height: 96 },
  { type: "piano", label: "Grand piano", description: "Baby grand", category: "production", width: 60, depth: 66, height: 40, finish: "painted_black" },
  { type: "uplight", label: "Uplight", description: "Coloured LED wash", category: "decor", width: 12, depth: 12, height: 8, lightColor: "gold" },
  { type: "chandelier", label: "Chandelier", description: "Crystal centrepiece", category: "decor", width: 36, depth: 36, height: 36, elevation: 96, lightColor: "champagne" },
  { type: "plant", label: "Potted plant", description: "Greenery accent", category: "decor", width: 24, depth: 24, height: 72 },
  { type: "column", label: "Column", description: "Venue pillar", category: "decor", width: 24, depth: 24, height: 144, finish: "painted_white" },
  { type: "entrance_marker", label: "Entrance arch", description: "Upright wayfinding", category: "zones", width: 72, depth: 24, height: 84, finish: "gold" },
  { type: "table_area", label: "Table area", description: "Flexible seating zone", category: "zones", width: 120, depth: 120, height: 30, seatingCount: 10 },
];

export function getStudioObjectOption(
  type: StudioObjectType
): StudioObjectOption | undefined {
  return STUDIO_OBJECT_OPTIONS.find((option) => option.type === type);
}

/** Builds a clean, valid object from the library defaults. */
export function createStudioObject(
  type: StudioObjectType,
  position: { x: number; z: number },
  overrides: Partial<Omit<StudioObject, "type">> = {}
): StudioObject {
  const option = getStudioObjectOption(type);
  const base = {
    id: createStudioItemId("object"),
    type,
    label: option?.label ?? type.replaceAll("_", " "),
    x: position.x,
    z: position.z,
    width: option?.width ?? 48,
    depth: option?.depth ?? 48,
    height: option?.height ?? 30,
    rotation: 0,
    notes: "",
    ...(option?.finish
      ? { finish: option.finish }
      : type === "dance_floor"
        ? { finish: DEFAULT_DANCE_FLOOR_FINISH }
        : {}),
    ...(option?.seatingCount !== undefined
      ? { seatingCount: option.seatingCount }
      : {}),
    ...(option?.elevation !== undefined ? { elevation: option.elevation } : {}),
    ...(option?.chairStyle ? { chairStyle: option.chairStyle } : {}),
    ...(option?.linenColor !== undefined
      ? { linenColor: option.linenColor }
      : {}),
    ...(option?.lightColor ? { lightColor: option.lightColor } : {}),
    ...(option?.fabric ? { fabric: option.fabric } : {}),
    ...(option?.drapeColor ? { drapeColor: option.drapeColor } : {}),
    ...(option?.fullness !== undefined ? { fullness: option.fullness } : {}),
    ...overrides,
  };
  return base as StudioObject;
}

export const STUDIO_STATUS_LABELS: Record<StudioDesignStatus, string> = {
  draft: "Draft",
  saved: "Saved",
  archived: "Archived",
};

export function cloneStudioTemplate(
  template: StudioTemplateKey = "rectangle"
): StudioDesignJson {
  return structuredClone(STUDIO_TEMPLATES[template]);
}

export function getDrapeColorHex(color: string): string {
  return DRAPE_COLORS.find((option) => option.value === color)?.hex ?? "#eee6d7";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getStudioMaterials(design: {
  materials?: unknown;
}): StudioMaterials {
  const materials = isRecord(design.materials) ? design.materials : {};
  const floor = STUDIO_FLOOR_FINISHES.some(
    (option) => option.value === materials.floor
  )
    ? (materials.floor as StudioFloorFinish)
    : DEFAULT_STUDIO_MATERIALS.floor;
  const walls = STUDIO_WALL_FINISHES.some(
    (option) => option.value === materials.walls
  )
    ? (materials.walls as StudioWallFinish)
    : DEFAULT_STUDIO_MATERIALS.walls;
  const lighting = STUDIO_LIGHTING_MOODS.some(
    (option) => option.value === materials.lighting
  )
    ? (materials.lighting as StudioLightingMood)
    : DEFAULT_STUDIO_MATERIALS.lighting;
  const uplightColor = DRAPE_COLORS.some(
    (option) => option.value === materials.uplightColor
  )
    ? (materials.uplightColor as DrapeColor)
    : null;
  const ceiling = STUDIO_CEILING_FINISHES.some(
    (option) => option.value === materials.ceiling
  )
    ? (materials.ceiling as StudioCeilingFinish)
    : "auto";
  return { floor, walls, lighting, uplightColor, ceiling };
}

/** Ceiling drape designs; always an array even for designs saved before they existed. */
export function getCeilingDrapes(design: {
  ceilingDrapes?: StudioCeilingDrape[];
}): StudioCeilingDrape[] {
  return Array.isArray(design.ceilingDrapes) ? design.ceilingDrapes : [];
}

function isValidCeilingDrape(drape: unknown): boolean {
  if (!hasStableId(drape)) return false;
  const inRange = (value: unknown, min: number, max: number) =>
    isFiniteNumber(value) && value >= min && value <= max;
  return (
    CEILING_DRAPE_STYLES.some((option) => option.value === drape.type) &&
    isRequiredString(drape.label, STUDIO_LABEL_MAX_LENGTH) &&
    CEILING_COVERAGES.some((option) => option.value === drape.coverage) &&
    inRange(drape.x, -120000, 120000) &&
    inRange(drape.z, -120000, 120000) &&
    inRange(drape.width, 12, 120000) &&
    inRange(drape.depth, 12, 120000) &&
    inRange(drape.rotation, -36000, 36000) &&
    inRange(drape.inset, 0, 600) &&
    inRange(drape.hubX, -120000, 120000) &&
    inRange(drape.hubZ, -120000, 120000) &&
    inRange(drape.edgeDrop, 0, 480) &&
    inRange(drape.hubDrop, 0, 480) &&
    inRange(drape.sag, 0, 480) &&
    Number.isInteger(drape.count) &&
    inRange(drape.count, 1, 64) &&
    inRange(drape.panelWidth, 6, 480) &&
    Number.isInteger(drape.scallops) &&
    inRange(drape.scallops, 1, 16) &&
    DRAPE_FABRICS.some((option) => option.value === drape.fabric) &&
    DRAPE_COLORS.some((option) => option.value === drape.color) &&
    isOptionalDrapeColor(drape.accentColor, true) &&
    drape.accentColor !== undefined &&
    inRange(drape.fullness, 1, 4) &&
    CEILING_LIGHT_STYLES.some((option) => option.value === drape.lights) &&
    DRAPE_COLORS.some((option) => option.value === drape.lightColor) &&
    CEILING_HUB_DECOR.some((option) => option.value === drape.hubDecor) &&
    typeof drape.perimeterValance === "boolean" &&
    isOptionalDrapeColor(drape.uplightColor, true) &&
    drape.uplightColor !== undefined &&
    typeof drape.notes === "string" &&
    drape.notes.length <= STUDIO_NOTES_MAX_LENGTH &&
    isOptionalBoolean(drape.locked) &&
    isOptionalBoolean(drape.hidden)
  );
}

function hasStableId(
  value: unknown
): value is Record<string, unknown> & { id: string } {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 100
  );
}

function isRequiredString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isOptionalString(value: unknown, maxLength: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function isOptionalSeatingCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= STUDIO_MAX_SEATING_COUNT)
  );
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalRange(value: unknown, min: number, max: number): boolean {
  return (
    value === undefined ||
    (isFiniteNumber(value) && value >= min && value <= max)
  );
}

function isOptionalDrapeColor(value: unknown, allowNull = false): boolean {
  if (value === undefined) return true;
  if (value === null) return allowNull;
  return DRAPE_COLORS.some((option) => option.value === value);
}

function isOptionalOption<T extends { value: string }>(
  value: unknown,
  options: readonly T[]
): boolean {
  return value === undefined || options.some((option) => option.value === value);
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function isValidObjectExtras(object: Record<string, unknown>): boolean {
  return (
    isOptionalBoolean(object.locked) &&
    isOptionalBoolean(object.hidden) &&
    isOptionalRange(object.elevation, 0, 600) &&
    (object.color === undefined ||
      (typeof object.color === "string" && HEX_COLOR_PATTERN.test(object.color))) &&
    isOptionalOption(object.chairStyle, STUDIO_CHAIR_STYLES) &&
    isOptionalDrapeColor(object.linenColor, true) &&
    isOptionalDrapeColor(object.lightColor) &&
    isOptionalOption(object.fabric, DRAPE_FABRICS) &&
    isOptionalDrapeColor(object.drapeColor) &&
    isOptionalRange(object.fullness, 1, 4)
  );
}

function isValidStudioObjectFinish(type: unknown, finish: unknown): boolean {
  if (finish === undefined) return true;
  const options =
    type === "dance_floor" ? DANCE_FLOOR_FINISHES : GENERIC_OBJECT_FINISHES;
  return options.some((option) => option.value === finish);
}

function getFloorWallLength(
  floor: StudioPoint[] | null,
  wallIndex: number
): number | null {
  if (!floor || !Number.isInteger(wallIndex) || wallIndex < 0 || wallIndex >= floor.length) {
    return null;
  }
  const start = floor[wallIndex];
  const end = floor[(wallIndex + 1) % floor.length];
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function pointDistanceSquared(a: StudioPoint, b: StudioPoint): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function crossProduct(
  a: StudioPoint,
  b: StudioPoint,
  c: StudioPoint
): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function pointOnSegment(
  point: StudioPoint,
  start: StudioPoint,
  end: StudioPoint,
  tolerance: number
): boolean {
  const segmentLength = Math.max(
    1,
    Math.hypot(end.x - start.x, end.z - start.z)
  );
  if (Math.abs(crossProduct(start, end, point)) > tolerance * segmentLength) {
    return false;
  }
  return (
    point.x >= Math.min(start.x, end.x) - tolerance &&
    point.x <= Math.max(start.x, end.x) + tolerance &&
    point.z >= Math.min(start.z, end.z) - tolerance &&
    point.z <= Math.max(start.z, end.z) + tolerance
  );
}

function segmentsIntersect(
  a: StudioPoint,
  b: StudioPoint,
  c: StudioPoint,
  d: StudioPoint,
  tolerance: number
): boolean {
  const abLength = Math.max(1, Math.hypot(b.x - a.x, b.z - a.z));
  const cdLength = Math.max(1, Math.hypot(d.x - c.x, d.z - c.z));
  const abTolerance = tolerance * abLength;
  const cdTolerance = tolerance * cdLength;
  const abc = crossProduct(a, b, c);
  const abd = crossProduct(a, b, d);
  const cda = crossProduct(c, d, a);
  const cdb = crossProduct(c, d, b);

  if (
    ((abc > abTolerance && abd < -abTolerance) ||
      (abc < -abTolerance && abd > abTolerance)) &&
    ((cda > cdTolerance && cdb < -cdTolerance) ||
      (cda < -cdTolerance && cdb > cdTolerance))
  ) {
    return true;
  }

  return (
    (Math.abs(abc) <= abTolerance && pointOnSegment(c, a, b, tolerance)) ||
    (Math.abs(abd) <= abTolerance && pointOnSegment(d, a, b, tolerance)) ||
    (Math.abs(cda) <= cdTolerance && pointOnSegment(a, c, d, tolerance)) ||
    (Math.abs(cdb) <= cdTolerance && pointOnSegment(b, c, d, tolerance))
  );
}

function adjacentEdgesOverlap(
  outerA: StudioPoint,
  shared: StudioPoint,
  outerB: StudioPoint,
  tolerance: number
): boolean {
  const collinear =
    Math.abs(crossProduct(outerA, shared, outerB)) <=
    tolerance *
      Math.max(
        1,
        Math.hypot(shared.x - outerA.x, shared.z - outerA.z),
        Math.hypot(outerB.x - shared.x, outerB.z - shared.z)
      );
  return (
    collinear &&
    (pointOnSegment(outerA, shared, outerB, tolerance) ||
      pointOnSegment(outerB, outerA, shared, tolerance))
  );
}

function validateRoomPolygon(points: StudioPoint[]): string[] {
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const span = Math.max(
    1,
    Math.max(...xs) - Math.min(...xs),
    Math.max(...zs) - Math.min(...zs)
  );
  const coordinateTolerance = Math.max(1e-7, span * 1e-10);
  const distanceToleranceSquared = coordinateTolerance * coordinateTolerance;
  const errors: string[] = [];

  const hasDuplicateAdjacentPoint = points.some((point, index) => {
    const next = points[(index + 1) % points.length];
    return pointDistanceSquared(point, next) <= distanceToleranceSquared;
  });
  if (hasDuplicateAdjacentPoint) {
    errors.push(
      "The room outline has duplicate neighboring points. Move or remove one of them."
    );
  }

  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    doubledArea += current.x * next.z - next.x * current.z;
  }
  const areaTolerance = Math.max(1e-4, span * span * 1e-10);
  if (Math.abs(doubledArea) / 2 <= areaTolerance) {
    errors.push(
      "The room outline must enclose a measurable area; its points appear collinear."
    );
  }

  let selfIntersects = false;
  for (
    let firstIndex = 0;
    firstIndex < points.length && !selfIntersects;
    firstIndex += 1
  ) {
    const firstStart = points[firstIndex];
    const firstEnd = points[(firstIndex + 1) % points.length];
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < points.length;
      secondIndex += 1
    ) {
      const secondStart = points[secondIndex];
      const secondEnd = points[(secondIndex + 1) % points.length];
      const consecutive = secondIndex === firstIndex + 1;
      const closesPolygon =
        firstIndex === 0 && secondIndex === points.length - 1;

      if (consecutive) {
        selfIntersects = adjacentEdgesOverlap(
          firstStart,
          firstEnd,
          secondEnd,
          coordinateTolerance
        );
      } else if (closesPolygon) {
        selfIntersects = adjacentEdgesOverlap(
          secondStart,
          secondEnd,
          firstEnd,
          coordinateTolerance
        );
      } else {
        selfIntersects = segmentsIntersect(
          firstStart,
          firstEnd,
          secondStart,
          secondEnd,
          coordinateTolerance
        );
      }
      if (selfIntersects) break;
    }
  }
  if (selfIntersects) {
    errors.push(
      "The room outline crosses or overlaps itself. Adjust the walls so they form one simple boundary."
    );
  }

  return errors;
}

function roomFloorMatchesTemplate(
  actual: StudioPoint[],
  expected: StudioPoint[],
  tolerance = 1e-6
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (point, index) =>
        Math.abs(point.x - expected[index].x) <= tolerance &&
        Math.abs(point.z - expected[index].z) <= tolerance
    )
  );
}

export type StudioValidationResult =
  | { valid: true; design: StudioDesignJson; bytes: number }
  | { valid: false; errors: string[]; bytes: number };

export function validateStudioDesign(
  value: unknown,
  maxBytes = STUDIO_MAX_PAYLOAD_BYTES
): StudioValidationResult {
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { valid: false, errors: ["The room design is not valid JSON."], bytes: 0 };
  }

  const bytes = new TextEncoder().encode(serialized).byteLength;
  const errors: string[] = [];
  if (bytes > maxBytes) {
    errors.push("The room design is too large to save.");
  }
  if (!isRecord(value)) {
    return { valid: false, errors: [...errors, "The room design is invalid."], bytes };
  }
  if (value.version !== STUDIO_DESIGN_VERSION || value.units !== "inches") {
    errors.push("This room design version is not supported.");
  }

  let floorPoints: StudioPoint[] | null = null;
  let expectedTemplateFloor: StudioPoint[] | null = null;
  const room = value.room;
  if (!isRecord(room)) {
    errors.push("Room details are required.");
  } else {
    if (!ROOM_SHAPES.includes(room.shape as StudioRoomShape)) {
      errors.push("Choose a supported room shape.");
    }
    if (
      typeof room.name !== "string" ||
      room.name.trim().length === 0 ||
      room.name.length > STUDIO_LABEL_MAX_LENGTH
    ) {
      errors.push("Enter a room name under 160 characters.");
    }
    if (
      !isFiniteNumber(room.wallHeight) ||
      room.wallHeight < 72 ||
      room.wallHeight > 600
    ) {
      errors.push("Wall height must be between 6 and 50 feet.");
    }
    const templateDimensions = room.templateDimensions;
    if (room.shape === "custom") {
      if (templateDimensions !== undefined) {
        errors.push("Custom room outlines cannot include template dimensions.");
      }
    } else if (room.shape === "rectangle" || room.shape === "l_shape") {
      const minimumSide = room.shape === "l_shape" ? 24 : 12;
      if (
        !isRecord(templateDimensions) ||
        !isFiniteNumber(templateDimensions.width) ||
        templateDimensions.width < minimumSide ||
        templateDimensions.width > 120000 ||
        !isFiniteNumber(templateDimensions.length) ||
        templateDimensions.length < minimumSide ||
        templateDimensions.length > 120000 ||
        (templateDimensions.originX !== undefined &&
          (!isFiniteNumber(templateDimensions.originX) ||
            Math.abs(templateDimensions.originX) > 120000)) ||
        (templateDimensions.originZ !== undefined &&
          (!isFiniteNumber(templateDimensions.originZ) ||
            Math.abs(templateDimensions.originZ) > 120000))
      ) {
        errors.push(
          "Room template width and length must use valid, in-range dimensions."
        );
      } else if (room.shape === "l_shape") {
        if (
          !isFiniteNumber(templateDimensions.cutoutWidth) ||
          templateDimensions.cutoutWidth < 12 ||
          templateDimensions.cutoutWidth >
            templateDimensions.width - 12 ||
          !isFiniteNumber(templateDimensions.cutoutDepth) ||
          templateDimensions.cutoutDepth < 12 ||
          templateDimensions.cutoutDepth >
            templateDimensions.length - 12
        ) {
          errors.push(
            "L-shape cutout dimensions must fit inside the room with at least one foot remaining."
          );
        } else {
          const originX = templateDimensions.originX ?? 0;
          const originZ = templateDimensions.originZ ?? 0;
          expectedTemplateFloor = createLShapeRoom(
            templateDimensions.width,
            templateDimensions.length,
            templateDimensions.cutoutWidth,
            templateDimensions.cutoutDepth
          ).map((point) => ({
            x: point.x + originX,
            z: point.z + originZ,
          }));
        }
      } else if (
        templateDimensions.cutoutWidth !== undefined ||
        templateDimensions.cutoutDepth !== undefined
      ) {
        errors.push(
          "Rectangle room templates cannot include L-shape cutout dimensions."
        );
      } else {
        const originX = templateDimensions.originX ?? 0;
        const originZ = templateDimensions.originZ ?? 0;
        expectedTemplateFloor = createRectangleRoom(
          templateDimensions.width,
          templateDimensions.length
        ).map((point) => ({
          x: point.x + originX,
          z: point.z + originZ,
        }));
      }
    }
    const floor = room.floor;
    const minimumPoints = room.shape === "l_shape" ? 6 : 4;
    if (!Array.isArray(floor) || floor.length < minimumPoints || floor.length > 64) {
      errors.push(`The ${String(room.shape)} room outline is incomplete.`);
    } else if (
      floor.some(
        (point) =>
          !isRecord(point) ||
          !isFiniteNumber(point.x) ||
          !isFiniteNumber(point.z) ||
          Math.abs(point.x) > 120000 ||
          Math.abs(point.z) > 120000
      )
    ) {
      errors.push("Room outline points must use valid dimensions.");
    } else {
      floorPoints = floor as StudioPoint[];
      errors.push(...validateRoomPolygon(floorPoints));
      if (
        expectedTemplateFloor &&
        !roomFloorMatchesTemplate(floorPoints, expectedTemplateFloor)
      ) {
        errors.push(
          "The room outline does not match its template dimensions. Reapply the room dimensions before saving."
        );
      }
    }
  }

  const seenIds = new Set<string>();
  const openings = value.openings;
  if (!Array.isArray(openings) || openings.length > 100) {
    errors.push("Openings must be a valid list.");
  } else {
    for (const opening of openings) {
      const stableId = hasStableId(opening);
      if (stableId && seenIds.has(opening.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(opening.id);
      const wallIndex =
        isRecord(opening) && isFiniteNumber(opening.wallIndex)
          ? opening.wallIndex
          : -1;
      const wallLength = getFloorWallLength(floorPoints, wallIndex);
      if (
        !stableId ||
        !isRecord(opening) ||
        !STUDIO_OPENING_TYPES.includes(opening.type as StudioOpeningType) ||
        !isOptionalRange(opening.sillHeight, 0, 600) ||
        !isOptionalRange(opening.openingHeight, 12, 600) ||
        !isOptionalBoolean(opening.locked) ||
        !isOptionalBoolean(opening.hidden) ||
        !isRequiredString(opening.label, STUDIO_LABEL_MAX_LENGTH) ||
        !Number.isInteger(wallIndex) ||
        wallLength === null ||
        !isFiniteNumber(opening.offset) ||
        opening.offset < 0 ||
        opening.offset > 120000 ||
        !isFiniteNumber(opening.width) ||
        opening.width <= 0 ||
        opening.width > 120000 ||
        (wallLength !== null &&
          opening.offset + opening.width > wallLength + 0.001)
      ) {
        errors.push("One or more door/opening markers are invalid.");
        break;
      }
    }
  }

  const objects = value.objects;
  if (!Array.isArray(objects) || objects.length > STUDIO_MAX_OBJECTS) {
    errors.push("Room objects must be a valid list.");
  } else {
    for (const object of objects) {
      const stableId = hasStableId(object);
      if (stableId && seenIds.has(object.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(object.id);
      if (
        !stableId ||
        !isRecord(object) ||
        !STUDIO_OBJECT_TYPES.includes(object.type as StudioObjectType) ||
        !isRequiredString(object.label, STUDIO_LABEL_MAX_LENGTH) ||
        !isFiniteNumber(object.x) ||
        Math.abs(object.x) > 120000 ||
        !isFiniteNumber(object.z) ||
        Math.abs(object.z) > 120000 ||
        !isFiniteNumber(object.width) ||
        object.width <= 0 ||
        object.width > 120000 ||
        !isFiniteNumber(object.depth) ||
        object.depth <= 0 ||
        object.depth > 120000 ||
        !isFiniteNumber(object.height) ||
        object.height < 0 ||
        object.height > 600 ||
        !isFiniteNumber(object.rotation) ||
        Math.abs(object.rotation) > 36000 ||
        !isOptionalString(object.notes, STUDIO_OBJECT_NOTES_MAX_LENGTH) ||
        !isValidStudioObjectFinish(object.type, object.finish) ||
        !isOptionalSeatingCount(object.seatingCount) ||
        !isValidObjectExtras(object)
      ) {
        errors.push("One or more room objects are invalid.");
        break;
      }
    }
  }

  const drapeRuns = value.drapeRuns;
  if (!Array.isArray(drapeRuns) || drapeRuns.length > 200) {
    errors.push("Drape runs must be a valid list.");
  } else {
    for (const drape of drapeRuns) {
      const stableId = hasStableId(drape);
      if (stableId && seenIds.has(drape.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(drape.id);
      const wallIndex =
        isRecord(drape) && isFiniteNumber(drape.wallIndex)
          ? drape.wallIndex
          : -1;
      const wallLength = getFloorWallLength(floorPoints, wallIndex);
      if (
        !stableId ||
        !isRecord(drape) ||
        !DRAPE_RUN_TYPES.includes(drape.type as DrapeRunType) ||
        !DRAPE_FABRICS.some((fabric) => fabric.value === drape.fabric) ||
        !DRAPE_COLORS.some((color) => color.value === drape.color) ||
        !isRequiredString(drape.label, STUDIO_LABEL_MAX_LENGTH) ||
        !isOptionalString(drape.notes, STUDIO_NOTES_MAX_LENGTH) ||
        !Number.isInteger(wallIndex) ||
        wallLength === null ||
        !isFiniteNumber(drape.startOffset) ||
        drape.startOffset < 0 ||
        drape.startOffset > 120000 ||
        !isFiniteNumber(drape.endOffset) ||
        drape.endOffset <= drape.startOffset ||
        drape.endOffset > 120000 ||
        (wallLength !== null && drape.endOffset > wallLength + 0.001) ||
        !isFiniteNumber(drape.height) ||
        drape.height <= 0 ||
        drape.height > 600 ||
        !isFiniteNumber(drape.fullness) ||
        drape.fullness < 1 ||
        drape.fullness > 4 ||
        !isOptionalOption(drape.hardware, DRAPE_HARDWARE) ||
        !isOptionalDrapeColor(drape.uplightColor, true) ||
        !isOptionalBoolean(drape.puddle) ||
        !isOptionalBoolean(drape.locked) ||
        !isOptionalBoolean(drape.hidden)
      ) {
        errors.push("One or more drape runs are invalid.");
        break;
      }
    }
  }

  const treatments =
    value.treatments === undefined ? [] : value.treatments;
  if (!Array.isArray(treatments) || treatments.length > 100) {
    errors.push("Drape treatments must be a valid list.");
  } else {
    for (const treatment of treatments) {
      const stableId = hasStableId(treatment);
      if (stableId && seenIds.has(treatment.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(treatment.id);
      const anchor =
        isRecord(treatment) && isRecord(treatment.anchor)
          ? treatment.anchor
          : null;
      const wallIndex =
        anchor && isFiniteNumber(anchor.wallIndex) ? anchor.wallIndex : -1;
      const wallLength = getFloorWallLength(floorPoints, wallIndex);
      if (
        !stableId ||
        !isRecord(treatment) ||
        !anchor ||
        !STUDIO_TREATMENT_TYPES.includes(
          treatment.type as StudioTreatmentType
        ) ||
        !isRequiredString(treatment.label, STUDIO_LABEL_MAX_LENGTH) ||
        anchor.kind !== "wall" ||
        !Number.isInteger(wallIndex) ||
        wallLength === null ||
        !isFiniteNumber(anchor.startOffset) ||
        anchor.startOffset < 0 ||
        anchor.startOffset > 120000 ||
        !isFiniteNumber(anchor.endOffset) ||
        anchor.endOffset <= anchor.startOffset ||
        anchor.endOffset > 120000 ||
        (wallLength !== null && anchor.endOffset > wallLength + 0.001) ||
        !DRAPE_FABRICS.some((fabric) => fabric.value === treatment.fabric) ||
        !DRAPE_COLORS.some((color) => color.value === treatment.color) ||
        !DRAPE_COLORS.some(
          (color) => color.value === treatment.secondaryColor
        ) ||
        !isFiniteNumber(treatment.height) ||
        treatment.height <= 0 ||
        treatment.height > 600 ||
        !isFiniteNumber(treatment.fullness) ||
        treatment.fullness < 1 ||
        treatment.fullness > 4 ||
        !isFiniteNumber(treatment.tiebackHeight) ||
        treatment.tiebackHeight < 0 ||
        treatment.tiebackHeight > 600 ||
        !isFiniteNumber(treatment.swagDrop) ||
        treatment.swagDrop < 0 ||
        treatment.swagDrop > 600 ||
        !isFiniteNumber(treatment.openingWidth) ||
        treatment.openingWidth < 0 ||
        treatment.openingWidth > 120000 ||
        typeof treatment.hasBackdrop !== "boolean" ||
        typeof treatment.hasTopSwag !== "boolean" ||
        typeof treatment.hasTiebacks !== "boolean" ||
        typeof treatment.hasTopPipe !== "boolean" ||
        typeof treatment.hasFloralHeader !== "boolean" ||
        (treatment.uplightColor !== null &&
          !DRAPE_COLORS.some(
            (color) => color.value === treatment.uplightColor
          )) ||
        !STUDIO_FRAME_FINISHES.some(
          (finish) => finish.value === treatment.frameFinish
        ) ||
        !isOptionalString(treatment.notes, STUDIO_NOTES_MAX_LENGTH) ||
        !isOptionalRange(treatment.swagCount, 1, 8) ||
        !isOptionalOption(treatment.hardware, DRAPE_HARDWARE) ||
        !isOptionalBoolean(treatment.locked) ||
        !isOptionalBoolean(treatment.hidden)
      ) {
        errors.push("One or more drape treatments are invalid.");
        break;
      }
    }
  }

  const ceilingDrapes =
    value.ceilingDrapes === undefined ? [] : value.ceilingDrapes;
  if (
    !Array.isArray(ceilingDrapes) ||
    ceilingDrapes.length > STUDIO_MAX_CEILING_DRAPES
  ) {
    errors.push("Ceiling drape designs must be a valid list.");
  } else {
    for (const drape of ceilingDrapes) {
      const stableId = hasStableId(drape);
      if (stableId && seenIds.has(drape.id)) {
        errors.push("Studio item IDs must be unique.");
        break;
      }
      if (stableId) seenIds.add(drape.id);
      if (!isValidCeilingDrape(drape)) {
        errors.push("One or more ceiling drape designs are invalid.");
        break;
      }
    }
  }

  if (
    typeof value.notes !== "string" ||
    value.notes.length > STUDIO_NOTES_MAX_LENGTH
  ) {
    errors.push(`Design notes must be under ${STUDIO_NOTES_MAX_LENGTH} characters.`);
  }

  if (
    !isRecord(value.view) ||
    value.view.cameraMode !== "orbit" ||
    (value.view.transparentWalls !== undefined &&
      typeof value.view.transparentWalls !== "boolean") ||
    !isOptionalOption(value.view.wallDisplay, STUDIO_WALL_DISPLAYS) ||
    !isOptionalBoolean(value.view.showCeiling)
  ) {
    errors.push("Studio view settings are invalid.");
  }

  if (value.materials !== undefined) {
    const materials = value.materials;
    if (
      !isRecord(materials) ||
      !STUDIO_FLOOR_FINISHES.some(
        (option) => option.value === materials.floor
      ) ||
      !STUDIO_WALL_FINISHES.some(
        (option) => option.value === materials.walls
      ) ||
      !STUDIO_LIGHTING_MOODS.some(
        (option) => option.value === materials.lighting
      ) ||
      !isOptionalDrapeColor(materials.uplightColor, true) ||
      !isOptionalOption(materials.ceiling, STUDIO_CEILING_FINISHES)
    ) {
      errors.push("Studio room finish settings are invalid.");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, bytes };
  }
  return {
    valid: true,
    design: {
      ...(value as StudioDesignJson),
      treatments: treatments as StudioTreatment[],
      ceilingDrapes: ceilingDrapes as StudioCeilingDrape[],
      materials: getStudioMaterials(value),
    },
    bytes,
  };
}

export function normalizeStudioDesign(
  design: StudioDesignJson
): StudioDesignJson {
  return {
    ...design,
    treatments: Array.isArray(design.treatments) ? design.treatments : [],
    ceilingDrapes: getCeilingDrapes(design),
    materials: getStudioMaterials(design),
  };
}

export function createStudioItemId(
  prefix: "drape" | "object" | "opening" | "treatment" | "ceiling"
): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}
