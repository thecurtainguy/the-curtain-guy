import * as THREE from "three";

/* Browser-only singletons; a disposed CanvasTexture re-uploads on next use. */
let washTexture: THREE.CanvasTexture | null = null;
let poolTexture: THREE.CanvasTexture | null = null;
let glowTexture: THREE.CanvasTexture | null = null;

/** Uplight scallop: hot just above the can, fanning out and fading upward. */
export function getWashTexture() {
  if (washTexture) return washTexture;
  const width = 128;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    const image = context.createImageData(width, height);
    for (let py = 0; py < height; py += 1) {
      const v = 1 - py / (height - 1);
      const spread = 0.1 + 0.9 * Math.pow(v, 0.62);
      const rise = THREE.MathUtils.smoothstep(v, 0.0, 0.07);
      const fade = Math.pow(1 - v, 0.9);
      for (let px = 0; px < width; px += 1) {
        const u = (px / (width - 1)) * 2 - 1;
        const across = Math.exp(-((u / spread) ** 2) * 2.2);
        const edge = THREE.MathUtils.smoothstep(1 - Math.abs(u), 0, 0.18);
        const value = Math.min(1, across * edge * rise * (0.18 + 0.82 * fade));
        const index = (py * width + px) * 4;
        const level = Math.round(value * 255);
        image.data[index] = level;
        image.data[index + 1] = level;
        image.data[index + 2] = level;
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }
  washTexture = new THREE.CanvasTexture(canvas);
  return washTexture;
}

function radialTexture(stops: Array<[number, number]>) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    for (const [offset, level] of stops) {
      const channel = Math.round(level * 255);
      gradient.addColorStop(offset, `rgb(${channel},${channel},${channel})`);
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

export function getPoolTexture() {
  poolTexture ??= radialTexture([
    [0, 1],
    [0.25, 0.55],
    [0.6, 0.14],
    [1, 0],
  ]);
  return poolTexture;
}

export function getGlowTexture() {
  glowTexture ??= radialTexture([
    [0, 1],
    [0.08, 0.85],
    [0.22, 0.32],
    [0.5, 0.08],
    [1, 0],
  ]);
  return glowTexture;
}

export function additiveOptions(
  map: THREE.Texture,
  color: THREE.ColorRepresentation,
  strength: number
) {
  return {
    map,
    color: new THREE.Color(color).multiplyScalar(strength),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  };
}
