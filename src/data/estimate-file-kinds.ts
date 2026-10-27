import type { CustomerLanguage } from "@/data/customer-language";

export const ESTIMATE_FILE_KINDS = [
  "concept",
  "floor_plan",
  "reference_photo",
  "document",
] as const;

export type EstimateFileKind = (typeof ESTIMATE_FILE_KINDS)[number];

export const ESTIMATE_FILE_CAPTION_MAX = 200;

export function isEstimateFileKind(value: unknown): value is EstimateFileKind {
  return (
    typeof value === "string" &&
    (ESTIMATE_FILE_KINDS as readonly string[]).includes(value)
  );
}

export function normalizeEstimateFileKind(value: unknown): EstimateFileKind {
  return isEstimateFileKind(value) ? value : "document";
}

const KIND_LABELS: Record<CustomerLanguage, Record<EstimateFileKind, string>> = {
  en: {
    concept: "Concept",
    floor_plan: "Floor plan",
    reference_photo: "Reference photo",
    document: "Document",
  },
  fr: {
    concept: "Concept",
    floor_plan: "Plan de salle",
    reference_photo: "Photo de référence",
    document: "Document",
  },
};

export function estimateFileKindLabel(
  kind: EstimateFileKind,
  language: CustomerLanguage = "en"
): string {
  return KIND_LABELS[language][kind];
}

export const ESTIMATE_FILE_KIND_HINTS: Record<EstimateFileKind, string> = {
  concept: "AI or mock-up visual. Always shown with a disclaimer.",
  floor_plan: "Room layout or venue plan.",
  reference_photo: "Inspiration or venue photo.",
  document: "Anything else: specs, contracts, notes.",
};

const ATTACHMENT_COPY: Record<
  CustomerLanguage,
  {
    title: string;
    subtitle: string;
    documentsTitle: string;
    documentsSubtitle: string;
    conceptDisclaimer: string;
    conceptStamp: string;
    open: string;
  }
> = {
  en: {
    title: "Concept & references",
    subtitle: "Visuals shared with this document.",
    documentsTitle: "Attached documents",
    documentsSubtitle: "The following pages are attached to this document.",
    conceptDisclaimer:
      "Concept illustration, created with AI assistance to show the general look and feel. The final installation will vary with the venue, fabrics, lighting, and available inventory; it is not a guarantee of the exact result.",
    conceptStamp:
      "Concept illustration (AI-assisted). Not a guarantee of the final result.",
    open: "Open",
  },
  fr: {
    title: "Concept et références",
    subtitle: "Visuels joints à ce document.",
    documentsTitle: "Documents joints",
    documentsSubtitle: "Les pages suivantes sont jointes à ce document.",
    conceptDisclaimer:
      "Illustration conceptuelle, créée avec l’aide de l’IA pour montrer l’allure générale. L’installation finale variera selon la salle, les tissus, l’éclairage et l’inventaire disponible; elle ne garantit pas le résultat exact.",
    conceptStamp:
      "Illustration conceptuelle (assistée par IA). Ne garantit pas le résultat final.",
    open: "Ouvrir",
  },
};

export function getAttachmentCopy(language: CustomerLanguage = "en") {
  return ATTACHMENT_COPY[language];
}

/** Customer-safe attachment for web views; url is a short-lived signed URL. */
export type AttachmentViewItem = {
  id: string;
  kind: EstimateFileKind;
  caption: string | null;
  fileName: string;
  contentType: string;
  url: string;
};
