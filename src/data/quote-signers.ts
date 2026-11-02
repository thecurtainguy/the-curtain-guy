/** A person the customer may choose when they review and sign a quote. */
export type QuoteAuthorizedSigner = {
  name: string;
  title: string | null;
  email: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EXTRA_SIGNERS = 8;

export const SIGNER_CHOICE_REQUIRED = "Choose one of the people authorized to sign this quote.";
export const SIGNER_NO_LONGER_AUTHORIZED =
  "This person is no longer authorized to sign. Please start again.";
export const SIGNER_SESSION_MISMATCH =
  "This signing session is already verified for someone else. Start again.";

function readSigner(value: unknown): QuoteAuthorizedSigner | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const name = typeof record.name === "string" ? record.name.trim().slice(0, 120) : "";
  const title = typeof record.title === "string" ? record.title.trim().slice(0, 120) : "";
  if (!EMAIL.test(email) || name.length < 2) return null;
  return { name, title: title || null, email };
}

/** Drops incomplete or duplicate entries. Used when reading stored JSON. */
export function normalizeAuthorizedSigners(value: unknown): QuoteAuthorizedSigner[] {
  if (!Array.isArray(value)) return [];
  const out: QuoteAuthorizedSigner[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const signer = readSigner(item);
    if (!signer || seen.has(signer.email)) continue;
    seen.add(signer.email);
    out.push(signer);
    if (out.length >= MAX_EXTRA_SIGNERS) break;
  }
  return out;
}

/**
 * Validates the list an admin is saving. Blank rows are skipped.
 * The quote contact is not stored here; they are always allowed to sign.
 */
export function parseAuthorizedSignersInput(
  value: unknown,
  primaryEmail: string
): { ok: true; signers: QuoteAuthorizedSigner[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: "Signers must be a list." };
  if (value.length > MAX_EXTRA_SIGNERS) {
    return { ok: false, message: "You can add up to 8 additional signers." };
  }
  const primary = primaryEmail.trim().toLowerCase();
  const signers: QuoteAuthorizedSigner[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { ok: false, message: "Each signer needs a name and email." };
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!name && !email && !title) continue;
    if (name.length < 2) return { ok: false, message: "Each signer needs a full name." };
    if (name.length > 120) return { ok: false, message: "A signer name is too long." };
    if (title.length > 120) return { ok: false, message: "A signer title is too long." };
    if (!EMAIL.test(email)) {
      return { ok: false, message: `Invalid signer email${email ? `: ${email}` : ""}.` };
    }
    if (email === primary) {
      return { ok: false, message: `${email} is already the quote contact.` };
    }
    if (seen.has(email)) return { ok: false, message: `${email} is listed more than once.` };
    seen.add(email);
    signers.push({ name: name.slice(0, 120), title: title.slice(0, 120) || null, email });
  }
  return { ok: true, signers };
}

type QuoteSignerSource = {
  customer_name?: string | null;
  customer_email?: string | null;
  authorized_signers?: unknown;
};

/** Quote contact first, then anyone the admin added. */
export function quoteSignerChoices(quote: QuoteSignerSource): QuoteAuthorizedSigner[] {
  const email = (quote.customer_email || "").trim().toLowerCase();
  const primaryName = (quote.customer_name || "").trim().slice(0, 120);
  const extras = normalizeAuthorizedSigners(quote.authorized_signers).filter(
    (signer) => signer.email !== email
  );
  if (!email) return extras;
  return [
    {
      name: primaryName.length >= 2 ? primaryName : email,
      title: null,
      email,
    },
    ...extras,
  ];
}

export type ResolvedSigner =
  | { ok: true; signer: QuoteAuthorizedSigner; locked: boolean }
  | { ok: false; message: string };

/** Who receives the verification code. A single contact ignores any other email. */
export function resolveSigningSigner(
  quote: QuoteSignerSource,
  requestedEmail: unknown
): ResolvedSigner {
  const choices = quoteSignerChoices(quote);
  if (choices.length === 0) {
    return { ok: false, message: "This quote has no email address on file." };
  }
  if (choices.length === 1) return { ok: true, signer: choices[0], locked: false };
  const email = typeof requestedEmail === "string" ? requestedEmail.trim().toLowerCase() : "";
  const match = choices.find((choice) => choice.email === email);
  if (!match) return { ok: false, message: SIGNER_CHOICE_REQUIRED };
  return { ok: true, signer: match, locked: true };
}

/** The person already tied to a signing session, checked again at the moment of signing. */
export function signerFromSession(quote: QuoteSignerSource, sessionEmail: string): ResolvedSigner {
  const choices = quoteSignerChoices(quote);
  if (choices.length === 0) {
    return { ok: false, message: "This quote has no email address on file." };
  }
  if (choices.length === 1) return { ok: true, signer: choices[0], locked: false };
  const match = choices.find((choice) => choice.email === sessionEmail.trim().toLowerCase());
  if (!match) return { ok: false, message: SIGNER_NO_LONGER_AUTHORIZED };
  return { ok: true, signer: match, locked: true };
}
