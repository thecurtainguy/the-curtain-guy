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
  internal_notes: string | null;
  public_token_hash: string | null;
  public_token_expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
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
  line_items: InvoiceLineItemRow[];
  payments: InvoicePaymentRow[];
  events?: InvoiceEventRow[];
};

/** Customer payload — no internal notes, token hash, or activity log. */
export type CustomerSafeInvoice = Omit<
  InvoiceRow,
  "internal_notes" | "public_token_hash" | "created_by_user_id"
> & {
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
  },
} as const;

export function getInvoiceCopy(language: CustomerLanguage) {
  return INVOICE_COPY[language] ?? INVOICE_COPY.en;
}
