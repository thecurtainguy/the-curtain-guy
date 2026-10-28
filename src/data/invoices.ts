import type { CustomerLanguage } from "@/data/customer-language";
import {
  computeLineTotalCents,
  computeQuoteTaxTotals,
  getQuoteTaxBreakdownRows,
  normalizeManualTaxLines,
  type QuoteManualTaxLine,
  type QuoteTaxBreakdownRow,
  type QuoteTaxMode,
} from "@/data/quotes";

// Mirrors the signed Agreement's payment, late-payment, charges and language articles; it must not add obligations the Agreement lacks.
export const DEFAULT_INVOICE_TERMS = [
  "Where this invoice relates to a signed agreement (identified by the quote number shown), it is a document related to that agreement and is governed by it; if they differ, the signed agreement prevails.",
  "Amounts are payable in the currency shown, in the amounts and by the due dates set out in the payment schedule on this invoice. The deposit is credited in full against the total price.",
  "The event date, rental inventory and crew are reserved only once the agreement is formed and the deposit has been received.",
  "Late payment: any amount not paid when due bears interest from its due date until paid at the rate of 2% per month, compounded monthly (26.82% per year). After written notice requiring payment within a reasonable period, The Curtain Guy may suspend delivery, installation or any further work until payment is received, as provided in the agreement.",
  "Please include the invoice number as the payment reference. A payment is considered received once the funds have cleared or been successfully processed.",
  "Approved changes, additional labour, waiting time, cleaning beyond normal use, and the repair or replacement of lost or damaged rental items are charged as provided in the agreement, on a separate or adjusted invoice with supporting details.",
  "Rental items remain the property of The Curtain Guy and must remain at the venue and accessible for teardown at the scheduled time.",
  "This invoice is available in French and English. The version in the language that binds the agreement prevails.",
  "Please report questions or payment discrepancies promptly to info@thecurtainguy.com or 514-963-3193.",
].join("\n");

export const DEFAULT_INVOICE_TERMS_FR = [
  "Lorsque la présente facture se rapporte à un contrat signé (désigné par le numéro de soumission indiqué), elle constitue un document relatif à ce contrat et est régie par celui-ci; en cas de divergence, le contrat signé prévaut.",
  "Les sommes sont payables dans la devise indiquée, selon les montants et aux dates d’échéance prévus au calendrier de paiement de la présente facture. Le dépôt est entièrement crédité sur le prix total.",
  "La date de l’événement, l’inventaire de location et l’équipe ne sont réservés qu’une fois le contrat formé et le dépôt reçu.",
  "Retard de paiement : toute somme impayée à son échéance porte intérêt à compter de cette date jusqu’à parfait paiement au taux de 2 % par mois, composé mensuellement (26,82 % par année). Après un avis écrit exigeant le paiement dans un délai raisonnable, The Curtain Guy peut suspendre la livraison, l’installation ou tout autre travail jusqu’à réception du paiement, conformément au contrat.",
  "Veuillez indiquer le numéro de facture comme référence de paiement. Un paiement est considéré comme reçu lorsque les fonds ont été compensés ou traités avec succès.",
  "Les modifications approuvées, les heures de travail additionnelles, le temps d’attente, le nettoyage au-delà de l’usage normal ainsi que la réparation ou le remplacement d’articles loués perdus ou endommagés sont facturés conformément au contrat, sur une facture distincte ou ajustée accompagnée des pièces justificatives.",
  "Les articles loués demeurent la propriété de The Curtain Guy et doivent demeurer sur les lieux et accessibles pour le démontage à l’heure prévue.",
  "La présente facture est offerte en français et en anglais. La version dans la langue qui lie les parties au contrat prévaut.",
  "Veuillez signaler rapidement toute question ou divergence de paiement à info@thecurtainguy.com ou au 514-963-3193.",
].join("\n");

/** Earlier default terms as EN/FR pairs, so invoices issued with them still switch language. */
export const LEGACY_INVOICE_TERMS: ReadonlyArray<{ en: string; fr: string }> = [
  {
    en: [
      "This invoice is issued under the accepted proposal for the event and should be read together with that proposal and its approved revisions.",
      "The event date, inventory, and crew are secured only after written booking confirmation and receipt of the required deposit.",
      "The deposit is applied to the invoice total. The remaining balance is payable by the due date shown on this invoice.",
      "Please include the invoice number with every payment. Payment is considered received once the funds have been successfully processed or cleared.",
      "Cancellation, rescheduling, scope changes, additional labour, and damage charges are governed by the accepted proposal and any subsequent written approvals.",
      "Rental items remain the property of The Curtain Guy and must remain accessible and available for teardown at the agreed time.",
      "Please report questions or payment discrepancies promptly to info@thecurtainguy.com or 514-963-3193.",
    ].join("\n"),
    fr: [
      "La présente facture est émise conformément à la soumission acceptée pour l’événement et doit être lue avec cette soumission et ses révisions approuvées.",
      "La date de l’événement, l’inventaire et l’équipe sont réservés uniquement après la confirmation écrite de la réservation et la réception du dépôt exigé.",
      "Le dépôt est appliqué au total de la facture. Le solde est payable au plus tard à la date d’échéance indiquée sur cette facture.",
      "Veuillez indiquer le numéro de facture avec chaque paiement. Le paiement est considéré comme reçu lorsque les fonds ont été traités ou compensés avec succès.",
      "Les annulations, reports, modifications de la portée, heures de travail additionnelles et frais pour dommages sont régis par la soumission acceptée et toute approbation écrite ultérieure.",
      "Les articles loués demeurent la propriété de The Curtain Guy et doivent rester accessibles et disponibles pour le démontage à l’heure convenue.",
      "Veuillez signaler rapidement toute question ou divergence de paiement à info@thecurtainguy.com ou au 514-963-3193.",
    ].join("\n"),
  },
];

