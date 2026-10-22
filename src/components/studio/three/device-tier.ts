import type { StudioQuality } from "../editor/studio-editor-context";

/**
 * One-time device capability probe (browser only, cached per GPU in
 * localStorage). Must stay free of `three` so the 2D editor can call it
 * without loading the 3D engine.
 */
export type StudioDeviceTier = "low" | "mid" | "high";

export type StudioDeviceProfile = {
  tier: StudioDeviceTier;
  gpu: string;
  /** SwiftShader/llvmpipe etc. — hardware acceleration is off. */
  software: boolean;
  mobile: boolean;
};

const CACHE_KEY = "tcg-studio-device-tier-v2";
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|basic render|software/i;
const INTEGRATED_GPU =
  /intel.*(hd|uhd|iris)|mali|powervr|adreno.*[1-6]\d\d\b|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics/i;
const DISCRETE_GPU = /rtx|gtx|radeon rx|\brx \d|arc a\d|apple m\d (pro|max|ultra)/i;

let cached: StudioDeviceProfile | null = null;

type GpuProbe = { gpu: string; maxTexture: number; caveat: boolean };

/**
 * `failIfMajorPerformanceCaveat` refuses a context when the browser would
 * fall back to software or a blocklisted driver — catches cases where the
 * renderer string is masked.
 */
function hasPerformanceCaveat() {
  try {
    const canvas = document.createElement("canvas");
    const strict =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    if (!strict) return true;
    (strict as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return false;
  } catch {
    return false;
  }
}

function probeGpu(): GpuProbe {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return { gpu: "none", maxTexture: 0, caveat: true };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    );
    const maxTexture = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { gpu, maxTexture, caveat: hasPerformanceCaveat() };
  } catch {
    return { gpu: "unknown", maxTexture: 0, caveat: false };
  }
}

function detect(): StudioDeviceProfile {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const mobile =
    /android|iphone|ipad|ipod|mobile/i.test(nav.userAgent) ||
    (window.matchMedia?.("(pointer: coarse)").matches &&
      Math.min(window.screen.width, window.screen.height) < 820);
  const { gpu, maxTexture, caveat } = probeGpu();
  const software = SOFTWARE_GPU.test(gpu) || gpu === "none" || caveat;

  if (software || mobile || memory <= 2 || (maxTexture > 0 && maxTexture < 8192)) {
    return { tier: "low", gpu, software, mobile };
  }
  let score = 2;
  if (memory <= 4) score -= 1;
  if (cores <= 4) score -= 1;
  if (INTEGRATED_GPU.test(gpu)) score -= 1;
  if (nav.connection?.saveData) score -= 1;
  if (DISCRETE_GPU.test(gpu)) score += 1;
  const tier: StudioDeviceTier = score <= 1 ? "low" : score >= 3 ? "high" : "mid";
  return { tier, gpu, software, mobile };
}

export function getStudioDeviceProfile(): StudioDeviceProfile {
  if (cached) return cached;
  if (typeof window === "undefined") {
    return { tier: "mid", gpu: "ssr", software: false, mobile: false };
  }
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudioDeviceProfile;
      if (parsed?.tier) {
        cached = parsed;
        return parsed;
      }
    }
  } catch {
    // Cache is best-effort.
  }
  cached = detect();
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Cache is best-effort.
  }
  return cached;
}

/** Starting quality for users who never picked one. Ultra is opt-in only. */
export function getRecommendedStudioQuality(): StudioQuality {
  return getStudioDeviceProfile().tier === "low" ? "draft" : "high";
}
