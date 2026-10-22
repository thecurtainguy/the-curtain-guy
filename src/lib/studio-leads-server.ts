import "server-only";

import type { NextResponse } from "next/server";
import {
  STUDIO_TITLE_MAX_LENGTH,
  validateStudioDesign,
  type StudioDesignJson,
} from "@/data/studio";
import {
  languageFromUrl,
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import type {
  StudioDesignSource,
  StudioEventDetails,
  StudioLeadContact,
} from "@/data/studio-leads";
import { validateStudioLeadContact } from "@/components/studio/lead/lead-contact";
import { createQuoteToken, hashQuoteToken } from "@/lib/quote-tokens";
import {
  parseStudioEventDetails,
  studioEventDetailsFromRow,
  studioEventDetailsToColumns,
  studioLeadContactFromRow,
  type StudioDesignLeadRow,
  type StudioFailure,
  type StudioResult,
} from "@/lib/studio";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const STUDIO_VISITOR_COOKIE = "tcg_vid";
const STUDIO_VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** Marks that the signed-in account was already linked recently (skips repeat work). */
export const STUDIO_LINKED_COOKIE = "tcg_sl";
const STUDIO_LINKED_COOKIE_MAX_AGE = 60 * 60 * 6;

export const STUDIO_VISITOR_DESIGN_CAP = 25;
export const STUDIO_AUTOSAVE_MIN_INTERVAL_MS = 10_000;
const DEFAULT_TITLE = "Untitled room design";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESUME_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isStudioUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function failure(code: StudioFailure["code"], message: string): StudioFailure {
  return { ok: false, code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ------------------------------------------------------------------ */
/* Visitor cookie                                                      */
/* ------------------------------------------------------------------ */

type CookieReader = { get(name: string): { value: string } | undefined };

/** The server-issued anonymous visitor id; never read from the request body. */
export function readStudioVisitorId(cookies: CookieReader): string | null {
  const value = cookies.get(STUDIO_VISITOR_COOKIE)?.value;
  return isStudioUuid(value) ? value.toLowerCase() : null;
}

export function resolveStudioVisitorId(cookies: CookieReader): {
  visitorId: string;
  issued: boolean;
} {
  const existing = readStudioVisitorId(cookies);
  if (existing) return { visitorId: existing, issued: false };
  return { visitorId: crypto.randomUUID(), issued: true };
}

export function applyStudioVisitorCookie(
  response: NextResponse,
  visitorId: string
): void {
  response.cookies.set(STUDIO_VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STUDIO_VISITOR_COOKIE_MAX_AGE,
  });
}

export function studioLinkedCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STUDIO_LINKED_COOKIE_MAX_AGE,
  };
}

/* ------------------------------------------------------------------ */
/* Request metadata + best-effort rate limiting                        */
/* ------------------------------------------------------------------ */

export type StudioLeadRequestMeta = {
  language: CustomerLanguage;
  submittedFromUrl: string | null;
  userAgent: string | null;
};

