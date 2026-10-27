import {
  customerLocaleTag,
  type CustomerLanguage,
} from "@/data/customer-language";
import { getEnglishOptionLabel } from "@/data/estimate";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import frEstimate from "../../messages/fr/estimate.json";

export type QuoteCopy = {
  proposal: string;
  revision: (n: number) => string;
  tagline: (company: string) => string;
  tbd: string;

  acceptedTitle: string;
  acceptedThanks: string;
  acceptedBy: string;
  acceptedNext: string;
  declinedTitle: string;
  declinedRecorded: string;
  declinedBy: string;
  declinedNext: string;

  confirmAccepted: string;
  confirmDeclined: string;
  confirmChanges: string;
  confirmAddOn: string;
  confirmCustom: string;
  confirmQuestion: string;
  confirmGeneric: string;
  errorGeneric: string;
  errorNetwork: string;

  eventSummaryTitle: string;
  eventSummaryDescription: string;
  statEvent: string;
  statDate: string;
  statVenue: string;
  statCity: string;
  statValidUntil: string;
  billedTo: string;

  includedTitle: string;
  includedDescription: string;
  noLineItems: string;
  colItem: string;
  colQty: string;
  colPrice: string;
  colAmount: string;
  taxable: string;
  nonTaxable: string;
  qtyShort: string;
  included: string;

  requestsTitle: string;
  requestsDescription: string;
  notesForYou: string;
  noNotes: string;
  termsTitle: string;
  termsDescription: string;
  noTerms: string;

  optionsTitle: string;
  optionsDescription: string;
  browseMore: string;
  addOns: string;
  relatedServices: string;
  pendingAfterRequest: string;
  addForReview: string;
  sending: string;

  totalTitle: (currency: string | null | undefined) => string;
  totalHint: string;

  respondTitle: string;
  respondDescription: string;
  accept: string;
  requestChanges: string;
  askQuestion: string;
  decline: string;
  acceptConfirmHint: string;
  fullName: string;
  fullNamePlaceholder: string;
  acceptRecordHint: string;
  acceptTermsAcknowledgement: string;
  confirmAcceptance: string;
  changesLabel: string;
  changesPlaceholder: string;
  sendChangeRequest: string;
  declineRecordHint: string;
  optionalNote: string;
  declinePlaceholder: string;
  confirmDecline: string;
  questionLabel: string;
  questionPlaceholder: string;
  sendQuestion: string;

  customTitle: string;
  customDescription: string;
  customLabel: string;
  customPlaceholder: string;

  shareTitle: string;
  shareDescription: string;
  viewPdf: string;
  copied: string;
  copyLink: string;
  email: string;
  share: string;
  shareMailBody: (company: string, url: string) => string;
  shareWhatsApp: (ref: string, company: string, url: string) => string;
  shareNativeText: (company: string) => string;

  pdf: {
    opportunity: string;
    validUntil: string;
    respondTitle: string;
    openProposal: string;
    visitWebsite: string;
    call: string;
    interactiveProposal: string;
    noLinkHint: string;
    event: string;
    type: string;
    date: string;
    venue: string;
    cityArea: string;
    client: string;
    name: string;
    company: string;
    contact: string;
    billingAddress: string;
    status: string;
    currency: string;
    scopePricing: string;
    description: string;
    category: string;
    total: string;
    noPricedItems: string;
    includedSuffix: string;
    generated: string;
    subject: (ref: string) => string;
    mailBodyWithUrl: (url: string) => string;
    mailBodyNoUrl: (ref: string) => string;
    tagline: string;
    motto: string;
    location: string;
  };

  mail: {
    subject: (ref: string) => string;
    ready: (name: string | null) => string;
    instructions: string;
    headline: string;
    quoteLabel: string;
    opportunity: string;
    event: string;
    reviewLink: string;
    reviewButton: string;
    pdfAttachedText: (filename: string) => string;
    pdfAttachedHtml: (filename: string) => string;
    includedHeading: string;
    moreItems: (count: number) => string;
  };
};

