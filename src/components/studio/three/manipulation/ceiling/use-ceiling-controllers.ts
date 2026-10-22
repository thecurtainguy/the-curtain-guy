"use client";

import type { ThreeEvent } from "@react-three/fiber";
import {
  getCeilingDrapes,
  type StudioCeilingDrape,
  type StudioDesignJson,
  type StudioPoint,
} from "@/data/studio";
import {
  CEILING_STYLE_FIELDS,
  ceilingAxis,
  findCeilingDrape,
  getCeilingAreaCorners,
  insetCeilingPolygon,
  moveCeilingDrape,
  normalizeCeilingRotation,
  pointInCeilingPolygon,
  updateCeilingDrape,
  type CeilingLayout,
} from "@/lib/studio-ceiling";
import { findStudioItem, nudgeStudioItems } from "@/lib/studio-commands";
import {
  getPolygonCentroid,
  inchesToFeetLabel,
  type StudioBounds,
} from "@/lib/studio-geometry";
import { isStudioPointInRoom } from "@/lib/studio-interactions";
import * as THREE from "three";
import type {
  StudioEditorActions,
  StudioEditorSettings,
} from "../../../editor/studio-editor-context";
import { CEILING_FLUSH_CLEARANCE_IN, dropToWorldY } from "../../ceiling/frame";
import {
  SCALE,
  clamp,
  containCentersInPolygon,
  formatDegrees,
  fromWorld,
  intersectHorizontal,
  intersectVertical,
  snapTo,
  toWorld,
  wrapAngle,
  type GuideLine,
} from "../drag-math";
import type {
  ClaimOptions,
  GestureApi,
  ManipulationOverlay,
  StartSession,
} from "../use-manipulation-controllers";
import {
  MIN_CEILING_CLEARANCE,
  ceilingAnchor,
  ceilingClearance,
  ceilingFieldRange,
  clampDropForClearance,
  isCeilingMovable,
  type CeilingDropField,
} from "./ceiling-geometry";
import { getCachedCeilingLayout } from "./ceiling-proxies";

/** Inches within which a dragged hub / centre magnetises to the room centre. */
const CENTRE_SNAP = 12;
/** Smallest area rectangle side, inches. */
const MIN_AREA_SIDE = 24;
const CORNER_SIGNS: Array<[number, number]> = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * Snaps a plan point to the grid, then magnetises each axis to `centre`.
 * Returns the guide lines (plan inches) for the axes that locked on.
 */
function snapPlanPoint(
  point: StudioPoint,
  centre: StudioPoint,
  bounds: StudioBounds,
  options: { grid: number | null; magnet: boolean }
): { point: StudioPoint; guides: GuideLine[] } {
  let { x, z } = point;
  const guides: GuideLine[] = [];
  if (options.grid) {
    x = snapTo(x, options.grid);
    z = snapTo(z, options.grid);
  }
  if (options.magnet) {
    if (Math.abs(point.x - centre.x) <= CENTRE_SNAP) {
      x = centre.x;
      guides.push({
        from: { x: centre.x, z: bounds.minZ },
        to: { x: centre.x, z: bounds.maxZ },
      });
    }
    if (Math.abs(point.z - centre.z) <= CENTRE_SNAP) {
      z = centre.z;
      guides.push({
        from: { x: bounds.minX, z: centre.z },
        to: { x: bounds.maxX, z: centre.z },
      });
    }
  }
  return { point: { x, z }, guides };
}

/**
 * True when a gesture frame differs from the previous one. Snapped drags
 * repeat the same result for many pointer moves, and every preview rebuilds
 * the design's fabric, lights and pick proxy.
 */
function createChangeGate() {
  let last: string | null = null;
  return (key: string) => {
    if (key === last) return false;
    last = key;
    return true;
  };
}

/** Moves a design by (dx, dz); room-wide radial styles move their resolved hub. */
function shiftCeiling(
  drape: StudioCeilingDrape,
  layout: CeilingLayout,
  dx: number,
  dz: number
): StudioCeilingDrape {
  if (drape.coverage === "area" || !layout.hub) {
    return moveCeilingDrape(drape, dx, dz);
  }
  return {
    ...drape,
    x: drape.x + dx,
    z: drape.z + dz,
    hubX: layout.hub.x + dx,
    hubZ: layout.hub.z + dz,
  };
}

