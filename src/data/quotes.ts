import {
  customerLocaleTag,
  type CustomerLanguage,
} from "@/data/customer-language";
import type { DepositMode } from "@/data/invoices";
import type { QuoteBalanceDueRule, QuoteDepositDueRule } from "@/data/quote-payment-terms";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "revision_requested",
  "expired",
  "cancelled",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Statuses where the customer has received the quote and can still say yes. */
const ACCEPTABLE_QUOTE_STATUSES: readonly QuoteStatus[] = [
  "sent",
  "viewed",
  "revision_requested",
  "expired",
];

export function canMarkQuoteAccepted(status: QuoteStatus): boolean {
  return ACCEPTABLE_QUOTE_STATUSES.includes(status);
}

/** Statuses the customer can still respond to; these lapse to "expired" once the valid-until date passes. */
const OPEN_QUOTE_STATUSES: readonly QuoteStatus[] = ["sent", "viewed", "revision_requested"];

/** Title of the request a customer files from an expired proposal. */
export const QUOTE_RENEWAL_REQUEST_TITLE = "Renewal requested";

export const QUOTE_EXPIRED_MESSAGE = "This proposal has expired. Request a renewed quote to continue.";

function quoteTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** A quote stays valid through the end of its valid-until day, Montréal time. */
export function isQuoteValidityLapsed(validUntil: string | null | undefined): boolean {
  const date = validUntil?.slice(0, 10);
  return Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && quoteTodayIso() > date);
}

export function hasPendingRenewalRequest(quote: {
  requests: ReadonlyArray<{ title: string; status: QuoteRequestStatus }>;
}): boolean {
  return quote.requests.some(
    (req) => req.title === QUOTE_RENEWAL_REQUEST_TITLE && req.status === "pending_owner_review"
  );
}

/** Stored status, or "expired" for an open quote whose valid-until date has passed. */
export function effectiveQuoteStatus(
  status: QuoteStatus,
  validUntil: string | null | undefined
): QuoteStatus {
  return OPEN_QUOTE_STATUSES.includes(status) && isQuoteValidityLapsed(validUntil)
    ? "expired"
    : status;
}

export const QUOTE_LINE_CATEGORIES = [
  "drape_rental",
  "hardware",
  "installation",
  "delivery",
  "teardown",
  "labor",
  "rush_special_handling",
  "premium_fabric",
  "backdrop",
  "room_divider_masking",
  "custom",
] as const;

export type QuoteLineCategory = (typeof QUOTE_LINE_CATEGORIES)[number];

export const QUOTE_LINE_STATUSES = [
  "priced",
  "included",
  "pending_owner_review",
  "not_priced_yet",
  "requested_change",
  "approved",
  "declined",
  "needs_measurement",
  "needs_venue_confirmation",
] as const;

export type QuoteLineStatus = (typeof QUOTE_LINE_STATUSES)[number];

export const QUOTE_REQUEST_TYPES = [
  "add_on",
  "revision",
  "question",
  "custom",
] as const;

export type QuoteRequestType = (typeof QUOTE_REQUEST_TYPES)[number];

export const QUOTE_REQUEST_STATUSES = [
  "pending_owner_review",
  "approved",
  "declined",
  "converted_to_line_item",
  "needs_info",
] as const;

export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];

export const QUOTE_EVENT_TYPES = [
  "quote_created",
  "quote_sent",
  "quote_viewed",
  "quote_edited",
  "line_item_added",
  "line_item_updated",
  "line_item_removed",
  "customer_requested_add_on",
  "customer_requested_revision",
  "customer_question",
  "customer_accepted",
  "customer_declined",
  "pdf_downloaded",
  "request_reviewed",
  "revision_created",
] as const;

export type QuoteEventType = (typeof QUOTE_EVENT_TYPES)[number];

export const QUOTE_CATEGORY_LABELS: Record<QuoteLineCategory, string> = {
  drape_rental: "Drape rental",
  hardware: "Hardware",
  installation: "Installation",
  delivery: "Delivery",
  teardown: "Teardown",
  labor: "Labor",
  rush_special_handling: "Rush / special handling",
  premium_fabric: "Premium fabric",
  backdrop: "Backdrop",
  room_divider_masking: "Room divider / masking",
  custom: "Custom",
};

const QUOTE_CATEGORY_LABELS_FR: Record<QuoteLineCategory, string> = {
  drape_rental: "Location de draperie",
  hardware: "Quincaillerie",
  installation: "Installation",
  delivery: "Livraison",
  teardown: "Démontage",
  labor: "Main-d’œuvre",
  rush_special_handling: "Urgence / manutention spéciale",
  premium_fabric: "Tissu premium",
  backdrop: "Toile de fond",
  room_divider_masking: "Séparateur / masquage",
  custom: "Sur mesure",
};

/** Suggested line descriptions when picking a category in the admin quote builder. */
export const QUOTE_CATEGORY_DEFAULT_DESCRIPTIONS: Record<
  QuoteLineCategory,
  string
> = {
  drape_rental: "Event drape rental — fabric panels for the planned layout",
  hardware: "Pipe, bases, and mounting hardware for the drape setup",
  installation: "On-site installation of draping and hardware",
  delivery: "Delivery to venue",
  teardown: "Teardown and pickup after the event",
  labor: "Crew labor for install / event support",
  rush_special_handling: "Rush timing or special handling",
  premium_fabric: "Premium fabric upgrade",
  backdrop: "Backdrop / photo wall draping",
  room_divider_masking: "Room divider or masking drapes",
  custom: "Custom draping scope",
};

export function getQuoteCategoryDefaultDescription(category: string): string {
  return isQuoteLineCategory(category)
    ? QUOTE_CATEGORY_DEFAULT_DESCRIPTIONS[category]
    : "";
}

/** True when description is empty or still the previous category’s auto-fill. */
export function shouldAutofillQuoteDescription(
  description: string,
  previousCategory: string
): boolean {
  const trimmed = description.trim();
  if (!trimmed) return true;
  return trimmed === getQuoteCategoryDefaultDescription(previousCategory);
}

/** Display name for a quote line: saved snapshot, built-in type, or prettified slug. */
export function quoteLineCategoryLabel(
  item: {
    category: string;
    category_label?: string | null;
    category_label_fr?: string | null;
  },
  language: CustomerLanguage = "en"
): string {
  if (language === "fr") {
    const snapshotFr = item.category_label_fr?.trim();
    if (snapshotFr) return snapshotFr;
    if (isQuoteLineCategory(item.category)) {
      return QUOTE_CATEGORY_LABELS_FR[item.category];
    }
  }
  const snapshot = item.category_label?.trim();
  if (snapshot) return snapshot;
  if (isQuoteLineCategory(item.category)) {
    return language === "fr"
      ? QUOTE_CATEGORY_LABELS_FR[item.category]
      : QUOTE_CATEGORY_LABELS[item.category];
  }
  const pretty = item.category.replaceAll("_", " ").trim();
  if (pretty) return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  return language === "fr" ? "Article" : "Item";
}

/** Short unit forms for quotes: [singular, plural]. Unknown units show as typed. */
const QUOTE_UNIT_SHORT: Record<
  CustomerLanguage,
  Record<string, [string, string]>
> = {
  en: {
    each: ["ea", "ea"],
    "linear ft": ["ft", "ft"],
    ft: ["ft", "ft"],
    panel: ["panel", "panels"],
    set: ["set", "sets"],
    hour: ["hr", "hrs"],
    day: ["day", "days"],
    event: ["event", "events"],
  },
  fr: {
    each: ["ch.", "ch."],
    "linear ft": ["pi", "pi"],
    ft: ["pi", "pi"],
    panel: ["panneau", "panneaux"],
    set: ["ensemble", "ensembles"],
    hour: ["h", "h"],
    day: ["jour", "jours"],
    event: ["événement", "événements"],
  },
};

function normalizeQuoteUnit(unit: string | null | undefined): string {
  return unit?.trim().toLowerCase() ?? "";
}

function formatQuantityNumber(
  quantity: number,
  language: CustomerLanguage
): string {
  const rounded = Number.isInteger(quantity)
    ? quantity
    : Number(quantity.toFixed(2));
  return language === "fr"
    ? String(rounded).replace(".", ",")
    : String(rounded);
}

/** "40 ft", "2 sets", "1 event"; plain number for "each" or no unit. */
export function formatQuoteQuantity(
  quantity: number,
  unit: string | null | undefined,
  language: CustomerLanguage = "en"
): string {
  const qty = formatQuantityNumber(quantity, language);
  const key = normalizeQuoteUnit(unit);
  if (!key || key === "each") return qty;
  const short = QUOTE_UNIT_SHORT[language][key];
  const plural = language === "fr" ? quantity >= 2 : quantity !== 1;
  const label = short ? (plural ? short[1] : short[0]) : unit!.trim();
  return `${qty} ${label}`;
}

