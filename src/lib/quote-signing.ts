import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import type { CustomerLanguage } from "@/data/customer-language";
import { isCustomerLanguage, normalizeCustomerLanguage } from "@/data/customer-language";
import {
  SIGNATURE_IMAGE_MAX_CHARS,
  SIGNING_CLAUSE_KEYS,
  SIGNING_CODE_LENGTH,
  SIGNING_CODE_TTL_MINUTES,
  SIGNING_LANGUAGE_CHOICE,
  SIGNING_MAX_CODE_ATTEMPTS,
  SIGNING_MAX_CODE_SENDS,
  SIGNING_RESEND_COOLDOWN_SECONDS,
  SIGNING_SESSION_TTL_MINUTES,
  buildSigningClauses,
  signingConsentText,
  signingLanguageChoiceText,
  type QuoteAgreementAudit,
  type QuoteAgreementSummary,
  type SignatureMethod,
  type SigningAcknowledgement,
} from "@/data/quote-signing";
import {
  QUOTE_EXPIRED_MESSAGE,
  isQuoteValidityLapsed,
  type CustomerSafeQuote,
  type QuoteContractProvider,
} from "@/data/quotes";
import { getBusinessSettings } from "@/lib/business-settings";
import { getLocalizedDocumentTexts } from "@/lib/document-texts";
import { describeUserAgent } from "@/lib/document-views";
import {
  localizeQuote,
  logQuoteEvent,
  toCustomerSafeQuote,
  type QuoteWithRelations,
} from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type SigningChannel = "public_link" | "account";

export type QuoteSignatureRow = {
  id: string;
  quote_id: string;
  status: "pending" | "signed" | "countersigned" | "void";
  language: CustomerLanguage;
  channel: SigningChannel;
  signer_email: string;
  signer_user_id: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_sent_count: number;
  otp_last_sent_at: string | null;
  verified_at: string | null;
  session_token_hash: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signature_method: SignatureMethod | null;
  signature_image: string | null;
  initials: string | null;
  initials_image: string | null;
  acknowledgements: SigningAcknowledgement[];
  consent_text: string | null;
  language_choice_text: string | null;
  french_version_provided_via: "email_attachment" | "pdf_opened" | "owner_sent" | null;
  french_version_provided_at: string | null;
  document_snapshot: CustomerSafeQuote | null;
  document_hash: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signer_city: string | null;
  signer_region: string | null;
  signer_country: string | null;
  countersigner_user_id: string | null;
  countersigner_name: string | null;
  countersigner_title: string | null;
  countersign_method: SignatureMethod | null;
  countersign_image: string | null;
  countersigner_ip: string | null;
  countersigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export class SigningError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

const SIGNABLE_STATUSES = new Set(["sent", "viewed", "revision_requested"]);

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashCode(signatureId: string, code: string): string {
  return sha256(`${signatureId}:${code}`);
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Key-sorted JSON so the fingerprint only depends on content, not property order. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function headerText(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim() || null;
  }
}

async function requestFingerprint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || requestHeaders.get("x-real-ip") || null,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
    city: headerText(requestHeaders.get("x-vercel-ip-city")),
    region: headerText(requestHeaders.get("x-vercel-ip-country-region")),
    country: headerText(requestHeaders.get("x-vercel-ip-country")),
  };
}

function isPngDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= SIGNATURE_IMAGE_MAX_CHARS &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

export function assertQuoteSignable(quote: QuoteWithRelations) {
  if (!SIGNABLE_STATUSES.has(quote.status)) {
    throw new SigningError("This quote is not available for signing.", 409);
  }
  if (isQuoteValidityLapsed(quote.valid_until)) {
    throw new SigningError(QUOTE_EXPIRED_MESSAGE, 409);
  }
}

export type FrenchVersionEvidence = {
  via: "email_attachment" | "pdf_opened";
  at: string;
};

/**
 * First proof that the French version reached the customer: a sent email that
 * carried the French PDF, or the customer opening the French PDF.
 */
