import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { normalizeStudioDesign, type StudioDesignJson } from "@/data/studio";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";

export type SavedEventPlanDesign = {
  brief: EventBuilderBrief;
  design: StudioDesignJson;
};

/** Brief fields that only label the plan; they never move drapes, tables or openings. */
const LABEL_FIELDS = ["eventName", "eventDate", "venueName", "cityArea"] as const;

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b)
          )
        )
      : entry
  );
}

function layoutKey(brief: EventBuilderBrief): string {
  const rest: Record<string, unknown> = { ...brief };
  for (const field of LABEL_FIELDS) delete rest[field];
  return stableStringify(rest);
}

/**
 * Design to show and save while editing a plan. The saved design is kept unless
 * a layout answer changed; label-only edits refresh just its notes and room name.
 */
export function resolveEditedPlanDesign(
  brief: EventBuilderBrief,
  saved: SavedEventPlanDesign | null
): StudioDesignJson {
  const rebuilt = normalizeStudioDesign(buildStarterDesignFromBrief(brief));
  if (!saved || layoutKey(brief) !== layoutKey(saved.brief)) return rebuilt;
  return normalizeStudioDesign({
    ...saved.design,
    notes: rebuilt.notes,
    room: { ...saved.design.room, name: rebuilt.room.name },
  });
}