/** Suffix after a unit price: "/ ft", "/ set", "ea"; empty when no unit. */
export function formatQuoteUnitSuffix(
  unit: string | null | undefined,
  language: CustomerLanguage = "en"
): string {
  const key = normalizeQuoteUnit(unit);
  if (!key) return "";
  const units = QUOTE_UNIT_SHORT[language];
  if (key === "each") return units.each[0];
  return `/ ${units[key]?.[0] ?? unit!.trim()}`;
}

/** "$40.00 / ft" or "$20.00 ea"; plain price when no unit. */
export function formatQuoteUnitPrice(
  unitPriceCents: number,
  unit: string | null | undefined,
  language: CustomerLanguage = "en",
  currency: string | null | undefined = "CAD"
): string {
  const suffix = formatQuoteUnitSuffix(unit, language);
  const cents = Number(unitPriceCents) || 0;
  const price = Number.isInteger(cents)
    ? formatMoneyFromCents(cents, language, currency)
    : new Intl.NumberFormat(customerLocaleTag(language), {
        style: "currency",
        currency: currency === "USD" ? "USD" : "CAD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(cents / 100);
  return suffix ? `${price} ${suffix}` : price;
}

export function isValidQuoteLineCategorySlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9_]*$/.test(value) && value.length <= 60;
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  revision_requested: "Revision requested",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const QUOTE_LINE_STATUS_LABELS: Record<QuoteLineStatus, string> = {
  priced: "Priced",
  included: "Included",
  pending_owner_review: "Pending owner review",
  not_priced_yet: "Not priced yet",
  requested_change: "Requested change",
  approved: "Approved",
  declined: "Declined",
  needs_measurement: "Needs measurement",
  needs_venue_confirmation: "Needs venue confirmation",
};

export const QUOTE_REQUEST_STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  pending_owner_review: "Pending owner review",
  approved: "Approved",
  declined: "Declined",
  converted_to_line_item: "Converted to line item",
  needs_info: "Needs info",
};

const QUOTE_STATUS_LABELS_FR: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  viewed: "Consultée",
  accepted: "Acceptée",
  declined: "Refusée",
  revision_requested: "Révision demandée",
  expired: "Expirée",
  cancelled: "Annulée",
};

const QUOTE_LINE_STATUS_LABELS_FR: Record<QuoteLineStatus, string> = {
  priced: "Tarifé",
  included: "Inclus",
  pending_owner_review: "En révision",
  not_priced_yet: "Prix à venir",
  requested_change: "Modification demandée",
  approved: "Approuvé",
  declined: "Refusé",
  needs_measurement: "Mesures requises",
  needs_venue_confirmation: "Confirmation du lieu requise",
};

const QUOTE_REQUEST_STATUS_LABELS_FR: Record<QuoteRequestStatus, string> = {
  pending_owner_review: "En révision",
  approved: "Approuvée",
  declined: "Refusée",
  converted_to_line_item: "Ajoutée à la soumission",
  needs_info: "Précisions requises",
};

/** Read tracking is owner-only: customers see a viewed quote as plain "sent". */
export function customerQuoteStatus(status: QuoteStatus): QuoteStatus {
  return status === "viewed" ? "sent" : status;
}

export function quoteStatusLabel(
  status: QuoteStatus,
  language: CustomerLanguage = "en"
): string {
  return (language === "fr" ? QUOTE_STATUS_LABELS_FR : QUOTE_STATUS_LABELS)[
    status
  ];
}

export function quoteLineStatusLabel(
  status: QuoteLineStatus,
  language: CustomerLanguage = "en"
): string {
  return (
    language === "fr" ? QUOTE_LINE_STATUS_LABELS_FR : QUOTE_LINE_STATUS_LABELS
  )[status];
}

/**
 * A priced line at $0 reads as "Included" / "Inclus" to customers instead of
 * $0.00. Lines still awaiting a price keep their own status.
 */
export function isZeroPricedQuoteLine(item: {
  status: QuoteLineStatus | string;
  unit_price_cents: number | null | undefined;
}): boolean {
  return (
    (item.status === "priced" || item.status === "approved") &&
    (item.unit_price_cents ?? 0) === 0
  );
}

export function customerQuoteLineStatus<
  T extends { status: QuoteLineStatus; unit_price_cents: number | null | undefined },
>(item: T): QuoteLineStatus {
  return isZeroPricedQuoteLine(item) ? "included" : item.status;
}

export function quoteRequestStatusLabel(
  status: QuoteRequestStatus,
  language: CustomerLanguage = "en"
): string {
  return (
    language === "fr"
      ? QUOTE_REQUEST_STATUS_LABELS_FR
      : QUOTE_REQUEST_STATUS_LABELS
  )[status];
}

/** Pre-October 2026 default terms, still stored on quotes created before the revision. */
const LEGACY_QUOTE_TERMS_V1_FR = [
  "La présente soumission est émise par 9395-2521 Québec Inc., faisant affaire sous le nom The Curtain Guy, et décrit les articles loués et les services proposés pour l’événement indiqué ci-dessus.",
  "En acceptant cette soumission, le client confirme son approbation des renseignements sur l’événement, de la portée des travaux, des prix, du calendrier de paiement et des présentes conditions. L’acceptation ne réserve ni l’inventaire, ni l’équipe, ni la date de l’événement avant la confirmation écrite de la réservation par The Curtain Guy et la réception de tout dépôt exigé.",
  "Cette soumission est valide jusqu’à la date indiquée. Toute acceptation après cette date exige une nouvelle confirmation écrite des prix et de la disponibilité de l’inventaire et de l’équipe.",
  "Les prix sont fondés sur les renseignements actuellement disponibles. Les mesures du lieu, les contraintes d’accès, les changements d’horaire ou de quantité, les modifications demandées par le client ou toute autre condition sur place peuvent nécessiter une soumission révisée. Toute modification importante sera documentée aux fins d’approbation par le client.",
  "Tous les montants sont dans la devise indiquée. Le total de la soumission comprend uniquement les taxes expressément affichées. Le dépôt et le solde sont payables selon le calendrier de paiement indiqué dans cette soumission ou dans la facture connexe.",
  "Le client doit fournir des renseignements exacts sur le lieu, obtenir les autorisations requises et assurer un accès convenable ainsi que des plages suffisantes pour l’installation et le démontage. Il doit communiquer sans délai toute règle du lieu ou contrainte touchant les travaux.",
  "La livraison, l’installation et le démontage seront effectués selon l’horaire convenu. Les retards, visites supplémentaires ou heures de travail additionnelles attribuables à un accès indisponible, à un lieu non prêt ou à des contraintes non divulguées peuvent entraîner des frais supplémentaires approuvés ou confirmés par écrit.",
  "Si le client demande une annulation ou un report, The Curtain Guy confirmera par écrit tout remboursement, crédit ou montant supplémentaire. Dans la mesure permise par la loi, le client demeure responsable des travaux déjà effectués, des articles commandés spécialement et des frais de tiers non annulables. Toute nouvelle date est assujettie à la disponibilité et à une révision possible des prix.",
  "Les rendus, dessins Studio, photographies, échantillons et images conceptuelles servent à la planification. L’apparence finale peut varier en raison des dimensions du lieu, de l’éclairage, des caractéristiques des tissus, de l’inventaire disponible et des conditions d’installation.",
  "Tous les articles loués demeurent la propriété de The Curtain Guy. Le client ne doit pas déplacer, modifier ou retirer les installations ni permettre leur manipulation non autorisée, et doit s’assurer qu’elles demeurent accessibles pour le démontage à l’heure convenue.",
  "Le client est responsable de la perte ou des dommages aux articles loués causés par lui-même, ses invités, ses fournisseurs ou le personnel du lieu, à l’exception de l’usure normale et des dommages causés par The Curtain Guy. Les coûts raisonnables de réparation, de remplacement et de main-d’œuvre connexe peuvent être facturés.",
  "Aucune partie ne sera considérée en défaut pour un retard causé par des circonstances indépendantes de sa volonté raisonnable. Les parties collaboreront de bonne foi à tout report, tandis que les travaux exécutés et les engagements non récupérables demeureront payables dans la mesure permise par la loi.",
  "La présente soumission et ses révisions acceptées constituent l’entente entre les parties pour les travaux qui y sont décrits. Elles sont régies par les lois du Québec et les lois applicables du Canada, sous réserve de tout droit impératif en matière de protection du consommateur.",
].join("\n");