export async function findFrenchVersionEvidence(
  quoteId: string
): Promise<FrenchVersionEvidence | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quote_events")
    .select("event_type, actor_type, metadata, created_at")
    .eq("quote_id", quoteId)
    .in("event_type", ["quote_sent", "pdf_downloaded"])
    .order("created_at", { ascending: true });
  if (error) console.error("[signing] french evidence", error);
  for (const event of data ?? []) {
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;
    if (
      event.event_type === "quote_sent" &&
      metadata.email_sent === true &&
      Array.isArray(metadata.pdf_languages) &&
      metadata.pdf_languages.includes("fr")
    ) {
      return { via: "email_attachment", at: event.created_at as string };
    }
    if (
      event.event_type === "pdf_downloaded" &&
      metadata.language === "fr" &&
      (event.actor_type === "customer" || event.actor_type === "public_link")
    ) {
      return { via: "pdf_opened", at: event.created_at as string };
    }
  }
  return null;
}

/** The exact customer-facing document being signed, frozen in the signing language. */
export async function buildSigningSnapshot(
  quote: QuoteWithRelations,
  language: CustomerLanguage
): Promise<CustomerSafeQuote> {
  const safe = toCustomerSafeQuote(await localizeQuote(quote, language));
  const [texts, provider] = await Promise.all([
    getLocalizedDocumentTexts(language),
    currentContractProvider(),
  ]);
  return {
    ...safe,
    terms: safe.terms?.trim() || texts["quote.terms"],
    status: "accepted",
    requests: [],
    share_url: null,
    contract_provider: provider,
  };
}

/** The provider party as it currently stands in Billing settings. */
export async function currentContractProvider(): Promise<QuoteContractProvider> {
  const s = await getBusinessSettings();
  const cityLine = [[s.city, s.province].filter(Boolean).join(", "), s.postal_code]
    .filter(Boolean)
    .join("  ");
  return {
    legal_name: s.legal_name.trim(),
    trade_name: s.trade_name.trim(),
    address: [s.address_line1, s.address_line2, cityLine, s.country]
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
    phone: s.phone.trim(),
    email: s.email.trim(),
    website: s.website.trim(),
    neq: s.neq.trim(),
    gst_number: s.gst_number.trim(),
    qst_number: s.qst_number.trim(),
  };
}

async function loadSession(quoteId: string, signatureId: string): Promise<QuoteSignatureRow> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quote_signatures")
    .select("*")
    .eq("id", signatureId)
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (error) console.error("[signing] load session", error);
  if (!data) throw new SigningError("Signing session not found. Please start again.", 404);
  const row = data as QuoteSignatureRow;
  if (row.status !== "pending") throw new SigningError("This signing session is closed.", 409);
  return row;
}

/** Creates (or reuses) a pending session and returns a fresh 6-digit code to email. */
export async function issueSigningCode(input: {
  quote: QuoteWithRelations;
  channel: SigningChannel;
  language: CustomerLanguage;
  userId?: string | null;
  signatureId?: string | null;
}): Promise<{ signatureId: string; code: string; email: string }> {
  assertQuoteSignable(input.quote);
  const email = input.quote.customer_email.trim().toLowerCase();
  if (!email.includes("@")) throw new SigningError("This quote has no email address on file.");
  const admin = createAdminSupabaseClient();

  let row: QuoteSignatureRow | null = null;
  if (input.signatureId) {
    row = await loadSession(input.quote.id, input.signatureId).catch(() => null);
  }
  if (row) {
    const lastSent = row.otp_last_sent_at ? Date.parse(row.otp_last_sent_at) : 0;
    if (Date.now() - lastSent < SIGNING_RESEND_COOLDOWN_SECONDS * 1000) {
      throw new SigningError("Please wait a moment before requesting another code.", 429);
    }
    if (row.otp_sent_count >= SIGNING_MAX_CODE_SENDS) {
      throw new SigningError("Too many codes requested. Please start again later.", 429);
    }
  } else {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("quote_signatures")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", input.quote.id)
      .gte("created_at", since);
    if ((count ?? 0) >= SIGNING_MAX_CODE_SENDS) {
      throw new SigningError("Too many codes requested. Please start again later.", 429);
    }
    const { data, error } = await admin
      .from("quote_signatures")
      .insert({
        quote_id: input.quote.id,
        language: input.language,
        channel: input.channel,
        signer_email: email,
        signer_user_id: input.userId ?? null,
      })
      .select("*")
      .single();
    if (error || !data) {
      console.error("[signing] create session", error);
      throw new SigningError("Could not start signing. Please try again.", 500);
    }
    row = data as QuoteSignatureRow;
  }

  const code = String(randomInt(0, 10 ** SIGNING_CODE_LENGTH)).padStart(SIGNING_CODE_LENGTH, "0");
  const now = new Date();
  const { error } = await admin
    .from("quote_signatures")
    .update({
      otp_hash: hashCode(row.id, code),
      otp_expires_at: new Date(now.getTime() + SIGNING_CODE_TTL_MINUTES * 60_000).toISOString(),
      otp_attempts: 0,
      otp_sent_count: row.otp_sent_count + 1,
      otp_last_sent_at: now.toISOString(),
      language: input.language,
      updated_at: now.toISOString(),
    })
    .eq("id", row.id);
  if (error) {
    console.error("[signing] store code", error);
    throw new SigningError("Could not send a code. Please try again.", 500);
  }
  return { signatureId: row.id, code, email };
}

