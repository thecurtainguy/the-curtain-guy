import type { ReviewSubmissionData } from "@/lib/review-submission-schema";
import type {
  ReviewSubmissionRow,
  ReviewSubmissionStatus,
} from "@/data/review-submissions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ReviewInsertMeta = {
  submittedFromUrl?: string | null;
  userAgent?: string | null;
};

export type ReviewInsertResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

function parseEventDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export function buildReviewSubmissionInsertRow(
  data: ReviewSubmissionData,
  meta: ReviewInsertMeta = {}
) {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim() || null,
    role: data.role.trim() || null,
    organization: data.organization.trim() || null,
    event_category: data.eventCategory || null,
    event_label: data.eventLabel.trim() || null,
    event_date: parseEventDate(data.eventDate),
    venue: data.venue.trim() || null,
    location: data.location.trim() || null,
    rating: data.rating,
    experience: data.experience.trim(),
    services_used: data.servicesUsed.trim() || null,
    highlights: data.highlights.trim() || null,
    would_recommend: data.wouldRecommend,
    publish_on_website: data.publishOnWebsite,
    ok_to_contact: data.okToContact,
    raw_payload: data,
    submitted_from_url: meta.submittedFromUrl ?? null,
    user_agent: meta.userAgent ?? null,
  };
}

export async function insertReviewSubmission(
  data: ReviewSubmissionData,
  meta: ReviewInsertMeta = {}
): Promise<ReviewInsertResult> {
  const admin = createAdminSupabaseClient();
  const row = buildReviewSubmissionInsertRow(data, meta);

  const { data: inserted, error } = await admin
    .from("review_submissions")
    .insert(row)
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("[reviews] Supabase insert failed:", error?.message);
    return {
      ok: false,
      message: "We could not save your review. Please try again.",
    };
  }

  return { ok: true, id: inserted.id as string };
}

export async function fetchReviewSubmissionById(
  id: string
): Promise<ReviewSubmissionRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("review_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[reviews] fetchReviewSubmissionById failed", error);
    return null;
  }

  return (data as ReviewSubmissionRow | null) ?? null;
}

export async function listAdminReviewSubmissions(options?: {
  limit?: number;
}): Promise<ReviewSubmissionRow[]> {
  const admin = createAdminSupabaseClient();
  const limit = options?.limit ?? 500;

  const { data, error } = await admin
    .from("review_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[reviews] listAdminReviewSubmissions failed", error);
    return [];
  }

  return (data ?? []) as ReviewSubmissionRow[];
}

export type ReviewSubmissionUpdateInput = {
  status?: ReviewSubmissionStatus;
  internalNotes?: string;
  markViewed?: boolean;
};

export async function updateReviewSubmission(
  id: string,
  input: ReviewSubmissionUpdateInput
): Promise<ReviewSubmissionRow | null> {
  const admin = createAdminSupabaseClient();
  const updates: Record<string, unknown> = {};

  if (input.status) {
    updates.status = input.status;
    if (input.status === "reviewed" || input.status === "approved") {
      updates.reviewed_at = new Date().toISOString();
    }
    if (input.status === "published") {
      updates.published_at = new Date().toISOString();
      updates.reviewed_at = updates.reviewed_at ?? new Date().toISOString();
    }
  }

  if (typeof input.internalNotes === "string") {
    updates.internal_notes = input.internalNotes.slice(0, 10000);
  }

  if (input.markViewed) {
    updates.last_viewed_by_owner_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return fetchReviewSubmissionById(id);
  }

  const { data, error } = await admin
    .from("review_submissions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[reviews] updateReviewSubmission failed", error);
    return null;
  }

  return data as ReviewSubmissionRow;
}