const LEGACY_QUOTE_TERMS_V1 = [
  "This proposal is issued by 9395-2521 Québec Inc., operating as The Curtain Guy, and describes the rental items and services proposed for the event identified above.",
  "By accepting this proposal, the client confirms approval of the event details, scope, pricing, payment schedule, and these terms. Acceptance does not reserve inventory, crew, or the event date until The Curtain Guy confirms the booking in writing and receives any required deposit.",
  "This proposal is valid until the date shown. Acceptance after that date requires written reconfirmation of pricing, inventory, and crew availability.",
  "Pricing is based on the information currently available. Venue measurements, access restrictions, schedule or quantity changes, client-requested changes, or other site conditions may require a revised proposal. Material changes will be documented for client approval.",
  "All amounts are in the currency shown. The proposal total includes only the taxes expressly displayed. Any deposit and remaining balance are payable according to the payment schedule shown on this proposal or the related invoice.",
  "The client must provide accurate venue information, obtain required approvals, and provide suitable access and sufficient installation and teardown windows. The client must promptly disclose venue rules or other conditions affecting the work.",
  "Delivery, installation, and teardown will be performed according to the agreed schedule. Delays, additional visits, or additional labour caused by unavailable access, an unprepared venue, or undisclosed restrictions may result in additional charges approved or confirmed in writing.",
  "If the client requests cancellation or rescheduling, The Curtain Guy will confirm any refund, credit, or additional amount in writing. To the extent permitted by law, the client remains responsible for work already performed, specially ordered items, and non-cancellable third-party costs. A replacement date is subject to availability and revised pricing.",
  "Renderings, Studio designs, photographs, samples, and concept images are planning aids. Final appearance may vary because of venue dimensions, lighting, fabric characteristics, available inventory, and installation conditions.",
  "All rental items remain the property of The Curtain Guy. The client must not move, alter, remove, or permit unauthorized handling of installed items and must ensure they remain available for teardown at the agreed time.",
  "The client is responsible for loss of or damage to rental items caused by the client, guests, vendors, or venue personnel, excluding ordinary wear and damage caused by The Curtain Guy. Reasonable repair, replacement, and related labour costs may be invoiced.",
  "Neither party will be considered in default for delays caused by circumstances outside its reasonable control. The parties will cooperate in good faith regarding rescheduling, while completed work and non-recoverable commitments remain payable to the extent permitted by law.",
  "This proposal and its accepted revisions form the agreement between the parties for the quoted work. It is governed by the laws of Québec and the applicable laws of Canada, subject to any mandatory consumer-protection rights.",
].join("\n");

/** Earlier default terms as EN/FR pairs, so a stored legacy default still translates to its own counterpart. */
export const LEGACY_QUOTE_TERMS: ReadonlyArray<{ en: string; fr: string }> = [
  { en: LEGACY_QUOTE_TERMS_V1, fr: LEGACY_QUOTE_TERMS_V1_FR },
];

// Articles cross-reference each other by heading, not number, so per-quote edits cannot break references.
export const DEFAULT_QUOTE_TERMS = [
  "Parties and documents. These terms and conditions form part of the quote, also called the proposal, issued by 9395-2521 Québec Inc., operating as The Curtain Guy (the “Provider”), to the client named in it (the “Client”). The “Accepted Quote” is the version of that quote that the Client signs, identified by its quote number, including any revision suffix such as “-R1”. Once the booking is confirmed as set out under “Acceptance and booking confirmation”, the agreement between the parties (the “Agreement”) consists of the Accepted Quote — its event details and schedule, scope, quantities, inclusions, price and payment schedule — these terms, and any revision approved under “Changes and additional charges”, all of which are incorporated into it. If these documents conflict, they apply in the following order of precedence: (1) a revision or written amendment approved under “Changes and additional charges”, for the matters it covers; (2) the event details, schedule, scope, quantities, price and payment schedule of the Accepted Quote, as recorded under “Record of the Accepted Quote”; (3) these general terms and conditions.",
  "Record of the Accepted Quote. When the Client signs, the Accepted Quote is recorded as it stands at that moment, together with the signatures, initials and audit record, and the signed Agreement reproduces it in its schedules. That record is the authoritative version of the Accepted Quote: if any other copy, printout or later display of the quote differs from it, the signed record prevails. A revised quote issued after acceptance does not replace or modify the Accepted Quote unless the Client approves it under “Changes and additional charges”; each revision is identified by its own quote number and revision suffix.",
  "Acceptance and booking confirmation. The Client accepts a quote by signing that version before its expiry date; signing one version is not acceptance of any other version. The Agreement is formed when the Provider countersigns the Client’s acceptance or otherwise confirms the booking in writing. The event date, rental inventory and crew are reserved only once the Agreement is formed and the deposit shown in the payment schedule has been received; until then, the Provider may accept other bookings for the same date or inventory. If the Provider does not confirm the booking, it will notify the Client and refund in full any amount received. An expired quote can no longer be accepted; the Client may request a renewed quote, with pricing and availability reconfirmed.",
  "Scope. The Agreement covers only the rentals and services shown in the Accepted Quote as priced or included, in the quantities stated, for the event, venue and schedule stated in it. Optional enhancements, suggestions and other items presented with the quote for review, and any line that is not priced or marked as included, are excluded unless added under “Changes and additional charges”, as is any other item, service, visit or labour. Prices are based on the event information, measurements, schedule and site conditions provided by the Client or recorded in the Accepted Quote.",
  "Price and taxes. All amounts are in the currency shown. The total includes only the taxes expressly displayed; taxes are charged at the rates required by law.",
  "Payment and deposit. The Client must pay the deposit and the balance in the amounts and by the due dates set out in the payment schedule, using the payment methods indicated by the Provider. The deposit secures the reservation of the event date, inventory and crew and is credited in full against the total price. Approved additional charges are payable on the Provider’s invoice by the due date stated on it.",
  "Late payment. Any amount not paid when due bears interest from its due date until paid at the rate of 2% per month, compounded monthly (26.82% per year). If an amount remains unpaid, the Provider may give the Client written notice requiring payment within a reasonable period stated in the notice. If payment is not made within that period, the Provider may suspend delivery, installation or any further work until payment is received or, where the default is serious, terminate the Agreement by written notice, in which case the Client’s obligations are determined under “Cancellation by the Client” as of the date of termination. The Provider is not required to deliver or install before receiving every amount that the payment schedule makes payable before the event.",
  "Changes and additional charges. The Client may request changes to quantities, dimensions, materials, the venue, the schedule or access conditions. A change that affects the scope, price or schedule must be set out in a revised quote or written amendment and approved by the Client in writing (including by email or electronic signature) before it is carried out. Approved revisions form part of the Agreement and prevail over earlier versions for the matters they cover. The Provider may decline a change that cannot reasonably be carried out with the available inventory, crew or time. Additional labour, transportation, waiting time or extra visits resulting from an approved change, or from the circumstances described under “Site access, delays and safety”, are charged on the basis of the actual time and costs incurred, which the Provider will document to the Client in writing.",
  "Client, venue and site responsibilities. The Client must: (a) provide accurate event information, measurements, schedules and on-site contacts, and promptly notify the Provider of any change; (b) obtain all permissions required from the venue and disclose the venue rules and restrictions that affect the work, including rigging, fire-safety, insurance and access requirements; (c) ensure that the Provider’s crew has safe, timely and unobstructed access — including loading, parking and elevators — to a clear and prepared installation area for the full installation and teardown windows in the schedule; and (d) coordinate venue staff and other vendors so that they do not delay or interfere with the work. The Provider may rely on the information provided by the Client.",
  "Site access, delays and safety. If the installation area is not accessible, not ready or not safe at the scheduled time, or if information provided by the Client proves inaccurate, the Provider will notify the Client and make reasonable efforts to proceed or to adapt the installation. The Provider may refuse, stop or modify any work that it reasonably considers unsafe for people, property or equipment, or contrary to venue rules or applicable law, and will propose a safe alternative where one is reasonably available. Resulting waiting time, additional labour or extra visits are charged as set out under “Changes and additional charges”. Where the work cannot be completed for reasons attributable to the Client or the venue, the Client remains responsible for the price of the work performed and the costs incurred.",
  "Cancellation by the Client. The Client may cancel the Agreement at any time by written notice to the Provider; cancellation takes effect when the notice is received. The Client must then pay, in proportion to the agreed price, the value of the work performed before the notice (including design, planning and preparation specific to the event), the cost of materials specially ordered or made for the event, crew and labour committed to the event that cannot reasonably be reassigned, and non-recoverable third-party costs, each as documented by the Provider, together with any other damages to which the Provider is entitled by law. The Provider will take reasonable steps to limit these amounts. Amounts already paid, including the deposit, are applied to them; any surplus is refunded to the Client within 15 days of the Provider’s statement, and any shortfall is payable on invoice.",
  "Rescheduling. A request to change the event date or schedule is a change request under “Changes and additional charges” and is subject to the availability of inventory and crew. If the Provider accepts a new date, it will issue a revised quote; amounts already paid are credited to the rescheduled booking, and any price difference or additional cost caused by the change is shown in the revised quote. If the Client does not accept the revised quote, the existing Agreement continues to apply, and the Client may cancel it under “Cancellation by the Client”.",
  "Venue cancellation, postponement or denied access. If the venue, an authority or another third party cancels or postpones the event or denies access, the Client must notify the Provider promptly, and the parties will first try to agree on a new date under “Rescheduling”. If no new date is agreed, the Agreement ends as though cancelled by the Client on the date of the notice, unless the cause is attributable to the Provider, in which case “Cancellation by the Provider” applies, or constitutes force majeure, in which case “Force majeure” applies.",
  "Cancellation by the Provider. The Provider may cancel the Agreement only for a serious reason, such as non-payment as set out under “Late payment”, unsafe conditions that cannot reasonably be corrected, or force majeure, by written notice to the Client. If the Provider cancels for any other reason, it will refund all amounts paid by the Client, without prejudice to any other remedy available to the Client by law.",
  "Ownership and care of rental items. All drapes, hardware and other rental items remain the property of the Provider at all times; the Client acquires only the right to use them for the event. From delivery until teardown, the Client must take reasonable care of the items and keep them away from foreseeable hazards such as open flames and liquids, and must not move, alter, attach anything to, cut, mark or remove them, or allow anyone other than the Provider’s crew to handle or adjust the installation. The Client must ensure that the items remain at the venue and are accessible to the Provider for teardown at the scheduled time.",
  "Loss and damage. The Client is responsible for the loss, theft or damage of rental items occurring between delivery and teardown, including when caused by the Client’s guests, vendors or venue personnel, except ordinary wear and tear, loss or damage caused by the Provider or its crew, and loss or damage resulting from force majeure, and subject to applicable law. The Provider will notify the Client in writing within a reasonable time after teardown, with a description of the loss or damage and supporting documentation such as photographs. The Client must pay the reasonable cost of cleaning beyond normal use, of repair or, where repair is not reasonably possible, of replacement — not exceeding the cost of an equivalent item — together with the related labour.",
  "Liability. Each party is liable for damage caused by its own fault, in accordance with the law. The Provider is not liable for delays, deficiencies or damage caused by inaccurate information provided by the Client, lack of access, unsafe site conditions, or the acts of the venue, other vendors or guests who are not under the Provider’s control. Nothing in the Agreement excludes or limits liability for bodily or moral injury, for intentional or gross fault, or where the law does not allow such an exclusion or limitation.",
  "Appearance and renderings. Renderings, Studio designs, photographs, samples and concept images are planning aids, not specifications. Final appearance may vary because of venue dimensions, lighting, fabric characteristics, available inventory and installation conditions.",
  "Force majeure. Neither party is liable for failing to perform, or for delay in performing, an obligation to the extent caused by force majeure within the meaning of the Civil Code of Québec, being an unforeseeable and irresistible event such as severe weather, fire, flood, an epidemic or public-health order, government action, or a widespread utility or transport failure. Lack of funds, and conditions that the affected party could reasonably have anticipated or avoided, are not force majeure. The affected party must notify the other party in writing as soon as possible, take reasonable steps to limit the consequences and resume performance as soon as it can. The parties will first try in good faith to agree on a new date under “Rescheduling”. If performance becomes impossible or no new date is agreed, either party may end the Agreement by written notice; the Client then pays for the work performed and the costs incurred that cannot be recovered, and the Provider refunds any surplus of amounts paid, subject to applicable law.",
  "Notices. Notices under the Agreement must be in writing and may be sent by email to the addresses shown in the Agreement, or to any other address a party designates in writing. A notice takes effect when it is received.",
  "Electronic documents and signatures. The parties agree to conclude, sign and keep the Agreement and related documents electronically. A signature or initials affixed through the Provider’s secure signing process, together with its audit record, have the same effect as a handwritten signature, in accordance with the Act to establish a legal framework for information technology (Québec). A copy of the signed Agreement is sent to the Client by email.",
  "Entire agreement. The Agreement, including revisions approved under “Changes and additional charges”, is the entire agreement between the parties on its subject and replaces any estimate, earlier quote version or discussion that it does not incorporate. It may be amended only in writing approved by both parties. If a provision is held invalid or unenforceable, the rest of the Agreement remains in effect.",
  "Governing law and consumer rights. The Agreement is governed by the laws of Québec and the federal laws of Canada applicable there. If the Client is a consumer within the meaning of the Consumer Protection Act (Québec), nothing in the Agreement limits the rights the Client has under that Act or under any other mandatory law, and each provision applies only to the extent permitted by them.",
  "Language. This Agreement is drawn up in French, and an English version is also available. The French version binds the parties unless, after the French version was provided to the Client, the Client expressly chose to be bound by the English version, as recorded in the Client’s electronic signature consent; in that case, the English version binds the parties. The same choice applies to the documents related to the Agreement.",
].join("\n");

