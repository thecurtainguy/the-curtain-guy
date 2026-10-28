import type { CustomerLanguage } from "@/data/customer-language";
import { formatQuoteDate } from "@/data/quote-copy";
import { quotePaymentRows } from "@/data/quote-payment-terms";
import { quoteScheduleRows } from "@/data/quote-schedule";
import { formatMoneyFromCents, type CustomerSafeQuote } from "@/data/quotes";

export const SIGNING_CODE_LENGTH = 6;
export const SIGNING_CODE_TTL_MINUTES = 10;
export const SIGNING_SESSION_TTL_MINUTES = 45;
export const SIGNING_MAX_CODE_ATTEMPTS = 5;
export const SIGNING_MAX_CODE_SENDS = 5;
export const SIGNING_RESEND_COOLDOWN_SECONDS = 45;
/** Data-URL cap for a signature/initials PNG (canvas output is ~10–40 KB). */
export const SIGNATURE_IMAGE_MAX_CHARS = 400_000;

export const SIGNING_CLAUSE_KEYS = ["schedule", "payment", "cancellation", "care"] as const;
export type SigningClauseKey = (typeof SIGNING_CLAUSE_KEYS)[number];

export type SignatureMethod = "typed" | "drawn";

export type SigningClause = {
  key: SigningClauseKey;
  title: string;
  facts: Array<{ label: string; value: string }>;
  statement: string;
};

/** Stored per clause when the customer initials it. */
export type SigningAcknowledgement = {
  key: SigningClauseKey;
  title: string;
  statement: string;
  initialed_at: string;
};

/** What the customer (and admin) can see about an executed agreement. */
export type QuoteAgreementSummary = {
  id: string;
  status: "signed" | "countersigned";
  language: CustomerLanguage;
  signerName: string;
  signerTitle: string | null;
  signerEmail: string;
  signedAt: string;
  signatureImage: string;
  initials: string | null;
  documentHash: string;
  countersignerName: string | null;
  countersignerTitle: string | null;
  countersignedAt: string | null;
  countersignImage: string | null;
};

/** Owner-only audit fields shown in admin and on the certificate. */
export type QuoteAgreementAudit = QuoteAgreementSummary & {
  verifiedAt: string | null;
  signerIp: string | null;
  signerUserAgent: string | null;
  signerLocation: string | null;
  channel: "public_link" | "account";
  acknowledgements: SigningAcknowledgement[];
  consentText: string | null;
  signatureMethod: SignatureMethod | null;
  /** Exact wording of the language option the signer selected; null on older signatures. */
  languageChoiceText: string | null;
  frenchVersionProvidedVia: "email_attachment" | "pdf_opened" | "owner_sent" | null;
  frenchVersionProvidedAt: string | null;
};

export function signingConsentText(language: CustomerLanguage, signerName: string, displayRef: string): string {
  const quoteRef = displayRef.replace(/^(Quote|Soumission)\s+/i, "");
  return language === "fr"
    ? `En sélectionnant « Signer et accepter », moi, ${signerName}, reconnais que ma signature et mes initiales électroniques ont la même valeur juridique que ma signature manuscrite, que je suis autorisé(e) à signer au nom du client indiqué, et que j’accepte la soumission ${quoteRef} dans la version qui m’est présentée, y compris son horaire, sa portée, ses quantités, ses prix et son calendrier de paiement, ainsi que l’ensemble des conditions. Je consens à recevoir cette entente et les avis connexes par voie électronique.`
    : `By selecting “Sign & accept”, I, ${signerName}, agree that my electronic signature and initials are the legal equivalent of my handwritten signature, that I am authorized to sign on behalf of the client named in this agreement, and that I accept quote ${quoteRef} in the version displayed to me, including its schedule, scope, quantities, pricing and payment schedule, and all terms and conditions. The French version of this agreement was provided to me before signing, and I expressly wish to be bound by its English version. I consent to receive this agreement and related notices electronically.`;
}

/**
 * The signing-language choice, shown bilingually so each option reads in its
 * own language. Selecting English is the customer's express choice; the
 * selected option's exact wording is stored with the signature.
 */
export const SIGNING_LANGUAGE_CHOICE = {
  heading: "Langue du contrat · Contract language",
  body: "Les versions française et anglaise vous ont été transmises. Choisissez la version qui vous liera. · The French and English versions were provided to you. Choose the version that will bind you.",
  options: {
    fr: {
      label: "Français",
      description: "Je signe et suis lié(e) par la version française du contrat.",
    },
    en: {
      label: "English",
      description:
        "The French version was provided to me first. I expressly choose to sign and be bound by the English version.",
    },
  },
  frenchFirst: {
    title: "Consultez d’abord la version française · Open the French version first",
    body: "Pour signer en anglais, ouvrez la version française du contrat. · To sign in English, open the French version of the agreement.",
    open: "Ouvrir la version française (PDF)",
    opened: "Version française consultée · French version opened",
  },
  errors: {
    frenchFirst:
      "Ouvrez la version française avant de choisir l’anglais. · Please open the French version before choosing English.",
  },
} as const;