/**
 * Gesture controllers for ceiling designs (move, hub, drops, rotation, area
 * resize). Shares the session + overlay plumbing of the main controllers so
 * each gesture is one undo step and Escape cancels.
 */
export function useCeilingControllers({
  design,
  bounds,
  preview,
  settings,
  selectedIds,
  startSession,
  gesture,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  preview: StudioEditorActions["preview"];
  settings: StudioEditorSettings;
  selectedIds: string[];
  startSession: StartSession;
  gesture: GestureApi;
}) {
  const floor = design.room.floor;
  const wallHeight = design.room.wallHeight;
  const increment = Math.max(1, settings.snapIncrement);
  const ceilingY = wallHeight * SCALE;
  const guidesHeight = ceilingY - 0.08;

  const planTitle = (point: StudioPoint) =>
    `X ${inchesToFeetLabel(point.x - bounds.minX)}  ·  Z ${inchesToFeetLabel(
      point.z - bounds.minZ
    )}`;

  const readoutAt = (
    point: StudioPoint,
    y: number,
    title: string,
    detail?: string
  ): ManipulationOverlay["readout"] => {
    const [x, z] = toWorld(bounds, point);
    return { position: [x, y, z], title, detail };
  };

  /* ------------------------------- Move -------------------------------- */

  /** Returns false when the design cannot move (room-wide rows etc.). */
  const startCeilingDrag = (
    event: ThreeEvent<PointerEvent>,
    id: string,
    claim: ClaimOptions = {}
  ): boolean => {
    const base = design;
    const grabbed = findCeilingDrape(base, id);
    if (!grabbed || grabbed.locked || !isCeilingMovable(grabbed)) return false;
    const wasSelected = selectedIds.includes(id);
    const ids = wasSelected
      ? selectedIds.filter((itemId) => {
          const found = findStudioItem(base, itemId);
          return found && !found.item.locked;
        })
      : [id];
    const ceilings = getCeilingDrapes(base).filter(
      (drape) =>
        ids.includes(drape.id) &&
        !drape.locked &&
        !drape.hidden &&
        isCeilingMovable(drape)
    );
    const layouts = new Map(
      ceilings.map((drape) => [drape.id, getCachedCeilingLayout(drape, floor)])
    );
    const otherIds = ids.filter(
      (itemId) => findStudioItem(base, itemId)?.kind !== "ceiling"
    );
    const grabbedLayout = layouts.get(id);
    if (!grabbedLayout) return false;
    const anchor = ceilingAnchor(grabbed, grabbedLayout);

    /* Area centres and object centres stay in the room; hubs stay in their outline. */
    const roomPoints: StudioPoint[] = [
      ...ceilings
        .filter((drape) => drape.coverage === "area")
        .map((drape) => ({ x: drape.x, z: drape.z })),
      ...base.objects
        .filter(
          (object) =>
            otherIds.includes(object.id) && isStudioPointInRoom(object, floor)
        )
        .map((object) => ({ x: object.x, z: object.z })),
    ].filter((point) => isStudioPointInRoom(point, floor));
    const hubLimits = ceilings.flatMap((drape) => {
      const layout = layouts.get(drape.id);
      if (drape.coverage === "area" || !layout?.hub) return [];
      return [{ hub: layout.hub, outline: insetCeilingPolygon(layout.outline, 2) }];
    });
    const contain = (delta: StudioPoint): StudioPoint | null => {
      let next: StudioPoint | null = containCentersInPolygon(roomPoints, delta, floor);
      for (const limit of hubLimits) {
        if (!next) return null;
        next = containCentersInPolygon([limit.hub], next, limit.outline);
      }
      if (!next) return null;
      const valid =
        roomPoints.every((point) =>
          isStudioPointInRoom({ x: point.x + next.x, z: point.z + next.z }, floor)
        ) &&
        hubLimits.every((limit) =>
          pointInCeilingPolygon(limit.outline, limit.hub.x + next.x, limit.hub.z + next.z)
        );
      return valid ? next : null;
    };

    const planeY = event.point.y;
    const startHit =
      intersectHorizontal(event.ray.clone(), planeY) ?? event.point.clone();
    const ghosts = ceilings.map((drape) => layouts.get(drape.id)?.outline ?? []);
    const centre = getPolygonCentroid(floor);
    const detail = ids.length > 1 ? `Moving ${ids.length} items` : grabbed.label;
    const readoutY = planeY - 0.35;
    let lastValid = { x: 0, z: 0 };
    const changed = createChangeGate();

    startSession(event, {
      ...claim,
      onActivate: () =>
        gesture.begin(
          {
            mode: "move",
            ceilingGhosts: ghosts,
            readout: readoutAt(anchor, readoutY, planTitle(anchor), detail),
          },
          wasSelected ? undefined : { kind: "ceiling", id }
        ),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, planeY);
        if (!hit) return;
        const raw = {
          x: anchor.x + (hit.x - startHit.x) / SCALE,
          z: anchor.z + (hit.z - startHit.z) / SCALE,
        };
        const snapped = free
          ? { point: raw, guides: [] }
          : snapPlanPoint(raw, centre, bounds, {
              grid: settings.snapEnabled ? increment : null,
              magnet: settings.smartGuides,
            });
        const contained = contain({
          x: snapped.point.x - anchor.x,
          z: snapped.point.z - anchor.z,
        });
        if (contained) lastValid = contained;
        const { x: dx, z: dz } = lastValid;
        const guides = contained ? snapped.guides : [];
        if (!changed(`${dx}|${dz}|${guides.length}`)) return;
        let next =
          otherIds.length > 0 ? nudgeStudioItems(base, otherIds, dx, dz) : base;
        next = {
          ...next,
          ceilingDrapes: getCeilingDrapes(next).map((drape) => {
            const layout = layouts.get(drape.id);
            return layout ? shiftCeiling(drape, layout, dx, dz) : drape;
          }),
        };
        preview(next);
        const moved = { x: anchor.x + dx, z: anchor.z + dz };
        gesture.setOverlay({
          mode: "move",
          ceilingGhosts: ghosts,
          guides,
          guidesHeight,
          readout: readoutAt(moved, readoutY, planTitle(moved), detail),
        });
      },
      onEnd: gesture.finish,
    });
    return true;
  };

  /* -------------------------------- Hub -------------------------------- */

  const startHubDrag = (event: ThreeEvent<PointerEvent>, drape: StudioCeilingDrape) => {
    if (drape.locked) return;
    const base = design;
    const layout = getCachedCeilingLayout(drape, floor);
    const hub = layout.hub;
    if (!hub) return;
    const outline = insetCeilingPolygon(layout.outline, 2);
    const centre = getPolygonCentroid(layout.outline);
    const planeY = dropToWorldY(
      wallHeight,
      Math.max(CEILING_FLUSH_CLEARANCE_IN, drape.hubDrop)
    );
    const startHit =
      intersectHorizontal(event.ray.clone(), planeY) ?? event.point.clone();
    const label = CEILING_STYLE_FIELDS[drape.type].labels.hub ?? "Hub";
    const readoutY = planeY - 0.45;
    let lastValid = { x: 0, z: 0 };
    const changed = createChangeGate();

    startSession(event, {
      threshold: 1,
      cursor: "move",
      onActivate: () =>
        gesture.begin({
          mode: "hub",
          readout: readoutAt(hub, readoutY, planTitle(hub), label),
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, planeY);
        if (!hit) return;
        const raw = {
          x: hub.x + (hit.x - startHit.x) / SCALE,
          z: hub.z + (hit.z - startHit.z) / SCALE,
        };
        const snapped = free
          ? { point: raw, guides: [] }
          : snapPlanPoint(raw, centre, bounds, {
              grid: settings.snapEnabled ? increment : null,
              magnet: settings.smartGuides,
            });
        const contained = containCentersInPolygon(
          [hub],
          { x: snapped.point.x - hub.x, z: snapped.point.z - hub.z },
          outline
        );
        if (
          contained &&
          pointInCeilingPolygon(outline, hub.x + contained.x, hub.z + contained.z)
        ) {
          lastValid = contained;
        }
        const next = { x: hub.x + lastValid.x, z: hub.z + lastValid.z };
        const guides = contained ? snapped.guides : [];
        if (!changed(`${next.x}|${next.z}|${guides.length}`)) return;
        preview(updateCeilingDrape(base, drape.id, { hubX: next.x, hubZ: next.z }));
        gesture.setOverlay({
          mode: "hub",
          guides,
          guidesHeight,
          readout: readoutAt(next, readoutY, planTitle(next), label),
        });
      },
      onEnd: gesture.finish,
    });
  };

  /* ------------------------------- Drops ------------------------------- */

  const startDropDrag = (
    event: ThreeEvent<PointerEvent>,
    drape: StudioCeilingDrape,
    field: CeilingDropField
  ) => {
    if (drape.locked) return;
    const base = design;
    const normal = new THREE.Vector3();
    event.camera.getWorldDirection(normal);
    normal.y = 0;
    if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
    normal.normalize();
    const pivot = event.eventObject.getWorldPosition(new THREE.Vector3());
    const startHit = intersectVertical(event.ray.clone(), pivot, normal);
    if (!startHit) return;
    const range = ceilingFieldRange(drape, field);
    const label = CEILING_STYLE_FIELDS[drape.type].labels[field] ?? "Drop";
    const startValue = drape[field];
    const plan = fromWorld(bounds, pivot.x, pivot.z);
    const changed = createChangeGate();

    const readout = (value: number, limited: boolean) => {
      const next = { ...drape, [field]: value };
      const clearance = ceilingClearance(next, wallHeight);
      return readoutAt(
        plan,
        pivot.y - (value - startValue) * SCALE - 0.5,
        `${label} ${inchesToFeetLabel(value)}`,
        limited
          ? `${inchesToFeetLabel(MIN_CEILING_CLEARANCE)} min clearance`
          : `${inchesToFeetLabel(clearance)} clear to floor`
      );
    };

    startSession(event, {
      threshold: 1,
      cursor: "ns-resize",
      onActivate: () =>
        gesture.begin({
          mode: "drop",
          activeHandle: field,
          readout: readout(startValue, false),
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectVertical(ray, pivot, normal);
        if (!hit) return;
        let value = startValue - (hit.y - startHit.y) / SCALE;
        const step =
          !free && settings.snapEnabled
            ? Math.max(range.step, Math.min(increment, 6))
            : 1;
        value = clamp(snapTo(value, step), range.min, range.max);
        const fitted = clampDropForClearance(drape, field, value, wallHeight);
        value = Math.round(fitted.value);
        if (!changed(`${value}|${fitted.limited}`)) return;
        preview(updateCeilingDrape(base, drape.id, { [field]: value }));
        gesture.setOverlay({
          mode: "drop",
          activeHandle: field,
          readout: readout(value, fitted.limited),
        });
      },
      onEnd: gesture.finish,
    });
  };

  /* ------------------------------ Rotation ----------------------------- */

  const startCeilingRotate = (
    event: ThreeEvent<PointerEvent>,
    drape: StudioCeilingDrape,
    pivot: StudioPoint,
    ringY: number
  ) => {
    if (drape.locked) return;
    const base = design;
    const startHit = intersectHorizontal(event.ray.clone(), ringY);
    if (!startHit) return;
    const startPoint = fromWorld(bounds, startHit.x, startHit.z);
    let lastAngle = Math.atan2(startPoint.z - pivot.z, startPoint.x - pivot.x);
    let accumulated = 0;
    const step = settings.rotationSnap > 0 ? settings.rotationSnap : 0;
    const label = CEILING_STYLE_FIELDS[drape.type].labels.direction ?? "Rotation";
    const readoutY = ringY - 0.4;
    const changed = createChangeGate();

    startSession(event, {
      threshold: 1,
      onActivate: () =>
        gesture.begin({
          mode: "rotate",
          readout: readoutAt(pivot, readoutY, formatDegrees(drape.rotation), label),
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, ringY);
        if (!hit) return;
        const point = fromWorld(bounds, hit.x, hit.z);
        const angle = Math.atan2(point.z - pivot.z, point.x - pivot.x);
        accumulated += wrapAngle(angle - lastAngle);
        lastAngle = angle;
        const raw = drape.rotation + (accumulated * 180) / Math.PI;
        const snapped =
          free || step === 0 ? Math.round(raw * 10) / 10 : snapTo(raw, step);
        const rotation = normalizeCeilingRotation(snapped);
        if (!changed(`${rotation}|${free}`)) return;
        preview(updateCeilingDrape(base, drape.id, { rotation }));
        gesture.setOverlay({
          mode: "rotate",
          readout: readoutAt(
            pivot,
            readoutY,
            formatDegrees(rotation),
            free ? `${label} · free` : `${label} · snap ${step}°`
          ),
        });
      },
      onEnd: gesture.finish,
    });
  };

  /* ---------------------------- Area resize ---------------------------- */

  const startAreaResize = (
    event: ThreeEvent<PointerEvent>,
    drape: StudioCeilingDrape,
    cornerIndex: number,
    planeY: number
  ) => {
    if (drape.locked || drape.coverage !== "area") return;
    const base = design;
    const signs = CORNER_SIGNS[cornerIndex] ?? CORNER_SIGNS[2];
    const fixed = getCeilingAreaCorners(drape)[(cornerIndex + 2) % 4];
    const u = ceilingAxis(drape.rotation);
    const v = { x: -u.z, z: u.x };
    const hubCentred = Math.hypot(drape.hubX - drape.x, drape.hubZ - drape.z) < 1;
    const sizeTitle = (width: number, depth: number) =>
      `${inchesToFeetLabel(width)} × ${inchesToFeetLabel(depth)}`;
    const readoutY = planeY - 0.45;
    /* One array for the whole gesture so the ghost outline isn't rebuilt per move. */
    const ghosts = [getCeilingAreaCorners(drape)];
    const changed = createChangeGate();

    startSession(event, {
      threshold: 1,
      cursor: cornerIndex % 2 === 0 ? "nwse-resize" : "nesw-resize",
      onActivate: () =>
        gesture.begin({
          mode: "resize",
          ceilingGhosts: ghosts,
          readout: readoutAt(
            drape,
            readoutY,
            sizeTitle(drape.width, drape.depth),
            "Ceiling area"
          ),
        }),
      onMove: ({ ray, free }) => {
        const hit = intersectHorizontal(ray, planeY);
        if (!hit) return;
        const raw = fromWorld(bounds, hit.x, hit.z);
        const pointer = {
          x: clamp(raw.x, bounds.minX, bounds.maxX),
          z: clamp(raw.z, bounds.minZ, bounds.maxZ),
        };
        const du = (pointer.x - fixed.x) * u.x + (pointer.z - fixed.z) * u.z;
        const dv = (pointer.x - fixed.x) * v.x + (pointer.z - fixed.z) * v.z;
        let width = Math.max(MIN_AREA_SIDE, signs[0] * du);
        let depth = Math.max(MIN_AREA_SIDE, signs[1] * dv);
        if (!free && settings.snapEnabled) {
          width = Math.max(MIN_AREA_SIDE, snapTo(width, increment));
          depth = Math.max(MIN_AREA_SIDE, snapTo(depth, increment));
        }
        width = Math.round(width);
        depth = Math.round(depth);
        const x = fixed.x + u.x * signs[0] * (width / 2) + v.x * signs[1] * (depth / 2);
        const z = fixed.z + u.z * signs[0] * (width / 2) + v.z * signs[1] * (depth / 2);
        if (!changed(`${width}|${depth}`)) return;
        preview(
          updateCeilingDrape(base, drape.id, {
            width,
            depth,
            x,
            z,
            ...(hubCentred ? { hubX: x, hubZ: z } : {}),
          })
        );
        gesture.setOverlay({
          mode: "resize",
          ceilingGhosts: ghosts,
          readout: readoutAt({ x, z }, readoutY, sizeTitle(width, depth), "Ceiling area"),
        });
      },
      onEnd: gesture.finish,
    });
  };

  return {
    startCeilingDrag,
    startHubDrag,
    startDropDrag,
    startCeilingRotate,
    startAreaResize,
  };
}