const en: QuoteCopy = {
  proposal: "Proposal",
  revision: (n) => `Revision ${n}`,
  tagline: (company) =>
    `A tailored draping plan from ${company} for your event — reviewed and refined with our team.`,
  tbd: "TBD",

  acceptedTitle: "Proposal accepted",
  acceptedThanks: "Thank you",
  acceptedBy: "accepted by",
  acceptedNext:
    ". Our team will confirm next steps for delivery, installation, and teardown.",
  declinedTitle: "Proposal declined",
  declinedRecorded: "We’ve recorded your response",
  declinedBy: "declined by",
  declinedNext: ". Reach out anytime if you’d like to revisit the plan.",

  confirmAccepted: "Thank you — we’ve noted your acceptance.",
  confirmDeclined: "We’ve recorded your response.",
  confirmChanges: "Change request sent — pending owner review.",
  confirmAddOn: "Added to quote for review — pending owner review.",
  confirmCustom: "Custom request sent — pending owner review.",
  confirmQuestion: "Question sent — we’ll follow up shortly.",
  confirmGeneric: "Request received.",
  errorGeneric: "Something went wrong. Please try again.",
  errorNetwork: "Network error. Please try again.",

  eventSummaryTitle: "Event summary",
  eventSummaryDescription: "The details this proposal is built around.",
  statEvent: "Event",
  statDate: "Date",
  statVenue: "Venue",
  statCity: "City",
  statValidUntil: "Valid until",
  billedTo: "Billed to",

  includedTitle: "What’s included",
  includedDescription: "Priced and included items in this proposal.",
  noLineItems: "Line items will appear here once the proposal is finalized.",
  colItem: "Item",
  colQty: "Qty",
  colPrice: "Price",
  colAmount: "Amount",
  taxable: "Taxable",
  nonTaxable: "Non-taxable",
  qtyShort: "Qty",
  included: "Included",

  requestsTitle: "Your requests",
  requestsDescription: "Options and questions you’ve shared for review.",
  notesForYou: "Notes for you",
  noNotes: "No additional notes on this proposal.",
  termsTitle: "Terms & conditions",
  termsDescription: "Please review before accepting your proposal.",
  noTerms: "No terms on this proposal yet.",

  optionsTitle: "Review options",
  optionsDescription: "A few enhancements we can price into this proposal.",
  browseMore: "Browse more options",
  addOns: "Add-ons",
  relatedServices: "Related services",
  pendingAfterRequest: "Pending owner review after request",
  addForReview: "Add for review",
  sending: "Sending…",

  totalTitle: (currency) => `Proposal total · ${currency === "USD" ? "USD" : "CAD"}`,
  totalHint: "Based on priced and included line items.",

  respondTitle: "Respond",
  respondDescription: "Accept, request changes, decline, or ask a question.",
  accept: "Accept proposal",
  requestChanges: "Request changes",
  askQuestion: "Ask a question",
  decline: "Decline",
  acceptConfirmHint: "Confirm you’d like to move forward as outlined.",
  fullName: "Full name",
  fullNamePlaceholder: "Your full name",
  acceptRecordHint: "We’ll record who accepted this proposal.",
  acceptTermsAcknowledgement:
    "I confirm that I am authorized to accept this proposal and agree to its scope, payment schedule, and Terms & Conditions.",
  confirmAcceptance: "Confirm acceptance",
  changesLabel: "What would you like adjusted?",
  changesPlaceholder: "I’d like to adjust the backdrop height…",
  sendChangeRequest: "Send change request",
  declineRecordHint: "We’ll record who declined this proposal.",
  optionalNote: "Optional note",
  declinePlaceholder: "Timing no longer works…",
  confirmDecline: "Confirm decline",
  questionLabel: "Your question",
  questionPlaceholder: "Can teardown happen the morning after?",
  sendQuestion: "Send question",

  customTitle: "Something else?",
  customDescription: "Describe a custom detail for review.",
  customLabel: "Custom request",
  customPlaceholder: "Can you also add draping around the DJ area?",

  shareTitle: "Share & PDF",
  shareDescription: "Send this proposal or open the PDF.",
  viewPdf: "View PDF",
  copied: "Copied",
  copyLink: "Copy link",
  email: "Email",
  share: "Share",
  shareMailBody: (company, url) =>
    `Here is the draping proposal from ${company}:\n\n${url}`,
  shareWhatsApp: (ref, company, url) => `${ref} from ${company}: ${url}`,
  shareNativeText: (company) => `Draping proposal from ${company}`,

  pdf: {
    opportunity: "Opportunity",
    validUntil: "Valid until",
    respondTitle: "Respond & share online",
    openProposal: "Open proposal",
    visitWebsite: "Visit website",
    call: "Call",
    interactiveProposal: "Interactive proposal:",
    noLinkHint:
      "Accept, request changes, or ask questions from your guest proposal link when available",
    event: "Event",
    type: "Type",
    date: "Date",
    venue: "Venue",
    cityArea: "City / area",
    client: "Client",
    name: "Name",
    company: "Company",
    contact: "Contact",
    billingAddress: "Billing address",
    status: "Status",
    currency: "Currency",
    scopePricing: "Scope & pricing",
    description: "Description",
    category: "Category",
    total: "Total",
    noPricedItems: "No priced line items yet.",
    includedSuffix: " (Included)",
    generated: "Generated",
    subject: (ref) => `Proposal ${ref}`,
    mailBodyWithUrl: (url) => `Regarding your draping proposal:\n\n${url}`,
    mailBodyNoUrl: (ref) => `Regarding proposal ${ref}`,
    tagline: "Event Draping & Rentals",
    motto: "Transform Spaces · Create Moments",
    location: "Montreal and surrounding areas",
  },

  mail: {
    subject: (ref) => `Your Curtain Guy quote is ready — ${ref}`,
    ready: (name) =>
      `${name || "Hello"}, your Curtain Guy quote is ready to review.`,
    instructions:
      "Open your proposal to accept, request changes, or add options for owner review. No payment is collected on this page.",
    headline: "Your proposal is ready",
    quoteLabel: "Quote",
    opportunity: "Opportunity",
    event: "Event",
    reviewLink: "Review your proposal:",
    reviewButton: "Review your quote",
    pdfAttachedText: (filename) => `A PDF copy is attached (${filename}).`,
    pdfAttachedHtml: (filename) =>
      `A PDF copy of this proposal is attached (${filename}).`,
    includedHeading: "What’s included",
    moreItems: (count) =>
      `+ ${count} more ${count === 1 ? "item" : "items"} in your proposal`,
  },
};

