import type { User } from "@supabase/supabase-js";
import { isEmailVerified, isOwnerProfile } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { EventPlanSubmissionRow } from "@/data/event-plans";
import {
  parseEventBuilderBrief,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import {
  normalizeStudioDesign,
  type StudioDesignJson,
} from "@/data/studio";

export function customerCanAccessEventPlan(
  plan: Pick<EventPlanSubmissionRow, "owner_user_id" | "contact_email">,
  user: User,
  options: { requireVerifiedForEmailMatch?: boolean } = {}
): boolean {
  const requireVerified = options.requireVerifiedForEmailMatch ?? true;

  if (plan.owner_user_id && plan.owner_user_id === user.id) {
    return true;
  }

  if (!requireVerified || !isEmailVerified(user)) {
    return false;
  }

  const userEmail = user.email?.trim().toLowerCase();
  const planEmail = plan.contact_email?.trim().toLowerCase();
  if (!userEmail || !planEmail) return false;
  return userEmail === planEmail;
}

export function canManageEventPlan(input: {
  plan: EventPlanSubmissionRow;
  user: User | null;
  profile: UserProfile | null;
}): boolean {
  const { plan, user, profile } = input;
  if (isOwnerProfile(profile)) return true;
  if (user && customerCanAccessEventPlan(plan, user)) return true;
  return false;
}

export async function fetchEventPlanById(
  id: string
): Promise<EventPlanSubmissionRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_plan_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as EventPlanSubmissionRow;
}

export async function listEventPlansForCustomer(
  user: User
): Promise<EventPlanSubmissionRow[]> {
  const admin = createAdminSupabaseClient();
  const email = user.email?.trim().toLowerCase();

  const byOwner = await admin
    .from("event_plan_submissions")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = new Map<string, EventPlanSubmissionRow>();
  for (const row of (byOwner.data ?? []) as EventPlanSubmissionRow[]) {
    rows.set(row.id, row);
  }

  if (email && isEmailVerified(user)) {
    const byEmail = await admin
      .from("event_plan_submissions")
      .select("*")
      .ilike("contact_email", email)
      .order("created_at", { ascending: false })
      .limit(200);

    for (const row of (byEmail.data ?? []) as EventPlanSubmissionRow[]) {
      rows.set(row.id, row);
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function parseEventPlanBrief(
  row: EventPlanSubmissionRow
): EventBuilderBrief | null {
  return parseEventBuilderBrief(row.brief_json);
}

export function parseEventPlanDesign(
  row: EventPlanSubmissionRow
): StudioDesignJson | null {
  try {
    return normalizeStudioDesign(row.design_json as StudioDesignJson);
  } catch {
    return null;
  }
}

export type CustomerSafeEventPlan = Omit<
  EventPlanSubmissionRow,
  "user_agent" | "submitted_from_url"
>;

export function toCustomerSafeEventPlan(
  row: EventPlanSubmissionRow
): CustomerSafeEventPlan {
  const { user_agent: _ua, submitted_from_url: _url, ...safe } = row;
  return safe;
}