function sanitizeSubmittedUrl(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    url.hash = "";
    // Resume links carry a private token in the path.
    url.pathname = url.pathname.replace(/^\/studio\/d\/[^/]+/, "/studio/d/[token]");
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function getStudioLeadRequestMeta(
  request: Request,
  bodyLanguage?: unknown
): StudioLeadRequestMeta {
  const referer = request.headers.get("referer");
  const cookieLocale = (request.headers.get("cookie") ?? "").match(
    /(?:^|;\s*)NEXT_LOCALE=([^;]+)/
  )?.[1];
  const language =
    bodyLanguage === "en" || bodyLanguage === "fr"
      ? bodyLanguage
      : languageFromUrl(referer) ?? normalizeCustomerLanguage(cookieLocale);
  return {
    language,
    submittedFromUrl: sanitizeSubmittedUrl(referer),
    userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
  };
}

export function getStudioClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

const rateBuckets = new Map<string, number[]>();

/**
 * In-memory sliding window (per server instance). Returns false when the key
 * is over its limit. Complements the per-row DB throttle and per-visitor cap.
 */
export function consumeStudioRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, hits] of rateBuckets) {
      if (!hits.some((time) => now - time < windowMs)) rateBuckets.delete(bucketKey);
    }
  }
  const hits = (rateBuckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (hits.length >= limit) {
    rateBuckets.set(key, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  return true;
}

/* ------------------------------------------------------------------ */
/* Draft parsing                                                       */
/* ------------------------------------------------------------------ */

type StudioDraftInput = {
  id: string | null;
  title: string;
  design: StudioDesignJson;
  /** Undefined when the client did not send details (keeps stored values). */
  details: StudioEventDetails | undefined;
  source: StudioDesignSource;
};

function parseDraftInput(body: Record<string, unknown>): StudioResult<{ draft: StudioDraftInput }> {
  if ("owner_user_id" in body || "visitor_id" in body || "created_by_user_id" in body) {
    return failure("validation", "Ownership fields are not accepted.");
  }
  let id: string | null = null;
  if (body.id !== undefined && body.id !== null) {
    if (!isStudioUuid(body.id)) return failure("validation", "A valid design id is required.");
    id = body.id.toLowerCase();
  }
  let title = DEFAULT_TITLE;
  if (body.title !== undefined) {
    if (typeof body.title !== "string") return failure("validation", "Title must be text.");
    title = body.title.trim() || DEFAULT_TITLE;
    if (title.length > STUDIO_TITLE_MAX_LENGTH) {
      return failure(
        "validation",
        `Title must be under ${STUDIO_TITLE_MAX_LENGTH} characters.`
      );
    }
  }
  const validation = validateStudioDesign(body.design_json);
  if (!validation.valid) {
    return failure("validation", validation.errors[0] ?? "The room design is invalid.");
  }
  let details: StudioEventDetails | undefined;
  if ("event_details" in body) {
    const parsed = parseStudioEventDetails(body.event_details);
    if (!parsed.ok) return parsed;
    details = parsed.details;
  }
  return {
    ok: true,
    draft: {
      id,
      title,
      design: validation.design,
      details,
      source: body.mode === "event" ? "event_builder" : "studio",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Row access                                                          */
/* ------------------------------------------------------------------ */

async function loadLeadRow(
  id: string
): Promise<StudioResult<{ row: StudioDesignLeadRow }>> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[studio-leads] load failed:", error.code ?? error.message);
    return failure("database", "Could not load the Studio design.");
  }
  if (!data) return failure("not_found", "Studio design not found.");
  return { ok: true, row: data as StudioDesignLeadRow };
}

function visitorOwnsRow(row: StudioDesignLeadRow, visitorId: string): boolean {
  return (
    !row.owner_user_id &&
    typeof row.visitor_id === "string" &&
    row.visitor_id.toLowerCase() === visitorId
  );
}

async function loadVisitorRow(
  id: string,
  visitorId: string
): Promise<StudioResult<{ row: StudioDesignLeadRow }>> {
  const result = await loadLeadRow(id);
  if (!result.ok) return result;
  if (!visitorOwnsRow(result.row, visitorId)) {
    // Same message for "someone else's" and "claimed" rows: never confirm existence.
    return failure("forbidden", "This design is no longer linked to this browser.");
  }
  return result;
}

async function countVisitorRows(visitorId: string): Promise<StudioResult<{ count: number }>> {
  const admin = createAdminSupabaseClient();
  const { count, error } = await admin
    .from("studio_designs")
    .select("id", { count: "exact", head: true })
    .eq("visitor_id", visitorId);
  if (error) {
    console.error("[studio-leads] count failed:", error.code ?? error.message);
    return failure("database", "Could not save the Studio design.");
  }
  return { ok: true, count: count ?? 0 };
}

type WriteOptions = {
  throttle: boolean;
  extra?: Record<string, unknown>;
};

async function writeVisitorDesign(
  visitorId: string,
  draft: StudioDraftInput,
  meta: StudioLeadRequestMeta,
  options: WriteOptions
): Promise<StudioResult<{ row: StudioDesignLeadRow; previous: StudioDesignLeadRow | null }>> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const base: Record<string, unknown> = {
    title: draft.title,
    design_json: draft.design,
    language: meta.language,
    last_activity_at: now,
    ...(draft.details ? studioEventDetailsToColumns(draft.details) : {}),
    ...options.extra,
  };

  if (draft.id) {
    const current = await loadVisitorRow(draft.id, visitorId);
    if (!current.ok) return current;
    if (options.throttle) {
      const last = Date.parse(current.row.last_activity_at);
      if (Number.isFinite(last) && Date.now() - last < STUDIO_AUTOSAVE_MIN_INTERVAL_MS) {
        return failure("rate_limited", "Autosave is catching up — try again shortly.");
      }
    }
    const { data, error } = await admin
      .from("studio_designs")
      .update(base)
      .eq("id", draft.id)
      .eq("visitor_id", visitorId)
      .is("owner_user_id", null)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[studio-leads] update failed:", error.code ?? error.message);
      return failure("database", "Could not save the Studio design.");
    }
    if (!data) {
      return failure("forbidden", "This design is no longer linked to this browser.");
    }
    return { ok: true, row: data as StudioDesignLeadRow, previous: current.row };
  }

  const counted = await countVisitorRows(visitorId);
  if (!counted.ok) return counted;
  if (counted.count >= STUDIO_VISITOR_DESIGN_CAP) {
    return failure(
      "conflict",
      "You have reached the limit of saved rooms for this browser. Save or contact us to keep designing."
    );
  }
  const { data, error } = await admin
    .from("studio_designs")
    .insert({
      ...base,
      visitor_id: visitorId,
      owner_user_id: null,
      created_by_user_id: null,
      status: "draft",
      source: draft.source,
      submitted_from_url: meta.submittedFromUrl,
      user_agent: meta.userAgent,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[studio-leads] insert failed:", error?.code ?? error?.message);
    return failure("database", "Could not save the Studio design.");
  }
  return { ok: true, row: data as StudioDesignLeadRow, previous: null };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Browser-safe projection of a visitor's own row. */
export type StudioVisitorDraft = {
  id: string;
  title: string;
  design_json: StudioDesignJson;
  updated_at: string;
  last_activity_at: string;
  status: string;
  source: StudioDesignSource;
  details: StudioEventDetails;
  contact: StudioLeadContact | null;
};

export function toStudioVisitorDraft(row: StudioDesignLeadRow): StudioVisitorDraft {
  return {
    id: row.id,
    title: row.title,
    design_json: row.design_json,
    updated_at: row.updated_at,
    last_activity_at: row.last_activity_at,
    status: row.status,
    source: row.source,
    details: studioEventDetailsFromRow(row),
    contact: studioLeadContactFromRow(row),
  };
}

export async function autosaveVisitorDesign(
  visitorId: string,
  body: Record<string, unknown>,
  meta: StudioLeadRequestMeta
): Promise<StudioResult<{ row: StudioDesignLeadRow }>> {
  const parsed = parseDraftInput(body);
  if (!parsed.ok) return parsed;
  const result = await writeVisitorDesign(visitorId, parsed.draft, meta, {
    throttle: true,
  });
  if (!result.ok) return result;
  return { ok: true, row: result.row };
}

export async function getVisitorDraft(
  id: string,
  visitorId: string
): Promise<StudioResult<{ row: StudioDesignLeadRow }>> {
  if (!isStudioUuid(id)) return failure("validation", "A valid design id is required.");
  return loadVisitorRow(id.toLowerCase(), visitorId);
}

export type StudioLeadSaveResult = {
  row: StudioDesignLeadRow;
  token: string;
  contact: StudioLeadContact;
  /** First time this row captured this email (owner should be notified). */
  newLead: boolean;
};

export async function saveVisitorLead(
  visitorId: string,
  body: Record<string, unknown>,
  meta: StudioLeadRequestMeta
): Promise<
  | ({ ok: true } & StudioLeadSaveResult)
  | (StudioFailure & { fieldErrors?: Record<string, string> })
> {
  const parsed = parseDraftInput(body);
  if (!parsed.ok) return parsed;
  const contactInput = isRecord(body.contact) ? body.contact : {};
  const contactResult = validateStudioLeadContact({
    name: contactInput.name,
    email: contactInput.email,
    phone: contactInput.phone,
  });
  if (!contactResult.ok) {
    return {
      ...failure("validation", "Please complete your contact details."),
      fieldErrors: contactResult.errors,
    };
  }
  const contact = contactResult.contact;
  const token = createQuoteToken();
  const now = new Date().toISOString();

  let previous: StudioDesignLeadRow | null = null;
  if (parsed.draft.id) {
    const current = await loadVisitorRow(parsed.draft.id, visitorId);
    if (!current.ok) return current;
    previous = current.row;
  }

  const result = await writeVisitorDesign(visitorId, parsed.draft, meta, {
    throttle: false,
    extra: {
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone,
      contact_captured_at: previous?.contact_captured_at ?? now,
      status: "saved",
      public_token_hash: token.hash,
      public_token_expires_at: token.expiresAt,
    },
  });
  if (!result.ok) return result;

  const newLead =
    !previous?.contact_email ||
    previous.contact_email.toLowerCase() !== contact.email;
  return { ok: true, row: result.row, token: token.token, contact, newLead };
}

export type StudioResumeLookup =
  | { status: "ok"; row: StudioDesignLeadRow }
  | { status: "expired" }
  | { status: "invalid" };

export async function resolveStudioResumeToken(token: string): Promise<StudioResumeLookup> {
  if (typeof token !== "string" || !RESUME_TOKEN_PATTERN.test(token)) {
    return { status: "invalid" };
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select("*")
    .eq("public_token_hash", hashQuoteToken(token))
    .maybeSingle();
  if (error) {
    console.error("[studio-leads] resume lookup failed:", error.code ?? error.message);
    return { status: "invalid" };
  }
  if (!data) return { status: "invalid" };
  const row = data as StudioDesignLeadRow;
  if (row.status === "archived") return { status: "invalid" };
  const expires = row.public_token_expires_at
    ? Date.parse(row.public_token_expires_at)
    : NaN;
  if (!Number.isFinite(expires) || expires <= Date.now()) return { status: "expired" };
  return { status: "ok", row };
}

/**
 * Moves an emailed design onto this browser so autosave keeps working.
 * The previous browser loses write access to it (its next autosave starts a
 * new row) — the private link is the stronger proof of ownership.
 */
export async function bindStudioResumeToken(
  token: string,
  visitorId: string
): Promise<StudioResult<{ row: StudioDesignLeadRow }>> {
  const lookup = await resolveStudioResumeToken(token);
  if (lookup.status !== "ok") {
    return failure("not_found", "This design link is invalid or has expired.");
  }
  if (lookup.row.owner_user_id) {
    return failure("forbidden", "This design now lives in a Curtain Guy account. Sign in to open it.");
  }
  if (lookup.row.visitor_id === visitorId) return { ok: true, row: lookup.row };
  const counted = await countVisitorRows(visitorId);
  if (!counted.ok) return counted;
  if (counted.count >= STUDIO_VISITOR_DESIGN_CAP) {
    return failure("conflict", "This browser has too many saved rooms to open another.");
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .update({ visitor_id: visitorId, last_activity_at: new Date().toISOString() })
    .eq("id", lookup.row.id)
    .is("owner_user_id", null)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    console.error("[studio-leads] resume bind failed:", error?.code ?? "no row");
    return failure("database", "Could not open this design.");
  }
  return { ok: true, row: data as StudioDesignLeadRow };
}

/**
 * Attaches unowned studio rows to a signed-in customer:
 * - rows whose contact_email matches the verified account email;
 * - rows from this browser's visitor cookie that have no contact email yet
 *   (rows saved under a different email stay with that person).
 */
export async function linkStudioLeadsToAccount(input: {
  userId: string;
  email: string | null | undefined;
  visitorId: string | null;
}): Promise<{ linked: number }> {
  if (!isStudioUuid(input.userId)) return { linked: 0 };
  const admin = createAdminSupabaseClient();
  const email = input.email?.trim().toLowerCase() ?? "";
  let linked = 0;

  if (email) {
    const { data, error } = await admin
      .from("studio_designs")
      .update({ owner_user_id: input.userId })
      .is("owner_user_id", null)
      .eq("contact_email", email)
      .select("id");
    if (error) console.error("[studio-leads] email link failed:", error.code ?? error.message);
    else linked += data?.length ?? 0;
  }

  if (input.visitorId) {
    const { data, error } = await admin
      .from("studio_designs")
      .update({ owner_user_id: input.userId })
      .is("owner_user_id", null)
      .eq("visitor_id", input.visitorId)
      .is("contact_email", null)
      .select("id");
    if (error) console.error("[studio-leads] visitor link failed:", error.code ?? error.message);
    else linked += data?.length ?? 0;
  }

  return { linked };
}

/** True when the caller may attach this studio row to an event plan. */
export async function canAttachStudioDesign(
  id: unknown,
  caller: { visitorId: string | null; userId: string | null; isOwner: boolean }
): Promise<boolean> {
  if (!isStudioUuid(id)) return false;
  const result = await loadLeadRow(id.toLowerCase());
  if (!result.ok) return false;
  const row = result.row;
  if (caller.isOwner) return true;
  if (caller.userId && row.owner_user_id === caller.userId) return true;
  return Boolean(caller.visitorId && visitorOwnsRow(row, caller.visitorId));
}
