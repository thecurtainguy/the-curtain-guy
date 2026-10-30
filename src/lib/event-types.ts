import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_EVENT_TYPES,
  EVENT_TYPE_LABEL_MAX,
  isEventTypeIconKey,
  setEventTypeCatalog,
  slugifyEventTypeLabel,
  type EventType,
  type EventTypeIconKey,
  type EventTypeUsage,
} from "@/data/event-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const EVENT_TYPES_TAG = "event-types";

function normalizeRow(row: Record<string, unknown>): EventType | null {
  if (typeof row.id !== "string" || typeof row.label !== "string") return null;
  return {
    id: row.id,
    label: row.label,
    label_fr: typeof row.label_fr === "string" ? row.label_fr : "",
    icon: isEventTypeIconKey(row.icon) ? row.icon : "sparkles",
    sort_order: Number(row.sort_order) || 0,
    active: row.active !== false,
  };
}

async function fetchEventTypes(): Promise<EventType[]> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("event_types")
      .select("id, label, label_fr, icon, sort_order, active")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) {
      console.error("[event-types] load", error);
      return DEFAULT_EVENT_TYPES;
    }
    const types = (data ?? [])
      .map((row) => normalizeRow(row as Record<string, unknown>))
      .filter((type): type is EventType => type !== null);
    return types.length > 0 ? types : DEFAULT_EVENT_TYPES;
  } catch (error) {
    console.error("[event-types] load failed", error);
    return DEFAULT_EVENT_TYPES;
  }
}

const getCachedEventTypes = unstable_cache(fetchEventTypes, ["event-types"], {
  tags: [EVENT_TYPES_TAG],
  revalidate: 300,
});

/** All event types (including hidden), in display order. Also primes the sync label helpers. */
export async function getEventTypes(): Promise<EventType[]> {
  const types = await getCachedEventTypes();
  setEventTypeCatalog(types);
  return types;
}

function invalidate(): void {
  revalidateTag(EVENT_TYPES_TAG, { expire: 0 });
}

export async function getEventTypeUsage(): Promise<Record<string, EventTypeUsage>> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("event_type_usage");
  if (error) {
    console.error("[event-types] usage", error);
    throw new Error("Could not check where event types are used.");
  }
  const usage: Record<string, EventTypeUsage> = {};
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    usage[String(row.event_type_id)] = {
      estimates: Number(row.estimates) || 0,
      event_plans: Number(row.event_plans) || 0,
      quotes: Number(row.quotes) || 0,
      invoices: Number(row.invoices) || 0,
      jobs: Number(row.jobs) || 0,
      studio_designs: Number(row.studio_designs) || 0,
      products: Number(row.products) || 0,
    };
  }
  return usage;
}

type EventTypeInput = {
  label?: unknown;
  label_fr?: unknown;
  icon?: unknown;
  active?: unknown;
};

function cleanLabel(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, EVENT_TYPE_LABEL_MAX) : "";
}

export async function createEventType(
  input: EventTypeInput
): Promise<{ eventType: EventType } | { error: string }> {
  const label = cleanLabel(input.label);
  if (!label) return { error: "Give the event type a name." };
  const id = slugifyEventTypeLabel(label);
  if (!id) return { error: "Use at least one letter or number in the name." };

  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("event_types").select("id, label").eq("id", id).maybeSingle();
  if (existing) {
    return { error: `“${(existing as { label: string }).label}” already exists. Rename or show that one instead.` };
  }

  const { data: last } = await admin
    .from("event_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const icon: EventTypeIconKey = isEventTypeIconKey(input.icon) ? input.icon : "sparkles";

  const { data, error } = await admin
    .from("event_types")
    .insert({
      id,
      label,
      label_fr: cleanLabel(input.label_fr),
      icon,
      sort_order: (Number((last as { sort_order?: number } | null)?.sort_order) || 0) + 10,
      active: true,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[event-types] create", error);
    return { error: "Could not add the event type." };
  }
  invalidate();
  const eventType = normalizeRow(data as Record<string, unknown>);
  return eventType ? { eventType } : { error: "Could not add the event type." };
}

export async function updateEventType(
  id: string,
  input: EventTypeInput
): Promise<{ eventType: EventType } | { error: string }> {
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) {
    const label = cleanLabel(input.label);
    if (!label) return { error: "The English name can’t be empty." };
    patch.label = label;
  }
  if (input.label_fr !== undefined) patch.label_fr = cleanLabel(input.label_fr);
  if (input.icon !== undefined) {
    if (!isEventTypeIconKey(input.icon)) return { error: "Unknown icon." };
    patch.icon = input.icon;
  }
  if (input.active !== undefined) patch.active = input.active === true;
  if (Object.keys(patch).length === 0) return { error: "Nothing to update." };

  const admin = createAdminSupabaseClient();
  if (patch.active === false) {
    const { count } = await admin
      .from("event_types")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .neq("id", id);
    if (!count) return { error: "Keep at least one event type visible so clients can submit requests." };
  }
  const { data, error } = await admin.from("event_types").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) {
    console.error("[event-types] update", error);
    return { error: "Could not save the event type." };
  }
  if (!data) return { error: "That event type no longer exists." };
  invalidate();
  const eventType = normalizeRow(data as Record<string, unknown>);
  return eventType ? { eventType } : { error: "Could not save the event type." };
}

export async function reorderEventTypes(ids: string[]): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminSupabaseClient();
  const results = await Promise.all(
    ids.map((id, index) => admin.from("event_types").update({ sort_order: (index + 1) * 10 }).eq("id", id))
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[event-types] reorder", failed.error);
    return { error: "Could not save the new order." };
  }
  invalidate();
  return { ok: true };
}

/**
 * Only unused types can be deleted; the database trigger enforces the same rule
 * so a record created between this check and the delete is still protected.
 */
export async function deleteEventType(
  id: string
): Promise<{ ok: true } | { error: string; usage?: EventTypeUsage }> {
  const usage = (await getEventTypeUsage())[id];
  if (!usage) {
    invalidate();
    return { error: "That event type no longer exists." };
  }
  if (Object.values(usage).some((count) => count > 0)) {
    return {
      error: "This event type is used by existing records, so it can’t be deleted. Hide it instead.",
      usage,
    };
  }
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("event_types").delete().eq("id", id);
  if (error) {
    console.error("[event-types] delete", error);
    return {
      error: error.code === "P0001"
        ? "This event type is used by existing records, so it can’t be deleted. Hide it instead."
        : "Could not delete the event type.",
    };
  }
  invalidate();
  return { ok: true };
}
