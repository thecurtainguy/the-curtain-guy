import { isValidEmail } from "@/data/estimate";
import type { ReviewCategory } from "@/data/reviews";

export type ReviewSubmissionData = {
  name: string;
  email: string;
  phone: string;
  role: string;
  organization: string;
  eventCategory: ReviewCategory | "";
  eventLabel: string;
  eventDate: string;
  venue: string;
  location: string;
  rating: number;
  experience: string;
  servicesUsed: string;
  highlights: string;
  wouldRecommend: "yes" | "maybe" | "no" | "";
  publishOnWebsite: boolean;
  okToContact: boolean;
};

export type ReviewSubmissionValidation = {
  valid: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const REVIEW_MAX_PAYLOAD_BYTES = 24 * 1024;

const REVIEW_CATEGORIES: ReviewCategory[] = [
  "wedding",
  "corporate",
  "gala",
  "mitzvah",
  "venue",
  "production",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

export function isReviewHoneypotTriggered(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const honeypot = (payload as Record<string, unknown>).website;
  return typeof honeypot === "string" && honeypot.trim().length > 0;
}

export function parseReviewSubmissionPayload(
  payload: unknown
): ReviewSubmissionData | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const category = asString(raw.eventCategory);
  const recommend = asString(raw.wouldRecommend);

  return {
    name: asString(raw.name),
    email: asString(raw.email),
    phone: asString(raw.phone),
    role: asString(raw.role),
    organization: asString(raw.organization),
    eventCategory: REVIEW_CATEGORIES.includes(category as ReviewCategory)
      ? (category as ReviewCategory)
      : "",
    eventLabel: asString(raw.eventLabel),
    eventDate: asString(raw.eventDate),
    venue: asString(raw.venue),
    location: asString(raw.location),
    rating: Number(raw.rating) || 0,
    experience: asString(raw.experience),
    servicesUsed: asString(raw.servicesUsed),
    highlights: asString(raw.highlights),
    wouldRecommend:
      recommend === "yes" || recommend === "maybe" || recommend === "no"
        ? recommend
        : "",
    publishOnWebsite: asBoolean(raw.publishOnWebsite),
    okToContact: asBoolean(raw.okToContact),
  };
}

export function validateReviewSubmission(
  data: ReviewSubmissionData
): ReviewSubmissionValidation {
  const fieldErrors: Record<string, string> = {};

  const name = data.name.trim();
  if (!name) fieldErrors.name = "Name is required.";
  else if (name.length > 120) fieldErrors.name = "Name is too long.";

  const email = data.email.trim();
  if (!email) fieldErrors.email = "Email is required.";
  else if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email.";

  if (data.phone.trim().length > 30) {
    fieldErrors.phone = "Phone is too long.";
  }

  if (data.role.trim().length > 120) {
    fieldErrors.role = "Role is too long.";
  }

  if (data.organization.trim().length > 160) {
    fieldErrors.organization = "Organization is too long.";
  }

  if (!data.eventCategory) {
    fieldErrors.eventCategory = "Pick the event type that fits best.";
  }

  if (data.eventLabel.trim().length > 160) {
    fieldErrors.eventLabel = "Event label is too long.";
  }

  if (data.venue.trim().length > 200) {
    fieldErrors.venue = "Venue is too long.";
  }

  if (data.location.trim().length > 120) {
    fieldErrors.location = "Location is too long.";
  }

  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    fieldErrors.rating = "Choose a star rating.";
  }

  const experience = data.experience.trim();
  if (!experience) {
    fieldErrors.experience = "Tell us about your experience.";
  } else if (experience.length < 40) {
    fieldErrors.experience = "Please share a bit more detail (at least 40 characters).";
  } else if (experience.length > 4000) {
    fieldErrors.experience = "Experience text is too long.";
  }

  if (data.servicesUsed.trim().length > 1000) {
    fieldErrors.servicesUsed = "Services description is too long.";
  }

  if (data.highlights.trim().length > 1000) {
    fieldErrors.highlights = "Highlights are too long.";
  }

  if (!data.wouldRecommend) {
    fieldErrors.wouldRecommend = "Let us know if you'd recommend us.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      message: "Please fix the highlighted fields before sending.",
      fieldErrors,
    };
  }

  return { valid: true };
}