export const DEFAULT_INVOICE_FOOTER =
  "Thank you for choosing The Curtain Guy.";
export const DEFAULT_INVOICE_FOOTER_FR =
  "Merci d’avoir choisi The Curtain Guy.";
export const DEFAULT_PAYMENT_PAGE_INTRO =
  "Choose a payment method below and include your invoice number as the payment reference so we can apply the payment correctly.";
export const DEFAULT_PAYMENT_PAGE_INTRO_FR =
  "Choisissez un mode de paiement ci-dessous et indiquez votre numéro de facture comme référence afin que nous puissions appliquer le paiement correctement.";

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "void",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<
  CustomerLanguage,
  Record<InvoiceStatus | "overdue", string>
> = {
  en: {
    draft: "Draft",
    sent: "Unpaid",
    partially_paid: "Partially paid",
    paid: "Paid",
    void: "Void",
    overdue: "Overdue",
  },
  fr: {
    draft: "Brouillon",
    sent: "Impayée",
    partially_paid: "Partiellement payée",
    paid: "Payée",
    void: "Annulée",
    overdue: "En retard",
  },
};

export const DEPOSIT_MODES = ["none", "percent", "fixed"] as const;
export type DepositMode = (typeof DEPOSIT_MODES)[number];

export const PAYMENT_KINDS = ["deposit", "payment", "refund"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_METHOD_KINDS = [
  "etransfer",
  "cheque",
  "wire",
  "cash",
  "custom",
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export const PAYMENT_CURRENCIES = ["CAD", "USD"] as const;
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

/** Interac e-Transfer is CAD-only, and Canadian banks (incl. Wealthsimple) won't take USD cheques. */
export function defaultPaymentMethodCurrencies(kind: PaymentMethodKind): PaymentCurrency[] {
  return kind === "etransfer" || kind === "cheque" ? ["CAD"] : ["CAD", "USD"];
}

export function paymentMethodAcceptsCurrency(method: PaymentMethod, currency: string | null | undefined): boolean {
  const target: PaymentCurrency = currency === "USD" ? "USD" : "CAD";
  return (method.currencies ?? defaultPaymentMethodCurrencies(method.kind)).includes(target);
}

/** French (`_fr`) values are optional; blank ones fall back to English. */
export type PaymentMethodField = {
  label: string;
  value: string;
  label_fr?: string;
  value_fr?: string;
};

export type PaymentMethod = {
  id: string;
  kind: PaymentMethodKind;
  enabled: boolean;
  label: string;
  label_fr?: string;
  fields: PaymentMethodField[];
  instructions: string;
  instructions_fr?: string;
  /** Invoice currencies this method is offered for. */
  currencies?: PaymentCurrency[];
};

export const BALANCE_DUE_RULES = [
  "event_date",
  "days_before_event",
  "days_after_issue",
] as const;
export type BalanceDueRule = (typeof BALANCE_DUE_RULES)[number];

export function isBalanceDueRule(value: unknown): value is BalanceDueRule {
  return typeof value === "string" && (BALANCE_DUE_RULES as readonly string[]).includes(value);
}

export type BusinessSettings = {
  legal_name: string;
  trade_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  gst_number: string;
  qst_number: string;
  neq: string;
  invoice_prefix: string;
  default_deposit_percent: number;
  default_balance_due_rule: BalanceDueRule;
  default_due_days: number;
  default_deposit_due_days: number;
  invoice_notes: string;
  invoice_notes_fr: string;
  invoice_terms: string;
  invoice_terms_fr: string;
  invoice_footer: string;
  invoice_footer_fr: string;
  payment_page_title: string;
  payment_page_title_fr: string;
  payment_page_intro: string;
  payment_page_intro_fr: string;
  payment_methods: PaymentMethod[];
  /** Storage path in the private `billing-documents` bucket (e.g. void cheque). */
  payment_document_path: string | null;
  payment_document_name: string | null;
  payment_document_label: string;
  payment_document_label_fr: string;
  payment_document_enabled: boolean;
  payment_document_uploaded_at: string | null;
  updated_at?: string | null;
};

/** True when a payment document should be appended to invoice PDFs. */
export function hasActivePaymentDocument(settings: BusinessSettings): boolean {
  return Boolean(settings.payment_document_enabled && settings.payment_document_path);
}

export const BUSINESS_TEXT_FIELDS = [
  "legal_name",
  "trade_name",
  "address_line1",
  "address_line2",
  "city",
  "province",
  "postal_code",
  "country",
  "phone",
  "email",
  "website",
  "gst_number",
  "qst_number",
  "neq",
  "invoice_prefix",
  "invoice_notes",
  "invoice_notes_fr",
  "invoice_terms",
  "invoice_terms_fr",
  "invoice_footer",
  "invoice_footer_fr",
  "payment_page_title",
  "payment_page_title_fr",
  "payment_page_intro",
  "payment_page_intro_fr",
  "payment_document_label",
  "payment_document_label_fr",
] as const satisfies readonly (keyof BusinessSettings)[];

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  opportunity_ref: string;
  sequence: number;
  job_id: string | null;
  quote_id: string | null;
  estimate_request_id: string | null;
  customer_id: string | null;
  po_number: string | null;
  status: InvoiceStatus;
  language: CustomerLanguage;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  billing_address: string | null;
  event_date: string | null;
  event_type: string | null;
  venue_name: string | null;
  venue_address?: string | null;
  customer_venue_id?: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  tax_mode: QuoteTaxMode;
  gst_rate: number;
  qst_rate: number;
  manual_tax_lines: QuoteManualTaxLine[];
  subtotal_cents: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_cents: number;
  total_tax_cents: number;
  total_cents: number;
  deposit_mode: DepositMode;
  deposit_percent: number;
  deposit_cents: number;
  deposit_due_date: string | null;
  amount_paid_cents: number;
  balance_due_cents: number;
  notes: string | null;
  terms: string | null;
  /** notes / terms in the language other than `language`. */
  notes_translated?: string | null;
  terms_translated?: string | null;
  internal_notes: string | null;
  /** 0 for the original; n for INV-xxxxx-Rn. */
  revision_number?: number;
  replaces_invoice_id?: string | null;
  replaced_by_invoice_id?: string | null;
  replaced_at?: string | null;
  /** Automatic payment reminders to the customer. */
  reminders_enabled?: boolean;
  /** Reminder recipients; null = whoever received the latest invoice email. */
  reminder_to?: string[] | null;
  reminder_cc?: string[] | null;
  /** Enabled automatic steps (see `REMINDER_STEPS`). */
  reminder_stages?: string[] | null;
  /** Keep emailing weekly from 21 days late until paid. */
  reminder_repeat_weekly?: boolean;
  public_token_hash: string | null;
  public_token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  /** Confirmed customer reads (real browser, owner excluded). */
  view_count: number;
  last_viewed_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  /** description in the language other than the invoice's language. */
  description_translated?: string | null;
  quantity: number;
  unit_label: string | null;
  unit_price_cents: number;
  line_total_cents: number;
  is_taxable: boolean;
  sort_order: number;
  product_id?: string | null;
  category?: string | null;
  category_label?: string | null;
  category_label_fr?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  source_quote_line_id?: string | null;
};

export type InvoicePaymentRow = {
  id: string;
  invoice_id: string;
  kind: PaymentKind;
  amount_cents: number;
  paid_on: string;
  method: string;
  reference: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type InvoiceEventRow = {
  id: string;
  invoice_id: string | null;
  invoice_number: string | null;
  actor_type: "owner" | "customer" | "system" | "public_link";
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** One field change recorded in an audit event's `metadata.changes`. */
export type InvoiceFieldChange = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
};

export const INVOICE_ACTOR_LABELS: Record<InvoiceEventRow["actor_type"], string> = {
  owner: "Admin",
  customer: "Client (portal)",
  system: "System",
  public_link: "Client (link)",
};

export function readInvoiceFieldChanges(metadata: Record<string, unknown> | null | undefined): InvoiceFieldChange[] {
  const raw = metadata?.changes;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is InvoiceFieldChange =>
      Boolean(c) && typeof c === "object" && typeof (c as InvoiceFieldChange).label === "string"
  );
}

export type InvoiceWithRelations = InvoiceRow & {
  /** Numbers of the linked invoices in a revision chain. */
  replaces_invoice_number?: string | null;
  replaced_by_invoice_number?: string | null;
  line_items: InvoiceLineItemRow[];
  payments: InvoicePaymentRow[];
  events?: InvoiceEventRow[];
};

/** Customer payload — no internal notes, token hash, or activity log. */
export type CustomerSafeInvoice = Omit<
  InvoiceRow,
  | "internal_notes"
  | "public_token_hash"
  | "created_by_user_id"
  | "view_count"
  | "viewed_at"
  | "last_viewed_at"
  | "reminders_enabled"
  | "reminder_to"
  | "reminder_cc"
  | "reminder_stages"
  | "reminder_repeat_weekly"
> & {
  replaces_invoice_number?: string | null;
  replaced_by_invoice_number?: string | null;
  line_items: InvoiceLineItemRow[];
  payments: Array<
    Pick<InvoicePaymentRow, "id" | "kind" | "amount_cents" | "paid_on" | "method">
  >;
};

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return (
    typeof value === "string" &&
    (INVOICE_STATUSES as readonly string[]).includes(value)
  );
}

