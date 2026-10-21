/**
 * Module-level PBR material + procedural texture caches for Studio objects.
 * Materials and textures live for the page lifetime and are shared across
 * every object — never dispose them from a component.
 */
import {
  getDrapeColorHex,
  type DanceFloorFinish,
  type DrapeColor,
  type GenericStudioObjectFinish,
} from "@/data/studio";
import * as THREE from "three";
import {
  cachedCanvasTexture,
  hashSeed,
  makeCanvas,
  mix,
  normalMapFromHeight,
  rng,
  shade,
  wrapDraw,
} from "../texture-utils";

const materialCache = new Map<string, THREE.Material>();

export function cachedMaterial<T extends THREE.Material>(
  key: string,
  build: () => T
): T {
  const cached = materialCache.get(key);
  if (cached) return cached as T;
  const material = build();
  materialCache.set(key, material);
  return material;
}

const isBrowser = () => typeof document !== "undefined";

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */

function woodGrainCanvas(base: string, seed: number, planks = 1) {
  return makeCanvas(256, 256, (g, w, h) => {
    const random = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const plankH = h / planks;
    for (let p = 0; p < planks; p++) {
      const tone = 0.9 + random() * 0.2;
      g.fillStyle = shade(base, tone);
      g.fillRect(0, p * plankH, w, plankH);
      for (let i = 0; i < 46; i++) {
        const y = p * plankH + random() * plankH;
        g.strokeStyle = shade(base, 0.72 + random() * 0.22);
        g.globalAlpha = 0.18 + random() * 0.22;
        g.lineWidth = 0.6 + random() * 1.6;
        g.beginPath();
        g.moveTo(0, y);
        const amp = 1 + random() * 3;
        for (let x = 0; x <= w; x += 16) {
          g.lineTo(x, y + Math.sin(x * 0.03 + i) * amp);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      if (planks > 1) {
        g.fillStyle = shade(base, 0.45);
        g.fillRect(0, p * plankH, w, 1.5);
      }
    }
  });
}

export function woodTexture(base = "#8a6744", planks = 1) {
  return cachedCanvasTexture(`obj-wood:${base}:${planks}`, () =>
    woodGrainCanvas(base, hashSeed(base) + planks, planks)
  );
}

function marbleCanvas(seed: number) {
  return makeCanvas(512, 512, (g, w, h) => {
    const random = rng(seed);
    g.fillStyle = "#f1eee9";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(200,195,188,${random() * 0.08})`;
      const r = 6 + random() * 30;
      wrapDraw(w, random() * w, random() * h, r, (x, y) => {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      });
    }
    for (let v = 0; v < 9; v++) {
      g.strokeStyle = `rgba(${120 + random() * 40},${116 + random() * 30},${110 + random() * 30},${0.25 + random() * 0.35})`;
      g.lineWidth = 0.6 + random() * 2.2;
      g.beginPath();
      let x = random() * w;
      let y = 0;
      g.moveTo(x, y);
      while (y < h) {
        x += (random() - 0.5) * 34;
        y += 8 + random() * 22;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

export function marbleTexture() {
  return cachedCanvasTexture("obj-marble", () => marbleCanvas(77));
}

function noiseHeightCanvas(size: number, seed: number, grain: number) {
  return makeCanvas(size, size, (g, w, h) => {
    const random = rng(seed);
    const image = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = 128 + (random() - 0.5) * grain;
      image.data[i * 4] = v;
      image.data[i * 4 + 1] = v;
      image.data[i * 4 + 2] = v;
      image.data[i * 4 + 3] = 255;
    }
    g.putImageData(image, 0, 0);
  });
}

/** Fine woven-fabric normal map (linens, upholstery). */
export function weaveNormal() {
  return cachedCanvasTexture(
    "obj-weave-normal",
    () => {
      const height = makeCanvas(128, 128, (g, w, h) => {
        const random = rng(31);
        g.fillStyle = "#808080";
        g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) {
          g.fillStyle = `rgba(255,255,255,${0.12 + random() * 0.1})`;
          g.fillRect(0, y, w, 1);
        }
        for (let x = 0; x < w; x += 2) {
          g.fillStyle = `rgba(0,0,0,${0.1 + random() * 0.1})`;
          g.fillRect(x, 0, 1, h);
        }
      });
      return normalMapFromHeight(height, 1.6);
    },
    { srgb: false }
  );
}

export function carpetTexture(base: string) {
  return cachedCanvasTexture(`obj-carpet:${base}`, () =>
    makeCanvas(256, 256, (g, w, h) => {
      const random = rng(hashSeed(base));
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = shade(base, 0.75 + random() * 0.5);
        g.globalAlpha = 0.35;
        g.fillRect(random() * w, random() * h, 1.4, 1.4);
      }
      g.globalAlpha = 1;
    })
  );
}

export function carpetNormal() {
  return cachedCanvasTexture(
    "obj-carpet-normal",
    () => normalMapFromHeight(noiseHeightCanvas(128, 9, 120), 2.2),
    { srgb: false }
  );
}

/* ------------------------------------------------------------------ */
/* Dance floor (texture spans 2 × 2 panels = 8 ft)                     */
/* ------------------------------------------------------------------ */

export const DANCE_TEXTURE_FEET = 8;

function drawSeams(g: CanvasRenderingContext2D, w: number, color: string) {
  g.fillStyle = color;
  const half = w / 2;
  for (const p of [0, half]) {
    g.fillRect(p - 1, 0, 2, w);
    g.fillRect(0, p - 1, w, 2);
  }
  g.fillRect(w - 1, 0, 1, w);
  g.fillRect(0, w - 1, w, 1);
}

function danceCanvas(finish: DanceFloorFinish) {
  const size = 512;
  return makeCanvas(size, size, (g, w) => {
    const random = rng(hashSeed(finish));
    const half = w / 2;
    switch (finish) {
      case "white_gloss":
        g.fillStyle = "#f3f1ec";
        g.fillRect(0, 0, w, w);
        drawSeams(g, w, "rgba(120,115,105,0.55)");
        break;
      case "black_gloss":
        g.fillStyle = "#121213";
        g.fillRect(0, 0, w, w);
        drawSeams(g, w, "rgba(0,0,0,0.9)");
        break;
      case "checkerboard":
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            g.fillStyle = (i + j) % 2 ? "#151515" : "#f2efe8";
            g.fillRect(i * half, j * half, half, half);
          }
        }
        drawSeams(g, w, "rgba(70,70,70,0.6)");
        break;
      case "warm_parquet": {
        const slat = half / 4;
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            const vertical = (i + j) % 2;
            const tone = shade("#9c6537", 0.82 + random() * 0.3);
            g.fillStyle = tone;
            g.fillRect(i * slat, j * slat, slat, slat);
            g.strokeStyle = "rgba(60,35,18,0.35)";
            g.lineWidth = 1;
            for (let k = 1; k < 4; k++) {
              g.beginPath();
              if (vertical) {
                g.moveTo(i * slat + (k * slat) / 4, j * slat);
                g.lineTo(i * slat + (k * slat) / 4, (j + 1) * slat);
              } else {
                g.moveTo(i * slat, j * slat + (k * slat) / 4);
                g.lineTo((i + 1) * slat, j * slat + (k * slat) / 4);
              }
              g.stroke();
            }
          }
        }
        drawSeams(g, w, "rgba(40,22,10,0.6)");
        break;
      }
      case "oak":
      case "dark_wood": {
        const base = finish === "oak" ? "#b98d5a" : "#4a3226";
        const planks = 16;
        const ph = w / planks;
        for (let p = 0; p < planks; p++) {
          g.fillStyle = shade(base, 0.86 + random() * 0.26);
          g.fillRect(0, p * ph, w, ph);
          for (let i = 0; i < 8; i++) {
            g.strokeStyle = shade(base, 0.7 + random() * 0.2);
            g.globalAlpha = 0.3;
            g.beginPath();
            const y = p * ph + random() * ph;
            g.moveTo(0, y);
            g.bezierCurveTo(w * 0.3, y + 2, w * 0.6, y - 2, w, y);
            g.stroke();
          }
          g.globalAlpha = 1;
          g.fillStyle = "rgba(0,0,0,0.35)";
          g.fillRect(0, p * ph, w, 1);
          const joint = (p * 97) % w;
          g.fillRect(joint, p * ph, 1, ph);
        }
        drawSeams(g, w, "rgba(20,12,6,0.55)");
        break;
      }
      case "neutral_event_carpet":
        g.fillStyle = "#7f776c";
        g.fillRect(0, 0, w, w);
        for (let i = 0; i < 20000; i++) {
          g.fillStyle = shade("#7f776c", 0.75 + random() * 0.5);
          g.globalAlpha = 0.4;
          g.fillRect(random() * w, random() * w, 1.5, 1.5);
        }
        g.globalAlpha = 1;
        drawSeams(g, w, "rgba(40,36,30,0.35)");
        break;
      case "led_starlit":
        g.fillStyle = "#0b0f19";
        g.fillRect(0, 0, w, w);
        drawSeams(g, w, "rgba(0,0,0,0.9)");
        break;
      case "custom_wrap_monogram":
        g.fillStyle = "#ece4d4";
        g.fillRect(0, 0, w, w);
        drawSeams(g, w, "rgba(140,120,90,0.45)");
        break;
    }
  });
}

export function danceTexture(finish: DanceFloorFinish) {
  return cachedCanvasTexture(`obj-dance:${finish}`, () => danceCanvas(finish));
}

/** Panel grooves as a normal map, shared by every dance finish. */
export function danceSeamNormal() {
  return cachedCanvasTexture(
    "obj-dance-seams",
    () =>
      normalMapFromHeight(
        makeCanvas(256, 256, (g, w) => {
          g.fillStyle = "#ffffff";
          g.fillRect(0, 0, w, w);
          g.fillStyle = "#000000";
          const half = w / 2;
          for (const p of [0, half, w]) {
            g.fillRect(p - 1, 0, 2, w);
            g.fillRect(0, p - 1, w, 2);
          }
        }),
        4
      ),
    { srgb: false }
  );
}

export function starlitEmissive() {
  return cachedCanvasTexture("obj-dance-stars", () =>
    makeCanvas(512, 512, (g, w) => {
      const random = rng(4242);
      g.fillStyle = "#000000";
      g.fillRect(0, 0, w, w);
      for (let i = 0; i < 420; i++) {
        const r = 0.8 + random() * 2.2;
        const x = random() * w;
        const y = random() * w;
        const glow = g.createRadialGradient(x, y, 0, x, y, r * 3);
        const warm = random() > 0.4;
        glow.addColorStop(0, warm ? "rgba(255,236,190,1)" : "rgba(210,225,255,1)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = glow;
        g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      }
    })
  );
}

export function monogramTexture(initials: string) {
  return cachedCanvasTexture(`obj-monogram:${initials}`, () =>
    makeCanvas(512, 512, (g, w) => {
      const c = w / 2;
      g.clearRect(0, 0, w, w);
      g.strokeStyle = "#b8873b";
      g.lineWidth = 10;
      g.beginPath();
      g.arc(c, c, w * 0.44, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.arc(c, c, w * 0.4, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        g.save();
        g.translate(c + Math.cos(a) * w * 0.42, c + Math.sin(a) * w * 0.42);
        g.rotate(a + Math.PI / 2);
        g.fillStyle = "#b8873b";
        g.beginPath();
        g.ellipse(0, 0, 5, 12, 0.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.fillStyle = "#a87a32";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "italic 400 170px Georgia, 'Times New Roman', serif";
      g.fillText(initials, c, c + 8);
    })
  );
}

export function rugTexture(base: string) {
  return cachedCanvasTexture(`obj-rug:${base}`, () =>
    makeCanvas(256, 256, (g, w) => {
      const random = rng(hashSeed(base) + 3);
      g.fillStyle = base;
      g.fillRect(0, 0, w, w);
      for (let i = 0; i < 6000; i++) {
        g.fillStyle = shade(base, 0.8 + random() * 0.4);
        g.globalAlpha = 0.3;
        g.fillRect(random() * w, random() * w, 1.5, 1.5);
      }
      g.globalAlpha = 1;
      g.strokeStyle = mix(base, "#c9a24a", 0.6);
      g.lineWidth = 6;
      g.strokeRect(14, 14, w - 28, w - 28);
      g.lineWidth = 2;
      g.strokeRect(26, 26, w - 52, w - 52);
    })
  );
}

/* ------------------------------------------------------------------ */
/* Core materials                                                      */
/* ------------------------------------------------------------------ */

export const MAT = {
  gold: () =>
    cachedMaterial("gold", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e7b95f",
        metalness: 1,
        roughness: 0.2,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1,
      })
    ),
  brushedGold: () =>
    cachedMaterial("brushed-gold", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#d6a955",
        metalness: 1,
        roughness: 0.36,
      })
    ),
  silver: () =>
    cachedMaterial("silver", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e3e5ea",
        metalness: 1,
        roughness: 0.16,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1,
      })
    ),
  aluminum: () =>
    cachedMaterial("aluminum", () =>
      new THREE.MeshStandardMaterial({
        color: "#c4c8cd",
        metalness: 0.95,
        roughness: 0.32,
      })
    ),
  blackMetal: () =>
    cachedMaterial("black-metal", () =>
      new THREE.MeshStandardMaterial({
        color: "#1d1d20",
        metalness: 0.7,
        roughness: 0.4,
      })
    ),
  blackGloss: () =>
    cachedMaterial("black-gloss", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0c0c0e",
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
      })
    ),
  whiteGloss: () =>
    cachedMaterial("white-gloss", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f3f2ee",
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      })
    ),
  whiteResin: () =>
    cachedMaterial("white-resin", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f1efea",
        roughness: 0.42,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      })
    ),
  porcelain: () =>
    cachedMaterial("porcelain", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f7f5f0",
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      })
    ),
  glass: () =>
    cachedMaterial("glass", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f4f1ea",
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    ),
  acrylic: () =>
    cachedMaterial("acrylic", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e9f1f4",
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        ior: 1.49,
        specularIntensity: 1,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      })
    ),
  screenGlass: () =>
    cachedMaterial("screen-glass", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#06070a",
        roughness: 0.05,
        metalness: 0.3,
        clearcoat: 1,
      })
    ),
  rubber: () =>
    cachedMaterial("rubber", () =>
      new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.9 })
    ),
  soil: () =>
    cachedMaterial("soil", () =>
      new THREE.MeshStandardMaterial({ color: "#2b2018", roughness: 1 })
    ),
  candleWax: () =>
    cachedMaterial("candle-wax", () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f6efe0",
        roughness: 0.55,
        sheen: 0.4,
        sheenColor: new THREE.Color("#fff3da"),
        emissive: "#ffb766",
        emissiveIntensity: 0.08,
      })
    ),
  flame: () =>
    cachedMaterial("flame", () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd38a",
        emissive: "#ffb24a",
        emissiveIntensity: 4,
        toneMapped: false,
      })
    ),
  wood: (base = "#8a6744") =>
    cachedMaterial(`wood:${base}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        map: isBrowser() ? woodTexture(base) : null,
        roughness: 0.48,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
      })
    ),
  marble: (tint = "#ffffff") =>
    cachedMaterial(`marble:${tint}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: tint,
        map: isBrowser() ? marbleTexture() : null,
        roughness: 0.14,
        clearcoat: 0.8,
        clearcoatRoughness: 0.06,
      })
    ),
  velvet: (hex: string) =>
    cachedMaterial(`velvet:${hex}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.82,
        sheen: 1,
        sheenRoughness: 0.42,
        sheenColor: new THREE.Color(mix(hex, "#ffffff", 0.45)),
        normalMap: isBrowser() ? weaveNormal() : null,
        normalScale: new THREE.Vector2(0.25, 0.25),
      })
    ),
  painted: (hex: string, roughness = 0.42) =>
    cachedMaterial(`painted:${hex}:${roughness}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
      })
    ),
  leaf: (hex: string) =>
    cachedMaterial(`leaf:${hex}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.55,
        sheen: 0.3,
        sheenColor: new THREE.Color(mix(hex, "#e8ffd0", 0.5)),
        flatShading: true,
      })
    ),
  petal: (hex: string) =>
    cachedMaterial(`petal:${hex}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.68,
        sheen: 0.7,
        sheenColor: new THREE.Color(mix(hex, "#ffffff", 0.6)),
      })
    ),
  emissive: (hex: string, intensity = 3) =>
    cachedMaterial(`emissive:${hex}:${intensity}`, () =>
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: intensity,
        toneMapped: false,
      })
    ),
  zone: (hex: string, opacity: number) =>
    cachedMaterial(`zone:${hex}:${opacity}`, () =>
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    ),
} as const;

/** Floor-length table linen: soft woven fabric with a satin-like sheen. */
export function linenMaterial(color: DrapeColor | string) {
  const hex = color.startsWith("#") ? color : getDrapeColorHex(color);
  return cachedMaterial(`linen:${hex}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness: 0.78,
      sheen: 0.8,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(mix(hex, "#ffffff", 0.55)),
      normalMap: isBrowser() ? weaveNormal() : null,
      normalScale: new THREE.Vector2(0.18, 0.18),
      side: THREE.DoubleSide,
    })
  );
}

