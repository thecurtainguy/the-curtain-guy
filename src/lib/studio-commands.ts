import {
  createStudioItemId,
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

export type StudioItemKind = "object" | "drape" | "treatment" | "opening";

export type StudioItemRef =
  | { kind: "object"; item: StudioObject }
  | { kind: "drape"; item: StudioDrapeRun }
  | { kind: "treatment"; item: StudioTreatment }
  | { kind: "opening"; item: StudioOpening };

export type StudioClipboard = {
  objects: StudioObject[];
  drapeRuns: StudioDrapeRun[];
  treatments: StudioTreatment[];
  openings: StudioOpening[];
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
  ].map((item) => item.id);
}

function isLocked(design: StudioDesignJson, id: string): boolean {
  return Boolean(findStudioItem(design, id)?.item.locked);
}

export function removeStudioItems(
  design: StudioDesignJson,
  ids: readonly string[]
): StudioDesignJson {
  const remove = new Set(ids.filter((id) => !isLocked(design, id)));
  if (remove.size === 0) return design;
  return {
    ...design,
    objects: design.objects.filter((item) => !remove.has(item.id)),
    drapeRuns: design.drapeRuns.filter((item) => !remove.has(item.id)),
    treatments: design.treatments.filter((item) => !remove.has(item.id)),
    openings: design.openings.filter((item) => !remove.has(item.id)),
  };
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
  return {
    design: {
      ...design,
      objects: [...design.objects, ...objects],
      drapeRuns: [...design.drapeRuns, ...drapeRuns],
      treatments: [...design.treatments, ...treatments],
      openings: [...design.openings, ...openings],
    },
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
  const walls = getWallSegments(design.room.floor);
  const along = (wallIndex: number) => {
    const wall = walls[wallIndex];
    if (!wall || wall.length <= 0) return 0;
    return (
      (dx * (wall.end.x - wall.start.x) + dz * (wall.end.z - wall.start.z)) /
      wall.length
    );
  };
  return {
    ...design,
    objects: design.objects.map((object) =>
      set.has(object.id) && !object.locked
        ? {
            ...object,
            x: clampFinite(object.x + dx, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
            z: clampFinite(object.z + dz, -STUDIO_MAX_COORDINATE, STUDIO_MAX_COORDINATE),
          }
        : object
    ),
    drapeRuns: design.drapeRuns.map((run) => {
      if (!set.has(run.id) || run.locked) return run;
      const wall = walls[run.wallIndex];
      if (!wall) return run;
      const span = run.endOffset - run.startOffset;
      const start = clampFinite(
        run.startOffset + along(run.wallIndex),
        0,
        Math.max(0, wall.length - span)
      );
      return { ...run, startOffset: start, endOffset: start + span };
    }),
    treatments: design.treatments.map((treatment) => {
      if (!set.has(treatment.id) || treatment.locked) return treatment;
      const wall = walls[treatment.anchor.wallIndex];
      if (!wall) return treatment;
      const span = treatment.anchor.endOffset - treatment.anchor.startOffset;
      const start = clampFinite(
        treatment.anchor.startOffset + along(treatment.anchor.wallIndex),
        0,
        Math.max(0, wall.length - span)
      );
      return {
        ...treatment,
        anchor: { ...treatment.anchor, startOffset: start, endOffset: start + span },
      };
    }),
    openings: design.openings.map((opening) =>
      set.has(opening.id) && !opening.locked
        ? clampOpeningToWall(
            { ...opening, offset: opening.offset + along(opening.wallIndex) },
            design.room.floor
          )
        : opening
    ),
  };
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
  return {
    ...design,
    objects: design.objects.map((object) =>
      set.has(object.id) && !object.locked
        ? { ...object, rotation: normalizeRotation(object.rotation + degrees) }
        : object
    ),
  };
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
  return {
    ...design,
    objects: design.objects.map((object) => {
      if (!set.has(object.id)) return object;
      const rx = object.x - cx;
      const rz = object.z - cz;
      return {
        ...object,
        x: cx + rx * cos - rz * sin,
        z: cz + rx * sin + rz * cos,
        rotation: normalizeRotation(object.rotation + degrees),
      };
    }),
  };
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
  return {
    ...design,
    objects: design.objects.map((object) => moved.get(object.id) ?? object),
  };
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
  return {
    ...design,
    objects: design.objects.map((object) => moved.get(object.id) ?? object),
  };
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
  return {
    ...design,
    objects: design.objects.map(apply),
    drapeRuns: design.drapeRuns.map(apply),
    treatments: design.treatments.map(apply),
    openings: design.openings.map(apply),
  };
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
