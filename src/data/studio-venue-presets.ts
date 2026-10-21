import type {
  StudioFloorFinish,
  StudioLightingMood,
  StudioPoint,
  StudioRoomShape,
  StudioWallFinish,
} from "@/data/studio";

export type StudioVenuePresetIcon =
  | "salon"
  | "ballroom"
  | "banquet"
  | "tent"
  | "loft"
  | "blackbox"
  | "hotel"
  | "pavilion";

export type StudioVenuePreset = {
  key: string;
  label: string;
  description: string;
  icon: StudioVenuePresetIcon;
  shape: StudioRoomShape;
  roomName: string;
  /** Inches. */
  width: number;
  length: number;
  wallHeight: number;
  cutoutWidth?: number;
  cutoutDepth?: number;
  /** Only for `custom` presets: outline in inches, clockwise from top-left. */
  floor?: StudioPoint[];
  floorFinish: StudioFloorFinish;
  wallFinish: StudioWallFinish;
  lighting: StudioLightingMood;
  /** CSS background used for the photo-like preset tile. */
  backdrop: string;
};

const FT = 12;

function octagon(size: number, chamfer: number): StudioPoint[] {
  return [
    { x: chamfer, z: 0 },
    { x: size - chamfer, z: 0 },
    { x: size, z: chamfer },
    { x: size, z: size - chamfer },
    { x: size - chamfer, z: size },
    { x: chamfer, z: size },
    { x: 0, z: size - chamfer },
    { x: 0, z: chamfer },
  ];
}

export const STUDIO_VENUE_PRESETS: StudioVenuePreset[] = [
  {
    key: "intimate_salon",
    label: "Intimate salon",
    description: "Private dinners, 60–80 guests",
    icon: "salon",
    shape: "rectangle",
    roomName: "Intimate salon",
    width: 30 * FT,
    length: 25 * FT,
    wallHeight: 12 * FT,
    floorFinish: "herringbone",
    wallFinish: "white_plaster",
    lighting: "candlelight",
    backdrop:
      "radial-gradient(circle at 30% 20%, rgba(255,214,160,0.45), transparent 55%), linear-gradient(135deg, #3a2a1c, #120c08)",
  },
  {
    key: "grand_ballroom",
    label: "Grand ballroom",
    description: "Galas & weddings, 500+",
    icon: "ballroom",
    shape: "rectangle",
    roomName: "Grand ballroom",
    width: 80 * FT,
    length: 60 * FT,
    wallHeight: 24 * FT,
    floorFinish: "white_marble",
    wallFinish: "warm_ivory",
    lighting: "warm_gala",
    backdrop:
      "radial-gradient(circle at 50% 0%, rgba(240,200,120,0.55), transparent 60%), linear-gradient(160deg, #4a3618, #140e06)",
  },
  {
    key: "banquet_hall",
    label: "Banquet hall",
    description: "Receptions, 240–300",
    icon: "banquet",
    shape: "rectangle",
    roomName: "Banquet hall",
    width: 60 * FT,
    length: 40 * FT,
    wallHeight: 16 * FT,
    floorFinish: "event_carpet",
    wallFinish: "neutral_beige",
    lighting: "warm_gala",
    backdrop:
      "radial-gradient(circle at 70% 25%, rgba(214,180,130,0.4), transparent 55%), linear-gradient(145deg, #3b3125, #15110c)",
  },
  {
    key: "wedding_tent",
    label: "Wedding tent",
    description: "Garden marquee on lawn",
    icon: "tent",
    shape: "rectangle",
    roomName: "Wedding tent",
    width: 40 * FT,
    length: 80 * FT,
    wallHeight: 18 * FT,
    floorFinish: "lawn",
    wallFinish: "tent_canvas",
    lighting: "twilight_blue",
    backdrop:
      "radial-gradient(circle at 50% 10%, rgba(250,246,235,0.35), transparent 55%), linear-gradient(180deg, #2b3a4f 0%, #1d2a1b 70%, #0f160d)",
  },
  {
    key: "industrial_loft",
    label: "Industrial loft",
    description: "Brick & concrete, 200",
    icon: "loft",
    shape: "rectangle",
    roomName: "Industrial loft",
    width: 50 * FT,
    length: 30 * FT,
    wallHeight: 16 * FT,
    floorFinish: "polished_concrete",
    wallFinish: "exposed_brick",
    lighting: "warm_gala",
    backdrop:
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 2px, transparent 2px 10px), linear-gradient(135deg, #6b3524, #2a140d)",
  },
  {
    key: "black_box",
    label: "Black-box studio",
    description: "Productions & launches",
    icon: "blackbox",
    shape: "rectangle",
    roomName: "Black-box studio",
    width: 40 * FT,
    length: 40 * FT,
    wallHeight: 20 * FT,
    floorFinish: "black_event",
    wallFinish: "black_box",
    lighting: "dark_venue",
    backdrop:
      "radial-gradient(circle at 50% 40%, rgba(120,140,255,0.25), transparent 50%), linear-gradient(180deg, #121218, #050506)",
  },
  {
    key: "hotel_l_ballroom",
    label: "Hotel L-ballroom",
    description: "Pre-function wing, 350",
    icon: "hotel",
    shape: "l_shape",
    roomName: "Hotel ballroom",
    width: 90 * FT,
    length: 60 * FT,
    wallHeight: 18 * FT,
    cutoutWidth: 35 * FT,
    cutoutDepth: 25 * FT,
    floorFinish: "event_carpet",
    wallFinish: "wood_panel",
    lighting: "warm_gala",
    backdrop:
      "radial-gradient(circle at 25% 30%, rgba(230,190,120,0.4), transparent 50%), linear-gradient(150deg, #43301d, #120d08)",
  },
  {
    key: "octagon_pavilion",
    label: "Octagon pavilion",
    description: "Garden pavilion, 150",
    icon: "pavilion",
    shape: "custom",
    roomName: "Octagon pavilion",
    width: 50 * FT,
    length: 50 * FT,
    wallHeight: 14 * FT,
    floor: octagon(50 * FT, 15 * FT),
    floorFinish: "dark_oak",
    wallFinish: "white_plaster",
    lighting: "daylight",
    backdrop:
      "radial-gradient(circle at 50% 50%, rgba(255,250,235,0.35), transparent 60%), linear-gradient(135deg, #39402c, #12150d)",
  },
];