export function isDepositMode(value: unknown): value is DepositMode {
  return (
    typeof value === "string" &&
    (DEPOSIT_MODES as readonly string[]).includes(value)
  );
}

export function isPaymentKind(value: unknown): value is PaymentKind {
  return (
    typeof value === "string" &&
    (PAYMENT_KINDS as readonly string[]).includes(value)
  );
}

/** `TCG-10030` → `INV-10030`; later invoices on the same job get `-1`, `-2`… */
/** Once issued, an invoice is a record: corrections go through a revision that replaces it. */
export function isInvoiceLocked(status: InvoiceStatus): boolean {
  return status !== "draft";
}

/** Clerical fields that stay editable on an issued invoice (every edit is logged). */
export const INVOICE_CLERICAL_FIELDS = [
  "internal_notes",
  "po_number",
  "billing_address",
  "customer_name",
  "company_name",
  "customer_email",
  "customer_phone",
] as const;

export const INVOICE_LOCKED_MESSAGE =
  "This invoice has been issued and is locked. Use “Revise invoice” to correct it — the revision replaces it when sent.";

/** "INV-10043" → "INV-10043-R1"; revisions of a revision keep the original root. */
export function formatInvoiceRevisionNumber(invoiceNumber: string, revision: number): string {
  const root = invoiceNumber.replace(/-R\d+$/i, "");
  return revision > 0 ? `${root}-R${revision}` : root;
}