/** Checks the emailed code; on success returns a one-time signing token for this session. */
export async function verifySigningCode(input: {
  quote: QuoteWithRelations;
  signatureId: string;
  code: string;
}): Promise<{ signingToken: string }> {
  assertQuoteSignable(input.quote);
  const row = await loadSession(input.quote.id, input.signatureId);
  const admin = createAdminSupabaseClient();
  const code = input.code.replace(/\D/g, "");
  if (!row.otp_hash || !row.otp_expires_at || Date.parse(row.otp_expires_at) < Date.now()) {
    throw new SigningError("This code has expired. Request a new one.");
  }
  if (row.otp_attempts >= SIGNING_MAX_CODE_ATTEMPTS) {
    throw new SigningError("Too many incorrect attempts. Request a new code.", 429);
  }
  if (code.length !== SIGNING_CODE_LENGTH || !safeEqualHex(hashCode(row.id, code), row.otp_hash)) {
    await admin
      .from("quote_signatures")
      .update({ otp_attempts: row.otp_attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    throw new SigningError("That code is incorrect. Please check your email and try again.");
  }

  const signingToken = randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const { error } = await admin
    .from("quote_signatures")
    .update({
      verified_at: now,
      session_token_hash: sha256(signingToken),
      otp_hash: null,
      updated_at: now,
    })
    .eq("id", row.id);
  if (error) {
    console.error("[signing] verify", error);
    throw new SigningError("Could not verify the code. Please try again.", 500);
  }
  return { signingToken };
}

export type SignQuoteInput = {
  quote: QuoteWithRelations;
  signatureId: string;
  signingToken: string;
  language: unknown;
  signerName: unknown;
  signerTitle: unknown;
  method: unknown;
  signatureImage: unknown;
  initials: unknown;
  initialsImage: unknown;
  initialedAt: unknown;
  agreeAll: unknown;
  consent: unknown;
  userId?: string | null;
};

/** Validates the verified session, freezes the document, records the signature, and accepts the quote. */
export async function signQuote(input: SignQuoteInput): Promise<QuoteSignatureRow> {
  const { quote } = input;
  assertQuoteSignable(quote);
  const row = await loadSession(quote.id, input.signatureId);
  if (
    !row.verified_at ||
    !row.session_token_hash ||
    typeof input.signingToken !== "string" ||
    !safeEqualHex(sha256(input.signingToken), row.session_token_hash)
  ) {
    throw new SigningError("Please verify your email before signing.", 403);
  }
  if (Date.now() - Date.parse(row.verified_at) > SIGNING_SESSION_TTL_MINUTES * 60_000) {
    throw new SigningError("Your signing session expired. Please verify your email again.", 403);
  }

  const signerName = typeof input.signerName === "string" ? input.signerName.trim().slice(0, 120) : "";
  if (signerName.length < 2) throw new SigningError("Please enter your full legal name.");
  const signerTitle =
    typeof input.signerTitle === "string" ? input.signerTitle.trim().slice(0, 120) || null : null;
  const method: SignatureMethod = input.method === "drawn" ? "drawn" : "typed";
  if (!isPngDataUrl(input.signatureImage)) throw new SigningError("Please type or draw your signature.");
  const initials = typeof input.initials === "string" ? input.initials.trim().slice(0, 6) : "";
  if (!initials) throw new SigningError("Initial each key clause to continue.");
  const initialsImage = isPngDataUrl(input.initialsImage) ? input.initialsImage : null;
  if (input.agreeAll !== true) throw new SigningError("Please confirm you agree to all terms.");
  if (input.consent !== true) throw new SigningError("Please accept the electronic signature consent.");

  const initialedAt = (input.initialedAt ?? {}) as Record<string, unknown>;
  if (SIGNING_CLAUSE_KEYS.some((key) => typeof initialedAt[key] !== "string")) {
    throw new SigningError("Initial each key clause to continue.");
  }

  if (!isCustomerLanguage(input.language)) {
    throw new SigningError("Please choose the language of your agreement.");
  }
  const language: CustomerLanguage = input.language;
  const bilingual = quote.bilingual !== false;
  if (!bilingual && language !== normalizeCustomerLanguage(quote.language)) {
    throw new SigningError("This quote can only be signed in the language it was issued in.");
  }
  // Charter of the French Language s.55: English binds only once the French version was provided.
  const frenchEvidence =
    bilingual && language === "en" ? await findFrenchVersionEvidence(quote.id) : null;
  if (bilingual && language === "en" && !frenchEvidence) {
    throw new SigningError(SIGNING_LANGUAGE_CHOICE.errors.frenchFirst);
  }
  const languageChoiceText = signingLanguageChoiceText(language, bilingual);
  const snapshot = await buildSigningSnapshot(quote, language);
  const signedAt = new Date().toISOString();
  const acknowledgements: SigningAcknowledgement[] = buildSigningClauses(snapshot, language).map(
    (clause) => {
      const stamp = Date.parse(String(initialedAt[clause.key]));
      return {
        key: clause.key,
        title: clause.title,
        statement: clause.statement,
        initialed_at:
          Number.isFinite(stamp) && stamp <= Date.now() && stamp >= Date.parse(row.verified_at!)
            ? new Date(stamp).toISOString()
            : signedAt,
      };
    }
  );
  const consentText = signingConsentText(language, signerName, snapshot.quote_display_ref, bilingual);
  const documentHash = sha256(
    stableStringify({
      document: snapshot,
      clauses: acknowledgements.map(({ key, title, statement }) => ({ key, title, statement })),
      consent: consentText,
      language_choice: languageChoiceText,
      signer: { name: signerName, email: row.signer_email },
    })
  );
  const client = await requestFingerprint();

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quote_signatures")
    .update({
      status: "signed",
      language,
      signer_name: signerName,
      signer_title: signerTitle,
      signer_user_id: input.userId ?? row.signer_user_id,
      signature_method: method,
      signature_image: input.signatureImage,
      initials,
      initials_image: initialsImage,
      acknowledgements,
      consent_text: consentText,
      language_choice_text: languageChoiceText,
      french_version_provided_via: frenchEvidence?.via ?? null,
      french_version_provided_at: frenchEvidence?.at ?? null,
      document_snapshot: snapshot,
      document_hash: documentHash,
      signed_at: signedAt,
      signer_ip: client.ip,
      signer_user_agent: client.userAgent,
      signer_city: client.city,
      signer_region: client.region,
      signer_country: client.country,
      session_token_hash: null,
      updated_at: signedAt,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error || !data) {
    console.error("[signing] sign", error);
    throw new SigningError(
      error?.code === "23505" ? "This quote has already been signed." : "Could not record your signature. Please try again.",
      error?.code === "23505" ? 409 : 500
    );
  }

  const { error: quoteError } = await admin
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: signedAt,
      accepted_by_name: signerName,
      agreed_language: language,
    })
    .eq("id", quote.id);
  if (quoteError) console.error("[signing] accept quote", quoteError);
  if (quote.customer_id) {
    const { error: customerError } = await admin
      .from("customers")
      .update({ preferred_language: language })
      .eq("id", quote.customer_id);
    if (customerError) console.error("[signing] customer language", customerError);
  }

  await logQuoteEvent({
    quoteId: quote.id,
    actorType: row.channel === "account" ? "customer" : "public_link",
    actorUserId: input.userId ?? null,
    actorEmail: row.signer_email,
    eventType: "customer_accepted",
    summary: `Customer e-signed the agreement (${signerName})`,
    metadata: {
      accepted_by_name: signerName,
      signer_title: signerTitle,
      signature_id: row.id,
      signature_method: method,
      document_hash: documentHash,
      terms_acknowledged: true,
      terms_language: language,
      language_choice_text: languageChoiceText,
      french_version_provided_via: frenchEvidence?.via ?? null,
      french_version_provided_at: frenchEvidence?.at ?? null,
      terms_snapshot: snapshot.terms,
      quote_display_ref: quote.quote_display_ref,
      quote_revision: quote.revision_number,
      initialed_clauses: acknowledgements.map((item) => item.key),
    },
  });

  return data as QuoteSignatureRow;
}

export async function fetchExecutedSignature(quoteId: string): Promise<QuoteSignatureRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quote_signatures")
    .select("*")
    .eq("quote_id", quoteId)
    .in("status", ["signed", "countersigned"])
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[signing] fetch executed", error);
  return (data as QuoteSignatureRow | null) ?? null;
}

