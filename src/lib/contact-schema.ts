import { isValidEmail } from "@/data/estimate";

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  venue: string;
  message: string;
};

export type ContactSubmissionValidation = {
  valid: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const CONTACT_MAX_PAYLOAD_BYTES = 16 * 1024;

export const CONTACT_MAX_NAME_LENGTH = 120;
export const CONTACT_MAX_EMAIL_LENGTH = 254;
export const CONTACT_MAX_PHONE_LENGTH = 30;
export const CONTACT_MAX_EVENT_TYPE_LENGTH = 80;
export const CONTACT_MAX_VENUE_LENGTH = 200;
export const CONTACT_MAX_MESSAGE_LENGTH = 5000;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function isContactHoneypotTriggered(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const raw = payload as Record<string, unknown>;
  const honeypot = raw.website;

  return typeof honeypot === "string" && honeypot.trim().length > 0;
}

export function parseContactFormPayload(payload: unknown): ContactFormData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;

  return {
    name: asString(raw.name),
    email: asString(raw.email),
    phone: asString(raw.phone),
    eventType: asString(raw.eventType),
    eventDate: asString(raw.eventDate),
    venue: asString(raw.venue),
    message: asString(raw.message),
  };
}

export function validateContactSubmission(
  data: ContactFormData
): ContactSubmissionValidation {
  const fieldErrors: Record<string, string> = {};

  const name = data.name.trim();
  if (!name) {
    fieldErrors.name = "Name is required.";
  } else if (name.length > CONTACT_MAX_NAME_LENGTH) {
    fieldErrors.name = `Name must be ${CONTACT_MAX_NAME_LENGTH} characters or fewer.`;
  }

  const email = data.email.trim();
  if (!email) {
    fieldErrors.email = "Email is required.";
  } else if (email.length > CONTACT_MAX_EMAIL_LENGTH) {
    fieldErrors.email = `Email must be ${CONTACT_MAX_EMAIL_LENGTH} characters or fewer.`;
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const phone = data.phone.trim();
  if (phone.length > CONTACT_MAX_PHONE_LENGTH) {
    fieldErrors.phone = `Phone must be ${CONTACT_MAX_PHONE_LENGTH} characters or fewer.`;
  }

  const eventType = data.eventType.trim();
  if (eventType.length > CONTACT_MAX_EVENT_TYPE_LENGTH) {
    fieldErrors.eventType = `Event type must be ${CONTACT_MAX_EVENT_TYPE_LENGTH} characters or fewer.`;
  }

  const venue = data.venue.trim();
  if (venue.length > CONTACT_MAX_VENUE_LENGTH) {
    fieldErrors.venue = `Venue must be ${CONTACT_MAX_VENUE_LENGTH} characters or fewer.`;
  }

  const message = data.message.trim();
  if (!message) {
    fieldErrors.message = "Message is required.";
  } else if (message.length > CONTACT_MAX_MESSAGE_LENGTH) {
    fieldErrors.message = `Message must be ${CONTACT_MAX_MESSAGE_LENGTH} characters or fewer.`;
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