export const DEFAULT_QUOTE_TERMS_FR = [
  "Parties et documents. Les présentes conditions générales font partie de la soumission émise par 9395-2521 Québec Inc., faisant affaire sous le nom The Curtain Guy (le « Prestataire »), au client qui y est désigné (le « Client »). La « Soumission acceptée » est la version de cette soumission que le Client signe, désignée par son numéro de soumission, y compris tout suffixe de révision comme « -R1 ». Une fois la réservation confirmée conformément à la clause « Acceptation et confirmation de la réservation », le contrat entre les parties (le « Contrat ») se compose de la Soumission acceptée — soit ses renseignements sur l’événement et son horaire, sa portée, ses quantités, ses inclusions, son prix et son calendrier de paiement —, des présentes conditions et de toute révision approuvée conformément à la clause « Modifications et frais supplémentaires », lesquels y sont tous intégrés. En cas de conflit entre ces documents, l’ordre de priorité suivant s’applique : 1) une révision ou une modification écrite approuvée conformément à la clause « Modifications et frais supplémentaires », pour les éléments qu’elle vise; 2) les renseignements sur l’événement, l’horaire, la portée, les quantités, le prix et le calendrier de paiement de la Soumission acceptée, tels que consignés conformément à la clause « Conservation de la Soumission acceptée »; 3) les présentes conditions générales.",
  "Conservation de la Soumission acceptée. Au moment où le Client signe, la Soumission acceptée est consignée telle qu’elle existe à ce moment, avec les signatures, les initiales et le registre d’audit, et le Contrat signé la reproduit dans ses annexes. Cet enregistrement constitue la version de référence de la Soumission acceptée : si une autre copie, un autre imprimé ou un affichage ultérieur de la soumission en diffère, l’enregistrement signé prévaut. Une soumission révisée émise après l’acceptation ne remplace ni ne modifie la Soumission acceptée, à moins que le Client ne l’approuve conformément à la clause « Modifications et frais supplémentaires »; chaque révision est désignée par son propre numéro de soumission et suffixe de révision.",
  "Acceptation et confirmation de la réservation. Le Client accepte une soumission en signant cette version avant sa date d’expiration; la signature d’une version ne vaut pas acceptation d’une autre version. Le Contrat est formé lorsque le Prestataire contresigne l’acceptation du Client ou confirme autrement la réservation par écrit. La date de l’événement, l’inventaire de location et l’équipe ne sont réservés qu’une fois le Contrat formé et le dépôt prévu au calendrier de paiement reçu; d’ici là, le Prestataire peut accepter d’autres réservations pour la même date ou le même inventaire. Si le Prestataire ne confirme pas la réservation, il en avise le Client et lui rembourse intégralement toute somme reçue. Une soumission expirée ne peut plus être acceptée; le Client peut demander une soumission renouvelée, dont les prix et la disponibilité seront reconfirmés.",
  "Portée. Le Contrat vise uniquement les articles loués et les services indiqués dans la Soumission acceptée comme tarifés ou inclus, dans les quantités qui y sont précisées, pour l’événement, le lieu et l’horaire qui y sont indiqués. Les options, suggestions et autres éléments présentés avec la soumission aux fins d’examen, ainsi que toute ligne qui n’est ni tarifée ni indiquée comme incluse, sont exclus à moins d’être ajoutés conformément à la clause « Modifications et frais supplémentaires », tout comme tout autre article, service, déplacement ou travail. Les prix sont établis selon les renseignements sur l’événement, les mesures, l’horaire et les conditions du lieu fournis par le Client ou consignés dans la Soumission acceptée.",
  "Prix et taxes. Tous les montants sont exprimés dans la devise indiquée. Le total comprend uniquement les taxes expressément affichées; les taxes sont perçues aux taux prévus par la loi.",
  "Paiement et dépôt. Le Client doit payer le dépôt et le solde selon les montants et aux échéances prévus au calendrier de paiement, par les modes de paiement indiqués par le Prestataire. Le dépôt garantit la réservation de la date, de l’inventaire et de l’équipe et est porté en entier au crédit du prix total. Les frais supplémentaires approuvés sont payables sur facture du Prestataire, à l’échéance qui y est indiquée.",
  "Retard de paiement. Toute somme impayée à son échéance porte intérêt à compter de cette date jusqu’à parfait paiement au taux de 2 % par mois, composé mensuellement (26,82 % par année). Si une somme demeure impayée, le Prestataire peut transmettre au Client un avis écrit exigeant le paiement dans le délai raisonnable qui y est indiqué. À défaut de paiement dans ce délai, le Prestataire peut suspendre la livraison, l’installation ou tout autre travail jusqu’à réception du paiement ou, si le défaut est sérieux, résilier le Contrat par avis écrit; les obligations du Client sont alors établies conformément à la clause « Annulation par le Client », à la date de la résiliation. Le Prestataire n’est pas tenu de livrer ou d’installer avant d’avoir reçu toutes les sommes payables avant l’événement selon le calendrier de paiement.",
  "Modifications et frais supplémentaires. Le Client peut demander des modifications aux quantités, aux dimensions, aux matériaux, au lieu, à l’horaire ou aux conditions d’accès. Toute modification touchant la portée, le prix ou l’horaire doit être consignée dans une soumission révisée ou une modification écrite et approuvée par écrit par le Client (y compris par courriel ou signature électronique) avant d’être exécutée. Les révisions approuvées font partie du Contrat et prévalent sur les versions antérieures pour les éléments qu’elles visent. Le Prestataire peut refuser une modification qui ne peut raisonnablement être réalisée avec l’inventaire, l’équipe ou le temps disponibles. Les heures de travail supplémentaires, le transport, le temps d’attente ou les visites additionnelles découlant d’une modification approuvée ou des situations prévues à la clause « Accès au lieu, retards et sécurité » sont facturés selon le temps et les coûts réellement engagés, que le Prestataire documente par écrit au Client.",
  "Responsabilités du Client, du lieu et du site. Le Client doit : a) fournir des renseignements exacts sur l’événement, les mesures, l’horaire et les personnes-ressources sur place, et aviser sans délai le Prestataire de tout changement; b) obtenir toutes les autorisations requises du lieu et divulguer les règles et restrictions du lieu qui touchent les travaux, notamment en matière d’accrochage, de sécurité incendie, d’assurance et d’accès; c) assurer à l’équipe du Prestataire un accès sécuritaire, ponctuel et dégagé — y compris le quai de chargement, le stationnement et les ascenseurs — à une aire d’installation libre et prête pendant toutes les plages d’installation et de démontage prévues à l’horaire; d) coordonner le personnel du lieu et les autres fournisseurs afin qu’ils ne retardent ni n’entravent les travaux. Le Prestataire peut se fier aux renseignements fournis par le Client.",
  "Accès au lieu, retards et sécurité. Si l’aire d’installation n’est pas accessible, pas prête ou non sécuritaire à l’heure prévue, ou si des renseignements fournis par le Client s’avèrent inexacts, le Prestataire en avise le Client et fait des efforts raisonnables pour procéder ou adapter l’installation. Le Prestataire peut refuser, interrompre ou modifier tout travail qu’il juge raisonnablement dangereux pour les personnes, les biens ou l’équipement, ou contraire aux règles du lieu ou à la loi, et propose une solution sécuritaire lorsqu’il en existe raisonnablement une. Le temps d’attente, les heures de travail supplémentaires ou les visites additionnelles qui en découlent sont facturés conformément à la clause « Modifications et frais supplémentaires ». Si les travaux ne peuvent être achevés pour des raisons imputables au Client ou au lieu, le Client demeure responsable du prix des travaux exécutés et des coûts engagés.",
  "Annulation par le Client. Le Client peut résilier le Contrat en tout temps par avis écrit au Prestataire; la résiliation prend effet à la réception de l’avis. Le Client doit alors payer, en proportion du prix convenu, la valeur des travaux exécutés avant l’avis (y compris la conception, la planification et la préparation propres à l’événement), le coût des matériaux commandés ou fabriqués spécialement pour l’événement, l’équipe et la main-d’œuvre engagées pour l’événement qui ne peuvent raisonnablement être réaffectées, ainsi que les frais de tiers non récupérables, chacun étant documenté par le Prestataire, en plus de tout autre préjudice auquel le Prestataire a droit selon la loi. Le Prestataire prend des mesures raisonnables pour limiter ces montants. Les sommes déjà versées, y compris le dépôt, sont imputées sur ces montants; tout excédent est remboursé au Client dans les 15 jours suivant l’état de compte du Prestataire, et tout solde est payable sur facture.",
  "Report. Toute demande de changement de la date ou de l’horaire de l’événement constitue une demande de modification au sens de la clause « Modifications et frais supplémentaires » et est assujettie à la disponibilité de l’inventaire et de l’équipe. Si le Prestataire accepte une nouvelle date, il émet une soumission révisée; les sommes déjà versées sont portées au crédit de la réservation reportée, et tout écart de prix ou coût supplémentaire causé par le changement figure dans la soumission révisée. Si le Client n’accepte pas la soumission révisée, le Contrat existant continue de s’appliquer et le Client peut le résilier conformément à la clause « Annulation par le Client ».",
  "Annulation ou report par le lieu et refus d’accès. Si le lieu, une autorité ou un autre tiers annule ou reporte l’événement ou refuse l’accès, le Client doit en aviser promptement le Prestataire, et les parties tentent d’abord de convenir d’une nouvelle date conformément à la clause « Report ». À défaut d’entente sur une nouvelle date, le Contrat prend fin comme s’il avait été résilié par le Client à la date de l’avis, à moins que la cause ne soit imputable au Prestataire, auquel cas la clause « Annulation par le Prestataire » s’applique, ou ne constitue une force majeure, auquel cas la clause « Force majeure » s’applique.",
  "Annulation par le Prestataire. Le Prestataire ne peut résilier le Contrat que pour un motif sérieux, notamment le défaut de paiement prévu à la clause « Retard de paiement », des conditions dangereuses qui ne peuvent raisonnablement être corrigées ou une force majeure, par avis écrit au Client. S’il résilie le Contrat pour tout autre motif, il rembourse au Client toutes les sommes versées, sans préjudice des autres recours dont le Client dispose selon la loi.",
  "Propriété et soin des articles loués. Les drapés, la quincaillerie et les autres articles loués demeurent en tout temps la propriété du Prestataire; le Client n’acquiert que le droit de les utiliser pour l’événement. De la livraison jusqu’au démontage, le Client doit prendre un soin raisonnable des articles et les tenir à l’écart des risques prévisibles comme les flammes nues et les liquides, et doit s’abstenir de les déplacer, de les modifier, d’y fixer quoi que ce soit, de les couper, de les marquer ou de les retirer, ou de permettre à quiconque autre que l’équipe du Prestataire de manipuler ou d’ajuster l’installation. Le Client doit s’assurer que les articles demeurent sur les lieux et accessibles au Prestataire pour le démontage à l’heure prévue.",
  "Perte et dommages. Le Client est responsable de la perte, du vol ou des dommages subis par les articles loués entre la livraison et le démontage, y compris lorsqu’ils sont causés par ses invités, ses fournisseurs ou le personnel du lieu, à l’exception de l’usure normale, des pertes ou dommages causés par le Prestataire ou son équipe et de ceux résultant d’une force majeure, et sous réserve de la loi applicable. Le Prestataire avise le Client par écrit dans un délai raisonnable après le démontage, avec une description de la perte ou des dommages et des pièces justificatives, comme des photographies. Le Client doit payer le coût raisonnable du nettoyage au-delà de l’usage normal, de la réparation ou, si la réparation n’est pas raisonnablement possible, du remplacement — sans excéder le coût d’un article équivalent — ainsi que la main-d’œuvre connexe.",
  "Responsabilité. Chaque partie est responsable du préjudice causé par sa propre faute, conformément à la loi. Le Prestataire n’est pas responsable des retards, lacunes ou dommages causés par des renseignements inexacts fournis par le Client, un manque d’accès, des conditions dangereuses sur les lieux ou les actes du lieu, d’autres fournisseurs ou d’invités qui ne relèvent pas du Prestataire. Rien dans le Contrat n’exclut ni ne limite la responsabilité pour le préjudice corporel ou moral, pour une faute intentionnelle ou lourde, ou lorsque la loi ne permet pas une telle exclusion ou limitation.",
  "Apparence et rendus. Les rendus, dessins Studio, photographies, échantillons et images conceptuelles servent à la planification et ne constituent pas des spécifications. L’apparence finale peut varier en raison des dimensions du lieu, de l’éclairage, des caractéristiques des tissus, de l’inventaire disponible et des conditions d’installation.",
  "Force majeure. Aucune partie n’est responsable de l’inexécution ou du retard d’exécution d’une obligation dans la mesure où ils sont causés par une force majeure au sens du Code civil du Québec, soit un événement imprévisible et irrésistible tel que des conditions météorologiques extrêmes, un incendie, une inondation, une épidémie ou une ordonnance de santé publique, une mesure gouvernementale ou une panne généralisée des services publics ou des transports. Le manque de fonds et les situations que la partie touchée pouvait raisonnablement prévoir ou éviter ne constituent pas une force majeure. La partie touchée doit aviser l’autre partie par écrit dès que possible, prendre des mesures raisonnables pour en limiter les conséquences et reprendre l’exécution dès qu’elle le peut. Les parties tentent d’abord de bonne foi de convenir d’une nouvelle date conformément à la clause « Report ». Si l’exécution devient impossible ou si aucune nouvelle date n’est convenue, l’une ou l’autre partie peut mettre fin au Contrat par avis écrit; le Client paie alors les travaux exécutés et les coûts engagés qui ne peuvent être récupérés, et le Prestataire rembourse tout excédent des sommes versées, sous réserve de la loi applicable.",
  "Avis. Les avis prévus au Contrat doivent être donnés par écrit et peuvent être transmis par courriel aux adresses indiquées au Contrat, ou à toute autre adresse qu’une partie désigne par écrit. Un avis prend effet à sa réception.",
  "Documents et signatures électroniques. Les parties conviennent de conclure, de signer et de conserver le Contrat et les documents connexes sur support électronique. Une signature ou des initiales apposées au moyen du processus de signature sécurisé du Prestataire, avec le registre d’audit qui s’y rattache, ont le même effet qu’une signature manuscrite, conformément à la Loi concernant le cadre juridique des technologies de l’information. Une copie du Contrat signé est transmise au Client par courriel.",
  "Intégralité du contrat. Le Contrat, y compris les révisions approuvées conformément à la clause « Modifications et frais supplémentaires », constitue l’entente complète entre les parties quant à son objet et remplace toute estimation, version antérieure de la soumission ou discussion qu’il n’intègre pas. Il ne peut être modifié que par écrit avec l’approbation des deux parties. Si une disposition est jugée invalide ou inapplicable, les autres dispositions du Contrat demeurent en vigueur.",
  "Droit applicable et droits du consommateur. Le Contrat est régi par les lois du Québec et les lois fédérales du Canada qui s’y appliquent. Si le Client est un consommateur au sens de la Loi sur la protection du consommateur, rien dans le Contrat ne limite les droits que lui confèrent cette loi ou toute autre loi d’ordre public, et chaque disposition ne s’applique que dans la mesure permise par celles-ci.",
  "Langue. Le présent contrat est rédigé en français, et une version anglaise est également offerte. La version française lie les parties, à moins que le Client, après avoir reçu la version française, n’ait expressément choisi d’être lié par la version anglaise, tel que consigné dans son consentement à la signature électronique; la version anglaise lie alors les parties. Le même choix s’applique aux documents qui se rattachent au Contrat.",
].join("\n");