export function toAgreementSummary(row: QuoteSignatureRow): QuoteAgreementSummary {
  return {
    id: row.id,
    status: row.status === "countersigned" ? "countersigned" : "signed",
    language: row.language,
    signerName: row.signer_name ?? "",
    signerTitle: row.signer_title,
    signerEmail: row.signer_email,
    signedAt: row.signed_at ?? row.updated_at,
    signatureImage: row.signature_image ?? "",
    initials: row.initials,
    documentHash: row.document_hash ?? "",
    countersignerName: row.countersigner_name,
    countersignerTitle: row.countersigner_title,
    countersignedAt: row.countersigned_at,
    countersignImage: row.countersign_image,
  };
}

export function toAgreementAudit(row: QuoteSignatureRow): QuoteAgreementAudit {
  return {
    ...toAgreementSummary(row),
    verifiedAt: row.verified_at,
    signerIp: row.signer_ip,
    signerUserAgent: row.signer_user_agent,
    signerLocation: [row.signer_city, row.signer_region, row.signer_country].filter(Boolean).join(", ") || null,
    channel: row.channel,
    acknowledgements: row.acknowledgements ?? [],
    consentText: row.consent_text,
    signatureMethod: row.signature_method,
    languageChoiceText: row.language_choice_text ?? null,
    frenchVersionProvidedVia: row.french_version_provided_via ?? null,
    frenchVersionProvidedAt: row.french_version_provided_at ?? null,
  };
}

