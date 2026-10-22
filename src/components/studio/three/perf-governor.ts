import { useSyncExternalStore } from "react";
import type { StudioQuality } from "../editor/studio-editor-context";
import { getStudioDeviceProfile } from "./device-tier";
import type { StudioQualityPreset } from "./engine-quality";
import { isStudioInteracting } from "./interaction-store";

/**
 * Runtime quality governor. Samples frame intervals only while the Studio
 * renders continuously (the demand frameloop idles between edits, which would
 * otherwise read as a terrible frame rate) and steps the render down one notch
 * at a time when motion gets choppy:
 *
 *   1. AO off   2. resolution × 0.8   3. bloom off   4. shadow map halved
 *
 * Steps that change nothing for the active preset are skipped. The reached
 * level persists per device + quality, and the governor may climb back up at
 * most twice per session when frames are comfortably fast.
 */
export type StudioGovernorStep = "ao" | "dpr" | "bloom" | "shadow";

export type StudioGovernorState = {
  quality: StudioQuality;
  /** Number of applicable steps currently applied. */
  level: number;
  /** Applicable steps for this preset, in order. */
  steps: StudioGovernorStep[];
  aoOff: boolean;
  dprScale: number;
  bloomOff: boolean;
  shadowHalf: boolean;
};

const STORAGE_KEY = "tcg-studio-governor-v1";
const DOWN_SAMPLES = 45;
const UP_SAMPLES = 90;
const DOWN_MS = 28;
const UP_MS = 14;
/* A 60 Hz display can't show < 14 ms frames: steady vsync with little jitter also counts. */
const VSYNC_MS = 17.6;
const VSYNC_JANK_MS = 22;
const CONTINUOUS_MS = 50;
const INTERACTIVE_MAX_MS = 250;
/* Ignore the hitch right after a level/quality change (reallocation, shader compile). */
const WARMUP_MS = 1200;
const MAX_UPGRADES = 2;
export const STUDIO_GOVERNOR_DPR_SCALE = 0.8;

const listeners = new Set<() => void>();
const samples: number[] = [];
let lastFrameAt = 0;
let sinceCheck = 0;
let warmUntil = 0;
let upgrades = 0;
let state: StudioGovernorState = buildState("high", [], 0);

function buildState(
  quality: StudioQuality,
  steps: StudioGovernorStep[],
  level: number
): StudioGovernorState {
  const applied = new Set(steps.slice(0, level));
  return {
    quality,
    level,
    steps,
    aoOff: applied.has("ao"),
    dprScale: applied.has("dpr") ? STUDIO_GOVERNOR_DPR_SCALE : 1,
    bloomOff: applied.has("bloom"),
    shadowHalf: applied.has("shadow"),
  };
}

function stepsFor(preset: StudioQualityPreset): StudioGovernorStep[] {
  const steps: StudioGovernorStep[] = [];
  if (preset.ao) steps.push("ao");
  steps.push("dpr");
  if (preset.bloom) steps.push("bloom");
  if (preset.shadows && preset.shadowMapSize > 512) steps.push("shadow");
  return steps;
}

type Persisted = { gpu: string; levels: Partial<Record<StudioQuality, number>> };

function readPersisted(): Persisted | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed?.gpu !== getStudioDeviceProfile().gpu) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(quality: StudioQuality, level: number) {
  try {
    const previous = readPersisted();
    const next: Persisted = {
      gpu: getStudioDeviceProfile().gpu,
      levels: { ...previous?.levels, [quality]: level },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persistence is best-effort.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function setLevel(level: number, save = true) {
  const clamped = Math.max(0, Math.min(state.steps.length, level));
  if (clamped === state.level) return;
  state = buildState(state.quality, state.steps, clamped);
  if (save) persist(state.quality, clamped);
  resetStudioGovernorSamples();
  emit();
}

/** Drop collected samples and ignore the next warm-up window. */
export function resetStudioGovernorSamples() {
  samples.length = 0;
  lastFrameAt = 0;
  sinceCheck = 0;
  warmUntil = performance.now() + WARMUP_MS;
}

/** Point the governor at the active quality; restores the persisted level. */
export function configureStudioGovernor(quality: StudioQuality, preset: StudioQualityPreset) {
  const steps = stepsFor(preset);
  if (quality === state.quality && steps.join() === state.steps.join()) return;
  const saved = typeof window === "undefined" ? 0 : (readPersisted()?.levels[quality] ?? 0);
  state = buildState(quality, steps, Math.max(0, Math.min(steps.length, saved)));
  resetStudioGovernorSamples();
  emit();
}

/** User asked for full quality again: clear the degradation for this quality. */
export function resetStudioGovernorLevel() {
  upgrades = 0;
  setLevel(0);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Call once per rendered frame with `performance.now()`. */
export function recordStudioFrame(now: number) {
  const previous = lastFrameAt;
  lastFrameAt = now;
  if (!previous || now < warmUntil) return;
  const interval = now - previous;
  const continuous =
    interval < CONTINUOUS_MS || (interval < INTERACTIVE_MAX_MS && isStudioInteracting());
  if (!continuous) return;

  samples.push(interval);
  if (samples.length > UP_SAMPLES) samples.shift();
  /* Sorting 45–90 numbers is cheap, but there's no need to do it every frame. */
  sinceCheck += 1;
  if (sinceCheck < 5) return;
  sinceCheck = 0;

  if (samples.length >= DOWN_SAMPLES && state.level < state.steps.length) {
    if (median(samples.slice(-DOWN_SAMPLES)) > DOWN_MS) {
      setLevel(state.level + 1);
      return;
    }
  }
  if (samples.length >= UP_SAMPLES && state.level > 0 && upgrades < MAX_UPGRADES) {
    const mid = median(samples);
    const janky = samples.filter((value) => value > VSYNC_JANK_MS).length / samples.length;
    if (mid < UP_MS || (mid <= VSYNC_MS && janky < 0.08)) {
      upgrades += 1;
      setLevel(state.level - 1);
    }
  }
}

export function getStudioGovernor() {
  return state;
}

export function subscribeStudioGovernor(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useStudioGovernor() {
  return useSyncExternalStore(subscribeStudioGovernor, getStudioGovernor, getStudioGovernor);
}

/** The preset with governor steps that live in preset fields (shadow map size) applied. */
export function governStudioPreset(
  preset: StudioQualityPreset,
  governor: Pick<StudioGovernorState, "shadowHalf">
): StudioQualityPreset {
  if (!governor.shadowHalf) return preset;
  return { ...preset, shadowMapSize: Math.max(512, preset.shadowMapSize / 2) };
}
