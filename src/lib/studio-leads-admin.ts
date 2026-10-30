import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeStudioDesign,
  type StudioDesignJson,
  type StudioDesignStatus,
} from "@/data/studio";
import {
  STUDIO_DESIGN_SOURCES,
  STUDIO_LEAD_STAGES,
  STUDIO_LEAD_STAGE_LABELS,
  getStudioLeadStage,
  type StudioDesignSource,
  type StudioLeadStage,
} from "@/data/studio-leads";
import { getEventTypeLabel } from "@/data/event-types";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import { requireOwner } from "@/lib/auth";
import { calculateRoomAreaSquareFeet, getStudioBounds } from "@/lib/studio-geometry";
import type { StudioActor } from "@/lib/studio";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { toPlanThumbData } from "@/components/admin/studio-leads/design-summary";
import {
  STUDIO_LEADS_BADGE_WINDOW_DAYS,
  STUDIO_LEADS_PAGE_SIZE,
  STUDIO_LEADS_STATS_WINDOW_DAYS,
  emptyStudioLeadStageCounts,
  type StudioLeadFilters,
  type StudioLeadListItem,
  type StudioLeadStats,
} from "@/components/admin/studio-leads/studio-leads-shared";

/* ------------------------------------------------------------------ */
/* Access + time helpers                                               */
/* ------------------------------------------------------------------ */

const LEAD_TIME_ZONE = "America/Toronto";
const INDEX_BATCH = 1000;
/** Hard ceiling for the in-memory stage index; far above realistic volume. */
const MAX_INDEX_ROWS = 20000;
const ID_CHUNK = 100;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOwnerActor(actor: StudioActor): boolean {
  return (
    actor.role === "owner" &&
    UUID_PATTERN.test(actor.userId) &&
    (!actor.user || actor.user.id === actor.userId)
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LEAD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timestampFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LEAD_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LEAD_TIME_ZONE,
  month: "short",
  day: "numeric",
});

function zonedToday(now = new Date()): string {
  return dateFormatter.format(now);
}

function zoneOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", {
      timeZone: LEAD_TIME_ZONE,
      timeZoneName: "longOffset",
    })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** UTC instant of local midnight (studio time zone) for a YYYY-MM-DD date. */
function zonedMidnightIso(isoDate: string): string {
  const offset = zoneOffsetMinutes(new Date(`${isoDate}T12:00:00Z`));
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) - offset * 60_000).toISOString();
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000
  );
}

function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return shortDateFormatter.format(new Date(iso));
}

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso || !Number.isFinite(Date.parse(iso))) return null;
  return timestampFormatter.format(new Date(iso));
}

function formatEventDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = parseISODate(value);
  return parsed ? formatDisplayDate(parsed) : value;
}

function eventTypeLabel(value: string | null): string | null {
  if (!value) return null;
  return getEventTypeLabel(value) ?? value;
}

function asSource(value: string | null): StudioDesignSource {
  return (STUDIO_DESIGN_SOURCES as readonly string[]).includes(value ?? "")
    ? (value as StudioDesignSource)
    : "studio";
}

function chunk<T>(items: T[], size = ID_CHUNK): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

const INDEX_COLUMNS: string =
  "id, owner_user_id, source, contact_email, event_name, event_type, event_date, guest_count, quote_id, job_id, last_activity_at, created_at";

/** Card columns: design_json is projected to the arrays the card needs (no notes/view/materials). */
const CARD_COLUMNS: string = `${INDEX_COLUMNS}, title, contact_name, contact_phone, visitor_id, venue_name, city_area, estimate_request_id, thumbnail_data_url, room:design_json->room, drapeRuns:design_json->drapeRuns, openings:design_json->openings, treatments:design_json->treatments, ceilingDrapes:design_json->ceilingDrapes, objects:design_json->objects`;