/** One term per line. Numbered bullets/dashes are stripped so PDF and web match. */
export function splitQuoteTerms(
  terms: string | null | undefined,
  fallback?: string | null
): string[] {
  const raw = (terms?.trim() || fallback?.trim() || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^currency is cad\.?$/i.test(line));
}

function normalizedTerms(value: string | null | undefined): string {
  return splitQuoteTerms(value).join("\n").trim();
}

/**
 * The standard terms text in the other language when `stored` is a default or
 * legacy default; null when the terms were customised for this quote.
 */
export function standardQuoteTermsIn(
  stored: string | null | undefined,
  quoteLanguage: CustomerLanguage,
  viewLanguage: CustomerLanguage,
  configured: Partial<Record<CustomerLanguage, string>> = {}
): string | null {
  const storedTerms = normalizedTerms(stored);
  if (!storedTerms) return null;
  const defaults = [
    configured[quoteLanguage],
    quoteLanguage === "fr" ? DEFAULT_QUOTE_TERMS_FR : DEFAULT_QUOTE_TERMS,
  ];
  if (defaults.some((value) => value && normalizedTerms(value) === storedTerms)) {
    return (
      configured[viewLanguage] ??
      (viewLanguage === "fr" ? DEFAULT_QUOTE_TERMS_FR : DEFAULT_QUOTE_TERMS)
    );
  }
  const legacy = LEGACY_QUOTE_TERMS.find(
    (pair) => normalizedTerms(pair[quoteLanguage]) === storedTerms
  );
  return legacy ? legacy[viewLanguage] : null;
}