const fr: QuoteCopy = {
  proposal: "Soumission",
  revision: (n) => `Révision ${n}`,
  tagline: (company) =>
    `Un plan de drapage sur mesure de ${company} pour votre événement — révisé et peaufiné avec notre équipe.`,
  tbd: "À confirmer",

  acceptedTitle: "Soumission acceptée",
  acceptedThanks: "Merci",
  acceptedBy: "acceptée par",
  acceptedNext:
    ". Notre équipe confirmera les prochaines étapes pour la livraison, l’installation et le démontage.",
  declinedTitle: "Soumission refusée",
  declinedRecorded: "Nous avons enregistré votre réponse",
  declinedBy: "refusée par",
  declinedNext:
    ". Écrivez-nous en tout temps si vous souhaitez revoir le projet.",

  confirmAccepted: "Merci — nous avons bien noté votre acceptation.",
  confirmDeclined: "Nous avons enregistré votre réponse.",
  confirmChanges: "Demande de modification envoyée — en révision.",
  confirmAddOn: "Ajouté à la soumission pour révision — en révision.",
  confirmCustom: "Demande personnalisée envoyée — en révision.",
  confirmQuestion: "Question envoyée — nous vous répondrons sous peu.",
  confirmGeneric: "Demande reçue.",
  errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
  errorNetwork: "Erreur réseau. Veuillez réessayer.",

  eventSummaryTitle: "Résumé de l’événement",
  eventSummaryDescription: "Les détails sur lesquels repose cette soumission.",
  statEvent: "Événement",
  statDate: "Date",
  statVenue: "Lieu",
  statCity: "Ville",
  statValidUntil: "Valide jusqu’au",
  billedTo: "Facturé à",

  includedTitle: "Ce qui est inclus",
  includedDescription: "Articles tarifés et inclus dans cette soumission.",
  noLineItems:
    "Les articles apparaîtront ici une fois la soumission finalisée.",
  colItem: "Article",
  colQty: "Qté",
  colPrice: "Prix",
  colAmount: "Montant",
  taxable: "Taxable",
  nonTaxable: "Non taxable",
  qtyShort: "Qté",
  included: "Inclus",

  requestsTitle: "Vos demandes",
  requestsDescription: "Options et questions que vous avez soumises pour révision.",
  notesForYou: "Notes pour vous",
  noNotes: "Aucune note supplémentaire pour cette soumission.",
  termsTitle: "Conditions générales",
  termsDescription: "À lire avant d’accepter votre soumission.",
  noTerms: "Aucune condition pour cette soumission pour le moment.",

  optionsTitle: "Options à considérer",
  optionsDescription:
    "Quelques ajouts que nous pouvons intégrer à cette soumission.",
  browseMore: "Voir plus d’options",
  addOns: "Ajouts",
  relatedServices: "Services connexes",
  pendingAfterRequest: "Révisé par notre équipe après la demande",
  addForReview: "Ajouter pour révision",
  sending: "Envoi…",

  totalTitle: (currency) => `Total de la soumission · ${currency === "USD" ? "$ US" : "$ CA"}`,
  totalHint: "Basé sur les articles tarifés et inclus.",

  respondTitle: "Répondre",
  respondDescription:
    "Acceptez, demandez des modifications, refusez ou posez une question.",
  accept: "Accepter la soumission",
  requestChanges: "Demander des modifications",
  askQuestion: "Poser une question",
  decline: "Refuser",
  acceptConfirmHint: "Confirmez que vous souhaitez aller de l’avant tel que décrit.",
  fullName: "Nom complet",
  fullNamePlaceholder: "Votre nom complet",
  acceptRecordHint: "Nous enregistrerons le nom de la personne qui accepte.",
  acceptTermsAcknowledgement:
    "Je confirme avoir l’autorisation d’accepter cette soumission et j’accepte sa portée, son calendrier de paiement et ses conditions générales.",
  confirmAcceptance: "Confirmer l’acceptation",
  changesLabel: "Que souhaitez-vous modifier?",
  changesPlaceholder: "J’aimerais ajuster la hauteur de la toile de fond…",
  sendChangeRequest: "Envoyer la demande",
  declineRecordHint: "Nous enregistrerons le nom de la personne qui refuse.",
  optionalNote: "Note (facultatif)",
  declinePlaceholder: "Le moment ne convient plus…",
  confirmDecline: "Confirmer le refus",
  questionLabel: "Votre question",
  questionPlaceholder: "Le démontage peut-il se faire le lendemain matin?",
  sendQuestion: "Envoyer la question",

  customTitle: "Autre chose?",
  customDescription: "Décrivez un détail personnalisé pour révision.",
  customLabel: "Demande personnalisée",
  customPlaceholder: "Pouvez-vous aussi draper autour de la zone DJ?",

  shareTitle: "Partager et PDF",
  shareDescription: "Envoyez cette soumission ou ouvrez le PDF.",
  viewPdf: "Voir le PDF",
  copied: "Copié",
  copyLink: "Copier le lien",
  email: "Courriel",
  share: "Partager",
  shareMailBody: (company, url) =>
    `Voici la soumission de drapage de ${company} :\n\n${url}`,
  shareWhatsApp: (ref, company, url) => `${ref} de ${company} : ${url}`,
  shareNativeText: (company) => `Soumission de drapage de ${company}`,

  pdf: {
    opportunity: "Dossier",
    validUntil: "Valide jusqu’au",
    respondTitle: "Répondre et partager en ligne",
    openProposal: "Ouvrir la soumission",
    visitWebsite: "Visiter le site",
    call: "Appeler",
    interactiveProposal: "Soumission interactive :",
    noLinkHint:
      "Acceptez, demandez des modifications ou posez vos questions à partir de votre lien de soumission lorsqu’il est disponible",
    event: "Événement",
    type: "Type",
    date: "Date",
    venue: "Lieu",
    cityArea: "Ville / secteur",
    client: "Client",
    name: "Nom",
    company: "Entreprise",
    contact: "Personne-ressource",
    billingAddress: "Adresse de facturation",
    status: "Statut",
    currency: "Devise",
    scopePricing: "Portée et prix",
    description: "Description",
    category: "Catégorie",
    total: "Total",
    noPricedItems: "Aucun article tarifé pour le moment.",
    includedSuffix: " (inclus)",
    generated: "Généré le",
    subject: (ref) => `Soumission ${ref}`,
    mailBodyWithUrl: (url) => `Au sujet de votre soumission de drapage :\n\n${url}`,
    mailBodyNoUrl: (ref) => `Au sujet de la soumission ${ref}`,
    tagline: "Drapage et location événementielle",
    motto: "Transformer les espaces · Créer des moments",
    location: "Montréal et environs",
  },

  mail: {
    subject: (ref) => `Votre soumission The Curtain Guy est prête — ${ref}`,
    ready: (name) =>
      name
        ? `Bonjour ${name}, votre soumission The Curtain Guy est prête.`
        : "Bonjour, votre soumission The Curtain Guy est prête.",
    instructions:
      "Ouvrez votre soumission pour l’accepter, demander des modifications ou ajouter des options pour révision. Aucun paiement n’est perçu sur cette page.",
    headline: "Votre soumission est prête",
    quoteLabel: "Soumission",
    opportunity: "Dossier",
    event: "Événement",
    reviewLink: "Consultez votre soumission :",
    reviewButton: "Voir ma soumission",
    pdfAttachedText: (filename) => `Une copie PDF est jointe (${filename}).`,
    pdfAttachedHtml: (filename) =>
      `Une copie PDF de cette soumission est jointe (${filename}).`,
    includedHeading: "Ce qui est inclus",
    moreItems: (count) =>
      `+ ${count} ${count === 1 ? "autre article" : "autres articles"} dans votre soumission`,
  },
};

