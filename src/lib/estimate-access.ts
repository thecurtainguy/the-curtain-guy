import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth";
import { isEmailVerified, isOwnerProfile } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyUploadToken } from "@/lib/estimate-files";

export type EstimateRequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  source: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  city_area: string | null;
  venue_setting: string | null;
  guest_count: number | null;
  drape_goals: unknown;
  measurements: unknown;
  look_and_fabric: unknown;
  add_ons: unknown;
  notes: string | null;
  estimate_brief: string;
  raw_payload: unknown;
  submitted_from_url: string | null;
  user_agent: string | null;
  user_id: string | null;
  internal_notes: string | null;
  last_viewed_by_owner_at: string | null;
  upload_token_hash: string | null;
  upload_token_expires_at: string | null;
  opportunity_number?: number | null;
  opportunity_ref?: string | null;
};

export type EstimateFileRow = {
  id: string;
  estimate_request_id: string;
  uploaded_by_user_id: string | null;
  uploader_email: string | null;
  bucket: string;
  object_path: string;
  original_file_name: string;
  content_type: string;
  file_size_bytes: number;
  upload_status: string;
  created_at: string;
  uploaded_at: string | null;
};

export function customerCanAccessEstimate(
  estimate: Pick<EstimateRequestRow, "user_id" | "customer_email">,
  user: User,
  options: { requireVerifiedForEmailMatch?: boolean } = {}
): boolean {
  const requireVerified = options.requireVerifiedForEmailMatch ?? true;

  if (estimate.user_id && estimate.user_id === user.id) {
    return true;
  }

  if (!requireVerified || !isEmailVerified(user)) {
    return false;
  }

  const userEmail = user.email?.trim().toLowerCase();
  const estimateEmail = estimate.customer_email?.trim().toLowerCase();
  if (!userEmail || !estimateEmail) return false;
  return userEmail === estimateEmail;
}

export function canManageEstimateUploads(input: {
  estimate: EstimateRequestRow;
  user: User | null;
  profile: UserProfile | null;
  uploadToken?: string | null;
}): boolean {
  const { estimate, user, profile, uploadToken } = input;

  if (isOwnerProfile(profile)) {
    return true;
  }

  if (user && customerCanAccessEstimate(estimate, user)) {
    return true;
  }

  if (uploadToken) {
    const expiresAt = estimate.upload_token_expires_at
      ? new Date(estimate.upload_token_expires_at).getTime()
      : 0;
    if (expiresAt && Date.now() > expiresAt) {
      return false;
    }
    return verifyUploadToken(uploadToken, estimate.upload_token_hash);
  }

  return false;
}

export async function fetchEstimateById(
  id: string
): Promise<EstimateRequestRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("estimate_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as EstimateRequestRow;
}

export async function fetchEstimateFiles(
  estimateId: string,
  statuses: string[] = ["uploaded", "pending"]
): Promise<EstimateFileRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("estimate_files")
    .select("*")
    .eq("estimate_request_id", estimateId)
    .in("upload_status", statuses)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as EstimateFileRow[];
}

export async function countEstimateFiles(estimateId: string): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { count, error } = await admin
    .from("estimate_files")
    .select("id", { count: "exact", head: true })
    .eq("estimate_request_id", estimateId)
    .in("upload_status", ["uploaded", "pending"]);

  if (error) return 0;
  return count ?? 0;
}

/** Estimates for a customer: owned by user_id, plus verified email-matched guests. */
export async function listEstimatesForCustomer(
  user: User
): Promise<EstimateRequestRow[]> {
  const admin = createAdminSupabaseClient();
  const verified = isEmailVerified(user);
  const email = user.email?.trim().toLowerCase() ?? "";

  const { data: owned, error: ownedError } = await admin
    .from("estimate_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (ownedError) {
    console.error("[account] Failed to list owned estimates:", ownedError.message);
  }

  let emailMatched: EstimateRequestRow[] = [];

  if (verified && email) {
    const { data: matched, error: matchError } = await admin
      .from("estimate_requests")
      .select("*")
      .ilike("customer_email", email)
      .order("created_at", { ascending: false });

    if (matchError) {
      console.error(
        "[account] Failed to list email-matched estimates:",
        matchError.message
      );
    } else {
      emailMatched = (matched as EstimateRequestRow[]).filter(
        (row) => row.user_id !== user.id
      );
    }
  }

  const byId = new Map<string, EstimateRequestRow>();
  for (const row of [...(owned as EstimateRequestRow[] | null ?? []), ...emailMatched]) {
    byId.set(row.id, row);
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function toCustomerSafeEstimate(row: EstimateRequestRow) {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    event_type: row.event_type,
    event_date: row.event_date,
    venue_name: row.venue_name,
    city_area: row.city_area,
    venue_setting: row.venue_setting,
    guest_count: row.guest_count,
    drape_goals: row.drape_goals,
    measurements: row.measurements,
    look_and_fabric: row.look_and_fabric,
    add_ons: row.add_ons,
    notes: row.notes,
    estimate_brief: row.estimate_brief,
    user_id: row.user_id,
  };
}
