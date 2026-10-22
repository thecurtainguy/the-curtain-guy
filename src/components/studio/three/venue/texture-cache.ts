/**
 * Ref-counted cache of procedural venue map sets (floor, wall, ceiling).
 *
 * Each set is three stable DataTextures that start as a 1×1 flat finish
 * colour, then swap in a fast 256 px preview and finally the quality tier's
 * size as worker jobs land — materials never rebuild or recompile. Pixel
 * buffers are dropped once uploaded to the GPU, so a set costs GPU memory
 * only. Released sets linger in a small LRU (per surface group and byte
 * budget) for quick toggling and are disposed on eviction.
 *
 * Components use `useVenueTextures`; imperative callers use
 * `acquireVenueTextures` and must call `release()`.
 */
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { rgbOf } from "../color-utils";
import { getStudioQualityPreset } from "../engine-quality";
import { requestVenueMaps, type VenueMapJob } from "./texture-jobs";
import {
  venueMapDef,
  type VenueMapData,
  type VenueMapGroup,
  type VenueMapSpec,
} from "./texture-gen";

export type VenueQuality = "draft" | "high" | "ultra";

export type VenueTextureSet = {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
};

const PREVIEW_SIZE = 256;
/** Unreferenced sets kept per surface group for quick toggling. */
const SPARE_PER_GROUP = 2;
/** GPU bytes all unreferenced sets may hold together. */
const SPARE_BYTES = 96 * 1024 * 1024;
/** Entries created during render but not yet retained are safe this long. */
const UNRETAINED_GRACE_MS = 2500;

type Stage = 0 | 1 | 2;

type Entry = {
  key: string;
  spec: VenueMapSpec;
  size: number;
  textures: VenueTextureSet;
  placeholder: { color: Uint8Array; normal: Uint8Array; rough: Uint8Array };
  /** 0 = flat placeholder, 1 = preview, 2 = full size. */
  stage: Stage;
  refs: number;
  retained: boolean;
  lastUsed: number;
  /** Estimated GPU bytes (with mips) of the current stage. */
  bytes: number;
  jobs: { preview?: VenueMapJob; final?: VenueMapJob };
  listeners: Map<() => void, number>;
  evicted: boolean;
  /** Renderer used to pre-upload landed maps in idle time. */
  gl: THREE.WebGLRenderer | null;
  uploadToken: number;
};

const entries = new Map<string, Entry>();

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/* -------------------------------------------------------------- textures */

/** Drop CPU pixels once the GPU has them; re-uploads come from a regenerate. */
function releasePixels(texture: THREE.Texture) {
  const image = texture.image as THREE.DataTextureImageData;
  image.data = null;
}

function makeTexture(
  data: Uint8Array,
  format: THREE.PixelFormat,
  srgb: boolean,
  anisotropy: number,
  repeat: [number, number]
) {
  const texture = new THREE.DataTexture(data, 1, 1, format, THREE.UnsignedByteType);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = false;
  texture.anisotropy = anisotropy;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.needsUpdate = true;
  return texture;
}

/** Replaces a texture's pixels (any size): frees the old GPU storage first. */
function swapPixels(
  texture: THREE.DataTexture,
  data: Uint8Array,
  width: number,
  height: number,
  release: boolean
) {
  texture.dispose();
  texture.image = { data, width, height };
  texture.onUpdate = release ? releasePixels : null;
  texture.needsUpdate = true;
}

function gpuBytes(width: number, height: number) {
  return Math.round((width * height * (4 + 4 + 2) * 4) / 3);
}

function createEntry(key: string, spec: VenueMapSpec, size: number, anisotropy: number): Entry {
  const def = venueMapDef(spec);
  if (!def) throw new Error(`Unknown venue finish ${key}`);
  const [r, g, b] = rgbOf(def.flat[0]);
  const ro = Math.round(def.flat[1] * 255);
  const placeholder = {
    color: new Uint8Array([r, g, b, 255]),
    normal: new Uint8Array([128, 128, 255, 255]),
    rough: new Uint8Array([ro, ro]),
  };
  const repeat: [number, number] = [12 / def.tileIn[0], 12 / def.tileIn[1]];
  return {
    key,
    spec,
    size,
    textures: {
      map: makeTexture(placeholder.color, THREE.RGBAFormat, true, anisotropy, repeat),
      normalMap: makeTexture(placeholder.normal, THREE.RGBAFormat, false, anisotropy, repeat),
      roughnessMap: makeTexture(placeholder.rough, THREE.RGFormat, false, anisotropy, repeat),
    },
    placeholder,
    stage: 0,
    refs: 0,
    retained: false,
    lastUsed: now(),
    bytes: 0,
    jobs: {},
    listeners: new Map(),
    evicted: false,
    gl: null,
    uploadToken: 0,
  };
}

function notify(entry: Entry) {
  for (const listener of entry.listeners.keys()) listener();
}

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 150 });
  else setTimeout(fn, 16);
}