export function otherCustomerLanguage(language: CustomerLanguage): CustomerLanguage {
  return language === "fr" ? "en" : "fr";
}

/** Base text when viewing in the base language, otherwise its translation (base as last resort). */
export function textInLanguage(
  base: string | null | undefined,
  translated: string | null | undefined,
  baseLanguage: CustomerLanguage,
  viewLanguage: CustomerLanguage
): string {
  if (viewLanguage === baseLanguage) return base ?? "";
  return translated?.trim() || base || "";
}

/** Customer-visible lines with text but no translation into the other language. */
export function linesMissingTranslation<
  T extends { description: string; description_translated?: string | null; customer_visible?: boolean },
>(lines: T[]): T[] {
  return lines.filter(
    (line) =>
      line.customer_visible !== false &&
      line.description.trim() &&
      !line.description_translated?.trim()
  );
}
export const QUOTE_TAX_MODES = ["quebec_gst_qst", "none", "manual"] as const;
export type QuoteTaxMode = (typeof QUOTE_TAX_MODES)[number];

export const QUOTE_TAX_MODE_LABELS: Record<QuoteTaxMode, string> = {
  quebec_gst_qst: "Quebec GST/QST",
  none: "No tax",
  manual: "Manual tax",
};

export const QUOTE_TAX_CATEGORIES = ["standard", "exempt", "custom"] as const;
export type QuoteTaxCategory = (typeof QUOTE_TAX_CATEGORIES)[number];

export const DEFAULT_GST_RATE = 0.05;
export const DEFAULT_QST_RATE = 0.09975;

/** One manual tax line — rate is a decimal fraction of taxable subtotal. */
export type QuoteManualTaxLine = {
  label: string;
  rate: number;
};

export function normalizeManualTaxLines(
  value: unknown
): QuoteManualTaxLine[] {
  if (!Array.isArray(value)) return [];
  const lines: QuoteManualTaxLine[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const label =
      typeof record.label === "string" ? record.label.trim() : "";
    const rate = Number(record.rate);
    if (!Number.isFinite(rate) || rate < 0) continue;
    lines.push({
      label: label || "Tax",
      rate: Math.min(rate, 5), // hard cap 500%
    });
  }
  return lines;
}

/** Parse UI percent string ("13" / "9.975") into decimal rate. */
export function percentInputToRate(value: string): number {
  const n = Number.parseFloat(value.replace("%", "").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n / 100, 5);
}

/** Format decimal rate for percent inputs. */
export function rateToPercentInput(rate: number): string {
  const pct = Number((Number(rate) * 100).toFixed(4));
  if (!Number.isFinite(pct) || pct < 0) return "0";
  return Number.isInteger(pct) ? String(pct) : String(pct);
}

export function computeManualTaxLineCents(
  taxableSubtotalCents: number,
  rate: number
): number {
  const safeRate =
    Number.isFinite(rate) && rate > 0 ? Math.min(rate, 5) : 0;
  return Math.max(0, Math.round(taxableSubtotalCents * safeRate));
}

