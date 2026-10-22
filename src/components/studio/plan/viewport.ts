/**
 * 2D plan camera. `zoom` is screen pixels per plan inch (1 = 100%); `x`/`z`
 * are the plan coordinates shown at the viewport's top-left corner.
 */
export type PlanCamera = { zoom: number; x: number; z: number };
export type PlanSize = { width: number; height: number };
export type PlanRect = { minX: number; maxX: number; minZ: number; maxZ: number };

export const PLAN_MIN_ZOOM = 0.1;
export const PLAN_MAX_ZOOM = 10;
export const PLAN_FIT_PADDING_PX = 72;

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(PLAN_MAX_ZOOM, Math.max(PLAN_MIN_ZOOM, zoom));
}

export function fitCamera(
  rect: PlanRect,
  size: PlanSize,
  paddingPx = PLAN_FIT_PADDING_PX
): PlanCamera {
  const width = Math.max(1, rect.maxX - rect.minX);
  const depth = Math.max(1, rect.maxZ - rect.minZ);
  const usableWidth = Math.max(40, size.width - paddingPx * 2);
  const usableHeight = Math.max(40, size.height - paddingPx * 2);
  const zoom = clampZoom(Math.min(usableWidth / width, usableHeight / depth));
  return centeredCamera(rect, size, zoom);
}

export function centeredCamera(
  rect: PlanRect,
  size: PlanSize,
  zoom: number
): PlanCamera {
  const safeZoom = clampZoom(zoom);
  const centerX = (rect.minX + rect.maxX) / 2;
  const centerZ = (rect.minZ + rect.maxZ) / 2;
  return {
    zoom: safeZoom,
    x: centerX - size.width / 2 / safeZoom,
    z: centerZ - size.height / 2 / safeZoom,
  };
}

/** Zooms by `factor` keeping the plan point under `screen` (viewport px) fixed. */
export function zoomCameraAt(
  camera: PlanCamera,
  factor: number,
  screen: { x: number; y: number }
): PlanCamera {
  const zoom = clampZoom(camera.zoom * factor);
  if (zoom === camera.zoom) return camera;
  const planX = camera.x + screen.x / camera.zoom;
  const planZ = camera.z + screen.y / camera.zoom;
  return { zoom, x: planX - screen.x / zoom, z: planZ - screen.y / zoom };
}

const ZOOM_STEP_LOG = Math.log(1.1);

/**
 * Zoom snapped to 10% steps, for zoom-compensated sizes that need not follow
 * every frame (hit areas, focus/outline padding): within ±5%, invisible.
 */
export function quantizeZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.exp(Math.round(Math.log(zoom) / ZOOM_STEP_LOG) * ZOOM_STEP_LOG);
}

export function screenToPlan(
  camera: PlanCamera,
  screen: { x: number; y: number }
): { x: number; z: number } {
  return {
    x: camera.x + screen.x / camera.zoom,
    z: camera.z + screen.y / camera.zoom,
  };
}

export function planToScreen(
  camera: PlanCamera,
  point: { x: number; z: number }
): { x: number; y: number } {
  return {
    x: (point.x - camera.x) * camera.zoom,
    y: (point.z - camera.z) * camera.zoom,
  };
}

export function getVisiblePlanRect(camera: PlanCamera, size: PlanSize): PlanRect {
  return {
    minX: camera.x,
    minZ: camera.z,
    maxX: camera.x + size.width / camera.zoom,
    maxZ: camera.z + size.height / camera.zoom,
  };
}

export function rectContains(outer: PlanRect, inner: PlanRect, slack = 0): boolean {
  return (
    inner.minX >= outer.minX - slack &&
    inner.maxX <= outer.maxX + slack &&
    inner.minZ >= outer.minZ - slack &&
    inner.maxZ <= outer.maxZ + slack
  );
}

const MINOR_MULTIPLIERS = [1, 2, 4, 5, 10, 20, 50, 100, 200, 500];
const MAJOR_STEPS = [12, 60, 120, 240, 600, 1200, 2400, 6000, 12000, 24000];

/**
 * Adaptive grid: minor lines follow the snap increment (coarsened until they
 * are at least ~8px apart), major lines land on whole-foot multiples.
 */
export function getGridSteps(
  snapIncrement: number,
  zoom: number
): { minor: number; major: number } {
  const base = Number.isFinite(snapIncrement) && snapIncrement > 0 ? snapIncrement : 12;
  let minor = base * MINOR_MULTIPLIERS[MINOR_MULTIPLIERS.length - 1];
  for (const multiplier of MINOR_MULTIPLIERS) {
    if (base * multiplier * zoom >= 8) {
      minor = base * multiplier;
      break;
    }
  }
  let major = minor * 5;
  for (const step of MAJOR_STEPS) {
    if (step >= minor * 3 && step * zoom >= 40 && step % minor === 0) {
      major = step;
      break;
    }
  }
  return { minor, major };
}

/** Ruler tick spacing in feet so labels stay at least ~56px apart. */
export function getRulerStepFeet(zoom: number): number {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  for (const step of steps) {
    if (step * 12 * zoom >= 56) return step;
  }
  return steps[steps.length - 1];
}
