import type { StudioDrapeRun, StudioOpening } from "@/data/studio";

/** Fabric kept clear of each side of a door casing, inches. */
export const DOOR_GAP_CLEARANCE = 4;
/** Drape pieces narrower than this are dropped, inches. */
export const MIN_DRAPE_SEGMENT = 12;

export type DrapeSegment = { start: number; end: number };

export function drapeRunUsesDoorGaps(run: Pick<StudioDrapeRun, "doorGaps">): boolean {
  return run.doorGaps !== false;
}

/** Visible doors/entrances on `wallIndex` that overlap [start, end]. */
export function getBlockingDoors(
  openings: readonly StudioOpening[],
  wallIndex: number,
  start: number,
  end: number
): StudioOpening[] {
  return openings.filter(
    (opening) =>
      opening.wallIndex === wallIndex &&
      !opening.hidden &&
      opening.type !== "window" &&
      opening.offset - DOOR_GAP_CLEARANCE < end &&
      opening.offset + opening.width + DOOR_GAP_CLEARANCE > start
  );
}

/**
 * Wall spans (inches from wall start) actually hung with fabric. A run with
 * door gaps on is split around every door/entrance it crosses; otherwise it
 * is a single span.
 */
export function getDrapeRunSegments(
  run: Pick<StudioDrapeRun, "wallIndex" | "startOffset" | "endOffset" | "doorGaps">,
  openings: readonly StudioOpening[]
): DrapeSegment[] {
  const whole = [{ start: run.startOffset, end: run.endOffset }];
  if (!drapeRunUsesDoorGaps(run)) return whole;
  const doors = getBlockingDoors(openings, run.wallIndex, run.startOffset, run.endOffset)
    .map((opening) => ({
      start: opening.offset - DOOR_GAP_CLEARANCE,
      end: opening.offset + opening.width + DOOR_GAP_CLEARANCE,
    }))
    .sort((a, b) => a.start - b.start);
  if (doors.length === 0) return whole;
  const segments: DrapeSegment[] = [];
  let cursor = run.startOffset;
  for (const door of doors) {
    if (door.start > cursor) segments.push({ start: cursor, end: Math.min(door.start, run.endOffset) });
    cursor = Math.max(cursor, door.end);
    if (cursor >= run.endOffset) break;
  }
  if (cursor < run.endOffset) segments.push({ start: cursor, end: run.endOffset });
  return segments.filter((segment) => segment.end - segment.start >= MIN_DRAPE_SEGMENT);
}

/** Total hung length of a run in inches, after door gaps. */
export function getDrapeRunHungLength(
  run: Pick<StudioDrapeRun, "wallIndex" | "startOffset" | "endOffset" | "doorGaps">,
  openings: readonly StudioOpening[]
): number {
  return getDrapeRunSegments(run, openings).reduce(
    (sum, segment) => sum + (segment.end - segment.start),
    0
  );
}