export function formatInvoiceNumber(
  prefix: string,
  opportunityRef: string,
  sequence: number
): string {
  const cleanPrefix = (prefix || "INV").trim().toUpperCase() || "INV";
  const base =
    opportunityRef.trim().replace(/^TCG-/i, "") || opportunityRef.trim();
  return sequence > 0
    ? `${cleanPrefix}-${base}-${sequence}`
    : `${cleanPrefix}-${base}`;
}

export function clampPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function computeDepositCents(input: {
  mode: DepositMode;
  percent: number;
  fixedCents: number;
  totalCents: number;
}): number {
  const total = Math.max(0, Math.round(input.totalCents));
  if (input.mode === "none") return 0;
  if (input.mode === "percent") {
    return Math.min(total, Math.round((total * clampPercent(input.percent)) / 100));
  }
  return Math.min(total, Math.max(0, Math.round(input.fixedCents)));
}

export type InvoiceTotals = {
  subtotal_cents: number;
  taxable_subtotal_cents: number;
  nontaxable_subtotal_cents: number;
  gst_cents: number;
  qst_cents: number;
  manual_tax_cents: number;
  total_tax_cents: number;
  total_cents: number;
};

export function computeInvoiceTotals(
  lines: Array<Pick<InvoiceLineItemRow, "quantity" | "unit_price_cents" | "is_taxable">>,
  tax: {
    tax_mode: QuoteTaxMode;
    gst_rate: number;
    qst_rate: number;
    manual_tax_lines: QuoteManualTaxLine[] | unknown;
  }
): InvoiceTotals {
  const totals = computeQuoteTaxTotals(
    lines.map((line) => ({
      status: "priced" as const,
      line_total_cents: computeLineTotalCents(
        Number(line.quantity),
        Number(line.unit_price_cents)
      ),
      is_taxable: line.is_taxable,
    })),
    {
      tax_mode: tax.tax_mode,
      gst_rate: tax.gst_rate,
      qst_rate: tax.qst_rate,
      manual_tax_lines: normalizeManualTaxLines(tax.manual_tax_lines),
    }
  );
  return {
    subtotal_cents: totals.subtotal_cents,
    taxable_subtotal_cents: totals.taxable_subtotal_cents,
    nontaxable_subtotal_cents: totals.nontaxable_subtotal_cents,
    gst_cents: totals.gst_cents,
    qst_cents: totals.qst_cents,
    manual_tax_cents: totals.manual_tax_cents,
    total_tax_cents: totals.total_tax_cents,
    total_cents: totals.total_cents,
  };
}