const COPY: Record<CustomerLanguage, QuoteCopy> = { en, fr };

/** Customer-action API errors are English; show French equivalents on French quotes. */
const API_ERRORS_FR: Record<string, string> = {
  "Sign in required.": "Connexion requise.",
  "Quote not found.": "Soumission introuvable.",
  "Access denied.": "Accès refusé.",
  "This quote is not available for customer action.":
    "Cette soumission n’est pas disponible pour une réponse.",
  "This proposal is still a draft and cannot be accepted yet.":
    "Cette soumission est encore un brouillon et ne peut pas être acceptée.",
  "This proposal is no longer available.":
    "Cette soumission n’est plus disponible.",
  "Please enter your full name to accept.":
    "Veuillez entrer votre nom complet pour accepter.",
  "Please confirm that you agree to the proposal and its terms.":
    "Veuillez confirmer que vous acceptez la soumission et ses conditions.",
  "Please enter your full name to decline.":
    "Veuillez entrer votre nom complet pour refuser.",
  "Please describe the changes you need.":
    "Veuillez décrire les modifications souhaitées.",
  "Please enter your question.": "Veuillez entrer votre question.",
  "Please describe your request.": "Veuillez décrire votre demande.",
  "Unknown option.": "Option inconnue.",
};

export function localizeQuoteApiError(
  message: string | null | undefined,
  language: CustomerLanguage
): string | null {
  if (!message) return null;
  if (language !== "fr") return message;
  return API_ERRORS_FR[message] ?? COPY.fr.errorGeneric;
}

