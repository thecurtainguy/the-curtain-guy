import {
  createStudioItemId,
  getCeilingDrapes,
  type StudioCeilingDrape,
  type StudioDesignJson,
  type StudioDrapeRun,
  type StudioObject,
  type StudioOpening,
  type StudioTreatment,
} from "@/data/studio";
import {
  clampDrapeRunToWall,
  clampOpeningToWall,
  clampTreatmentToWall,
  getWallSegments,
} from "@/lib/studio-geometry";
import {
  STUDIO_MAX_COORDINATE,
  clampFinite,
  getStudioObjectCorners,
} from "@/lib/studio-interactions";

export type StudioItemKind =
  | "object"
  | "drape"
  | "treatment"
  | "opening"
  | "ceiling";

export type StudioItemRef =
  | { kind: "object"; item: StudioObject }
  | { kind: "drape"; item: StudioDrapeRun }
  | { kind: "treatment"; item: StudioTreatment }
  | { kind: "opening"; item: StudioOpening }
  | { kind: "ceiling"; item: StudioCeilingDrape };

export type StudioClipboard = {
  objects: StudioObject[];
  drapeRuns: StudioDrapeRun[];
  treatments: StudioTreatment[];
  openings: StudioOpening[];
  ceilingDrapes: StudioCeilingDrape[];
};

export type StudioAlignMode =
  | "left"
  | "center_x"
  | "right"
  | "top"
  | "center_z"
  | "bottom";

export type StudioDistributeAxis = "x" | "z";

export function findStudioItem(
  design: StudioDesignJson,
  id: string
): StudioItemRef | null {
  const object = design.objects.find((item) => item.id === id);
  if (object) return { kind: "object", item: object };
  const drape = design.drapeRuns.find((item) => item.id === id);
  if (drape) return { kind: "drape", item: drape };
  const treatment = design.treatments.find((item) => item.id === id);
  if (treatment) return { kind: "treatment", item: treatment };
  const opening = design.openings.find((item) => item.id === id);
  if (opening) return { kind: "opening", item: opening };
  const ceiling = getCeilingDrapes(design).find((item) => item.id === id);
  if (ceiling) return { kind: "ceiling", item: ceiling };
  return null;
}

export function getAllStudioItemIds(
  design: StudioDesignJson,
  options: { includeLocked?: boolean; includeHidden?: boolean } = {}
): string[] {
  const keep = (item: { locked?: boolean; hidden?: boolean }) =>
    (options.includeLocked || !item.locked) &&
    (options.includeHidden || !item.hidden);
  return [
    ...design.objects.filter(keep),
    ...design.drapeRuns.filter(keep),
    ...design.treatments.filter(keep),
    ...design.openings.filter(keep),
    ...getCeilingDrapes(design).filter(keep),
  ].map((item) => item.id);
}

function isLocked(design: StudioDesignJson, id: string): boolean {
  return Boolean(findStudioItem(design, id)?.item.locked);
}

function shallowEqual<T extends object>(a: T, b: T): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a) as Array<keyof T>;
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key]
  );
}

/**
 * `items.map(fn)` that keeps the original array (and original items whose
 * result is shallow-equal) when nothing changed, so downstream memos keyed on
 * collection identity (3D walls, trim, seating) skip untouched collections.
 */
export function mapIfChanged<T extends object>(
  items: readonly T[],
  fn: (item: T) => T
): T[] {
  let result: T[] | null = null;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const mapped = fn(item);
    const next = mapped === item || shallowEqual(mapped, item) ? item : mapped;
    if (result) result.push(next);
    else if (next !== item) {
      result = items.slice(0, index);
      result.push(next);
    }
  }
  return result ?? (items as T[]);
}

/** `items.filter(keep)` that returns the original array when nothing is dropped. */
export function filterIfChanged<T>(
  items: readonly T[],
  keep: (item: T) => boolean
): T[] {
  const next = items.filter(keep);
  return next.length === items.length ? (items as T[]) : next;
}