export type QuoteRow = {
  id: string;
  customer_id?: string | null;
  estimate_request_id: string;
  opportunity_ref: string;
  revision_number: number;
  quote_display_ref: string;
  customer_name: string | null;
  customer_email: string;
  event_date: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  install_date?: string | null;
  install_start_time?: string | null;
  install_end_time?: string | null;
  teardown_date?: string | null;
  teardown_start_time?: string | null;
  teardown_end_time?: string | null;
  event_type: string | null;
  venue_name: string | null;
  venue_address?: string | null;
  customer_venue_id?: string | null;
  city_area: string | null;
  payment_deposit_mode?: DepositMode | null;
  payment_deposit_percent?: number | null;
  payment_deposit_fixed_cents?: number | null;
  payment_deposit_due_rule?: QuoteDepositDueRule | null;
  payment_deposit_due_date?: string | null;
  payment_balance_due_rule?: QuoteBalanceDueRule | null;
  payment_balance_due_days?: number | null;
  payment_balance_due_date?: string | null;
  status: QuoteStatus;
  /** Customer-facing language for proposal page, PDF, and emails. */
  language?: CustomerLanguage | null;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  tax_mode: QuoteTaxMode;
  gst_rate: number;
  qst_rate: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_label: string | null;
  manual_tax_cents: number;
  /** Percentage lines for tax_mode = manual. rate is a decimal (0.13 = 13%). */
  manual_tax_lines: QuoteManualTaxLine[];
  total_before_tax_cents: number;
  total_tax_cents: number;
  valid_until: string | null;
  customer_notes: string | null;
  /** customer_notes in the language other than `language`. */
  customer_notes_translated?: string | null;
  owner_notes: string | null;
  terms: string | null;
  /** Custom terms in the language other than `language`. */
  terms_translated?: string | null;
  /** Language the customer chose to be bound by; null until accepted. */
  agreed_language?: CustomerLanguage | null;
  public_token_hash: string | null;
  public_token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  /** Confirmed customer reads (real browser, owner excluded). */
  view_count: number;
  last_viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  declined_at: string | null;
  declined_by_name: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  /** product_categories.slug or a built-in QuoteLineCategory. */
  category: string;
  category_label?: string | null;
  category_label_fr?: string | null;
  description: string;
  /** description in the language other than the quote's language. */
  description_translated?: string | null;
  quantity: number;
  /** How the line is priced, e.g. "linear ft", "set". Null on older lines. */
  unit_label?: string | null;
  unit_price_cents: number;
  line_total_cents: number;
  status: QuoteLineStatus;
  customer_visible: boolean;
  is_taxable: boolean;
  tax_category: QuoteTaxCategory;
  sort_order: number;
  product_id: string | null;
  image_url: string | null;
  image_alt: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteCustomerRequestRow = {
  id: string;
  quote_id: string;
  estimate_request_id: string;
  request_type: QuoteRequestType;
  source_key: string | null;
  title: string;
  message: string | null;
  status: QuoteRequestStatus;
  owner_response: string | null;
  created_by_email: string | null;
  created_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteEventRow = {
  id: string;
  quote_id: string;
  actor_type: "owner" | "customer" | "system" | "public_link";
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: QuoteEventType;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Customer-safe quote payload — never includes owner_notes, events, or token hash. */
export type CustomerSafeQuote = {
  id: string;
  estimate_request_id: string;
  opportunity_ref: string;
  revision_number: number;
  quote_display_ref: string;
  customer_name: string | null;
  customer_email: string;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  install_date: string | null;
  install_start_time: string | null;
  install_end_time: string | null;
  teardown_date: string | null;
  teardown_start_time: string | null;
  teardown_end_time: string | null;
  event_type: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city_area: string | null;
  payment_deposit_mode: DepositMode | null;
  payment_deposit_percent: number | null;
  payment_deposit_fixed_cents: number | null;
  payment_deposit_due_rule: QuoteDepositDueRule | null;
  payment_deposit_due_date: string | null;
  payment_balance_due_rule: QuoteBalanceDueRule | null;
  payment_balance_due_days: number | null;
  payment_balance_due_date: string | null;
  status: QuoteStatus;
  language: CustomerLanguage;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  tax_mode: QuoteTaxMode;
  gst_rate: number;
  qst_rate: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_label: string | null;
  manual_tax_cents: number;
  /** Percentage lines for tax_mode = manual. rate is a decimal (0.13 = 13%). */
  manual_tax_lines: QuoteManualTaxLine[];
  total_before_tax_cents: number;
  total_tax_cents: number;
  valid_until: string | null;
  customer_notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  declined_at: string | null;
  declined_by_name: string | null;
  created_at: string;
  updated_at: string;
  line_items: QuoteLineItemRow[];
  requests: QuoteCustomerRequestRow[];
  share_url?: string | null;
  /** From the linked customer profile, when it has a company or billing address. */
  bill_to?: QuoteBillTo | null;
  /** Service provider identity frozen into a signing snapshot; absent on older signatures. */
  contract_provider?: QuoteContractProvider | null;
};

export type QuoteBillTo = {
  company_name: string | null;
  /** Multi-line billing address. */
  address: string | null;
};

export type QuoteContractProvider = {
  legal_name: string;
  trade_name: string;
  /** Multi-line postal address. */
  address: string;
  phone: string;
  email: string;
  website: string;
  neq: string;
  gst_number: string;
  qst_number: string;
};

export type QuoteTaxTotalsInput = {
  tax_mode?: QuoteTaxMode | string | null;
  gst_rate?: number | null;
  qst_rate?: number | null;
  manual_tax_cents?: number | null;
  manual_tax_lines?: QuoteManualTaxLine[] | null;
};

export type QuoteTaxTotals = {
  subtotal_cents: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_cents: number;
  total_before_tax_cents: number;
  total_tax_cents: number;
  total_cents: number;
};

export type QuoteTaxBreakdownRow = {
  key: string;
  label: string;
  amountCents: number;
  emphasis?: "muted" | "total";
};

/**
 * Compute quote totals from priced line items + tax mode.
 * GST/QST round per-tax from taxable subtotal only.
 */
export function computeQuoteTaxTotals(
  items: Array<
    Pick<QuoteLineItemRow, "status" | "line_total_cents" | "is_taxable">
  >,
  quote: QuoteTaxTotalsInput = {}
): QuoteTaxTotals {
  const rawMode = quote.tax_mode || "quebec_gst_qst";
  const taxMode: QuoteTaxMode = isQuoteTaxMode(rawMode)
    ? rawMode
    : "quebec_gst_qst";
  const gstRate =
    Number.isFinite(Number(quote.gst_rate)) && Number(quote.gst_rate) >= 0
      ? Number(quote.gst_rate)
      : DEFAULT_GST_RATE;
  const qstRate =
    Number.isFinite(Number(quote.qst_rate)) && Number(quote.qst_rate) >= 0
      ? Number(quote.qst_rate)
      : DEFAULT_QST_RATE;
  const manualLines = normalizeManualTaxLines(quote.manual_tax_lines);
  const legacyManualTaxCents = Math.max(
    0,
    Math.round(Number(quote.manual_tax_cents) || 0)
  );

  let subtotal = 0;
  let taxable = 0;
  let nontaxable = 0;

  for (const item of items) {
    if (item.status !== "priced" && item.status !== "included") continue;
    if (item.status === "included") continue;
    const lineTotal = Number(item.line_total_cents) || 0;
    subtotal += lineTotal;
    if (item.is_taxable !== false) {
      taxable += lineTotal;
    } else {
      nontaxable += lineTotal;
    }
  }

  let gstCents = 0;
  let qstCents = 0;
  let appliedManual = 0;
  let totalTax = 0;

  if (taxMode === "quebec_gst_qst") {
    gstCents = Math.round(taxable * gstRate);
    qstCents = Math.round(taxable * qstRate);
    totalTax = gstCents + qstCents;
  } else if (taxMode === "manual") {
    if (manualLines.length > 0) {
      appliedManual = manualLines.reduce(
        (sum, line) =>
          sum + computeManualTaxLineCents(taxable, line.rate),
        0
      );
    } else {
      // Legacy fixed-dollar manual tax
      appliedManual = legacyManualTaxCents;
    }
    totalTax = appliedManual;
  }

  return {
    subtotal_cents: subtotal,
    taxable_subtotal_cents: taxable,
    nontaxable_subtotal_cents: nontaxable,
    gst_cents: gstCents,
    qst_cents: qstCents,
    manual_tax_cents: appliedManual,
    total_before_tax_cents: subtotal,
    total_tax_cents: totalTax,
    total_cents: subtotal + totalTax,
  };
}

function formatTaxPercent(
  rate: number,
  language: CustomerLanguage = "en"
): string {
  const pct = Number((Number(rate) * 100).toFixed(3));
  return language === "fr"
    ? `${String(pct).replace(".", ",")} %`
    : `${pct}%`;
}

const TAX_ROW_LABELS: Record<
  CustomerLanguage,
  {
    subtotal: string;
    taxable: string;
    nontaxable: string;
    gst: string;
    qst: string;
    tax: string;
    total: (currency: string | null | undefined) => string;
  }
> = {
  en: {
    subtotal: "Subtotal",
    taxable: "Taxable subtotal",
    nontaxable: "Non-taxable subtotal",
    gst: "GST",
    qst: "QST",
    tax: "Tax",
    total: (currency) => `Total ${currency === "USD" ? "USD" : "CAD"}`,
  },
  fr: {
    subtotal: "Sous-total",
    taxable: "Sous-total taxable",
    nontaxable: "Sous-total non taxable",
    gst: "TPS",
    qst: "TVQ",
    tax: "Taxe",
    total: (currency) => `Total (${currency === "USD" ? "$ US" : "$ CA"})`,
  },
};

export function isQuoteTaxMode(value: string): value is QuoteTaxMode {
  return (QUOTE_TAX_MODES as readonly string[]).includes(value);
}

export function isQuoteTaxCategory(value: string): value is QuoteTaxCategory {
  return (QUOTE_TAX_CATEGORIES as readonly string[]).includes(value);
}

/** Shared tax rows for admin, customer proposal, PDF, and email. */
export function getQuoteTaxBreakdownRows(
  quote: Pick<
    QuoteRow,
    | "tax_mode"
    | "subtotal_cents"
    | "taxable_subtotal_cents"
    | "nontaxable_subtotal_cents"
    | "gst_cents"
    | "qst_cents"
    | "gst_rate"
    | "qst_rate"
    | "manual_tax_label"
    | "manual_tax_cents"
    | "manual_tax_lines"
    | "total_cents"
  >,
  options?: {
    variant?: "admin" | "customer";
    language?: CustomerLanguage;
    currency?: string | null;
  }
): QuoteTaxBreakdownRow[] {
  const variant = options?.variant ?? "customer";
  const language = options?.language ?? "en";
  const labels = TAX_ROW_LABELS[language];
  const taxMode = isQuoteTaxMode(quote.tax_mode || "")
    ? quote.tax_mode
    : "none";
  const rows: QuoteTaxBreakdownRow[] = [
    {
      key: "subtotal",
      label: labels.subtotal,
      amountCents: quote.subtotal_cents || 0,
    },
  ];

  if (taxMode === "quebec_gst_qst") {
    const showSplit =
      variant === "admin" || (quote.nontaxable_subtotal_cents || 0) > 0;
    if (showSplit) {
      rows.push({
        key: "taxable",
        label: labels.taxable,
        amountCents: quote.taxable_subtotal_cents || 0,
        emphasis: "muted",
      });
      if ((quote.nontaxable_subtotal_cents || 0) > 0) {
        rows.push({
          key: "nontaxable",
          label: labels.nontaxable,
          amountCents: quote.nontaxable_subtotal_cents || 0,
          emphasis: "muted",
        });
      }
    }
    rows.push(
      {
        key: "gst",
        label: `${labels.gst} ${formatTaxPercent(Number(quote.gst_rate) || DEFAULT_GST_RATE, language)}`,
        amountCents: quote.gst_cents || 0,
      },
      {
        key: "qst",
        label: `${labels.qst} ${formatTaxPercent(Number(quote.qst_rate) || DEFAULT_QST_RATE, language)}`,
        amountCents: quote.qst_cents || 0,
      }
    );
  } else if (taxMode === "manual") {
    const taxable = quote.taxable_subtotal_cents || 0;
    const manualLines = normalizeManualTaxLines(quote.manual_tax_lines);
    if (manualLines.length > 0) {
      if (variant === "admin" || (quote.nontaxable_subtotal_cents || 0) > 0) {
        rows.push({
          key: "taxable",
          label: labels.taxable,
          amountCents: taxable,
          emphasis: "muted",
        });
      }
      manualLines.forEach((line, index) => {
        rows.push({
          key: `manual-${index}`,
          label: `${line.label} ${formatTaxPercent(line.rate, language)}`,
          amountCents: computeManualTaxLineCents(taxable, line.rate),
        });
      });
    } else {
      rows.push({
        key: "manual",
        label: (quote.manual_tax_label || labels.tax).trim() || labels.tax,
        amountCents: quote.manual_tax_cents || 0,
      });
    }
  }

  rows.push({
    key: "total",
    label: labels.total(options?.currency),
    amountCents: quote.total_cents || 0,
    emphasis: "total",
  });

  return rows;
}

export function formatCadFromCents(
  cents: number,
  language: CustomerLanguage = "en"
): string {
  return formatMoneyFromCents(cents, language, "CAD");
}

/** CAD prints as "$"; USD prints as "US$" so the two are never confused. */
export function formatMoneyFromCents(
  cents: number,
  language: CustomerLanguage = "en",
  currency: string | null | undefined = "CAD"
): string {
  const value = (Number(cents) || 0) / 100;
  return new Intl.NumberFormat(customerLocaleTag(language), {
    style: "currency",
    currency: currency === "USD" ? "USD" : "CAD",
  }).format(value);
}

/**
 * Customer-facing quote reference.
 * Internal revision_number 1 = original (no -R suffix).
 * revision_number 2 = first revision → Quote TCG-10004-R1 / Soumission TCG-10004-R1
 */
export function formatQuoteDisplayRef(
  opportunityRef: string,
  revisionNumber: number,
  language: CustomerLanguage = "en"
): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  const word = language === "fr" ? "Soumission" : "Quote";
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return `${word} ${ref}`;
  }
  return `${word} ${ref}-R${revisionNumber - 1}`;
}

/** Reference the customer sees — never the admin "Draft Quote" heading. */
export function customerQuoteDisplayRef(quote: {
  opportunity_ref: string;
  revision_number: number;
  language?: CustomerLanguage | null;
}): string {
  return formatQuoteDisplayRef(
    quote.opportunity_ref,
    quote.revision_number,
    quote.language ?? "en"
  );
}

/** Draft admin heading — never includes -R1 for the original quote. */
export function formatDraftQuoteHeading(opportunityRef: string): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  return `Draft Quote — ${ref}`;
}