export function getInvoiceTaxRows(
  invoice: Pick<
    InvoiceRow,
    | "tax_mode"
    | "subtotal_cents"
    | "taxable_subtotal_cents"
    | "nontaxable_subtotal_cents"
    | "gst_cents"
    | "qst_cents"
    | "gst_rate"
    | "qst_rate"
    | "manual_tax_cents"
    | "manual_tax_lines"
    | "total_cents"
  > & { currency?: string | null },
  options?: { variant?: "admin" | "customer"; language?: CustomerLanguage }
): QuoteTaxBreakdownRow[] {
  return getQuoteTaxBreakdownRows(
    { ...invoice, manual_tax_label: null },
    { ...options, currency: invoice.currency }
  );
}

export function sumPaymentsCents(
  payments: Array<Pick<InvoicePaymentRow, "kind" | "amount_cents">>
): number {
  return payments.reduce(
    (sum, p) => sum + (p.kind === "refund" ? -p.amount_cents : p.amount_cents),
    0
  );
}

/** Status follows the money unless the invoice is void. */
export function deriveInvoiceStatus(input: {
  current: InvoiceStatus;
  sentAt: string | null;
  totalCents: number;
  paidCents: number;
}): InvoiceStatus {
  if (input.current === "void") return "void";
  if (input.totalCents > 0 && input.paidCents >= input.totalCents) return "paid";
  if (input.paidCents > 0) return "partially_paid";
  return input.sentAt ? "sent" : "draft";
}

export function todayIsoDate(timeZone = "America/Toronto"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + Math.round(days));
  return date.toISOString().slice(0, 10);
}

/** Event-based rules fall back to days-after-issue when there is no event date, and never land before the issue date. */
export function resolveBalanceDueDate(input: {
  rule: BalanceDueRule;
  days: number;
  issueDate: string;
  eventDate: string | null | undefined;
}): string {
  const days = Math.max(0, Math.round(input.days));
  if (input.rule !== "days_after_issue" && input.eventDate) {
    const target =
      input.rule === "event_date" ? input.eventDate : addDaysIso(input.eventDate, -days);
    return target < input.issueDate ? input.issueDate : target;
  }
  return addDaysIso(input.issueDate, days);
}

export function isInvoiceOverdue(
  invoice: Pick<InvoiceRow, "status" | "due_date" | "balance_due_cents">,
  today = todayIsoDate()
): boolean {
  if (invoice.status === "void" || invoice.status === "paid" || invoice.status === "draft") {
    return false;
  }
  return Boolean(invoice.due_date && invoice.due_date < today && invoice.balance_due_cents > 0);
}

export function invoiceDisplayStatus(
  invoice: Pick<InvoiceRow, "status" | "due_date" | "balance_due_cents">
): InvoiceStatus | "overdue" {
  return isInvoiceOverdue(invoice) ? "overdue" : invoice.status;
}

export type InvoiceAmountDue = {
  /** What the client should pay next. */
  dueNowCents: number;
  dueNowKind: "deposit" | "balance" | "none";
  dueNowDate: string | null;
  depositOutstandingCents: number;
  depositPaid: boolean;
};

export function computeAmountDue(
  invoice: Pick<
    InvoiceRow,
    | "deposit_mode"
    | "deposit_cents"
    | "deposit_due_date"
    | "amount_paid_cents"
    | "balance_due_cents"
    | "due_date"
    | "status"
  >
): InvoiceAmountDue {
  const hasDeposit = invoice.deposit_mode !== "none" && invoice.deposit_cents > 0;
  const depositOutstanding = hasDeposit
    ? Math.max(0, invoice.deposit_cents - invoice.amount_paid_cents)
    : 0;
  if (invoice.status === "void" || invoice.balance_due_cents <= 0) {
    return {
      dueNowCents: 0,
      dueNowKind: "none",
      dueNowDate: null,
      depositOutstandingCents: 0,
      depositPaid: hasDeposit,
    };
  }
  if (depositOutstanding > 0) {
    return {
      dueNowCents: depositOutstanding,
      dueNowKind: "deposit",
      dueNowDate: invoice.deposit_due_date,
      depositOutstandingCents: depositOutstanding,
      depositPaid: false,
    };
  }
  return {
    dueNowCents: invoice.balance_due_cents,
    dueNowKind: "balance",
    dueNowDate: invoice.due_date,
    depositOutstandingCents: 0,
    depositPaid: hasDeposit,
  };
}

export type InvoiceScheduleRow = {
  kind: "deposit" | "balance";
  amountCents: number;
  dueDate: string | null;
  isEventDay: boolean;
  paid: boolean;
};

