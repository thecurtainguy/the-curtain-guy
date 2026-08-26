import {
  isValidEmail,
  type EstimateFormData,
} from "@/data/estimate";
import { formatEventPlanReference } from "@/data/event-plans";
import {
  isEventBuilderBrief,
  parseEventBuilderBrief,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import {
  normalizeStudioDesign,
  validateStudioDesign,
  type StudioDesignJson,
} from "@/data/studio";

export const EVENT_PLAN_MAX_PAYLOAD_BYTES = 512 * 1024;

export type EventPlanContact = {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
};

export type EventPlanSubmitPayload = {
  contact: EventPlanContact;
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  website?: string;
};

export type EventPlanValidation = {
  valid: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type EventPlanInsertMeta = {
  submittedFromUrl?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  studioDesignId?: string | null;
};

export type EventPlanInsertResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; message: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function isEventPlanHoneypotTriggered(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const raw = payload as Record<string, unknown>;
  const honeypot = raw.website;
  return typeof honeypot === "string" && honeypot.trim().length > 0;
}

export function parseEventPlanPayload(payload: unknown): EventPlanSubmitPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const contactRaw = raw.contact;
  if (!contactRaw || typeof contactRaw !== "object") return null;
  const contact = contactRaw as Record<string, unknown>;
  const brief = parseEventBuilderBrief(raw.brief);
  if (!brief) return null;
  if (!raw.design || typeof raw.design !== "object") return null;

  return {
    contact: {
      name: asString(contact.name),
      email: asString(contact.email),
      phone: asString(contact.phone),
      notes: asString(contact.notes),
    },
    brief,
    design: raw.design as StudioDesignJson,
    website: asString(raw.website),
  };
}

export function validateEventPlanSubmission(
  payload: EventPlanSubmitPayload
): EventPlanValidation {
  const fieldErrors: Record<string, string> = {};
  const name = payload.contact.name.trim();
  const email = payload.contact.email.trim();

  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Email is required.";
  else if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email address.";

  if (!payload.brief.eventType) {
    fieldErrors.eventType = "Event type is required.";
  }

  if (!isEventBuilderBrief(payload.brief)) {
    return { valid: false, message: "Invalid event brief." };
  }

  const designValidation = validateStudioDesign(payload.design);
  if (!designValidation.valid) {
    return {
      valid: false,
      message: designValidation.errors[0] ?? "Invalid room design.",
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      message: "Please complete the required fields before submitting.",
      fieldErrors,
    };
  }

  return { valid: true };
}

function parseEventDate(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function buildEventPlanInsertRow(
  payload: EventPlanSubmitPayload,
  id: string,
  meta: EventPlanInsertMeta = {}
) {
  const normalized = normalizeStudioDesign(payload.design);
  return {
    id,
    contact_name: payload.contact.name.trim(),
    contact_email: payload.contact.email.trim(),
    contact_phone: payload.contact.phone?.trim() || null,
    event_type: payload.brief.eventType || null,
    event_date: parseEventDate(payload.brief.eventDate),
    venue_name: payload.brief.venueName?.trim() || null,
    city_area: payload.brief.cityArea?.trim() || null,
    brief_json: payload.brief,
    design_json: normalized,
    owner_user_id: meta.userId ?? null,
    studio_design_id: meta.studioDesignId ?? null,
    notes: payload.contact.notes?.trim() || null,
    submitted_from_url: meta.submittedFromUrl ?? null,
    user_agent: meta.userAgent ?? null,
  };
}

export type EventPlanUpdateResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; message: string };

export function buildEventPlanUpdateRow(payload: EventPlanSubmitPayload) {
  const normalized = normalizeStudioDesign(payload.design);
  return {
    contact_name: payload.contact.name.trim(),
    contact_email: payload.contact.email.trim(),
    contact_phone: payload.contact.phone?.trim() || null,
    event_type: payload.brief.eventType || null,
    event_date: parseEventDate(payload.brief.eventDate),
    venue_name: payload.brief.venueName?.trim() || null,
    city_area: payload.brief.cityArea?.trim() || null,
    brief_json: payload.brief,
    design_json: normalized,
    notes: payload.contact.notes?.trim() || null,
    status: "new",
  };
}

export async function updateEventPlanSubmission(
  config: { url: string; serviceRoleKey: string },
  planId: string,
  payload: EventPlanSubmitPayload
): Promise<EventPlanUpdateResult> {
  const row = buildEventPlanUpdateRow(payload);
  const endpoint = `${config.url.replace(/\/$/, "")}/rest/v1/event_plan_submissions?id=eq.${planId}`;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    console.error(
      "[event-plan] Supabase update failed:",
      response.status,
      await response.text().catch(() => "")
    );
    return {
      ok: false,
      message: "We could not update your event plan. Please try again.",
    };
  }

  const rows = (await response.json()) as Array<{ id: string; reference: string }>;
  const updated = rows[0];
  if (!updated?.id) {
    return {
      ok: false,
      message: "We could not update your event plan. Please try again.",
    };
  }

  return {
    ok: true,
    id: updated.id,
    reference: formatEventPlanReference(updated.id, updated.reference),
  };
}

export async function insertEventPlanSubmission(
  config: { url: string; serviceRoleKey: string },
  payload: EventPlanSubmitPayload,
  meta: EventPlanInsertMeta = {}
): Promise<EventPlanInsertResult> {
  const id = crypto.randomUUID();
  const row = buildEventPlanInsertRow(payload, id, meta);
  const endpoint = `${config.url.replace(/\/$/, "")}/rest/v1/event_plan_submissions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    console.error(
      "[event-plan] Supabase insert failed:",
      response.status,
      await response.text().catch(() => "")
    );
    return { ok: false, message: "We could not save your event plan. Please try again." };
  }

  const rows = (await response.json()) as Array<{ id: string; reference: string }>;
  const inserted = rows[0];
  if (!inserted?.id) {
    return { ok: false, message: "We could not save your event plan. Please try again." };
  }

  return {
    ok: true,
    id: inserted.id,
    reference: formatEventPlanReference(inserted.id, inserted.reference),
  };
}

// Re-export for email formatting that needs estimate labels
export type { EstimateFormData };
