/**
 * Physically based drape fabrics. Materials are cached per fabric + colour +
 * glow and shared for the page lifetime — never dispose them from a component.
 */
import {
  getDrapeColorHex,
  type DrapeColor,
  type DrapeFabric,
  type StudioFrameFinish,
} from "@/data/studio";
import * as THREE from "three";
import {
  getGauzeTextures,
  getPolyTextures,
  getSatinTextures,
  getSequinTextures,
  getVelvetTextures,
  type FabricTextureSet,
} from "./textures";

export type FabricQuality = "draft" | "high" | "ultra";

export function isTranslucentFabric(fabric: DrapeFabric | undefined) {
  return fabric === "sheer" || fabric === "chiffon";
}

export function resolveFabricHex(color: DrapeColor | string): string {
  return color.startsWith("#") ? color : getDrapeColorHex(color);
}

function luminance(color: THREE.Color) {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

/**
 * Same-hue, lighter tint for the sheen lobe. Lerping straight to white turns
 * saturated cloth (burgundy, navy) chalky, so lightness is lifted in HSL and
 * only a small white mix is added; near-black cloth gets a little extra lift.
 */
function sheenTint(base: THREE.Color, amount: number) {
  const hsl = base.getHSL({ h: 0, s: 0, l: 0 });
  const lift = luminance(base) < 0.05 ? amount + 0.12 : amount;
  const tint = new THREE.Color().setHSL(
    hsl.h,
    Math.min(1, hsl.s * 1.08),
    Math.min(0.85, hsl.l + lift * (1 - hsl.l) * 0.6)
  );
  return tint.lerp(new THREE.Color("#ffffff"), Math.min(0.5, lift * 0.25));
}

function applyTextures(
  material: THREE.MeshPhysicalMaterial,
  textures: FabricTextureSet
) {
  if (textures.normal) {
    material.normalMap = textures.normal;
    const scale = textures.normalScale ?? 0.5;
    material.normalScale.set(scale, scale);
  }
  if (textures.map) material.map = textures.map;
  if (textures.roughness) material.roughnessMap = textures.roughness;
  if (textures.emissive) material.emissiveMap = textures.emissive;
}

const fabricCache = new Map<string, THREE.MeshPhysicalMaterial>();

/**
 * @param glow optional uplight colour; translucent fabrics pick up a soft
 * self-lit tint, opaque fabrics a very faint one.
 */
export function getFabricMaterial(
  fabric: DrapeFabric,
  color: DrapeColor | string,
  glow?: DrapeColor | null
): THREE.MeshPhysicalMaterial {
  const hex = resolveFabricHex(color);
  const key = `${fabric}|${hex}|${glow ?? ""}`;
  const cached = fabricCache.get(key);
  if (cached) return cached;

  const base = new THREE.Color(hex);
  const material = new THREE.MeshPhysicalMaterial({
    color: base,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.name = `fabric:${key}`;

  switch (fabric) {
    case "velvet":
    case "velour": {
      const velour = fabric === "velour";
      material.color = base.clone().multiplyScalar(velour ? 0.88 : 0.8);
      material.roughness = velour ? 0.9 : 0.96;
      material.sheen = velour ? 0.85 : 1;
      material.sheenRoughness = velour ? 0.6 : 0.5;
      material.sheenColor = sheenTint(base, velour ? 0.28 : 0.38);
      applyTextures(material, getVelvetTextures(velour));
      break;
    }
    case "poly": {
      material.roughness = 0.8;
      material.sheen = 0.4;
      material.sheenRoughness = 0.7;
      material.sheenColor = sheenTint(base, 0.2);
      applyTextures(material, getPolyTextures());
      break;
    }
    case "satin": {
      material.roughness = 0.34;
      material.sheen = 0.55;
      material.sheenRoughness = 0.32;
      material.sheenColor = sheenTint(base, 0.5);
      material.clearcoat = 0.16;
      material.clearcoatRoughness = 0.38;
      material.anisotropy = 0.65;
      material.anisotropyRotation = Math.PI / 2;
      material.specularIntensity = 0.85;
      applyTextures(material, getSatinTextures());
      break;
    }
    case "sheer":
    case "chiffon": {
      const chiffon = fabric === "chiffon";
      material.roughness = chiffon ? 0.55 : 0.62;
      material.sheen = chiffon ? 0.75 : 0.6;
      material.sheenRoughness = 0.6;
      material.sheenColor = sheenTint(base, 0.6);
      material.transparent = true;
      material.opacity = chiffon ? 0.52 : 0.4;
      material.depthWrite = false;
      material.emissive = base.clone().multiplyScalar(0.06);
      applyTextures(material, getGauzeTextures(chiffon));
      break;
    }
    case "sequin": {
      material.color = new THREE.Color("#ffffff");
      material.metalness = 0.6;
      material.roughness = 0.75;
      material.clearcoat = 0.3;
      material.clearcoatRoughness = 0.2;
      material.emissive = base.clone().lerp(new THREE.Color("#ffffff"), 0.45);
      material.emissiveIntensity = 0.4;
      applyTextures(material, getSequinTextures(hex));
      break;
    }
  }

  if (glow) {
    const glowColor = new THREE.Color(getDrapeColorHex(glow));
    if (fabric === "sequin") {
      material.emissive = glowColor.lerp(new THREE.Color("#ffffff"), 0.3);
      material.emissiveIntensity = 0.6;
    } else {
      const strength = isTranslucentFabric(fabric) ? 0.16 : 0.035;
      material.emissive = material.emissive
        .clone()
        .add(glowColor.multiplyScalar(strength));
    }
  }

  fabricCache.set(key, material);
  return material;
}

const hardwareCache = new Map<string, THREE.MeshStandardMaterial>();

export type HardwareFinish =
  | "pipe"
  | "base_plate"
  | "track"
  | "fixture"
  | StudioFrameFinish;

export function getHardwareMaterial(
  finish: HardwareFinish
): THREE.MeshStandardMaterial {
  const cached = hardwareCache.get(finish);
  if (cached) return cached;
  const presets: Record<HardwareFinish, THREE.MeshStandardMaterialParameters> = {
    pipe: { color: "#a4a8ad", metalness: 0.72, roughness: 0.34 },
    base_plate: { color: "#2b2b2d", metalness: 0.45, roughness: 0.58 },
    track: { color: "#1f1f21", metalness: 0.4, roughness: 0.45 },
    fixture: { color: "#1a1a1b", metalness: 0.55, roughness: 0.38 },
    gold: { color: "#c9a24f", metalness: 0.7, roughness: 0.26 },
    black: { color: "#1d1c1b", metalness: 0.35, roughness: 0.42 },
    white: { color: "#ece8df", metalness: 0.08, roughness: 0.38 },
    wood: { color: "#7d5534", metalness: 0, roughness: 0.68 },
  };
  const material = new THREE.MeshStandardMaterial(presets[finish]);
  material.name = `hardware:${finish}`;
  hardwareCache.set(finish, material);
  return material;
}

const RIM_VERTEX = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    #ifdef USE_INSTANCING
      mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    #endif
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RIM_FRAGMENT = /* glsl */ `
  uniform vec3 rimColor;
  uniform float intensity;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    float facing = abs(dot(normalize(vNormalView), normalize(vViewDir)));
    float rim = pow(1.0 - facing, 2.4);
    gl_FragColor = vec4(rimColor * (rim * intensity + 0.05 * intensity), 1.0);
  }
`;

const rimCache = new Map<string, THREE.ShaderMaterial>();

/** Additive gold fresnel overlay for selected / hovered fabric meshes. */
export function getRimMaterial(kind: "selected" | "hover"): THREE.ShaderMaterial {
  const cached = rimCache.get(kind);
  if (cached) return cached;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      rimColor: {
        value: new THREE.Color(kind === "selected" ? "#e2b85c" : "#f1d9a0"),
      },
      intensity: { value: kind === "selected" ? 1.15 : 0.45 },
    },
    vertexShader: RIM_VERTEX,
    fragmentShader: RIM_FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthFunc: THREE.LessEqualDepth,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false,
  });
  material.name = `fabric-rim:${kind}`;
  rimCache.set(kind, material);
  return material;
}