export function describeSignerDevice(userAgent: string | null): string | null {
  const { browser, os, device } = describeUserAgent(userAgent);
  return [browser, os, device].filter(Boolean).join(" · ") || null;
}

export async function countersignQuote(input: {
  quoteId: string;
  ownerUserId: string;
  name: unknown;
  title: unknown;
  method: unknown;
  signatureImage: unknown;
}): Promise<QuoteSignatureRow> {
  const row = await fetchExecutedSignature(input.quoteId);
  if (!row) throw new SigningError("The customer hasn’t signed this quote yet.", 404);
  if (row.status === "countersigned") throw new SigningError("This agreement is already countersigned.", 409);
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (name.length < 2) throw new SigningError("Enter the countersigner’s full name.");
  if (!isPngDataUrl(input.signatureImage)) throw new SigningError("Type or draw your signature.");
  const client = await requestFingerprint();
  const now = new Date().toISOString();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quote_signatures")
    .update({
      status: "countersigned",
      countersigner_user_id: input.ownerUserId,
      countersigner_name: name,
      countersigner_title:
        typeof input.title === "string" ? input.title.trim().slice(0, 120) || null : null,
      countersign_method: input.method === "drawn" ? "drawn" : "typed",
      countersign_image: input.signatureImage,
      countersigner_ip: client.ip,
      countersigned_at: now,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", "signed")
    .select("*")
    .single();
  if (error || !data) {
    console.error("[signing] countersign", error);
    throw new SigningError("Could not countersign. Please try again.", 500);
  }
  return data as QuoteSignatureRow;
}