function appendIfAny<T>(items: readonly T[], added: readonly T[]): T[] {
  return added.length === 0 ? (items as T[]) : [...items, ...added];
}

type StudioCollections = Pick<
  StudioDesignJson,
  "objects" | "drapeRuns" | "treatments" | "openings"
> & { ceilingDrapes: StudioCeilingDrape[] };

/** Applies collection updates; returns `design` itself when none changed identity. */
function withCollections(
  design: StudioDesignJson,
  next: Partial<StudioCollections>
): StudioDesignJson {
  const changed =
    (next.objects !== undefined && next.objects !== design.objects) ||
    (next.drapeRuns !== undefined && next.drapeRuns !== design.drapeRuns) ||
    (next.treatments !== undefined && next.treatments !== design.treatments) ||
    (next.openings !== undefined && next.openings !== design.openings) ||
    (next.ceilingDrapes !== undefined &&
      next.ceilingDrapes !== getCeilingDrapes(design));
  if (!changed) return design;
  return {
    ...design,
    ...next,
    ceilingDrapes: next.ceilingDrapes ?? getCeilingDrapes(design),
  };
}

export function removeStudioItems(
  design: StudioDesignJson,
  ids: readonly string[]
): StudioDesignJson {
  const remove = new Set(ids.filter((id) => !isLocked(design, id)));
  if (remove.size === 0) return design;
  const keep = (item: { id: string }) => !remove.has(item.id);
  return withCollections(design, {
    objects: filterIfChanged(design.objects, keep),
    drapeRuns: filterIfChanged(design.drapeRuns, keep),
    treatments: filterIfChanged(design.treatments, keep),
    openings: filterIfChanged(design.openings, keep),
    ceilingDrapes: filterIfChanged(getCeilingDrapes(design), keep),
  });
}

export function copyStudioItems(
  design: StudioDesignJson,
  ids: readonly string[]
): StudioClipboard {
  const set = new Set(ids);
  return structuredClone({
    objects: design.objects.filter((item) => set.has(item.id)),
    drapeRuns: design.drapeRuns.filter((item) => set.has(item.id)),
    treatments: design.treatments.filter((item) => set.has(item.id)),
    openings: design.openings.filter((item) => set.has(item.id)),
    ceilingDrapes: getCeilingDrapes(design).filter((item) => set.has(item.id)),
  });
}

/**
 * Inserts clipboard items with fresh ids. Objects shift by `offset` inches on
 * both axes; wall items slide `offset` along their wall (and are clamped).
 */