/** Deposit + remaining balance as two dated instalments; empty when there is no deposit split. */
export function invoicePaymentSchedule(
  invoice: Pick<
    InvoiceRow,
    | "deposit_mode"
    | "deposit_cents"
    | "deposit_due_date"
    | "amount_paid_cents"
    | "total_cents"
    | "due_date"
    | "event_date"
    | "status"
  >
): InvoiceScheduleRow[] {
  const hasDeposit = invoice.deposit_mode !== "none" && invoice.deposit_cents > 0;
  const remainderCents = invoice.total_cents - invoice.deposit_cents;
  if (!hasDeposit || remainderCents <= 0 || invoice.status === "void") return [];
  return [
    {
      kind: "deposit",
      amountCents: invoice.deposit_cents,
      dueDate: invoice.deposit_due_date,
      isEventDay: Boolean(invoice.event_date && invoice.deposit_due_date === invoice.event_date),
      paid: invoice.amount_paid_cents >= invoice.deposit_cents,
    },
    {
      kind: "balance",
      amountCents: remainderCents,
      dueDate: invoice.due_date,
      isEventDay: Boolean(invoice.event_date && invoice.due_date === invoice.event_date),
      paid: invoice.amount_paid_cents >= invoice.total_cents,
    },
  ];
}

export function businessText(
  settings: BusinessSettings,
  key:
    | "invoice_notes"
    | "invoice_terms"
    | "invoice_footer"
    | "payment_page_title"
    | "payment_page_intro"
    | "payment_document_label",
  language: CustomerLanguage
): string {
  if (language === "fr") {
    const fr = settings[`${key}_fr`];
    if (fr?.trim()) return fr;
  }
  return settings[key] ?? "";
}

export function businessAddressLines(settings: BusinessSettings): string[] {
  const cityLine = [settings.city, settings.province, settings.postal_code]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return [settings.address_line1, settings.address_line2, cityLine]
    .map((line) => line.trim())
    .filter(Boolean);
}

function localized(english: string, french: string | undefined, language: CustomerLanguage): string {
  return language === "fr" && french?.trim() ? french : english;
}

/** Methods shown to clients in their language — enabled for this currency, with blank fields dropped. */
export function visiblePaymentMethods(
  methods: PaymentMethod[],
  language: CustomerLanguage = "en",
  currency?: string | null
): PaymentMethod[] {
  return methods
    .filter((method) => method.enabled && (currency === undefined || paymentMethodAcceptsCurrency(method, currency)))
    .map((method) => ({
      ...method,
      label: localized(method.label, method.label_fr, language),
      instructions: localized(method.instructions, method.instructions_fr, language),
      fields: method.fields
        .map((field) => ({
          ...field,
          label: localized(field.label, field.label_fr, language),
          value: localized(field.value, field.value_fr, language),
        }))
        .filter((field) => field.value.trim()),
    }));
}

export function normalizePaymentMethods(value: unknown): PaymentMethod[] {
  if (!Array.isArray(value)) return [];
  const result: PaymentMethod[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const kind = (PAYMENT_METHOD_KINDS as readonly string[]).includes(
      String(record.kind)
    )
      ? (record.kind as PaymentMethodKind)
      : "custom";
    const fields = Array.isArray(record.fields)
      ? record.fields
          .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === "object")
          .map((f) => ({
            label: String(f.label ?? "").slice(0, 80),
            value: String(f.value ?? "").slice(0, 400),
            label_fr: String(f.label_fr ?? "").slice(0, 80),
            value_fr: String(f.value_fr ?? "").slice(0, 400),
          }))
          .slice(0, 12)
      : [];
    const currencies = Array.isArray(record.currencies)
      ? PAYMENT_CURRENCIES.filter((c) => (record.currencies as unknown[]).includes(c))
      : [];
    result.push({
      id: String(record.id || `${kind}-${result.length}`).slice(0, 60),
      kind,
      enabled: record.enabled !== false,
      label: String(record.label ?? "").slice(0, 80) || "Payment method",
      label_fr: String(record.label_fr ?? "").slice(0, 80),
      fields,
      instructions: String(record.instructions ?? "").slice(0, 1000),
      instructions_fr: String(record.instructions_fr ?? "").slice(0, 1000),
      currencies: currencies.length > 0 ? currencies : defaultPaymentMethodCurrencies(kind),
    });
  }
  return result.slice(0, 12);
}

export function paymentMethodLabel(
  methods: PaymentMethod[],
  methodId: string,
  language: CustomerLanguage = "en"
): string {
  const method = methods.find((m) => m.id === methodId);
  return (method && localized(method.label, method.label_fr, language)) || methodId || "—";
}