/** Exact wording recorded as the signer's language choice. */
export function signingLanguageChoiceText(language: CustomerLanguage): string {
  const option = SIGNING_LANGUAGE_CHOICE.options[language];
  return `${option.label} — ${option.description}`;
}

/** "Marie-Ève Tremblay" → "MÈT". */
export function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toLocaleUpperCase())
    .join("")
    .slice(0, 4);
}

type ClauseSource = Pick<
  CustomerSafeQuote,
  | "event_date"
  | "event_start_time"
  | "event_end_time"
  | "install_date"
  | "install_start_time"
  | "install_end_time"
  | "teardown_date"
  | "teardown_start_time"
  | "teardown_end_time"
  | "venue_name"
  | "venue_address"
  | "city_area"
  | "total_cents"
  | "currency"
  | "valid_until"
  | "payment_deposit_mode"
  | "payment_deposit_percent"
  | "payment_deposit_fixed_cents"
  | "payment_deposit_due_rule"
  | "payment_deposit_due_date"
  | "payment_balance_due_rule"
  | "payment_balance_due_days"
  | "payment_balance_due_date"
>;

/** The four key clauses the customer initials, generated from the quote's own dates and amounts. */
export function buildSigningClauses(quote: ClauseSource, language: CustomerLanguage): SigningClause[] {
  const fr = language === "fr";
  const currency = quote.currency === "USD" ? "USD" : "CAD";
  const money = (cents: number) => formatMoneyFromCents(cents, language, currency);
  const date = (value: string | null | undefined) => formatQuoteDate(value, language, "—");

  const scheduleRows = quoteScheduleRows(quote, language);
  const scheduleFacts = (
    scheduleRows.length
      ? scheduleRows
      : [{ key: "event", label: fr ? "Événement" : "Event", date: quote.event_date, window: null }]
  ).map((row) => ({
    label: row.label,
    value: [row.date ? date(row.date) : null, row.window].filter(Boolean).join(" · ") || (fr ? "À confirmer" : "To be confirmed"),
  }));
  const venue = [quote.venue_name, quote.venue_address].filter(Boolean).join(", ") || quote.city_area;
  if (venue) scheduleFacts.push({ label: fr ? "Lieu" : "Venue", value: venue });

  const paymentFacts = quotePaymentRows(quote, language).map((row) => ({
    label: row.label,
    value: `${money(row.amountCents)} · ${row.due}`,
  }));
  paymentFacts.push({ label: "Total", value: money(quote.total_cents) });

  return [
    {
      key: "schedule",
      title: fr ? "Dates, horaire et lieu" : "Dates, schedule & venue",
      facts: scheduleFacts,
      statement: fr
        ? "Je confirme que ces dates, heures et ce lieu sont exacts. J’obtiendrai les autorisations requises du lieu et j’assurerai un accès sécuritaire et dégagé à une aire d’installation prête pendant toutes les plages d’installation et de démontage."
        : "I confirm these dates, times, and venue are correct. I will obtain any permissions the venue requires and ensure safe, clear access to a prepared installation area for the full installation and teardown windows.",
    },
    {
      key: "payment",
      title: fr ? "Calendrier de paiement" : "Payment schedule",
      facts: paymentFacts,
      statement: fr
        ? "J’accepte de payer les montants ci-dessus selon ce calendrier. La réservation est confirmée lorsque The Curtain Guy contresigne, et la date, l’inventaire et l’équipe sont réservés à la réception du dépôt. Toute somme en retard porte intérêt à 2 % par mois (26,82 % par année)."
        : "I agree to pay the amounts above on this schedule. The booking is confirmed when The Curtain Guy countersigns, and the date, inventory, and crew are reserved once the deposit is received. Overdue amounts bear interest at 2% per month (26.82% per year).",
    },
    {
      key: "cancellation",
      title: fr ? "Annulation et report" : "Cancellation & rescheduling",
      facts: [],
      statement: fr
        ? "Je peux annuler par avis écrit. Je paierai alors la valeur des travaux déjà exécutés, les matériaux commandés spécialement, l’équipe engagée qui ne peut être réaffectée et les frais de tiers non récupérables; les sommes versées y sont imputées et tout excédent m’est remboursé. Toute nouvelle date dépend de la disponibilité et peut entraîner une révision des prix."
        : "I may cancel by written notice. I will then pay the value of work already performed, specially ordered materials, committed crew that cannot be reassigned, and non-recoverable third-party costs; amounts I have paid are applied to these and any surplus is refunded. A new date depends on availability and may change the pricing.",
    },
    {
      key: "care",
      title: fr ? "Articles loués et dommages" : "Rental items & damage",
      facts: [],
      statement: fr
        ? "Les drapés et articles loués demeurent la propriété de The Curtain Guy. Je ne les déplacerai ni ne les modifierai, je suis responsable de leur perte ou de leurs dommages entre la livraison et le démontage, y compris par mes invités, mes fournisseurs ou le personnel du lieu (hors usure normale et dommages causés par The Curtain Guy), et je m’assure qu’ils restent accessibles pour le démontage."
        : "Drapes and rental items remain the property of The Curtain Guy. I will not move or alter them, I am responsible for loss or damage between delivery and teardown, including by my guests, vendors, or venue staff (excluding ordinary wear and damage caused by The Curtain Guy), and I will keep them accessible for teardown.",
    },
  ];
}