type LeadIndexRow = {
  id: string;
  owner_user_id: string | null;
  source: string | null;
  contact_email: string | null;
  event_name: string | null;
  event_type: string | null;
  event_date: string | null;
  guest_count: number | null;
  quote_id: string | null;
  job_id: string | null;
  last_activity_at: string;
  created_at: string;
};

type LeadCardRow = LeadIndexRow & {
  title: string;
  contact_name: string | null;
  contact_phone: string | null;
  visitor_id: string | null;
  venue_name: string | null;
  city_area: string | null;
  estimate_request_id: string | null;
  thumbnail_data_url: string | null;
  room: { name?: unknown; floor?: unknown } | null;
  drapeRuns: unknown;
  openings: unknown;
  treatments: unknown;
  ceilingDrapes: unknown;
  objects: unknown;
};

type LeadQuery = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

const SEARCH_COLUMNS = [
  "contact_name",
  "contact_email",
  "contact_phone",
  "event_name",
  "venue_name",
  "city_area",
  "title",
];

function buildSearchFilter(raw: string): string | null {
  // Values are double-quoted in the PostgREST logic tree, so only quotes, backslashes and wildcards need stripping.
  const term = raw.replace(/["\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!term) return null;
  const clauses = SEARCH_COLUMNS.map((column) => `${column}.ilike."%${term}%"`);
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4 && /^[\d\s()+.-]+$/.test(raw)) {
    clauses.push(`contact_phone.ilike."%${digits.split("").join("%")}%"`);
  }
  return clauses.join(",");
}

function applyLeadFilters(
  query: LeadQuery,
  filters: Partial<StudioLeadFilters>,
  today: string
): LeadQuery {
  let next = query.neq("status", "archived" satisfies StudioDesignStatus);
  if (filters.source) next = next.eq("source", filters.source);
  if (filters.from) next = next.gte("last_activity_at", zonedMidnightIso(filters.from));
  if (filters.to) {
    next = next.lt("last_activity_at", zonedMidnightIso(addDaysIso(filters.to, 1)));
  }
  if (filters.upcoming) next = next.gte("event_date", today);
  if (filters.estimateId) next = next.eq("estimate_request_id", filters.estimateId);
  if (filters.quoteId) next = next.eq("quote_id", filters.quoteId);
  if (filters.jobId) next = next.eq("job_id", filters.jobId);
  const search = filters.q ? buildSearchFilter(filters.q) : null;
  if (search) next = next.or(search);
  return next;
}

/** Staff accounts never count as a customer contact (owner_user_id is the creator for admin designs). */
const loadOwnerAccountIds = cache(async (): Promise<Set<string>> => {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("user_profiles").select("id").eq("role", "owner");
  if (error) {
    console.error("[studio-leads] Failed to load owner accounts:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => String(row.id)));
});

type StageLinks = {
  planByDesign: Map<string, { id: string; created_at: string }>;
  acceptedQuotes: Set<string>;
  ownerIds: Set<string>;
};

async function loadStageLinks(
  admin: SupabaseClient,
  rows: Array<Pick<LeadIndexRow, "id" | "quote_id">>
): Promise<StageLinks> {
  const designIds = rows.map((row) => row.id);
  const quoteIds = unique(rows.map((row) => row.quote_id));
  const [planResults, quoteResults, ownerIds] = await Promise.all([
    Promise.all(
      chunk(designIds).map((ids) =>
        admin
          .from("event_plan_submissions")
          .select("id, studio_design_id, created_at")
          .in("studio_design_id", ids)
          .order("created_at", { ascending: false })
      )
    ),
    Promise.all(
      chunk(quoteIds).map((ids) =>
        admin.from("quotes").select("id").in("id", ids).not("accepted_at", "is", null)
      )
    ),
    loadOwnerAccountIds(),
  ]);

  const planByDesign = new Map<string, { id: string; created_at: string }>();
  for (const result of planResults) {
    if (result.error) {
      console.error("[studio-leads] Failed to load event plans:", result.error.message);
      continue;
    }
    for (const plan of result.data ?? []) {
      const designId = String(plan.studio_design_id);
      if (!planByDesign.has(designId)) {
        planByDesign.set(designId, { id: String(plan.id), created_at: String(plan.created_at) });
      }
    }
  }
  const acceptedQuotes = new Set<string>();
  for (const result of quoteResults) {
    if (result.error) {
      console.error("[studio-leads] Failed to load quotes:", result.error.message);
      continue;
    }
    for (const quote of result.data ?? []) acceptedQuotes.add(String(quote.id));
  }
  return { planByDesign, acceptedQuotes, ownerIds };
}

function customerOwnerId(row: Pick<LeadIndexRow, "owner_user_id">, ownerIds: Set<string>) {
  return row.owner_user_id && !ownerIds.has(row.owner_user_id) ? row.owner_user_id : null;
}

function stageFor(row: LeadIndexRow, links: StageLinks): StudioLeadStage {
  return getStudioLeadStage({
    ownerUserId: customerOwnerId(row, links.ownerIds),
    contactEmail: row.contact_email,
    details: {
      eventName: row.event_name,
      eventType: row.event_type || null,
      eventDate: row.event_date,
      guestCount: row.guest_count,
    },
    hasEventPlan: links.planByDesign.has(row.id),
    quoteId: row.quote_id,
    jobId: row.job_id,
    quoteAccepted: row.quote_id ? links.acceptedQuotes.has(row.quote_id) : false,
  });
}

async function scanLeadIndex(
  admin: SupabaseClient,
  filters: Partial<StudioLeadFilters>,
  today: string
): Promise<{ rows: LeadIndexRow[]; truncated: boolean } | null> {
  const rows: LeadIndexRow[] = [];
  for (let from = 0; from < MAX_INDEX_ROWS; from += INDEX_BATCH) {
    const query = applyLeadFilters(
      admin.from("studio_designs").select(INDEX_COLUMNS),
      filters,
      today
    )
      .order("last_activity_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + INDEX_BATCH - 1);
    const { data, error } = await query;
    if (error) {
      console.error("[studio-leads] Failed to scan leads:", error.message);
      return null;
    }
    const batch = (data ?? []) as unknown as LeadIndexRow[];
    rows.push(...batch);
    if (batch.length < INDEX_BATCH) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export type StudioLeadsListResult =
  | {
      ok: true;
      leads: StudioLeadListItem[];
      total: number;
      page: number;
      pageCount: number;
      pageSize: number;
      truncated: boolean;
    }
  | { ok: false; message: string };

type ProfileContact = { full_name: string | null; email: string | null; phone: string | null };

async function loadCustomerProfiles(
  admin: SupabaseClient,
  ids: string[]
): Promise<Map<string, ProfileContact>> {
  const map = new Map<string, ProfileContact>();
  if (ids.length === 0) return map;
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, full_name, email, phone")
    .in("id", ids);
  if (error) {
    console.error("[studio-leads] Failed to load customer profiles:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(String(row.id), {
      full_name: row.full_name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
    });
  }
  return map;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function toListItem(
  row: LeadCardRow,
  stage: StudioLeadStage,
  links: StageLinks,
  profile: ProfileContact | undefined,
  today: string,
  now: number
): StudioLeadListItem {
  const plan = toPlanThumbData({
    floor: row.room?.floor,
    drapeRuns: row.drapeRuns,
    openings: row.openings,
  });
  const bounds = plan ? getStudioBounds(plan.floor) : null;
  const drapeInches = plan
    ? plan.runs.reduce(
        (sum, run) =>
          sum + run.segments.reduce((total, segment) => total + (segment.end - segment.start), 0),
        0
      )
    : 0;
  const hasAccount = Boolean(customerOwnerId(row, links.ownerIds));

  return {
    id: row.id,
    title: row.title,
    source: asSource(row.source),
    stage,
    contactName: row.contact_name?.trim() || profile?.full_name?.trim() || null,
    contactEmail: row.contact_email?.trim() || profile?.email?.trim() || null,
    contactPhone: row.contact_phone?.trim() || profile?.phone?.trim() || null,
    hasAccount,
    visitorShort: row.visitor_id ? row.visitor_id.slice(0, 8) : null,
    eventName: row.event_name,
    eventTypeLabel: eventTypeLabel(row.event_type),
    eventDate: row.event_date,
    eventDateLabel: formatEventDate(row.event_date),
    daysUntilEvent: row.event_date ? daysBetween(today, row.event_date) : null,
    guestCount: row.guest_count,
    venueName: row.venue_name,
    cityArea: row.city_area,
    roomName: typeof row.room?.name === "string" ? row.room.name : null,
    roomWidthFt: bounds ? Math.round(bounds.width / 12) : null,
    roomDepthFt: bounds ? Math.round(bounds.depth / 12) : null,
    areaSqFt: plan ? Math.round(calculateRoomAreaSquareFeet(plan.floor)) : 0,
    drapeLinearFt: Math.round(drapeInches / 12),
    treatmentCount: arrayLength(row.treatments),
    ceilingCount: arrayLength(row.ceilingDrapes),
    objectCount: arrayLength(row.objects),
    thumbnailDataUrl: row.thumbnail_data_url,
    plan,
    lastActivityAt: row.last_activity_at,
    lastActivityLabel: relativeTime(row.last_activity_at, now),
    createdAt: row.created_at,
    quoteId: row.quote_id,
    jobId: row.job_id,
    estimateRequestId: row.estimate_request_id,
    eventPlanId: links.planByDesign.get(row.id)?.id ?? null,
  };
}

async function hydrateCards(
  admin: SupabaseClient,
  rows: LeadCardRow[],
  links: StageLinks | null,
  today: string
): Promise<StudioLeadListItem[]> {
  const resolved = links ?? (await loadStageLinks(admin, rows));
  const profiles = await loadCustomerProfiles(
    admin,
    unique(rows.map((row) => customerOwnerId(row, resolved.ownerIds)))
  );
  const now = Date.now();
  return rows.map((row) =>
    toListItem(
      row,
      stageFor(row, resolved),
      resolved,
      row.owner_user_id ? profiles.get(row.owner_user_id) : undefined,
      today,
      now
    )
  );
}

export async function listStudioLeads(
  actor: StudioActor,
  filters: StudioLeadFilters
): Promise<StudioLeadsListResult> {
  if (!isOwnerActor(actor)) return { ok: false, message: "Owner access required." };
  const admin = createAdminSupabaseClient();
  const today = zonedToday();
  const pageSize = STUDIO_LEADS_PAGE_SIZE;

  // Fast path: everything filterable in SQL → paginate in the database.
  if (!filters.stage && filters.sort !== "stage") {
    const offset = (filters.page - 1) * pageSize;
    let query = applyLeadFilters(
      admin.from("studio_designs").select(CARD_COLUMNS, { count: "exact" }),
      filters,
      today
    );
    if (filters.sort === "created") {
      query = query.order("created_at", { ascending: false });
    } else if (filters.sort === "event") {
      query = query
        .order("event_date", { ascending: true, nullsFirst: false })
        .order("last_activity_at", { ascending: false });
    } else {
      query = query.order("last_activity_at", { ascending: false });
    }
    const { data, error, count } = await query
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error("[studio-leads] Failed to list leads:", error.message);
      return { ok: false, message: "Studio leads could not be loaded." };
    }
    const rows = (data ?? []) as unknown as LeadCardRow[];
    const total = count ?? rows.length;
    return {
      ok: true,
      leads: await hydrateCards(admin, rows, null, today),
      total,
      page: filters.page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      pageSize,
      truncated: false,
    };
  }

  // Stage filter / sort: stage is derived, so rank a light index in memory.
  const index = await scanLeadIndex(admin, filters, today);
  if (!index) return { ok: false, message: "Studio leads could not be loaded." };
  const links = await loadStageLinks(admin, index.rows);
  let ranked = index.rows.map((row) => ({ row, stage: stageFor(row, links) }));
  if (filters.stage) ranked = ranked.filter((entry) => entry.stage === filters.stage);
  if (filters.sort === "stage") {
    ranked.sort(
      (a, b) =>
        STUDIO_LEAD_STAGES.indexOf(b.stage) - STUDIO_LEAD_STAGES.indexOf(a.stage) ||
        b.row.last_activity_at.localeCompare(a.row.last_activity_at)
    );
  } else if (filters.sort === "created") {
    ranked.sort((a, b) => b.row.created_at.localeCompare(a.row.created_at));
  } else if (filters.sort === "event") {
    ranked.sort((a, b) => {
      if (!a.row.event_date) return b.row.event_date ? 1 : 0;
      if (!b.row.event_date) return -1;
      return a.row.event_date.localeCompare(b.row.event_date);
    });
  }

  const total = ranked.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pageCount);
  const pageIds = ranked
    .slice((page - 1) * pageSize, page * pageSize)
    .map((entry) => entry.row.id);
  if (pageIds.length === 0) {
    return { ok: true, leads: [], total, page, pageCount, pageSize, truncated: index.truncated };
  }

  const { data, error } = await admin
    .from("studio_designs")
    .select(CARD_COLUMNS)
    .in("id", pageIds);
  if (error) {
    console.error("[studio-leads] Failed to load lead cards:", error.message);
    return { ok: false, message: "Studio leads could not be loaded." };
  }
  const byId = new Map(
    ((data ?? []) as unknown as LeadCardRow[]).map((row) => [row.id, row])
  );
  const rows = pageIds
    .map((id) => byId.get(id))
    .filter((row): row is LeadCardRow => Boolean(row));
  return {
    ok: true,
    leads: await hydrateCards(admin, rows, links, today),
    total,
    page,
    pageCount,
    pageSize,
    truncated: index.truncated,
  };
}

/* ------------------------------------------------------------------ */
/* Stats + nav badge                                                   */
/* ------------------------------------------------------------------ */

export async function getStudioLeadStats(actor: StudioActor): Promise<StudioLeadStats | null> {
  if (!isOwnerActor(actor)) return null;
  const admin = createAdminSupabaseClient();
  const today = zonedToday();
  const since = addDaysIso(today, -(STUDIO_LEADS_STATS_WINDOW_DAYS - 1));
  const index = await scanLeadIndex(admin, { from: since }, today);
  if (!index) return null;
  const links = await loadStageLinks(admin, index.rows);
  const counts = emptyStudioLeadStageCounts();
  const todayStart = Date.parse(zonedMidnightIso(today));
  let activeToday = 0;
  for (const row of index.rows) {
    counts[stageFor(row, links)] += 1;
    if (Date.parse(row.last_activity_at) >= todayStart) activeToday += 1;
  }
  return {
    counts,
    activeToday,
    total: index.rows.length,
    windowDays: STUDIO_LEADS_STATS_WINDOW_DAYS,
  };
}

/** New contact-captured leads in the last week, for the admin nav. Never throws. */
export async function getStudioLeadsNavBadge(): Promise<number | null> {
  try {
    const owner = await requireOwner();
    if (!owner) return null;
    const admin = createAdminSupabaseClient();
    const since = new Date(
      Date.now() - STUDIO_LEADS_BADGE_WINDOW_DAYS * 86_400_000
    ).toISOString();
    const { count, error } = await admin
      .from("studio_designs")
      .select("id", { count: "exact", head: true })
      .gte("contact_captured_at", since)
      .neq("status", "archived");
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export type StudioLeadTimelineKey = "created" | Exclude<StudioLeadStage, "browsing">;

export type StudioLeadTimelineStep = {
  key: StudioLeadTimelineKey;
  label: string;
  reached: boolean;
  atLabel: string | null;
};

export type StudioLeadDetail = {
  id: string;
  title: string;
  status: StudioDesignStatus;
  source: StudioDesignSource;
  stage: StudioLeadStage;
  opportunityRef: string | null;
  createdLabel: string | null;
  lastActivityLabel: string;
  submittedFromUrl: string | null;
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    hasAccount: boolean;
    visitorShort: string | null;
    language: string | null;
  };
  event: {
    name: string | null;
    typeLabel: string | null;
    dateLabel: string | null;
    daysUntil: number | null;
    guestCount: number | null;
    venueName: string | null;
    cityArea: string | null;
  };
  timeline: StudioLeadTimelineStep[];
  links: {
    estimate: { id: string; ref: string | null } | null;
    quote: {
      id: string;
      ref: string | null;
      status: string | null;
      totalCents: number | null;
      acceptedAt: string | null;
    } | null;
    job: { id: string; status: string | null; name: string | null } | null;
    eventPlans: Array<{ id: string; reference: string | null; status: string; createdLabel: string | null }>;
  };
  design: StudioDesignJson;
};

type DetailRow = LeadIndexRow & {
  title: string;
  status: StudioDesignStatus;
  opportunity_ref: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_captured_at: string | null;
  visitor_id: string | null;
  venue_name: string | null;
  city_area: string | null;
  language: string | null;
  estimate_request_id: string | null;
  submitted_from_url: string | null;
  design_json: StudioDesignJson;
};

const DETAIL_COLUMNS: string = `${INDEX_COLUMNS}, title, status, opportunity_ref, contact_name, contact_phone, contact_captured_at, visitor_id, venue_name, city_area, language, estimate_request_id, submitted_from_url, design_json`;

export async function getStudioLeadDetail(
  actor: StudioActor,
  id: string
): Promise<StudioLeadDetail | null> {
  if (!isOwnerActor(actor) || !UUID_PATTERN.test(id)) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[studio-leads] Failed to load lead:", error.message);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as DetailRow;

  const [plansResult, quoteResult, jobResult, estimateResult, ownerIds] = await Promise.all([
    admin
      .from("event_plan_submissions")
      .select("id, reference, status, created_at")
      .eq("studio_design_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    row.quote_id
      ? admin
          .from("quotes")
          .select("id, quote_display_ref, status, total_cents, created_at, sent_at, accepted_at")
          .eq("id", row.quote_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.job_id
      ? admin
          .from("event_jobs")
          .select("id, status, event_name, created_at, confirmed_at")
          .eq("id", row.job_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.estimate_request_id
      ? admin
          .from("estimate_requests")
          .select("id, opportunity_ref")
          .eq("id", row.estimate_request_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    loadOwnerAccountIds(),
  ]);

  const plans = plansResult.error ? [] : (plansResult.data ?? []);
  const quote = quoteResult.data as {
    id: string;
    quote_display_ref: string | null;
    status: string | null;
    total_cents: number | null;
    created_at: string;
    sent_at: string | null;
    accepted_at: string | null;
  } | null;
  const job = jobResult.data as {
    id: string;
    status: string | null;
    event_name: string | null;
    created_at: string;
    confirmed_at: string | null;
  } | null;
  const estimate = estimateResult.data as { id: string; opportunity_ref: string | null } | null;

  const customerId = customerOwnerId(row, ownerIds);
  const profile = customerId
    ? (await loadCustomerProfiles(admin, [customerId])).get(customerId)
    : undefined;

  const links: StageLinks = {
    planByDesign: new Map(
      plans.length > 0
        ? [[id, { id: String(plans[0].id), created_at: String(plans[0].created_at) }]]
        : []
    ),
    acceptedQuotes: new Set(quote?.accepted_at ? [quote.id] : []),
    ownerIds,
  };
  const stage = stageFor(row, links);
  const stageIndex = STUDIO_LEAD_STAGES.indexOf(stage);
  const reached = (target: StudioLeadStage) => stageIndex >= STUDIO_LEAD_STAGES.indexOf(target);
  const hasDetails = Boolean(
    row.event_name || row.event_type || row.event_date || row.guest_count
  );
  const earliestPlan = plans.length > 0 ? String(plans[plans.length - 1].created_at) : null;

  const timeline: StudioLeadTimelineStep[] = [
    { key: "created", label: "Room created", reached: true, atLabel: formatTimestamp(row.created_at) },
    {
      key: "details",
      label: STUDIO_LEAD_STAGE_LABELS.details,
      reached: hasDetails || reached("details"),
      atLabel: null,
    },
    {
      key: "contact",
      label: STUDIO_LEAD_STAGE_LABELS.contact,
      reached: Boolean(row.contact_email || customerId) || reached("contact"),
      atLabel: formatTimestamp(row.contact_captured_at),
    },
    {
      key: "submitted",
      label: STUDIO_LEAD_STAGE_LABELS.submitted,
      reached: plans.length > 0 || reached("submitted"),
      atLabel: formatTimestamp(earliestPlan),
    },
    {
      key: "quoted",
      label: STUDIO_LEAD_STAGE_LABELS.quoted,
      reached: Boolean(row.quote_id) || reached("quoted"),
      atLabel: formatTimestamp(quote?.sent_at ?? quote?.created_at),
    },
    {
      key: "won",
      label: STUDIO_LEAD_STAGE_LABELS.won,
      reached: reached("won"),
      atLabel: formatTimestamp(quote?.accepted_at ?? job?.confirmed_at ?? job?.created_at),
    },
  ];

  const today = zonedToday();
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    source: asSource(row.source),
    stage,
    opportunityRef: row.opportunity_ref,
    createdLabel: formatTimestamp(row.created_at),
    lastActivityLabel: relativeTime(row.last_activity_at, Date.now()),
    submittedFromUrl: row.submitted_from_url,
    contact: {
      name: row.contact_name?.trim() || profile?.full_name?.trim() || null,
      email: row.contact_email?.trim() || profile?.email?.trim() || null,
      phone: row.contact_phone?.trim() || profile?.phone?.trim() || null,
      hasAccount: Boolean(customerId),
      visitorShort: row.visitor_id ? row.visitor_id.slice(0, 8) : null,
      language: row.language,
    },
    event: {
      name: row.event_name,
      typeLabel: eventTypeLabel(row.event_type),
      dateLabel: formatEventDate(row.event_date),
      daysUntil: row.event_date ? daysBetween(today, row.event_date) : null,
      guestCount: row.guest_count,
      venueName: row.venue_name,
      cityArea: row.city_area,
    },
    timeline,
    links: {
      estimate: estimate ? { id: estimate.id, ref: estimate.opportunity_ref } : null,
      quote: quote
        ? {
            id: quote.id,
            ref: quote.quote_display_ref,
            status: quote.status,
            totalCents: quote.total_cents,
            acceptedAt: quote.accepted_at,
          }
        : null,
      job: job ? { id: job.id, status: job.status, name: job.event_name } : null,
      eventPlans: plans.map((plan) => ({
        id: String(plan.id),
        reference: plan.reference ?? null,
        status: String(plan.status),
        createdLabel: formatTimestamp(String(plan.created_at)),
      })),
    },
    design: normalizeStudioDesign(row.design_json),
  };
}

/** Quote linked to a studio design (for the event plan → quote button). */
export async function getStudioDesignQuoteId(
  actor: StudioActor,
  designId: string | null
): Promise<string | null> {
  if (!designId || !isOwnerActor(actor) || !UUID_PATTERN.test(designId)) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select("quote_id")
    .eq("id", designId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.quote_id as string | null) ?? null;
}
