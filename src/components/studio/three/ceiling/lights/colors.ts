import type { DrapeColor } from "@/data/studio";
import { getStudioLightHex } from "../../engine-light-rig";

/**
 * String lights are incandescent-look LEDs: palette neutrals become colour
 * temperatures (ivory ≈ 2700 K, champagne ≈ 2400 K, gold ≈ 2100 K amber,
 * silver ≈ 5000 K); dark neutrals fall back to warm white because black
 * bulbs don't exist. Hues reuse the uplight LED mapping so they stay
 * recognisable.
 */
const STRING_LIGHT_HEX: Partial<Record<DrapeColor, string>> = {
  ivory: "#ffd6a0",
  white: "#fff0dc",
  champagne: "#ffc888",
  gold: "#ffb15e",
  silver: "#e6eeff",
  black: "#ffcf96",
  charcoal: "#ffcf96",
  taupe: "#ffc58a",
  rose_gold: "#ffb39a",
  blush: "#ffaab8",
  peach: "#ffb784",
};

export function getStringLightHex(color: DrapeColor): string {
  return STRING_LIGHT_HEX[color] ?? getStudioLightHex(color);
}
