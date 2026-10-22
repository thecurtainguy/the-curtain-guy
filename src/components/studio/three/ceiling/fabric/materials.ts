/**
 * Ceiling-only material variants. Cached for the page lifetime like the
 * shared fabric materials — never dispose them from a component.
 */
import { getDrapeColorHex, type DrapeColor, type DrapeFabric } from "@/data/studio";
import * as THREE from "three";
import {
  getFabricMaterialForQuality,
  isTranslucentFabric,
  type FabricQuality,
} from "../../fabric/materials";

/** Opacity of ceiling fabric seen from outside / above the room. */
const OUTSIDE_OPACITY = 0.32;

const ceilingCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Overhead fabric is lit mostly by bounce from the room below, which the
 * scene's downlights barely provide. Ceiling variants carry a soft
 * self-lit scatter term so sheers glow like they do in a lit ballroom
 * instead of reading as grey film against the dark ceiling.
 */
export function getCeilingFabricMaterial(
  fabric: DrapeFabric,
  color: DrapeColor,
  glow: DrapeColor | null,
  quality: FabricQuality
): THREE.MeshStandardMaterial {
  const key = `${fabric}|${color}|${glow ?? ""}|${quality}`;
  const cached = ceilingCache.get(key);
  if (cached) return cached;
  const base = getFabricMaterialForQuality(fabric, color, glow, quality);
  const material = base.clone();
  material.name = `${base.name}:ceiling`;
  const tint = new THREE.Color(getDrapeColorHex(color));
  if (isTranslucentFabric(fabric)) {
    material.opacity = Math.min(0.72, base.opacity + 0.16);
    material.emissive = base.emissive.clone().add(tint.multiplyScalar(0.16));
  } else if (fabric !== "sequin") {
    material.emissive = base.emissive.clone().add(tint.multiplyScalar(0.26));
  }
  ceilingCache.set(key, material);
  return material;
}

const fadedCache = new Map<string, THREE.Material>();

/**
 * See-through variant of a fabric material for outside views, so ceiling
 * fabric reads as a ghosted layer instead of a lid over the floor plan.
 */
export function getFadedMaterial(material: THREE.Material): THREE.Material {
  const cached = fadedCache.get(material.uuid);
  if (cached) return cached;
  const faded = material.clone();
  faded.name = `${material.name}:faded`;
  faded.transparent = true;
  faded.opacity = material.transparent
    ? material.opacity * 0.55
    : OUTSIDE_OPACITY;
  faded.depthWrite = false;
  fadedCache.set(material.uuid, faded);
  return faded;
}

let starSprite: THREE.CanvasTexture | null = null;

/** Soft round star point with a hot core. */
function getStarSprite() {
  if (starSprite) return starSprite;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g) {
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,255,255,0.85)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0.18)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
  }
  starSprite = new THREE.CanvasTexture(canvas);
  starSprite.colorSpace = THREE.SRGBColorSpace;
  return starSprite;
}

const starCache = new Map<string, THREE.PointsMaterial>();

/** Additive HDR star points (above the bloom threshold). */
export function getStarlightMaterial(color: DrapeColor, faded: boolean) {
  const key = `${color}|${faded ? 1 : 0}`;
  const cached = starCache.get(key);
  if (cached) return cached;
  const tint = new THREE.Color(getDrapeColorHex(color)).lerp(new THREE.Color("#ffffff"), 0.55);
  const material = new THREE.PointsMaterial({
    color: tint.multiplyScalar(faded ? 1.4 : 4.2),
    size: 0.09,
    sizeAttenuation: true,
    map: getStarSprite(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    toneMapped: false,
  });
  material.name = `ceiling-starlight:${key}`;
  starCache.set(key, material);
  return material;
}
