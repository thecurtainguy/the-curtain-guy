import { isValidEmail, isValidPhone } from "@/data/estimate";
import type { StudioLeadContact } from "@/data/studio-leads";

export type StudioLeadContactErrors = Partial<
  Record<keyof StudioLeadContact, string>
>;

/** Shared client + server rules: name, email and phone are all required. */
export function validateStudioLeadContact(contact: {
  name: unknown;
  email: unknown;
  phone: unknown;
}):
  | { ok: true; contact: StudioLeadContact }
  | { ok: false; errors: StudioLeadContactErrors } {
  const errors: StudioLeadContactErrors = {};
  const name =
    typeof contact.name === "string"
      ? contact.name.trim().replace(/\s+/g, " ")
      : "";
  const email =
    typeof contact.email === "string" ? contact.email.trim().toLowerCase() : "";
  const phone =
    typeof contact.phone === "string"
      ? contact.phone.trim().replace(/\s+/g, " ")
      : "";

  if (name.length < 2) errors.name = "Enter your full name.";
  else if (name.length > 160) errors.name = "Keep your name under 160 characters.";

  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254 || !isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!phone) errors.phone = "Enter a phone number so we can reach you.";
  else if (!isValidPhone(phone)) {
    errors.phone = "Enter a valid phone number, including area code.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, contact: { name, email, phone } };
}
