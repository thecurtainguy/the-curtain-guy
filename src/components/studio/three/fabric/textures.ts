/**
 * Seeded procedural fabric textures (browser only). Every texture is tiled in
 * feet: fabric UVs are authored in feet, and each texture's `repeat` is set to
 * `1 / tileFeet` so cloth detail stays the same physical size on any panel.
 */
import * as THREE from "three";
import {
  cachedCanvasTexture,
  makeCanvas,
  normalMapFromHeight,
  rng,
  shade,
  wrapDraw,
} from "../texture-utils";

function tiled(texture: THREE.CanvasTexture, tileFeet: number) {
  texture.repeat.set(1 / tileFeet, 1 / tileFeet);
  return texture;
}

/** Anisotropy every fabric texture is created with (see `textureWithAnisotropy`). */
export const FABRIC_TEXTURE_ANISOTROPY = 8;

/** Velvet / velour pile: vertical nap streaks, soft crush blotches, fine grain. */
function velvetHeight(seed: number, crush: number) {
  const rand = rng(seed);
  return makeCanvas(512, 512, (g, s) => {
    g.fillStyle = "rgb(128,128,128)";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26 * crush; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const r = 30 + rand() * 90;
      const v = 128 + (rand() - 0.5) * 46;
      wrapDraw(s, x, y, r, (X, Y) => {
        const grd = g.createRadialGradient(X, Y, 0, X, Y, r);
        grd.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
        grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(X, Y, r * 0.55, r, 0, 0, Math.PI * 2);
        g.fill();
      });
    }
    g.lineCap = "round";
    for (let i = 0; i < 5200; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const len = 3 + rand() * 9;
      const v = Math.round(128 + (rand() - 0.5) * 90);
      g.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      g.lineWidth = 0.6 + rand() * 0.9;
      wrapDraw(s, x, y, len, (X, Y) => {
        g.beginPath();
        g.moveTo(X, Y);
        g.lineTo(X + (rand() - 0.5) * 1.4, Y + len);
        g.stroke();
      });
    }
  });
}

/** Plain-weave grid for poly premier. */
function weaveHeight(seed: number, threads: number, floatRatio: number) {
  const rand = rng(seed);
  return makeCanvas(256, 256, (g, s) => {
    g.fillStyle = "rgb(110,110,110)";
    g.fillRect(0, 0, s, s);
    const step = s / threads;
    for (let row = 0; row < threads; row++) {
      for (let col = 0; col < threads; col++) {
        const over = (row + col) % 2 === 0;
        const v = Math.round((over ? 175 : 95) + (rand() - 0.5) * 30);
        g.fillStyle = `rgb(${v},${v},${v})`;
        const w = over ? step * floatRatio : step * 0.8;
        const h = over ? step * 0.8 : step * floatRatio;
        g.fillRect(col * step + (step - w) / 2, row * step + (step - h) / 2, w, h);
      }
    }
  });
}

/** Satin: long glossy warp floats running vertically. */
function satinHeight(seed: number) {
  const rand = rng(seed);
  return makeCanvas(256, 256, (g, s) => {
    g.fillStyle = "rgb(128,128,128)";
    g.fillRect(0, 0, s, s);
    const threads = 96;
    const step = s / threads;
    for (let col = 0; col < threads; col++) {
      const v = Math.round(128 + (rand() - 0.5) * 34);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(col * step, 0, step * 0.85, s);
    }
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rand() * threads) * step;
      const y = rand() * s;
      g.fillStyle = "rgba(70,70,70,0.6)";
      g.fillRect(x, y, step, 1.2);
    }
  });
}

/** Chiffon / sheer: fine crinkle lines and gauzy open weave. */
function gauzeHeight(seed: number, crinkle: number) {
  const rand = rng(seed);
  return makeCanvas(256, 256, (g, s) => {
    g.fillStyle = "rgb(128,128,128)";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90 * crinkle; i++) {
      const x = rand() * s;
      const v = Math.round(128 + (rand() - 0.5) * 70);
      g.strokeStyle = `rgba(${v},${v},${v},0.45)`;
      g.lineWidth = 0.8 + rand() * 2.4;
      g.beginPath();
      let px = x;
      g.moveTo(px, -4);
      for (let y = 0; y <= s + 8; y += 16) {
        px += (rand() - 0.5) * 3;
        g.lineTo(px, y);
      }
      g.stroke();
    }
    g.globalAlpha = 0.18;
    for (let y = 0; y < s; y += 3) {
      g.fillStyle = y % 6 === 0 ? "#9a9a9a" : "#7a7a7a";
      g.fillRect(0, y, s, 1);
    }
    g.globalAlpha = 1;
  });
}