/**
 * Uploads one map per idle callback, then asks for a frame, so a full-size
 * landing never stacks three texture uploads + mip builds into one frame.
 * Frames rendered meanwhile simply upload whatever is still pending.
 */
function preUpload(entry: Entry) {
  const gl = entry.gl;
  const token = ++entry.uploadToken;
  if (!gl || entry.refs === 0) {
    notify(entry);
    return;
  }
  const pending: THREE.DataTexture[] = [
    entry.textures.map,
    entry.textures.normalMap,
    entry.textures.roughnessMap,
  ];
  const step = () => {
    if (entry.evicted || token !== entry.uploadToken) return;
    const texture = pending.shift();
    if (!texture) {
      notify(entry);
      return;
    }
    if (texture.image.data) gl.initTexture(texture);
    idle(step);
  };
  idle(step);
}

function applyMaps(entry: Entry, data: VenueMapData, stage: Stage) {
  if (entry.evicted || stage <= entry.stage) return;
  const { map, normalMap, roughnessMap } = entry.textures;
  swapPixels(map, data.color, data.width, data.height, true);
  swapPixels(normalMap, data.normal, data.width, data.height, true);
  swapPixels(roughnessMap, data.rough, data.width, data.height, true);
  entry.stage = stage;
  entry.bytes = gpuBytes(data.width, data.height);
  if (stage === 2) {
    entry.jobs.preview?.cancel();
    entry.jobs = {};
  }
  preUpload(entry);
}

function resetToPlaceholder(entry: Entry) {
  const { map, normalMap, roughnessMap } = entry.textures;
  const { color, normal, rough } = entry.placeholder;
  swapPixels(map, color, 1, 1, false);
  swapPixels(normalMap, normal, 1, 1, false);
  swapPixels(roughnessMap, rough, 1, 1, false);
  entry.stage = 0;
  entry.bytes = 0;
  entry.uploadToken++;
}

function cancelJobs(entry: Entry) {
  entry.jobs.preview?.cancel();
  entry.jobs.final?.cancel();
  const pending = (job?: VenueMapJob) =>
    job && (job.state === "queued" || job.state === "running") ? job : undefined;
  entry.jobs = { preview: pending(entry.jobs.preview), final: pending(entry.jobs.final) };
}

const isPending = (job?: VenueMapJob) => job?.state === "queued" || job?.state === "running";

function startJobs(entry: Entry) {
  if (entry.refs === 0 || entry.stage === 2 || entry.evicted) return;
  if (entry.stage === 0 && entry.size > PREVIEW_SIZE && !isPending(entry.jobs.preview)) {
    entry.jobs.preview = requestVenueMaps(entry.spec, PREVIEW_SIZE, 0, (data) =>
      applyMaps(entry, data, 1)
    );
  }
  if (!isPending(entry.jobs.final)) {
    entry.jobs.final = requestVenueMaps(entry.spec, entry.size, 1, (data) =>
      applyMaps(entry, data, 2)
    );
  }
}

/* ------------------------------------------------------------- lifetime */

function evict(entry: Entry) {
  entry.jobs.preview?.cancel();
  entry.jobs.final?.cancel();
  entry.jobs = {};
  resetToPlaceholder(entry);
  entry.evicted = true;
  if (entries.get(entry.key) === entry) entries.delete(entry.key);
}

function sweep() {
  const t = now();
  const spares = [...entries.values()]
    .filter((entry) => entry.refs === 0)
    .sort((a, b) => b.lastUsed - a.lastUsed);
  const perGroup = new Map<VenueMapGroup, number>();
  let bytes = 0;
  for (const entry of spares) {
    if (!entry.retained && t - entry.lastUsed < UNRETAINED_GRACE_MS) continue;
    const count = (perGroup.get(entry.spec.group) ?? 0) + 1;
    if (!entry.retained || count > SPARE_PER_GROUP || bytes + entry.bytes > SPARE_BYTES) {
      evict(entry);
      continue;
    }
    perGroup.set(entry.spec.group, count);
    bytes += entry.bytes;
  }
}

let sweepQueued = false;
function scheduleSweep(delay = 0) {
  if (delay > 0) {
    setTimeout(sweep, delay);
    return;
  }
  if (sweepQueued) return;
  sweepQueued = true;
  // After the commit's passive effects, so sets re-acquired by new effects survive.
  setTimeout(() => {
    sweepQueued = false;
    sweep();
  }, 0);
}

function entryKey(specKey: string, size: number, anisotropy: number) {
  return `${specKey}@${size}x${anisotropy}`;
}

/** `specKey` is `${group}/${finish}`. Creates the entry (placeholder only) if missing. */
function peekEntry(specKey: string, size: number, anisotropy: number): Entry {
  const key = entryKey(specKey, size, anisotropy);
  let entry = entries.get(key);
  if (!entry) {
    const [group, finish] = specKey.split("/");
    entry = createEntry(key, { group, finish } as VenueMapSpec, size, anisotropy);
    entries.set(key, entry);
    scheduleSweep(UNRETAINED_GRACE_MS + 100);
  }
  return entry;
}