export function getQuoteCopy(language: CustomerLanguage | null | undefined): QuoteCopy {
  return COPY[language === "fr" ? "fr" : "en"];
}

/** Date-only or timestamp → "October 20, 2026" / "20 octobre 2026". */
export function formatQuoteDate(
  value: string | null | undefined,
  language: CustomerLanguage,
  fallback: string
): string {
  if (!value) return fallback;
  const locale = customerLocaleTag(language);
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed, locale);
  try {
    return formatDisplayDate(new Date(value), locale);
  } catch {
    return value;
  }
}

const FR_EVENT_TYPES = frEstimate.options.eventTypes as Record<
  string,
  { label?: string }
>;

/** Event types are stored as option ids (e.g. "corporate"); free text passes through. */
export function quoteEventTypeLabel(
  value: string | null | undefined,
  language: CustomerLanguage
): string | null {
  const id = value?.trim();
  if (!id) return null;
  if (language === "fr" && FR_EVENT_TYPES[id]?.label) {
    return FR_EVENT_TYPES[id].label!;
  }
  return getEnglishOptionLabel("eventTypes", id) ?? id;
}

/** French puts a no-break space before the colon. */
export function labelWithColon(label: string, language: CustomerLanguage): string {
  return language === "fr" ? `${label}\u00a0:` : `${label}:`;
}