export function splitInvoiceTerms(value: string | null | undefined): string[] {
  return (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const INVOICE_COPY = {
  en: {
    invoice: "Invoice",
    invoiceNumber: "Invoice #",
    issueDate: "Issue date",
    dueDate: "Due date",
    quoteRef: "Quote",
    reference: "Reference",
    poNumber: "PO #",
    totalIn: (currency: string) => `Total ${currency}`,
    billTo: "Bill to",
    event: "Event",
    eventDate: "Event date",
    venue: "Venue",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    total: "Total CAD",
    amountPaid: "Amount paid",
    balanceDue: "Balance due",
    depositRequired: "Deposit required",
    depositDue: "Deposit due",
    depositPaid: "Deposit received",
    dueNow: "Amount due now",
    dueBy: "Due by",
    dueOnReceipt: "Due on receipt",
    paidInFull: "Paid in full — thank you!",
    payments: "Payments received",
    notes: "Notes",
    terms: "Terms",
    termsTitle: "Terms and conditions",
    continued: "continued",
    included: "Included",
    agreement: "Agreement",
    agreementRef: (ref: string, date: string | null, by: string | null = null) =>
      `Issued under agreement ${ref}${date || by ? ", accepted" : ""}${by ? ` by ${by}` : ""}${date ? `${by ? " on" : ""} ${date}` : ""}.`,
    eventSchedule: "Schedule",
    gst: "GST #",
    qst: "QST #",
    neq: "NEQ",
    downloadPdf: "Download PDF",
    paymentReference: "Payment reference",
    documentAttached: "Attached as the last page of this invoice PDF.",
    scheduleTitle: "Payment schedule",
    scheduleDeposit: "Deposit",
    scheduleBalance: "Remaining balance",
    scheduleDueOn: "Due",
    scheduleEventDay: "event day",
    schedulePaid: "Paid",
    scheduleUpcoming: "To pay",
    remainingAfterDeposit: (amount: string, date: string) => `Then ${amount} due ${date}`,
    questions: "Questions about this invoice?",
    viewOnline: "View this invoice online",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    emailSubject: (number: string, business: string) => `Invoice ${number} · ${business}`,
    emailGreeting: (name: string | null) => (name ? `Hi ${name},` : "Hello,"),
    emailBody:
      "Thank you for booking with us. Your invoice is attached as a PDF and available online at the link below. Payment options are listed on the second page of the invoice.",
    emailButton: "View invoice",
    emailHeadline: "Your invoice is ready",
    revisedSubject: (number: string, replaces: string, business: string) =>
      `Updated invoice ${number} (replaces ${replaces}) · ${business}`,
    revisedHeadline: "Your updated invoice",
    revisedBody: (replaces: string) =>
      `Here is your updated invoice. It replaces invoice ${replaces}, which no longer needs to be paid. Any payment you already made has been applied to this invoice, and your previous link now opens this version.`,
    replacesNotice: (replaces: string) =>
      `This updated invoice replaces ${replaces}. Payments already received are applied here.`,
    receiptSubject: (number: string, business: string) => `Payment received — invoice ${number} · ${business}`,
    receiptHeadline: "Payment received — thank you",
    receiptBody: "We received your payment. Here are the details for your records.",
    refundSubject: (number: string, business: string) => `Refund issued — invoice ${number} · ${business}`,
    refundHeadline: "Refund issued",
    refundBody: "We issued a refund on your invoice. Here are the details for your records.",
    receiptAmount: "Amount",
    receiptMethod: "Method",
    receiptDate: "Date",
    receiptReference: "Reference",
    receiptRemaining: "Remaining balance",
    receiptPaidInFull: "Your invoice is now paid in full.",
    reminderWhat: { deposit: "deposit", balance: "balance" },
    reminderUpcomingSubject: (what: string, date: string, number: string) =>
      `Reminder: ${what} due ${date} — invoice ${number}`,
    reminderUpcomingHeadline: "A friendly reminder",
    reminderUpcomingBody: (what: string, amount: string, date: string) =>
      `Just a friendly reminder that the ${what} of ${amount} on your invoice is due on ${date}. If you’ve already sent it, thank you — please disregard this message.`,
    reminderOverdueSubject: (number: string) => `Payment overdue — invoice ${number}`,
    reminderOverdueHeadline: "Payment past due",
    reminderOverdueBody: (what: string, amount: string, date: string) =>
      `Our records show the ${what} of ${amount} on your invoice was due on ${date} and hasn’t been received yet. If you’ve already paid, thank you — please disregard this message, or reply with the payment details so we can match it.`,
    reminderInterest: "As set out in your agreement, late payment interest may apply to overdue amounts.",
    reminderArrangement: "If you’d like to discuss a payment arrangement, just reply to this email.",
  },
  fr: {
    invoice: "Facture",
    invoiceNumber: "Facture n°",
    issueDate: "Date d'émission",
    dueDate: "Date d'échéance",
    quoteRef: "Soumission",
    reference: "Référence",
    poNumber: "Bon de commande",
    totalIn: (currency: string) => `Total (${currency === "USD" ? "$ US" : "$ CA"})`,
    billTo: "Facturé à",
    event: "Événement",
    eventDate: "Date de l'événement",
    venue: "Lieu",
    description: "Description",
    qty: "Qté",
    unitPrice: "Prix unitaire",
    amount: "Montant",
    subtotal: "Sous-total",
    total: "Total ($ CA)",
    amountPaid: "Montant payé",
    balanceDue: "Solde dû",
    depositRequired: "Dépôt requis",
    depositDue: "Dépôt dû",
    depositPaid: "Dépôt reçu",
    dueNow: "Montant dû maintenant",
    dueBy: "Payable au plus tard le",
    dueOnReceipt: "Payable sur réception",
    paidInFull: "Payée en totalité — merci!",
    payments: "Paiements reçus",
    notes: "Notes",
    terms: "Conditions",
    termsTitle: "Modalités et conditions",
    continued: "suite",
    included: "Inclus",
    agreement: "Entente",
    agreementRef: (ref: string, date: string | null, by: string | null = null) =>
      `Émise en vertu de l'entente ${ref}${date || by ? ", acceptée" : ""}${by ? ` par ${by}` : ""}${date ? ` le ${date}` : ""}.`,
    eventSchedule: "Horaire",
    gst: "N° TPS",
    qst: "N° TVQ",
    neq: "NEQ",
    downloadPdf: "Télécharger le PDF",
    paymentReference: "Référence de paiement",
    documentAttached: "Joint en dernière page de ce PDF de facture.",
    scheduleTitle: "Échéancier de paiement",
    scheduleDeposit: "Dépôt",
    scheduleBalance: "Solde restant",
    scheduleDueOn: "Payable le",
    scheduleEventDay: "jour de l'événement",
    schedulePaid: "Payé",
    scheduleUpcoming: "À payer",
    remainingAfterDeposit: (amount: string, date: string) => `Puis ${amount} payable le ${date}`,
    questions: "Des questions sur cette facture?",
    viewOnline: "Consulter cette facture en ligne",
    pageOf: (page: number, total: number) => `Page ${page} de ${total}`,
    emailSubject: (number: string, business: string) => `Facture ${number} · ${business}`,
    emailGreeting: (name: string | null) => (name ? `Bonjour ${name},` : "Bonjour,"),
    emailBody:
      "Merci d'avoir réservé avec nous. Votre facture est jointe en PDF et disponible en ligne au lien ci-dessous. Les modes de paiement figurent à la deuxième page de la facture.",
    emailButton: "Voir la facture",
    emailHeadline: "Votre facture est prête",
    revisedSubject: (number: string, replaces: string, business: string) =>
      `Facture mise à jour ${number} (remplace ${replaces}) · ${business}`,
    revisedHeadline: "Votre facture mise à jour",
    revisedBody: (replaces: string) =>
      `Voici votre facture mise à jour. Elle remplace la facture ${replaces}, qui n'est plus à payer. Tout paiement déjà effectué a été appliqué à cette facture, et votre lien précédent ouvre maintenant cette version.`,
    replacesNotice: (replaces: string) =>
      `Cette facture mise à jour remplace ${replaces}. Les paiements déjà reçus y sont appliqués.`,
    receiptSubject: (number: string, business: string) => `Paiement reçu — facture ${number} · ${business}`,
    receiptHeadline: "Paiement reçu — merci",
    receiptBody: "Nous avons bien reçu votre paiement. Voici les détails pour vos dossiers.",
    refundSubject: (number: string, business: string) => `Remboursement émis — facture ${number} · ${business}`,
    refundHeadline: "Remboursement émis",
    refundBody: "Nous avons émis un remboursement sur votre facture. Voici les détails pour vos dossiers.",
    receiptAmount: "Montant",
    receiptMethod: "Mode de paiement",
    receiptDate: "Date",
    receiptReference: "Référence",
    receiptRemaining: "Solde restant",
    receiptPaidInFull: "Votre facture est maintenant payée en totalité.",
    reminderWhat: { deposit: "dépôt", balance: "solde" },
    reminderUpcomingSubject: (what: string, date: string, number: string) =>
      `Rappel : ${what} payable le ${date} — facture ${number}`,
    reminderUpcomingHeadline: "Petit rappel amical",
    reminderUpcomingBody: (what: string, amount: string, date: string) =>
      `Petit rappel amical : le ${what} de ${amount} sur votre facture est payable le ${date}. Si vous l'avez déjà envoyé, merci — veuillez ignorer ce message.`,
    reminderOverdueSubject: (number: string) => `Paiement en retard — facture ${number}`,
    reminderOverdueHeadline: "Paiement en souffrance",
    reminderOverdueBody: (what: string, amount: string, date: string) =>
      `Selon nos dossiers, le ${what} de ${amount} sur votre facture était payable le ${date} et n'a pas encore été reçu. Si vous avez déjà payé, merci — veuillez ignorer ce message ou nous répondre avec les détails du paiement afin que nous puissions le retracer.`,
    reminderInterest:
      "Conformément à votre entente, des intérêts de retard peuvent s'appliquer aux montants en souffrance.",
    reminderArrangement: "Si vous souhaitez discuter d'une entente de paiement, répondez simplement à ce courriel.",
  },
} as const;

export function getInvoiceCopy(language: CustomerLanguage) {
  return INVOICE_COPY[language] ?? INVOICE_COPY.en;
}
