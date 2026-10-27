import type { CustomerLanguage } from "@/data/customer-language";
import { DEFAULT_QUOTE_TERMS, DEFAULT_QUOTE_TERMS_FR } from "@/data/quotes";

export const DOCUMENT_TYPES = [
  "quote_pdf",
  "quote_email",
  "estimate_email",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const BASE_DOCUMENT_TEXT_SLUGS = [
  "quote.terms",
  "quote.pdf_footer",
  "quote.email_note",
  "quote.email_footer",
  "estimate.email_disclaimer",
] as const;

export type BaseDocumentTextSlug = (typeof BASE_DOCUMENT_TEXT_SLUGS)[number];

export const DOCUMENT_TEXT_SLUGS = [
  ...BASE_DOCUMENT_TEXT_SLUGS,
  "quote.terms.fr",
  "quote.pdf_footer.fr",
  "quote.email_note.fr",
  "quote.email_footer.fr",
  "estimate.email_disclaimer.fr",
] as const;

export type DocumentTextSlug = (typeof DOCUMENT_TEXT_SLUGS)[number];

/** French texts live under "<slug>.fr"; English uses the base slug. */
export function localizedDocumentTextSlug(
  slug: BaseDocumentTextSlug,
  language: CustomerLanguage
): DocumentTextSlug {
  return language === "fr" ? (`${slug}.fr` as DocumentTextSlug) : slug;
}

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
    rows: 18,
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
      "Planning proposal · Booking is secured only after written confirmation and receipt of any required deposit.",
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
      "Please review the scope, event schedule, payment milestones, and Terms & Conditions before accepting. Inventory, crew, and the event date remain subject to written confirmation and receipt of any required deposit. No payment is collected on the proposal page.",
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
  {
    slug: "quote.terms.fr",
    documentType: "quote_pdf",
    documentLabel: DOCUMENT_TYPE_META.quote_pdf.label,
    documentDescription: DOCUMENT_TYPE_META.quote_pdf.description,
    label: "Default terms & conditions — Français",
    description:
      "Copied onto new French quotes and used when a quote is switched to French.",
    rows: 18,
    defaultBody: DEFAULT_QUOTE_TERMS_FR,
    appliesTo: ["New French quotes", "French PDF", "French web proposal"],
    previewKind: "pdf_terms",
  },
  {
    slug: "quote.pdf_footer.fr",
    documentType: "quote_pdf",
    documentLabel: DOCUMENT_TYPE_META.quote_pdf.label,
    documentDescription: DOCUMENT_TYPE_META.quote_pdf.description,
    label: "PDF footer disclaimer — Français",
    description: "Footer line on French proposal PDFs.",
    rows: 3,
    defaultBody:
      "Proposition de planification · La réservation est garantie uniquement après confirmation écrite et réception de tout dépôt exigé.",
    appliesTo: ["French PDF"],
    previewKind: "pdf_footer",
  },
  {
    slug: "quote.email_note.fr",
    documentType: "quote_email",
    documentLabel: DOCUMENT_TYPE_META.quote_email.label,
    documentDescription: DOCUMENT_TYPE_META.quote_email.description,
    label: "Customer email note — Français",
    description: "Closing note on French quote-ready emails.",
    rows: 4,
    defaultBody:
      "Veuillez vérifier la portée des travaux, l’horaire de l’événement, les étapes de paiement et les conditions générales avant d’accepter. L’inventaire, l’équipe et la date de l’événement demeurent assujettis à une confirmation écrite et à la réception de tout dépôt exigé. Aucun paiement n’est perçu sur la page de la soumission.",
    appliesTo: ["French quote-ready email"],
    previewKind: "email_note",
  },
  {
    slug: "quote.email_footer.fr",
    documentType: "quote_email",
    documentLabel: DOCUMENT_TYPE_META.quote_email.label,
    documentDescription: DOCUMENT_TYPE_META.quote_email.description,
    label: "Email footer — Français",
    description: "Small print under French quote emails.",
    rows: 2,
    defaultBody: "Location de draperie événementielle à Montréal · thecurtainguy.com",
    appliesTo: ["French quote-ready email"],
    previewKind: "email_footer",
  },
  {
    slug: "estimate.email_disclaimer.fr",
    documentType: "estimate_email",
    documentLabel: DOCUMENT_TYPE_META.estimate_email.label,
    documentDescription: DOCUMENT_TYPE_META.estimate_email.description,
    label: "Planning-brief disclaimer — Français",
    description:
      "Shown on confirmation emails to customers who submitted from the French site.",
    rows: 4,
    defaultBody:
      "Ceci est un document de planification et non un prix final. L’équipe The Curtain Guy révisera les mesures, la disponibilité, la main-d’œuvre, la livraison, l’installation et le démontage avant de confirmer une estimation de location finale.",
    appliesTo: ["French estimate emails", "French event plan emails"],
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