function retainEntry(
  entry: Entry,
  gl: THREE.WebGLRenderer,
  onChange?: () => void
): () => void {
  entry.gl = gl;
  if (entry.evicted) {
    entry.evicted = false;
    if (!entries.has(entry.key)) entries.set(entry.key, entry);
  }
  entry.refs++;
  entry.retained = true;
  entry.lastUsed = now();
  if (onChange) entry.listeners.set(onChange, (entry.listeners.get(onChange) ?? 0) + 1);
  startJobs(entry);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    entry.refs--;
    entry.lastUsed = now();
    if (onChange) {
      const count = (entry.listeners.get(onChange) ?? 1) - 1;
      if (count > 0) entry.listeners.set(onChange, count);
      else entry.listeners.delete(onChange);
    }
    if (entry.refs === 0) {
      // A revived duplicate (its key re-created meanwhile) is invisible to the sweep.
      if (entries.get(entry.key) !== entry) evict(entry);
      else cancelJobs(entry);
      scheduleSweep();
    }
  };
}

/* ---------------------------------------------------------- context loss */

const watchedCanvases = new WeakSet<HTMLCanvasElement>();

/** Pixels are dropped after upload, so a restored GL context regenerates every set. */
function watchContextRestore(gl: THREE.WebGLRenderer) {
  const canvas = gl.domElement;
  if (watchedCanvases.has(canvas)) return;
  watchedCanvases.add(canvas);
  canvas.addEventListener("webglcontextrestored", () => {
    for (const entry of [...entries.values()]) {
      if (entry.refs === 0) {
        evict(entry);
        continue;
      }
      entry.jobs.preview?.cancel();
      entry.jobs.final?.cancel();
      entry.jobs = {};
      resetToPlaceholder(entry);
      startJobs(entry);
      notify(entry);
    }
  });
}

/* ------------------------------------------------------------------ API */

function specKeyOf(spec: VenueMapSpec | null) {
  return spec ? `${spec.group}/${spec.finish}` : null;
}

function textureParams(spec: VenueMapSpec, quality: VenueQuality, maxAnisotropy: number) {
  const preset = getStudioQualityPreset(quality);
  return {
    size: spec.group === "ceiling" ? preset.ceilingTextureSize : preset.textureSize,
    anisotropy: Math.max(1, Math.min(preset.anisotropy, maxAnisotropy)),
  };
}

/**
 * Map set for one finish at the quality tier's size and anisotropy. Returns
 * stable textures immediately (flat colour), refining in place; `invalidate()`
 * is called as each stage lands. Pass `null` to skip.
 */
export function useVenueTextures(spec: VenueMapSpec, quality: VenueQuality): VenueTextureSet;
export function useVenueTextures(
  spec: VenueMapSpec | null,
  quality: VenueQuality
): VenueTextureSet | null;
export function useVenueTextures(
  spec: VenueMapSpec | null,
  quality: VenueQuality
): VenueTextureSet | null {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const specKey = specKeyOf(spec);
  const { size, anisotropy } = spec
    ? textureParams(spec, quality, gl.capabilities.getMaxAnisotropy())
    : { size: 0, anisotropy: 0 };
  const entry = useMemo(
    () => (specKey ? peekEntry(specKey, size, anisotropy) : null),
    [specKey, size, anisotropy]
  );
  useEffect(
    () => (entry ? retainEntry(entry, gl, invalidate) : undefined),
    [entry, gl, invalidate]
  );
  useEffect(() => watchContextRestore(gl), [gl]);
  return entry?.textures ?? null;
}

/** Imperative variant of `useVenueTextures`; call `release()` when done. */
export function acquireVenueTextures(
  spec: VenueMapSpec,
  quality: VenueQuality,
  gl: THREE.WebGLRenderer,
  onChange?: () => void
): { textures: VenueTextureSet; release: () => void } {
  const { size, anisotropy } = textureParams(spec, quality, gl.capabilities.getMaxAnisotropy());
  const entry = peekEntry(specKeyOf(spec)!, size, anisotropy);
  watchContextRestore(gl);
  return { textures: entry.textures, release: retainEntry(entry, gl, onChange) };
}

/** Diagnostics: live / spare sets and their estimated GPU bytes. */
export function getVenueTextureStats() {
  let live = 0;
  let spare = 0;
  let liveBytes = 0;
  let spareBytes = 0;
  for (const entry of entries.values()) {
    if (entry.refs > 0) {
      live++;
      liveBytes += entry.bytes;
    } else {
      spare++;
      spareBytes += entry.bytes;
    }
  }
  return { live, spare, liveBytes, spareBytes };
}