/** Sequins as an overlapping fish-scale lattice of domed discs. */
const SEQUIN_PX = 512;
const SEQUIN_STEP = 16;
const SEQUIN_R = 9.5;

function forEachSequin(
  seed: number,
  fn: (x: number, y: number, k: number, sparkle: boolean) => void
) {
  const rand = rng(seed);
  for (let row = 0; row < SEQUIN_PX / (SEQUIN_STEP / 2); row++) {
    const y = row * (SEQUIN_STEP / 2);
    for (let x = (row % 2) * (SEQUIN_STEP / 2); x < SEQUIN_PX; x += SEQUIN_STEP) {
      fn(x, y, 0.55 + rand() * 0.9, rand() > 0.88);
    }
  }
}

/** Greyscale sequin albedo; the material colour supplies the tint. */
function sequinAlbedo() {
  const white = "#ffffff";
  return makeCanvas(SEQUIN_PX, SEQUIN_PX, (g, s) => {
    g.fillStyle = shade(white, 0.25);
    g.fillRect(0, 0, s, s);
    forEachSequin(41, (x, y, k) => {
      wrapDraw(s, x, y, SEQUIN_R, (X, Y) => {
        const grd = g.createRadialGradient(X - 2, Y - 3, 0.5, X, Y, SEQUIN_R);
        grd.addColorStop(0, shade(white, k * 1.3));
        grd.addColorStop(0.7, shade(white, k * 0.95));
        grd.addColorStop(1, shade(white, k * 0.55));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(X, Y, SEQUIN_R, 0, Math.PI * 2);
        g.fill();
      });
    });
  });
}

function sequinHeight() {
  return makeCanvas(SEQUIN_PX, SEQUIN_PX, (g, s) => {
    g.fillStyle = "rgb(40,40,40)";
    g.fillRect(0, 0, s, s);
    forEachSequin(41, (x, y, k) => {
      const tilt = (k - 1) * 3;
      wrapDraw(s, x, y, SEQUIN_R, (X, Y) => {
        const grd = g.createRadialGradient(X + tilt, Y - tilt, 0, X, Y, SEQUIN_R);
        grd.addColorStop(0, "rgb(235,235,235)");
        grd.addColorStop(0.8, "rgb(170,170,170)");
        grd.addColorStop(1, "rgb(60,60,60)");
        g.fillStyle = grd;
        g.beginPath();
        g.arc(X, Y, SEQUIN_R, 0, Math.PI * 2);
        g.fill();
      });
    });
  });
}

function sequinRoughness() {
  return makeCanvas(SEQUIN_PX, SEQUIN_PX, (g, s) => {
    g.fillStyle = "rgb(200,200,200)";
    g.fillRect(0, 0, s, s);
    forEachSequin(41, (x, y, k, sparkle) => {
      const v = sparkle ? 20 : Math.round(40 + (1.45 - k) * 110);
      wrapDraw(s, x, y, SEQUIN_R, (X, Y) => {
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.beginPath();
        g.arc(X, Y, SEQUIN_R * 0.92, 0, Math.PI * 2);
        g.fill();
      });
    });
  });
}

function sequinSparkle() {
  return makeCanvas(SEQUIN_PX, SEQUIN_PX, (g, s) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, s, s);
    forEachSequin(41, (x, y, _k, sparkle) => {
      if (!sparkle) return;
      wrapDraw(s, x, y, SEQUIN_R, (X, Y) => {
        const grd = g.createRadialGradient(X - 2, Y - 3, 0, X - 2, Y - 3, 5);
        grd.addColorStop(0, "rgba(255,255,255,1)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd;
        g.fillRect(X - 8, Y - 8, 16, 16);
      });
    });
  });
}

export type FabricTextureSet = {
  normal?: THREE.Texture;
  normalScale?: number;
  map?: THREE.Texture;
  roughness?: THREE.Texture;
  emissive?: THREE.Texture;
};

