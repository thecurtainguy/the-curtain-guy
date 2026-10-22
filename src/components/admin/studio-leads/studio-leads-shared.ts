import {
  STUDIO_DESIGN_SOURCES,
  STUDIO_LEAD_STAGES,
  type StudioDesignSource,
  type StudioLeadStage,
} from "@/data/studio-leads";
import type { StudioOpeningType, StudioPoint } from "@/data/studio";
import type { DrapeSegment } from "@/lib/studio-door-gaps";

export const STUDIO_LEAD_SORTS = ["activity", "created", "event", "stage"] as const;
export type StudioLeadSort = (typeof STUDIO_LEAD_SORTS)[number];

export const STUDIO_LEAD_SORT_LABELS: Record<StudioLeadSort, string> = {
  activity: "Last activity",
  created: "Newest first",
  event: "Event date",
  stage: "Furthest along",
};

export const STUDIO_LEAD_SOURCE_LABELS: Record<StudioDesignSource, string> = {
  studio: "Studio",
  event_builder: "Event builder",
  admin: "Admin",
};

export const STUDIO_LEADS_PAGE_SIZE = 24;
export const STUDIO_LEADS_STATS_WINDOW_DAYS = 30;
export const STUDIO_LEADS_BADGE_WINDOW_DAYS = 7;

export type StudioLeadFilters = {
  stage: StudioLeadStage | null;
  source: StudioDesignSource | null;
  /** Last-activity range, YYYY-MM-DD (inclusive). */
  from: string | null;
  to: string | null;
  upcoming: boolean;
  q: string;
  sort: StudioLeadSort;
  page: number;
  estimateId: string | null;
  quoteId: string | null;
  jobId: string | null;
};

export const DEFAULT_STUDIO_LEAD_FILTERS: StudioLeadFilters = {
  stage: null,
  source: null,
  from: null,
  to: null,
  upcoming: false,
  q: "",
  sort: "activity",
  page: 1,
  estimateId: null,
  quoteId: null,
  jobId: null,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type RawParams = Record<string, string | string[] | undefined>;

function first(params: RawParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(value: string | undefined, options: readonly T[]): T | null {
  return value && (options as readonly string[]).includes(value) ? (value as T) : null;
}

function isoDate(value: string | undefined): string | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null;
  return Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ? value : null;
}

function uuid(value: string | undefined): string | null {
  return value && UUID_PATTERN.test(value) ? value : null;
}

export function parseStudioLeadFilters(params: RawParams): StudioLeadFilters {
  const page = Number(first(params, "page"));
  return {
    stage: oneOf(first(params, "stage"), STUDIO_LEAD_STAGES),
    source: oneOf(first(params, "source"), STUDIO_DESIGN_SOURCES),
    from: isoDate(first(params, "from")),
    to: isoDate(first(params, "to")),
    upcoming: first(params, "upcoming") === "1",
    q: (first(params, "q") ?? "").trim().slice(0, 120),
    sort: oneOf(first(params, "sort"), STUDIO_LEAD_SORTS) ?? "activity",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
    estimateId: uuid(first(params, "estimateId")),
    quoteId: uuid(first(params, "quoteId")),
    jobId: uuid(first(params, "jobId")),
  };
}

export function buildStudioLeadsHref(
  filters: StudioLeadFilters,
  patch: Partial<StudioLeadFilters> = {}
): string {
  const next: StudioLeadFilters = {
    ...filters,
    ...patch,
    page: patch.page ?? 1,
  };
  const params = new URLSearchParams();
  if (next.stage) params.set("stage", next.stage);
  if (next.source) params.set("source", next.source);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.upcoming) params.set("upcoming", "1");
  if (next.q) params.set("q", next.q);
  if (next.sort !== "activity") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.estimateId) params.set("estimateId", next.estimateId);
  if (next.quoteId) params.set("quoteId", next.quoteId);
  if (next.jobId) params.set("jobId", next.jobId);
  const query = params.toString();
  return query ? `/admin/studio?${query}` : "/admin/studio";
}

export function hasActiveStudioLeadFilters(filters: StudioLeadFilters): boolean {
  return Boolean(
    filters.stage ||
      filters.source ||
      filters.from ||
      filters.to ||
      filters.upcoming ||
      filters.q ||
      filters.estimateId ||
      filters.quoteId ||
      filters.jobId
  );
}

/** Compact floor plan payload for `DesignPlanThumb` (no full design_json on the client). */
export type StudioPlanThumbData = {
  floor: StudioPoint[];
  runs: Array<{ wallIndex: number; color: string; segments: DrapeSegment[] }>;
  openings: Array<{
    wallIndex: number;
    offset: number;
    width: number;
    type: StudioOpeningType;
  }>;
};

export type StudioLeadListItem = {
  id: string;
  title: string;
  source: StudioDesignSource;
  stage: StudioLeadStage;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  hasAccount: boolean;
  visitorShort: string | null;
  eventName: string | null;
  eventTypeLabel: string | null;
  eventDate: string | null;
  eventDateLabel: string | null;
  daysUntilEvent: number | null;
  guestCount: number | null;
  venueName: string | null;
  cityArea: string | null;
  roomName: string | null;
  roomWidthFt: number | null;
  roomDepthFt: number | null;
  areaSqFt: number;
  drapeLinearFt: number;
  treatmentCount: number;
  ceilingCount: number;
  objectCount: number;
  thumbnailDataUrl: string | null;
  plan: StudioPlanThumbData | null;
  lastActivityAt: string;
  lastActivityLabel: string;
  createdAt: string;
  quoteId: string | null;
  jobId: string | null;
  estimateRequestId: string | null;
  eventPlanId: string | null;
};

export type StudioLeadStats = {
  counts: Record<StudioLeadStage, number>;
  activeToday: number;
  total: number;
  windowDays: number;
};

export function emptyStudioLeadStageCounts(): Record<StudioLeadStage, number> {
  return Object.fromEntries(STUDIO_LEAD_STAGES.map((stage) => [stage, 0])) as Record<
    StudioLeadStage,
    number
  >;
}