export function pasteStudioItems(
  design: StudioDesignJson,
  clipboard: StudioClipboard,
  offset = 24
): { design: StudioDesignJson; ids: string[] } {
  const ids: string[] = [];
  const floor = design.room.floor;
  const wallCount = floor.length;
  const objects = clipboard.objects.map((object) => {
    const id = createStudioItemId("object");
    ids.push(id);
    return {
      ...structuredClone(object),
      id,
      locked: false,
      x: clampFinite(object.x + offset, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
      z: clampFinite(object.z + offset, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
    } as StudioObject;
  });
  const drapeRuns = clipboard.drapeRuns
    .filter((run) => run.wallIndex < wallCount)
    .map((run) => {
      const id = createStudioItemId("drape");
      ids.push(id);
      const span = run.endOffset - run.startOffset;
      return clampDrapeRunToWall(
        {
          ...structuredClone(run),
          id,
          locked: false,
          startOffset: run.startOffset + offset,
          endOffset: run.startOffset + offset + span,
        },
        floor
      );
    });
  const treatments = clipboard.treatments
    .filter((treatment) => treatment.anchor.wallIndex < wallCount)
    .map((treatment) => {
      const id = createStudioItemId("treatment");
      ids.push(id);
      const span = treatment.anchor.endOffset - treatment.anchor.startOffset;
      return clampTreatmentToWall(
        {
          ...structuredClone(treatment),
          id,
          locked: false,
          anchor: {
            ...treatment.anchor,
            startOffset: treatment.anchor.startOffset + offset,
            endOffset: treatment.anchor.startOffset + offset + span,
          },
        },
        floor
      );
    });
  const openings = clipboard.openings
    .filter((opening) => opening.wallIndex < wallCount)
    .map((opening) => {
      const id = createStudioItemId("opening");
      ids.push(id);
      return clampOpeningToWall(
        {
          ...structuredClone(opening),
          id,
          locked: false,
          offset: opening.offset + offset,
        },
        floor
      );
    });
  const ceilingDrapes = (clipboard.ceilingDrapes ?? []).map((drape) => {
    const id = createStudioItemId("ceiling");
    ids.push(id);
    return {
      ...structuredClone(drape),
      id,
      locked: false,
      x: clampFinite(drape.x + offset, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
      z: clampFinite(drape.z + offset, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
      hubX: clampFinite(drape.hubX + offset, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
      hubZ: clampFinite(drape.hubZ + offset, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
    };
  });
  return {
    design: withCollections(design, {
      objects: appendIfAny(design.objects, objects),
      drapeRuns: appendIfAny(design.drapeRuns, drapeRuns),
      treatments: appendIfAny(design.treatments, treatments),
      openings: appendIfAny(design.openings, openings),
      ceilingDrapes: appendIfAny(getCeilingDrapes(design), ceilingDrapes),
    }),
    ids,
  };
}

export function duplicateStudioItems(
  design: StudioDesignJson,
  ids: readonly string[],
  offset = 24
): { design: StudioDesignJson; ids: string[] } {
  return pasteStudioItems(design, copyStudioItems(design, ids), offset);
}

/**
 * Moves objects by (dx, dz) inches. Wall-anchored items slide along their wall
 * by the projection of the delta onto the wall direction.
 */
export function nudgeStudioItems(
  design: StudioDesignJson,
  ids: readonly string[],
  dx: number,
  dz: number
): StudioDesignJson {
  const set = new Set(ids);
  if (set.size === 0) return design;
  let walls: ReturnType<typeof getWallSegments> | null = null;
  const wallAt = (wallIndex: number) => {
    walls ??= getWallSegments(design.room.floor);
    return walls[wallIndex];
  };
  const along = (wallIndex: number) => {
    const wall = wallAt(wallIndex);
    if (!wall || wall.length <= 0) return 0;
    return (
      (dx * (wall.end.x - wall.start.x) + dz * (wall.end.z - wall.start.z)) /
      wall.length
    );
  };
  return withCollections(design, {
    objects: mapIfChanged(design.objects, (object) =>
      set.has(object.id) && !object.locked
        ? {
            ...object,
            x: clampFinite(object.x + dx, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
            z: clampFinite(object.z + dz, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
          }
        : object
    ),
    drapeRuns: mapIfChanged(design.drapeRuns, (run) => {
      if (!set.has(run.id) || run.locked) return run;
      const wall = wallAt(run.wallIndex);
      if (!wall) return run;
      const span = run.endOffset - run.startOffset;
      const start = clampFinite(
        run.startOffset + along(run.wallIndex),
        0,
        Math.max(0, wall.length - span)
      );
      return { ...run, startOffset: start, endOffset: start + span };
    }),
    treatments: mapIfChanged(design.treatments, (treatment) => {
      if (!set.has(treatment.id) || treatment.locked) return treatment;
      const wall = wallAt(treatment.anchor.wallIndex);
      if (!wall) return treatment;
      const span = treatment.anchor.endOffset - treatment.anchor.startOffset;
      const start = clampFinite(
        treatment.anchor.startOffset + along(treatment.anchor.wallIndex),
        0,
        Math.max(0, wall.length - span)
      );
      const anchor = { ...treatment.anchor, startOffset: start, endOffset: start + span };
      return shallowEqual(anchor, treatment.anchor)
        ? treatment
        : { ...treatment, anchor };
    }),
    openings: mapIfChanged(design.openings, (opening) =>
      set.has(opening.id) && !opening.locked
        ? clampOpeningToWall(
            { ...opening, offset: opening.offset + along(opening.wallIndex) },
            design.room.floor
          )
        : opening
    ),
    ceilingDrapes: mapIfChanged(getCeilingDrapes(design), (drape) =>
      set.has(drape.id) && !drape.locked
        ? {
            ...drape,
            x: clampFinite(drape.x + dx, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
            z: clampFinite(drape.z + dz, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
            hubX: clampFinite(drape.hubX + dx, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
            hubZ: clampFinite(drape.hubZ + dz, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
          }
        : drape
    ),
  });
}

export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const normalized = ((degrees % 360) + 360) % 360;
  return Math.round(normalized * 100) / 100;
}

/** Rotates each selected object around its own center. */
export function rotateStudioItems(
  design: StudioDesignJson,
  ids: readonly string[],
  degrees: number
): StudioDesignJson {
  const set = new Set(ids);
  return withCollections(design, {
    objects: mapIfChanged(design.objects, (object) =>
      set.has(object.id) && !object.locked
        ? { ...object, rotation: normalizeRotation(object.rotation + degrees) }
        : object
    ),
    ceilingDrapes: mapIfChanged(getCeilingDrapes(design), (drape) =>
      set.has(drape.id) && !drape.locked
        ? { ...drape, rotation: normalizeRotation(drape.rotation + degrees) }
        : drape
    ),
  });
}

/** Rotates the selected objects as a group around their shared center. */
export function rotateStudioItemsAsGroup(
  design: StudioDesignJson,
  ids: readonly string[],
  degrees: number
): StudioDesignJson {
  const objects = design.objects.filter(
    (object) => ids.includes(object.id) && !object.locked
  );
  if (objects.length < 2) return rotateStudioItems(design, ids, degrees);
  const bounds = getObjectsBounds(objects);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const set = new Set(objects.map((object) => object.id));
  const spin = (x: number, z: number) => ({
    x: cx + (x - cx) * cos - (z - cz) * sin,
    z: cz + (x - cx) * sin + (z - cz) * cos,
  });
  return withCollections(design, {
    objects: mapIfChanged(design.objects, (object) => {
      if (!set.has(object.id)) return object;
      return {
        ...object,
        ...spin(object.x, object.z),
        rotation: normalizeRotation(object.rotation + degrees),
      };
    }),
    ceilingDrapes: mapIfChanged(getCeilingDrapes(design), (drape) => {
      if (!ids.includes(drape.id) || drape.locked) return drape;
      const hub = spin(drape.hubX, drape.hubZ);
      return {
        ...drape,
        ...spin(drape.x, drape.z),
        hubX: hub.x,
        hubZ: hub.z,
        rotation: normalizeRotation(drape.rotation + degrees),
      };
    }),
  });
}

export function getObjectsBounds(objects: readonly StudioObject[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const object of objects) {
    for (const corner of getStudioObjectCorners(object)) {
      minX = Math.min(minX, corner.x);
      maxX = Math.max(maxX, corner.x);
      minZ = Math.min(minZ, corner.z);
      maxZ = Math.max(maxZ, corner.z);
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  return { minX, maxX, minZ, maxZ };
}

/** Aligns selected objects (axis-aligned bounding boxes) to a shared edge or center. */
export function alignStudioObjects(
  design: StudioDesignJson,
  ids: readonly string[],
  mode: StudioAlignMode
): StudioDesignJson {
  const objects = design.objects.filter(
    (object) => ids.includes(object.id) && !object.locked
  );
  if (objects.length < 2) return design;
  const group = getObjectsBounds(objects);
  const moved = new Map<string, StudioObject>();
  for (const object of objects) {
    const box = getObjectsBounds([object]);
    let dx = 0;
    let dz = 0;
    if (mode === "left") dx = group.minX - box.minX;
    if (mode === "right") dx = group.maxX - box.maxX;
    if (mode === "center_x")
      dx = (group.minX + group.maxX) / 2 - (box.minX + box.maxX) / 2;
    if (mode === "top") dz = group.minZ - box.minZ;
    if (mode === "bottom") dz = group.maxZ - box.maxZ;
    if (mode === "center_z")
      dz = (group.minZ + group.maxZ) / 2 - (box.minZ + box.maxZ) / 2;
    moved.set(object.id, { ...object, x: object.x + dx, z: object.z + dz });
  }
  return withCollections(design, {
    objects: mapIfChanged(design.objects, (object) => moved.get(object.id) ?? object),
  });
}

/** Evenly spaces selected object centers between the outermost two (needs 3+). */
export function distributeStudioObjects(
  design: StudioDesignJson,
  ids: readonly string[],
  axis: StudioDistributeAxis
): StudioDesignJson {
  const objects = design.objects
    .filter((object) => ids.includes(object.id) && !object.locked)
    .sort((a, b) => (axis === "x" ? a.x - b.x : a.z - b.z));
  if (objects.length < 3) return design;
  const first = axis === "x" ? objects[0].x : objects[0].z;
  const last =
    axis === "x" ? objects[objects.length - 1].x : objects[objects.length - 1].z;
  const step = (last - first) / (objects.length - 1);
  const moved = new Map<string, StudioObject>();
  objects.forEach((object, index) => {
    const value = first + step * index;
    moved.set(
      object.id,
      axis === "x" ? { ...object, x: value } : { ...object, z: value }
    );
  });
  return withCollections(design, {
    objects: mapIfChanged(design.objects, (object) => moved.get(object.id) ?? object),
  });
}

/** Sets `locked` or `hidden` on every matching item of any kind. */
export function setStudioItemsFlag(
  design: StudioDesignJson,
  ids: readonly string[],
  flag: "locked" | "hidden",
  value: boolean
): StudioDesignJson {
  const set = new Set(ids);
  const apply = <T extends { id: string; locked?: boolean; hidden?: boolean }>(
    item: T
  ): T => (set.has(item.id) ? { ...item, [flag]: value } : item);
  return withCollections(design, {
    objects: mapIfChanged(design.objects, apply),
    drapeRuns: mapIfChanged(design.drapeRuns, apply),
    treatments: mapIfChanged(design.treatments, apply),
    openings: mapIfChanged(design.openings, apply),
    ceilingDrapes: mapIfChanged(getCeilingDrapes(design), apply),
  });
}

/** Lays out `count` copies of an object in a grid centred on (cx, cz). */
export function arrangeObjectGrid(
  template: StudioObject,
  options: {
    count: number;
    columns: number;
    spacingX: number;
    spacingZ: number;
    centerX: number;
    centerZ: number;
    stagger?: boolean;
  }
): StudioObject[] {
  const count = Math.max(1, Math.min(200, Math.round(options.count)));
  const columns = Math.max(1, Math.min(count, Math.round(options.columns)));
  const rows = Math.ceil(count / columns);
  const totalWidth = (columns - 1) * options.spacingX;
  const totalDepth = (rows - 1) * options.spacingZ;
  const result: StudioObject[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const staggerShift =
      options.stagger && row % 2 === 1 ? options.spacingX / 2 : 0;
    result.push({
      ...structuredClone(template),
      id: createStudioItemId("object"),
      label: `${template.label} ${index + 1}`,
      x: options.centerX - totalWidth / 2 + column * options.spacingX + staggerShift,
      z: options.centerZ - totalDepth / 2 + row * options.spacingZ,
    } as StudioObject);
  }
  return result;
}
