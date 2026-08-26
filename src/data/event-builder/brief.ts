import type { DrapeColor } from "@/data/studio";

export const EVENT_BUILDER_BRIEF_STORAGE_KEY = "tcg-event-builder-brief-v1";
export const EVENT_BUILDER_BRIEF_BACKUP_KEY = "tcg-event-builder-brief-v1-backup";
export const EVENT_BUILDER_STEP_STORAGE_KEY = "tcg-event-builder-step-v1";
export const ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY =
  "tcg-estimate-prefill-from-event-builder-v1";
export const ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY =
  "tcg-estimate-prefill-from-event-builder-v1-backup";

export type EventBuilderRoomShape = "rectangle" | "l_shape";

export type EventBuilderBrief = {
  version: 1;
  eventType: string;
  room: {
    shape: EventBuilderRoomShape;
    widthFt: number;
    lengthFt: number;
    wallHeightFt: number;
    cutoutWidthFt?: number;
    cutoutDepthFt?: number;
  };
  catalogSelections: string[];
  look: {
    fabricDirections: string[];
    primaryColor: DrapeColor;
    fullness: number;
  };
  addOns: string[];
  eventDate?: string;
  venueName?: string;
  cityArea?: string;
};

export const DEFAULT_EVENT_BUILDER_BRIEF: EventBuilderBrief = {
  version: 1,
  eventType: "",
  room: {
    shape: "rectangle",
    widthFt: 40,
    lengthFt: 60,
    wallHeightFt: 12,
    cutoutWidthFt: 20,
    cutoutDepthFt: 20,
  },
  catalogSelections: [],
  look: {
    fabricDirections: [],
    primaryColor: "ivory",
    fullness: 2,
  },
  addOns: [],
};

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isEventBuilderBrief(value: unknown): value is EventBuilderBrief {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return false;
  if (typeof raw.eventType !== "string") return false;
  if (!raw.room || typeof raw.room !== "object") return false;
  const room = raw.room as Record<string, unknown>;
  if (room.shape !== "rectangle" && room.shape !== "l_shape") return false;
  if (!isFinitePositive(room.widthFt) || !isFinitePositive(room.lengthFt)) {
    return false;
  }
  if (!isFinitePositive(room.wallHeightFt)) return false;
  if (!Array.isArray(raw.catalogSelections)) return false;
  if (!raw.look || typeof raw.look !== "object") return false;
  const look = raw.look as Record<string, unknown>;
  if (!Array.isArray(look.fabricDirections)) return false;
  if (typeof look.primaryColor !== "string") return false;
  if (!isFinitePositive(look.fullness)) return false;
  if (!Array.isArray(raw.addOns)) return false;
  return true;
}

export function parseEventBuilderBrief(value: unknown): EventBuilderBrief | null {
  if (!isEventBuilderBrief(value)) return null;
  return structuredClone(value);
}

export function saveEventBuilderBrief(brief: EventBuilderBrief): void {
  const json = JSON.stringify(brief);
  try {
    window.sessionStorage.setItem(EVENT_BUILDER_BRIEF_STORAGE_KEY, json);
    window.localStorage.setItem(EVENT_BUILDER_BRIEF_BACKUP_KEY, json);
  } catch {
    // Storage is best-effort.
  }
}

/** Session-only draft (same tab). */
export function readEventBuilderBriefSession(): EventBuilderBrief | null {
  try {
    const sessionRaw = window.sessionStorage.getItem(
      EVENT_BUILDER_BRIEF_STORAGE_KEY
    );
    if (!sessionRaw) return null;
    return parseEventBuilderBrief(JSON.parse(sessionRaw));
  } catch {
    return null;
  }
}

/** localStorage backup from a prior session (not auto-applied on load). */
export function readEventBuilderBriefBackup(): EventBuilderBrief | null {
  try {
    const backupRaw = window.localStorage.getItem(EVENT_BUILDER_BRIEF_BACKUP_KEY);
    if (!backupRaw) return null;
    return parseEventBuilderBrief(JSON.parse(backupRaw));
  } catch {
    return null;
  }
}

export function readEventBuilderBrief(): EventBuilderBrief | null {
  const session = readEventBuilderBriefSession();
  if (session) return session;
  return readEventBuilderBriefBackup();
}

export function clearEventBuilderBrief(): void {
  try {
    window.sessionStorage.removeItem(EVENT_BUILDER_BRIEF_STORAGE_KEY);
    window.localStorage.removeItem(EVENT_BUILDER_BRIEF_BACKUP_KEY);
    window.sessionStorage.removeItem(EVENT_BUILDER_STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function saveEventBuilderStep(stepIndex: number): void {
  try {
    window.sessionStorage.setItem(
      EVENT_BUILDER_STEP_STORAGE_KEY,
      String(stepIndex)
    );
  } catch {
    // ignore
  }
}

export function readEventBuilderStep(maxStep = 3): number {
  try {
    const raw = window.sessionStorage.getItem(EVENT_BUILDER_STEP_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, maxStep);
  } catch {
    return 0;
  }
}

export function saveEstimatePrefillFromEventBuilder(
  prefill: Record<string, unknown>
): void {
  const json = JSON.stringify(prefill);
  try {
    window.sessionStorage.setItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY,
      json
    );
    window.localStorage.setItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY,
      json
    );
  } catch {
    // ignore
  }
}

export function readEstimatePrefillFromEventBuilder(): Record<
  string,
  unknown
> | null {
  try {
    const sessionRaw = window.sessionStorage.getItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY
    );
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    }
    const backupRaw = window.localStorage.getItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY
    );
    if (backupRaw) {
      const parsed = JSON.parse(backupRaw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function clearEstimatePrefillFromEventBuilder(): void {
  try {
    window.sessionStorage.removeItem(ESTIMATE_PREFILL_FROM_EVENT_BUILDER_KEY);
    window.localStorage.removeItem(
      ESTIMATE_PREFILL_FROM_EVENT_BUILDER_BACKUP_KEY
    );
  } catch {
    // ignore
  }
}

export function openStudioEventMode(): void {
  window.open("/studio/new?mode=event", "_blank", "noopener,noreferrer");
}

export function openStudioDesignerMode(): void {
  window.open("/studio/new?mode=designer", "_blank", "noopener,noreferrer");
}

export function openGetEstimateFromEventBuilder(): void {
  window.open("/get-estimate", "_blank", "noopener,noreferrer");
}

type StudioBuildHrefOptions = {
  newPlan?: boolean;
  edit?: string;
  from?: "admin" | "customer";
};

/** Canonical links into `/studio/build` (use `newPlan` for a blank wizard). */
export function studioBuildHref(options: StudioBuildHrefOptions = {}): string {
  const params = new URLSearchParams();
  if (options.newPlan) params.set("new", "1");
  if (options.edit) params.set("edit", options.edit);
  if (options.from === "admin") params.set("from", "admin");
  const query = params.toString();
  return query ? `/studio/build?${query}` : "/studio/build";
}
