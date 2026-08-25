import type { ReviewCategory } from "@/data/reviews";

export const REVIEW_SUBMISSION_STATUSES = [
  "new",
  "reviewed",
  "approved",
  "published",
  "declined",
  "spam",
] as const;

export type ReviewSubmissionStatus = (typeof REVIEW_SUBMISSION_STATUSES)[number];

export type ReviewRecommendAnswer = "yes" | "maybe" | "no";

export type ReviewSubmissionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: ReviewSubmissionStatus;
  source: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  organization: string | null;
  event_category: ReviewCategory | null;
  event_label: string | null;
  event_date: string | null;
  venue: string | null;
  location: string | null;
  rating: number;
  experience: string;
  services_used: string | null;
  highlights: string | null;
  would_recommend: ReviewRecommendAnswer;
  publish_on_website: boolean;
  ok_to_contact: boolean;
  raw_payload: unknown;
  submitted_from_url: string | null;
  user_agent: string | null;
  internal_notes: string | null;
  last_viewed_by_owner_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
};

export function formatReviewSubmissionRef(id: string): string {
  return `REV-${id.slice(0, 8).toUpperCase()}`;
}

export function getReviewSubmissionStatusLabel(
  status: ReviewSubmissionStatus
): string {
  switch (status) {
    case "new":
      return "New";
    case "reviewed":
      return "Reviewed";
    case "approved":
      return "Approved";
    case "published":
      return "Published";
    case "declined":
      return "Declined";
    case "spam":
      return "Spam";
    default:
      return status;
  }
}

export function getRecommendLabel(value: ReviewRecommendAnswer): string {
  switch (value) {
    case "yes":
      return "Yes";
    case "maybe":
      return "Maybe";
    case "no":
      return "No";
    default:
      return value;
  }
}

export function isReviewSubmissionStatus(
  value: string
): value is ReviewSubmissionStatus {
  return REVIEW_SUBMISSION_STATUSES.includes(value as ReviewSubmissionStatus);
}