/**
 * Resolve display ref from live opportunity + revision.
 * Prefer this over stored quote_display_ref so older "-R1" originals display correctly.
 */
export function resolveQuoteDisplayRef(quote: {
  opportunity_ref: string;
  revision_number: number;
  status?: QuoteStatus | string | null;
}): string {
  if (quote.status === "draft" && quote.revision_number <= 1) {
    return formatDraftQuoteHeading(quote.opportunity_ref);
  }
  return formatQuoteDisplayRef(quote.opportunity_ref, quote.revision_number);
}

/**
 * Metadata label: Original (or null) for first quote; Rev 1 for second version, etc.
 */
export function formatQuoteRevisionLabel(
  revisionNumber: number,
  options?: { hideOriginal?: boolean }
): string | null {
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return options?.hideOriginal ? null : "Original";
  }
  return `Rev ${revisionNumber - 1}`;
}

/** Customer-visible revision index, or null for the original quote. */
export function getCustomerRevisionNumber(
  revisionNumber: number
): number | null {
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) return null;
  return revisionNumber - 1;
}

/** PDF / download filename stem without the "Quote " prefix. */
export function formatQuoteFilenameStem(
  opportunityRef: string,
  revisionNumber: number
): string {
  const ref = opportunityRef.trim() || "TCG-PENDING";
  if (!Number.isFinite(revisionNumber) || revisionNumber <= 1) {
    return ref;
  }
  return `${ref}-R${revisionNumber - 1}`;
}

/**
 * Quote line unit prices keep sub-cent precision so quantity × unit price can
 * land on an exact total ($10,000 / 600 ft = 1666.666667¢). Line totals and
 * every quote total stay whole cents.
 */
export const UNIT_PRICE_CENT_DECIMALS = 6;

export function normalizeUnitPriceCents(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** UNIT_PRICE_CENT_DECIMALS;
  return Math.round(n * factor) / factor;
}

export function unitPriceDollarsToCents(dollars: string | number): number {
  const n =
    typeof dollars === "string"
      ? Number.parseFloat(dollars.replace(",", "."))
      : Number(dollars);
  return Number.isFinite(n) ? normalizeUnitPriceCents(n * 100) : 0;
}

/** Input text for a unit price: at least 2 decimals, more only when needed. */
export function unitPriceCentsToDollarInput(cents: number): string {
  const fixed = ((Number(cents) || 0) / 100).toFixed(UNIT_PRICE_CENT_DECIMALS + 2);
  return fixed.replace(/(\.\d{2}\d*?)0+$/, "$1");
}

/** Unit price that makes `quantity` × unit round to exactly `lineTotalCents`. */
export function unitPriceCentsForLineTotal(
  lineTotalCents: number,
  quantity: number
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return normalizeUnitPriceCents(lineTotalCents / quantity);
}

export function computeLineTotalCents(
  quantity: number,
  unitPriceCents: number
): number {
  const qty = Number.isFinite(quantity) ? quantity : 0;
  const unit = Number.isFinite(unitPriceCents) ? unitPriceCents : 0;
  return Math.round(qty * unit);
}

export function sumPricedSubtotalCents(items: QuoteLineItemRow[]): number {
  return items
    .filter((item) => item.status === "priced" || item.status === "included")
    .reduce((sum, item) => {
      if (item.status === "included") return sum;
      return sum + (item.line_total_cents || 0);
    }, 0);
}

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(value);
}

export function isQuoteLineCategory(value: string): value is QuoteLineCategory {
  return (QUOTE_LINE_CATEGORIES as readonly string[]).includes(value);
}

export function isQuoteLineStatus(value: string): value is QuoteLineStatus {
  return (QUOTE_LINE_STATUSES as readonly string[]).includes(value);
}
