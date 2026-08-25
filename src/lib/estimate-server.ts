import {
  buildEstimateBrief,
  type EstimateFormData,
  isValidEmail,
} from "@/data/estimate";

export type EstimateSubmissionValidation = {
  valid: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type EstimateInsertMeta = {
  submittedFromUrl?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  uploadTokenHash?: string | null;
  uploadTokenExpiresAt?: string | null;
};

export type EstimateInsertResult =
  | {
      ok: true;
      id: string;
      opportunity_ref: string | null;
      opportunity_number: number | null;
    }
  | { ok: false; message: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export const ESTIMATE_MAX_PAYLOAD_BYTES = 64 * 1024;

export function isHoneypotTriggered(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const raw = payload as Record<string, unknown>;
  const honeypot = raw.website;

  return typeof honeypot === "string" && honeypot.trim().length > 0;
}

export function parseEstimateFormPayload(
  payload: unknown
): EstimateFormData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;

  return {
    eventType: asString(raw.eventType),
    eventDate: asString(raw.eventDate),
    venueName: asString(raw.venueName),
    cityArea: asString(raw.cityArea),
    venueSetting: asString(raw.venueSetting),
    guestCount: asString(raw.guestCount),
    drapeGoals: asStringArray(raw.drapeGoals),
    measurementsKnown: asString(raw.measurementsKnown),
    linearFeet: asString(raw.linearFeet),
    heightNeeded: asString(raw.heightNeeded),
    wallSections: asString(raw.wallSections),
    runLayout: asString(raw.runLayout),
    doorsOpenings: asString(raw.doorsOpenings),
    floorPlanAvailable: asString(raw.floorPlanAvailable),
    fabricDirections: asStringArray(raw.fabricDirections),
    fullnessPreference: asString(raw.fullnessPreference),
    addOns: asStringArray(raw.addOns),
    name: asString(raw.name),
    email: asString(raw.email),
    phone: asString(raw.phone),
    message: asString(raw.message),
  };
}

export function validateEstimateSubmission(
  data: EstimateFormData
): EstimateSubmissionValidation {
  const fieldErrors: Record<string, string> = {};

  if (!data.name.trim()) {
    fieldErrors.name = "Name is required.";
  }

  const email = data.email.trim();
  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!data.eventType) {
    fieldErrors.eventType = "Event type is required.";
  }

  if (!data.cityArea.trim()) {
    fieldErrors.cityArea = "City or area is required.";
  }

  if (data.drapeGoals.length === 0) {
    fieldErrors.drapeGoals = "Select at least one drape goal.";
  }

  if (data.fabricDirections.length === 0) {
    fieldErrors.fabricDirections =
      "Choose at least one fabric direction or select Not sure, recommend for me.";
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

function parseGuestCount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseEventDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function buildEstimateInsertRow(
  data: EstimateFormData,
  meta: EstimateInsertMeta = {}
) {
  const measurements = {
    measurementsKnown: data.measurementsKnown,
    linearFeet: data.linearFeet,
    heightNeeded: data.heightNeeded,
    wallSections: data.wallSections,
    runLayout: data.runLayout,
    doorsOpenings: data.doorsOpenings,
    floorPlanAvailable: data.floorPlanAvailable,
  };

  const lookAndFabric = {
    fabricDirections: data.fabricDirections,
    fullnessPreference: data.fullnessPreference,
  };

  return {
    customer_name: data.name.trim(),
    customer_email: data.email.trim(),
    customer_phone: data.phone.trim() || null,
    event_type: data.eventType || null,
    event_date: parseEventDate(data.eventDate),
    venue_name: data.venueName.trim() || null,
    city_area: data.cityArea.trim(),
    venue_setting: data.venueSetting || null,
    guest_count: parseGuestCount(data.guestCount),
    drape_goals: data.drapeGoals,
    measurements,
    look_and_fabric: lookAndFabric,
    add_ons: data.addOns,
    notes: data.message.trim() || null,
    estimate_brief: buildEstimateBrief(data),
    raw_payload: data,
    submitted_from_url: meta.submittedFromUrl ?? null,
    user_agent: meta.userAgent ?? null,
    user_id: meta.userId ?? null,
    upload_token_hash: meta.uploadTokenHash ?? null,
    upload_token_expires_at: meta.uploadTokenExpiresAt ?? null,
  };
}

export async function insertEstimateRequest(
  config: { url: string; serviceRoleKey: string },
  data: EstimateFormData,
  meta: EstimateInsertMeta = {}
): Promise<EstimateInsertResult> {
  const row = buildEstimateInsertRow(data, meta);
  const endpoint = `${config.url.replace(/\/$/, "")}/rest/v1/estimate_requests`;

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
      "[estimate] Supabase insert failed:",
      response.status,
      await response.text().catch(() => "")
    );
    return {
      ok: false,
      message: "We could not save your estimate request. Please try again.",
    };
  }

  const rows = (await response.json()) as Array<{
    id?: string;
    opportunity_ref?: string | null;
    opportunity_number?: number | null;
  }>;
  const inserted = rows[0];
  const id = inserted?.id;

  if (!id) {
    return {
      ok: false,
      message: "We could not save your estimate request. Please try again.",
    };
  }

  return {
    ok: true,
    id,
    opportunity_ref: inserted?.opportunity_ref?.trim() || null,
    opportunity_number:
      typeof inserted?.opportunity_number === "number"
        ? inserted.opportunity_number
        : null,
  };
}
