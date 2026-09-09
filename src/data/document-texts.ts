import { DEFAULT_QUOTE_TERMS } from "@/data/quotes";

export const DOCUMENT_TYPES = [
  "quote_pdf",
  "quote_email",
  "estimate_email",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TEXT_SLUGS = [
  "quote.terms",
  "quote.pdf_footer",
  "quote.email_note",
  "quote.email_footer",
  "estimate.email_disclaimer",
] as const;

export type DocumentTextSlug = (typeof DOCUMENT_TEXT_SLUGS)[number];

export type DocumentPreviewKind =
  | "pdf_terms"
  | "pdf_footer"
  | "email_note"
  | "email_footer"
  | "email_banner";

export type DocumentTextDefinition = {
  slug: DocumentTextSlug;
  documentType: DocumentType;
  documentLabel: string;
  documentDescription: string;
  label: string;
  description: string;
  rows: number;
  defaultBody: string;
  appliesTo: string[];
  previewKind: DocumentPreviewKind;
};

export const DOCUMENT_TYPE_META: Record<
  DocumentType,
  { label: string; description: string; appliesTo: string[] }
> = {
  quote_pdf: {
    label: "Quote / proposal",
    description: "PDF and customer proposal page.",
    appliesTo: ["Proposal PDF", "Web proposal"],
  },
  quote_email: {
    label: "Quote email",
    description: "Email sent when you share a quote with the customer.",
    appliesTo: ["Quote-ready email"],
  },
  estimate_email: {
    label: "Estimate emails",
    description: "Planning-brief emails for estimates and event plans.",
    appliesTo: ["Estimate emails", "Event plan emails"],
  },
};

export const DOCUMENT_TEXT_DEFS: DocumentTextDefinition[] = [
  {
    slug: "quote.terms",
    documentType: "quote_pdf",
    documentLabel: DOCUMENT_TYPE_META.quote_pdf.label,
    documentDescription: DOCUMENT_TYPE_META.quote_pdf.description,
    label: "Default terms & conditions",
    description:
      "Copied onto new quotes. You can still edit terms on each quote before sending.",
    rows: 10,
    defaultBody: DEFAULT_QUOTE_TERMS,
    appliesTo: ["New quotes", "PDF fallback", "Web proposal fallback"],
    previewKind: "pdf_terms",
  },
  {
    slug: "quote.pdf_footer",
    documentType: "quote_pdf",
    documentLabel: DOCUMENT_TYPE_META.quote_pdf.label,
    documentDescription: DOCUMENT_TYPE_META.quote_pdf.description,
    label: "PDF footer disclaimer",
    description:
      "Second line in the proposal PDF footer, under company contact details.",
    rows: 3,
    defaultBody:
      "Planning proposal only. Booking confirmed separately in writing.",
    appliesTo: ["Proposal PDF"],
    previewKind: "pdf_footer",
  },
  {
    slug: "quote.email_note",
    documentType: "quote_email",
    documentLabel: DOCUMENT_TYPE_META.quote_email.label,
    documentDescription: DOCUMENT_TYPE_META.quote_email.description,
    label: "Customer email note",
    description:
      "Closing note on the quote-ready email (availability and payment).",
    rows: 4,
    defaultBody:
      "Availability is not guaranteed until confirmed. Setup, installation, and teardown are planned around your event timeline. No payment is requested in this email.",
    appliesTo: ["Quote-ready email"],
    previewKind: "email_note",
  },
  {
    slug: "quote.email_footer",
    documentType: "quote_email",
    documentLabel: DOCUMENT_TYPE_META.quote_email.label,
    documentDescription: DOCUMENT_TYPE_META.quote_email.description,
    label: "Email footer",
    description: "Small print under the branded quote email.",
    rows: 2,
    defaultBody: "Montreal event drape rental · thecurtainguy.com",
    appliesTo: ["Quote-ready email"],
    previewKind: "email_footer",
  },
  {
    slug: "estimate.email_disclaimer",
    documentType: "estimate_email",
    documentLabel: DOCUMENT_TYPE_META.estimate_email.label,
    documentDescription: DOCUMENT_TYPE_META.estimate_email.description,
    label: "Planning-brief disclaimer",
    description:
      "Shown on estimate and event-plan confirmation emails to customers and the owner inbox.",
    rows: 4,
    defaultBody:
      "This is a planning brief, not final pricing. The Curtain Guy team will review measurements, availability, labor, delivery, installation, and teardown before confirming a final rental estimate.",
    appliesTo: ["Estimate emails", "Event plan emails"],
    previewKind: "email_banner",
  },
];

const DOCUMENT_TEXT_BY_SLUG = Object.fromEntries(
  DOCUMENT_TEXT_DEFS.map((def) => [def.slug, def])
) as Record<DocumentTextSlug, DocumentTextDefinition>;

export function isDocumentTextSlug(value: string): value is DocumentTextSlug {
  return DOCUMENT_TEXT_DEFS.some((def) => def.slug === value);
}

export function getDocumentTextDefinition(
  slug: DocumentTextSlug
): DocumentTextDefinition {
  return DOCUMENT_TEXT_BY_SLUG[slug];
}

export function getDocumentTextDefault(slug: DocumentTextSlug): string {
  return DOCUMENT_TEXT_BY_SLUG[slug].defaultBody;
}

export const MAX_DOCUMENT_TEXT_LENGTH = 20_000;