export const QUOTE_SIGNING_COPY = {
  en: {
    launch: "Review & sign",
    launchHint: "Secure e-signature · about 2 minutes",
    ceremonyTitle: "Sign your agreement",
    secureBadge: "Secure e-signature",
    close: "Close",
    back: "Back",
    next: "Continue",
    steps: { verify: "Verify", review: "Review", terms: "Terms", sign: "Sign" },
    verifyEyebrow: "Step 1 · Identity",
    verifyTitle: "Confirm it’s you",
    verifyBody: (email: string) =>
      `We’ll email a 6-digit code to ${email} to confirm the signer’s identity.`,
    fullName: "Full legal name",
    fullNamePlaceholder: "First and last name",
    titleLabel: "Title or role (optional)",
    titlePlaceholder: "e.g. Bride, Event planner, Director",
    sendCode: "Email me a code",
    resendCode: "Resend code",
    resendIn: (seconds: number) => `Resend in ${seconds}s`,
    codeSent: (email: string) => `Code sent to ${email}. It expires in 10 minutes.`,
    codeLabel: "Verification code",
    verifyCode: "Verify code",
    verified: "Identity verified",
    reviewEyebrow: "Step 2 · Review",
    reviewTitle: "Your event at a glance",
    reviewBody: "Check every detail below. These exact details become part of your signed agreement.",
    scopeTitle: "Scope",
    itemsCount: (count: number) => (count === 1 ? "1 item" : `${count} items`),
    totalLabel: "Agreement total",
    paymentTitle: "Payment schedule",
    validUntil: "Valid until",
    termsEyebrow: "Step 3 · Terms",
    termsTitle: "Initial the key clauses",
    termsBody: "Tap “Initial” on each key clause, then confirm you agree to the full terms.",
    initialsLabel: "Your initials",
    initialHere: "Initial",
    initialed: "Initialed",
    fullTermsTitle: "Full terms & conditions",
    agreeAll: "I have read and agree to all terms and conditions of this agreement.",
    signEyebrow: "Step 4 · Signature",
    signTitle: "Adopt your signature",
    signBody: "Type your name or draw your signature. It will be applied to your agreement.",
    typeTab: "Type",
    drawTab: "Draw",
    drawHint: "Sign with your finger or mouse",
    clear: "Clear",
    signatureOf: (name: string) => `Signature of ${name}`,
    consentTitle: "Electronic signature consent",
    signAndAccept: "Sign & accept",
    signing: "Signing…",
    previewNote: "Preview only — nothing is sent or signed from this view.",
    doneEyebrow: "Signed",
    doneTitle: "Your agreement is signed",
    doneBody:
      "A signed copy with its audit certificate is on its way to your inbox. The Curtain Guy will countersign to fully execute it.",
    downloadSigned: "Download signed agreement",
    finish: "Done",
    fingerprint: "Document fingerprint (SHA-256)",
    signedBy: "Signed by",
    signedOn: "Signed",
    awaitingCountersign: "Awaiting countersignature by The Curtain Guy",
    fullyExecuted: "Fully executed",
    countersignedBy: "Countersigned by",
    agreementTitle: "Signed agreement",
    legalNote: "Signed electronically with email verification. Your IP address and device are recorded in the audit certificate.",
    errors: {
      name: "Please enter your full legal name.",
      code: "Enter the 6-digit code from your email.",
      initials: "Initial each key clause to continue.",
      agreeAll: "Please confirm you agree to all terms.",
      signature: "Please type or draw your signature.",
      consent: "Please accept the electronic signature consent.",
    },
  },
  fr: {
    launch: "Réviser et signer",
    launchHint: "Signature électronique sécurisée · environ 2 minutes",
    ceremonyTitle: "Signez votre entente",
    secureBadge: "Signature électronique sécurisée",
    close: "Fermer",
    back: "Retour",
    next: "Continuer",
    steps: { verify: "Vérifier", review: "Réviser", terms: "Conditions", sign: "Signer" },
    verifyEyebrow: "Étape 1 · Identité",
    verifyTitle: "Confirmez votre identité",
    verifyBody: (email: string) =>
      `Nous enverrons un code à 6 chiffres à ${email} pour confirmer l’identité du signataire.`,
    fullName: "Nom légal complet",
    fullNamePlaceholder: "Prénom et nom",
    titleLabel: "Titre ou rôle (facultatif)",
    titlePlaceholder: "ex. Mariée, Planificatrice, Directeur",
    sendCode: "M’envoyer un code",
    resendCode: "Renvoyer le code",
    resendIn: (seconds: number) => `Renvoyer dans ${seconds} s`,
    codeSent: (email: string) => `Code envoyé à ${email}. Il expire dans 10 minutes.`,
    codeLabel: "Code de vérification",
    verifyCode: "Vérifier le code",
    verified: "Identité vérifiée",
    reviewEyebrow: "Étape 2 · Révision",
    reviewTitle: "Votre événement en un coup d’œil",
    reviewBody: "Vérifiez chaque détail ci-dessous. Ces renseignements exacts feront partie de votre entente signée.",
    scopeTitle: "Portée",
    itemsCount: (count: number) => (count === 1 ? "1 article" : `${count} articles`),
    totalLabel: "Total de l’entente",
    paymentTitle: "Calendrier de paiement",
    validUntil: "Valide jusqu’au",
    termsEyebrow: "Étape 3 · Conditions",
    termsTitle: "Paraphez les clauses clés",
    termsBody: "Touchez « Parapher » pour chaque clause clé, puis confirmez que vous acceptez l’ensemble des conditions.",
    initialsLabel: "Vos initiales",
    initialHere: "Parapher",
    initialed: "Paraphé",
    fullTermsTitle: "Conditions générales complètes",
    agreeAll: "J’ai lu et j’accepte l’ensemble des conditions de la présente entente.",
    signEyebrow: "Étape 4 · Signature",
    signTitle: "Adoptez votre signature",
    signBody: "Tapez votre nom ou dessinez votre signature. Elle sera apposée sur votre entente.",
    typeTab: "Taper",
    drawTab: "Dessiner",
    drawHint: "Signez avec le doigt ou la souris",
    clear: "Effacer",
    signatureOf: (name: string) => `Signature de ${name}`,
    consentTitle: "Consentement à la signature électronique",
    signAndAccept: "Signer et accepter",
    signing: "Signature…",
    previewNote: "Aperçu seulement — rien n’est envoyé ni signé depuis cette vue.",
    doneEyebrow: "Signée",
    doneTitle: "Votre entente est signée",
    doneBody:
      "Une copie signée avec son certificat d’audit est en route vers votre boîte de réception. The Curtain Guy la contresignera pour la rendre pleinement exécutée.",
    downloadSigned: "Télécharger l’entente signée",
    finish: "Terminer",
    fingerprint: "Empreinte du document (SHA-256)",
    signedBy: "Signée par",
    signedOn: "Signée le",
    awaitingCountersign: "En attente de la contresignature de The Curtain Guy",
    fullyExecuted: "Pleinement exécutée",
    countersignedBy: "Contresignée par",
    agreementTitle: "Entente signée",
    legalNote: "Signée électroniquement avec vérification par courriel. Votre adresse IP et votre appareil figurent au certificat d’audit.",
    errors: {
      name: "Veuillez entrer votre nom légal complet.",
      code: "Entrez le code à 6 chiffres reçu par courriel.",
      initials: "Paraphez chaque clause clé pour continuer.",
      agreeAll: "Veuillez confirmer que vous acceptez toutes les conditions.",
      signature: "Veuillez taper ou dessiner votre signature.",
      consent: "Veuillez accepter le consentement à la signature électronique.",
    },
  },
} satisfies Record<CustomerLanguage, unknown>;

export type QuoteSigningCopy = (typeof QUOTE_SIGNING_COPY)["en"];

/** "aron@gmail.com" → "a•••@gmail.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}${"•".repeat(Math.min(4, Math.max(1, local.length - 1)))}@${domain}`;
}