/** Stretch spandex: tighter, slightly shinier than woven linen. */
export function spandexMaterial(color: DrapeColor | string) {
  const hex = color.startsWith("#") ? color : getDrapeColorHex(color);
  return cachedMaterial(`spandex:${hex}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness: 0.5,
      sheen: 0.6,
      sheenRoughness: 0.3,
      sheenColor: new THREE.Color(mix(hex, "#ffffff", 0.5)),
      clearcoat: 0.1,
    })
  );
}

const FINISH_BASE: Record<GenericStudioObjectFinish, string> = {
  natural_wood: "#8a6744",
  painted_white: "#ece8e0",
  painted_black: "#1b1a19",
  metal: "#c6cacf",
  upholstered: "#d6cbbb",
  gold: "#e7b95f",
  acrylic: "#e9f1f4",
  marble: "#ffffff",
  custom: "#9a7847",
};

export function finishBaseColor(
  finish: GenericStudioObjectFinish | undefined,
  color?: string
) {
  if (color) return color;
  return FINISH_BASE[finish ?? "natural_wood"] ?? FINISH_BASE.natural_wood;
}

/**
 * Resolves a generic object finish (+ optional `#hex` custom tint) to a shared
 * PBR material. Textured finishes multiply the tint; painted ones replace it.
 */
export function finishMaterial(
  finish: GenericStudioObjectFinish | undefined,
  color?: string
): THREE.Material {
  const resolved = finish ?? "natural_wood";
  switch (resolved) {
    case "natural_wood":
      return color
        ? cachedMaterial(`wood-tint:${color}`, () =>
            new THREE.MeshPhysicalMaterial({
              color: mix(color, "#ffffff", 0.35),
              map: isBrowser() ? woodTexture("#9a7a5a") : null,
              roughness: 0.48,
              clearcoat: 0.35,
              clearcoatRoughness: 0.3,
            })
          )
        : MAT.wood();
    case "painted_white":
      return MAT.painted(color ?? FINISH_BASE.painted_white, 0.36);
    case "painted_black":
      return MAT.painted(color ?? FINISH_BASE.painted_black, 0.32);
    case "metal":
      return cachedMaterial(`metal:${color ?? "-"}`, () =>
        new THREE.MeshPhysicalMaterial({
          color: color ?? FINISH_BASE.metal,
          metalness: 1,
          roughness: 0.28,
          clearcoat: 0.2,
        })
      );
    case "upholstered":
      return MAT.velvet(color ?? FINISH_BASE.upholstered);
    case "gold":
      return color
        ? cachedMaterial(`gold-tint:${color}`, () =>
            new THREE.MeshPhysicalMaterial({
              color,
              metalness: 1,
              roughness: 0.22,
              clearcoat: 0.4,
              clearcoatRoughness: 0.1,
            })
          )
        : MAT.gold();
    case "acrylic":
      return color
        ? cachedMaterial(`acrylic-tint:${color}`, () => {
            const material = MAT.acrylic().clone();
            material.color.set(color);
            material.opacity = 0.45;
            return material;
          })
        : MAT.acrylic();
    case "marble":
      return MAT.marble(color ?? "#ffffff");
    case "custom":
    default:
      return MAT.painted(color ?? FINISH_BASE.custom, 0.4);
  }
}

/** Darker trim/leg companion for a finish (bases, frames, kick plates). */
export function trimMaterial(
  finish: GenericStudioObjectFinish | undefined
): THREE.Material {
  switch (finish) {
    case "gold":
    case "marble":
      return MAT.gold();
    case "painted_white":
    case "acrylic":
      return MAT.silver();
    case "metal":
      return MAT.aluminum();
    default:
      return MAT.blackMetal();
  }
}