const normalTex = (key: string, tileFeet: number, build: () => HTMLCanvasElement) =>
  tiled(
    cachedCanvasTexture(key, build, { srgb: false, anisotropy: FABRIC_TEXTURE_ANISOTROPY }),
    tileFeet
  );

export function getVelvetTextures(velour: boolean): FabricTextureSet {
  return {
    normal: normalTex(
      `fabric:velvet-normal:${velour ? "velour" : "velvet"}`,
      velour ? 1.6 : 2,
      () => normalMapFromHeight(velvetHeight(velour ? 77 : 31, velour ? 1.6 : 1), velour ? 2.4 : 1.8)
    ),
    normalScale: velour ? 0.55 : 0.4,
  };
}

export function getPolyTextures(): FabricTextureSet {
  return {
    normal: normalTex("fabric:poly-normal", 0.45, () =>
      normalMapFromHeight(weaveHeight(13, 48, 0.95), 2.2)
    ),
    normalScale: 0.35,
  };
}

export function getSatinTextures(): FabricTextureSet {
  return {
    normal: normalTex("fabric:satin-normal", 0.6, () =>
      normalMapFromHeight(satinHeight(19), 1.6)
    ),
    normalScale: 0.18,
  };
}

export function getGauzeTextures(chiffon: boolean): FabricTextureSet {
  return {
    normal: normalTex(`fabric:gauze-normal:${chiffon ? "chiffon" : "sheer"}`, 1.4, () =>
      normalMapFromHeight(gauzeHeight(chiffon ? 57 : 23, chiffon ? 1.7 : 0.8), 2)
    ),
    normalScale: chiffon ? 0.5 : 0.3,
  };
}

const SEQUIN_TILE_FEET = 0.5;

/** One shared set for every colour: the albedo is greyscale (tint via `material.color`). */
export function getSequinTextures(): FabricTextureSet {
  return {
    map: tiled(
      cachedCanvasTexture("fabric:sequin-albedo", sequinAlbedo, {
        anisotropy: FABRIC_TEXTURE_ANISOTROPY,
      }),
      SEQUIN_TILE_FEET
    ),
    normal: normalTex("fabric:sequin-normal", SEQUIN_TILE_FEET, () =>
      normalMapFromHeight(sequinHeight(), 3.2)
    ),
    normalScale: 0.9,
    roughness: tiled(
      cachedCanvasTexture("fabric:sequin-roughness", sequinRoughness, {
        srgb: false,
        anisotropy: FABRIC_TEXTURE_ANISOTROPY,
      }),
      SEQUIN_TILE_FEET
    ),
    emissive: tiled(
      cachedCanvasTexture("fabric:sequin-sparkle", sequinSparkle, {
        anisotropy: FABRIC_TEXTURE_ANISOTROPY,
      }),
      SEQUIN_TILE_FEET
    ),
  };
}

const anisotropyVariants = new Map<string, THREE.Texture>();

/**
 * The same texture (shared canvas source and repeat) at another anisotropy
 * level. One clone per texture per level, so the cache stays tiny.
 */
export function textureWithAnisotropy<T extends THREE.Texture>(
  texture: T,
  anisotropy: number
): T {
  if (texture.anisotropy === anisotropy) return texture;
  const key = `${texture.uuid}:${anisotropy}`;
  let variant = anisotropyVariants.get(key);
  if (!variant) {
    variant = texture.clone();
    variant.anisotropy = anisotropy;
    anisotropyVariants.set(key, variant);
  }
  return variant as T;
}

/** Soft vertical light-wash sprite (white; tinted by the material colour). */
export function getUplightWashTexture(): THREE.CanvasTexture {
  const texture = cachedCanvasTexture("fabric:uplight-wash", () =>
    makeCanvas(128, 256, (g, w, h) => {
      // Elliptical plume rising from the fixture: hot at the floor, fanning
      // out and fading toward the top of the wash.
      g.save();
      g.translate(w / 2, h);
      g.scale(w / 2 / h, 1);
      const plume = g.createRadialGradient(0, 0, 0, 0, 0, h);
      plume.addColorStop(0, "rgba(255,255,255,1)");
      plume.addColorStop(0.18, "rgba(255,255,255,0.8)");
      plume.addColorStop(0.55, "rgba(255,255,255,0.3)");
      plume.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = plume;
      g.fillRect(-h, -h, 2 * h, h);
      g.restore();
    })
  );
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
