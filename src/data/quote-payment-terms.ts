import type { CustomerLanguage } from "@/data/customer-language";
import {
  addDaysIso,
  clampPercent,
  computeDepositCents,
  isBalanceDueRule,
  isDepositMode,
  resolveBalanceDueDate,
  type BalanceDueRule,
  type DepositMode,
} from "@/data/invoices";
import { formatQuoteDate } from "@/data/quote-copy";

/** When the deposit is due. Null on a saved quote means on acceptance. */
export const QUOTE_DEPOSIT_DUE_RULES = ["on_acceptance", "fixed_date", "quote_expiry"] as const;
export type QuoteDepositDueRule = (typeof QUOTE_DEPOSIT_DUE_RULES)[number];

/** When the balance (or the payment in full) is due. Wider than the invoice / customer defaults. */
export const QUOTE_BALANCE_DUE_RULES = [
  "on_acceptance",
  "fixed_date",
  "quote_expiry",
  "event_date",
  "days_before_event",
  "days_after_issue",
] as const;
export type QuoteBalanceDueRule = (typeof QUOTE_BALANCE_DUE_RULES)[number];

export function isQuoteDepositDueRule(value: unknown): value is QuoteDepositDueRule {
  return typeof value === "string" && (QUOTE_DEPOSIT_DUE_RULES as readonly string[]).includes(value);
}

export function isQuoteBalanceDueRule(value: unknown): value is QuoteBalanceDueRule {
  return typeof value === "string" && (QUOTE_BALANCE_DUE_RULES as readonly string[]).includes(value);
}

/** Rules that need a day count. */
export function quoteDueRuleUsesDays(rule: QuoteBalanceDueRule | null | undefined): boolean {
  return rule === "days_before_event" || rule === "days_after_issue";
}

/** Optional payment terms on a quote. All null = the quote has no payment terms. */
export type QuotePaymentTerms = {
  payment_deposit_mode: DepositMode | null;
  payment_deposit_percent: number | null;
  payment_deposit_fixed_cents: number | null;
  payment_deposit_due_rule: QuoteDepositDueRule | null;
  payment_deposit_due_date: string | null;
  payment_balance_due_rule: QuoteBalanceDueRule | null;
  payment_balance_due_days: number | null;
  payment_balance_due_date: string | null;
};

export const QUOTE_PAYMENT_TERM_FIELDS = [
  "payment_deposit_mode",
  "payment_deposit_percent",
  "payment_deposit_fixed_cents",
  "payment_deposit_due_rule",
  "payment_deposit_due_date",
  "payment_balance_due_rule",
  "payment_balance_due_days",
  "payment_balance_due_date",
] as const;

export const NO_QUOTE_PAYMENT_TERMS: QuotePaymentTerms = {
  payment_deposit_mode: null,
  payment_deposit_percent: null,
  payment_deposit_fixed_cents: null,
  payment_deposit_due_rule: null,
  payment_deposit_due_date: null,
  payment_balance_due_rule: null,
  payment_balance_due_days: null,
  payment_balance_due_date: null,
};

export type QuotePaymentDefaults = {
  deposit_percent: number;
  balance_due_rule: BalanceDueRule;
  balance_due_days: number;
};

export function hasQuotePaymentTerms(quote: Partial<QuotePaymentTerms>): boolean {
  return Boolean(quote.payment_deposit_mode && quote.payment_balance_due_rule);
}

const isoDateOrNull = (value: unknown): string | null =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

export function quotePaymentTermsFrom(quote: Partial<QuotePaymentTerms>): QuotePaymentTerms {
  if (!hasQuotePaymentTerms(quote)) return NO_QUOTE_PAYMENT_TERMS;
  return {
    payment_deposit_mode: quote.payment_deposit_mode ?? null,
    payment_deposit_percent:
      quote.payment_deposit_percent == null ? null : Number(quote.payment_deposit_percent),
    payment_deposit_fixed_cents:
      quote.payment_deposit_fixed_cents == null ? null : Number(quote.payment_deposit_fixed_cents),
    payment_deposit_due_rule: quote.payment_deposit_due_rule ?? null,
    payment_deposit_due_date: isoDateOrNull(quote.payment_deposit_due_date),
    payment_balance_due_rule: quote.payment_balance_due_rule ?? null,
    payment_balance_due_days:
      quote.payment_balance_due_days == null ? null : Number(quote.payment_balance_due_days),
    payment_balance_due_date: isoDateOrNull(quote.payment_balance_due_date),
  };
}

export function defaultQuotePaymentTerms(defaults: QuotePaymentDefaults): QuotePaymentTerms {
  const percent = clampPercent(defaults.deposit_percent);
  return {
    payment_deposit_mode: percent > 0 ? "percent" : "none",
    payment_deposit_percent: percent,
    payment_deposit_fixed_cents: null,
    payment_deposit_due_rule: percent > 0 ? "on_acceptance" : null,
    payment_deposit_due_date: null,
    payment_balance_due_rule: defaults.balance_due_rule,
    payment_balance_due_days: Math.max(0, Math.round(defaults.balance_due_days)),
    payment_balance_due_date: null,
  };
}

/** Validates the payment-term fields of an API body. Missing deposit mode clears the terms. */
export function parseQuotePaymentTerms(
  body: Record<string, unknown>
): { terms: QuotePaymentTerms } | { error: string } {
  const mode = body.payment_deposit_mode;
  if (mode === null || mode === undefined || mode === "") return { terms: NO_QUOTE_PAYMENT_TERMS };
  if (!isDepositMode(mode)) return { error: "Invalid deposit type." };
  const rule = body.payment_balance_due_rule;
  if (!isQuoteBalanceDueRule(rule)) return { error: "Pick when the balance is due." };
  const percent = Number(body.payment_deposit_percent);
  if (mode === "percent" && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) {
    return { error: "Deposit % must be between 0 and 100." };
  }
  const fixed = Math.round(Number(body.payment_deposit_fixed_cents));
  if (mode === "fixed" && (!Number.isFinite(fixed) || fixed <= 0)) {
    return { error: "Enter the deposit amount." };
  }
  const days = Math.round(Number(body.payment_balance_due_days ?? 0));
  if (quoteDueRuleUsesDays(rule) && (!Number.isFinite(days) || days < 0 || days > 365)) {
    return { error: "Balance days must be between 0 and 365." };
  }
  const balanceDate = isoDateOrNull(body.payment_balance_due_date);
  if (rule === "fixed_date" && !balanceDate) {
    return { error: mode === "none" ? "Pick the payment due date." : "Pick the balance due date." };
  }

  const hasDeposit = mode !== "none";
  const depositRuleRaw = body.payment_deposit_due_rule ?? "on_acceptance";
  if (hasDeposit && !isQuoteDepositDueRule(depositRuleRaw)) {
    return { error: "Pick when the deposit is due." };
  }
  const depositRule = hasDeposit ? (depositRuleRaw as QuoteDepositDueRule) : null;
  const depositDate = isoDateOrNull(body.payment_deposit_due_date);
  if (depositRule === "fixed_date" && !depositDate) {
    return { error: "Pick the deposit due date." };
  }

  return {
    terms: {
      payment_deposit_mode: mode,
      payment_deposit_percent: mode === "percent" ? clampPercent(percent) : null,
      payment_deposit_fixed_cents: mode === "fixed" ? fixed : null,
      payment_deposit_due_rule: depositRule,
      payment_deposit_due_date: depositRule === "fixed_date" ? depositDate : null,
      payment_balance_due_rule: rule,
      payment_balance_due_days: quoteDueRuleUsesDays(rule) ? days : 0,
      payment_balance_due_date: rule === "fixed_date" ? balanceDate : null,
    },
  };
}

/**
 * Concrete due date for an invoice built from the quote. Acceptance-based and missing dates
 * fall back to the invoice issue date.
 */
export function resolveQuoteDueDate(input: {
  rule: QuoteBalanceDueRule;
  days: number;
  date: string | null;
  issueDate: string;
  eventDate: string | null | undefined;
  validUntil: string | null | undefined;
}): string {
  if (input.rule === "on_acceptance") return input.issueDate;
  if (input.rule === "fixed_date") return input.date ?? input.issueDate;
  if (input.rule === "quote_expiry") return isoDateOrNull(input.validUntil) ?? input.issueDate;
  if (!isBalanceDueRule(input.rule)) return input.issueDate;
  return resolveBalanceDueDate({
    rule: input.rule,
    days: input.days,
    issueDate: input.issueDate,
    eventDate: input.eventDate,
  });
}

export const QUOTE_PAYMENT_COPY = {
  en: {
    title: "Payment schedule",
    deposit: (percent: number | null) => (percent != null ? `Deposit ${percent}%` : "Deposit"),
    balance: "Balance",
    full: "Payment in full",
    onAcceptance: "Due on acceptance",
    due: (date: string) => `Due ${date}`,
    onEventDate: "Due on the event date",
    onQuoteExpiry: "Due by the quote expiry date",
    quoteExpiry: "Quote expiry date",
    beforeEvent: (days: number) =>
      days === 1 ? "1 day before the event" : `${days} days before the event`,
    afterInvoice: (days: number) =>
      days === 0
        ? "Due on receipt of the invoice"
        : days === 1
          ? "Due 1 day after the invoice"
          : `Due ${days} days after the invoice`,
  },
  fr: {
    title: "Calendrier de paiement",
    deposit: (percent: number | null) => (percent != null ? `Dépôt ${percent} %` : "Dépôt"),
    balance: "Solde",
    full: "Paiement complet",
    onAcceptance: "Payable à l’acceptation",
    due: (date: string) => `Payable le ${date}`,
    onEventDate: "Payable le jour de l’événement",
    onQuoteExpiry: "Payable avant l’expiration de la soumission",
    quoteExpiry: "Date d’expiration de la soumission",
    beforeEvent: (days: number) =>
      days === 1 ? "1 jour avant l’événement" : `${days} jours avant l’événement`,
    afterInvoice: (days: number) =>
      days === 0
        ? "Payable à la réception de la facture"
        : days === 1
          ? "Payable 1 jour après la facture"
          : `Payable ${days} jours après la facture`,
  },
} satisfies Record<CustomerLanguage, unknown>;

export type QuotePaymentRow = {
  key: "deposit" | "balance" | "full";
  label: string;
  amountCents: number;
  due: string;
  /** e.g. "7 days before the event" when `due` shows the computed date. */
  detail: string | null;
};

type DueContext = {
  eventDate: string | null;
  validUntil: string | null;
  language: CustomerLanguage;
};

function describeDue(
  rule: QuoteBalanceDueRule,
  options: { days: number; date: string | null },
  context: DueContext
): { due: string; detail: string | null } {
  const copy = QUOTE_PAYMENT_COPY[context.language];
  const format = (iso: string) => formatQuoteDate(iso, context.language, iso);
  switch (rule) {
    case "on_acceptance":
      return { due: copy.onAcceptance, detail: null };
    case "fixed_date":
      return options.date
        ? { due: copy.due(format(options.date)), detail: null }
        : { due: copy.onAcceptance, detail: null };
    case "quote_expiry":
      return context.validUntil
        ? { due: copy.due(format(context.validUntil)), detail: copy.quoteExpiry }
        : { due: copy.onQuoteExpiry, detail: null };
    case "event_date":
      return { due: context.eventDate ? copy.due(format(context.eventDate)) : copy.onEventDate, detail: null };
    case "days_before_event":
      return context.eventDate
        ? {
            due: copy.due(format(addDaysIso(context.eventDate, -options.days))),
            detail: copy.beforeEvent(options.days),
          }
        : {
            due: `${context.language === "fr" ? "Payable" : "Due"} ${copy.beforeEvent(options.days)}`,
            detail: null,
          };
    case "days_after_issue":
      return { due: copy.afterInvoice(options.days), detail: null };
  }
}

/** Deposit + balance (or payment in full) rows for the customer, or [] when the quote has no terms. */
export function quotePaymentRows(
  quote: Partial<QuotePaymentTerms> & {
    total_cents: number;
    event_date: string | null;
    valid_until?: string | null;
  },
  language: CustomerLanguage
): QuotePaymentRow[] {
  const terms = quotePaymentTermsFrom(quote);
  if (!terms.payment_deposit_mode || !terms.payment_balance_due_rule) return [];
  const copy = QUOTE_PAYMENT_COPY[language];
  const total = Math.max(0, Math.round(quote.total_cents));
  const depositCents = computeDepositCents({
    mode: terms.payment_deposit_mode,
    percent: terms.payment_deposit_percent ?? 0,
    fixedCents: terms.payment_deposit_fixed_cents ?? 0,
    totalCents: total,
  });
  const context: DueContext = {
    eventDate: quote.event_date,
    validUntil: isoDateOrNull(quote.valid_until),
    language,
  };

  const balanceDue = describeDue(
    terms.payment_balance_due_rule,
    { days: terms.payment_balance_due_days ?? 0, date: terms.payment_balance_due_date },
    context
  );
  if (depositCents <= 0) {
    return [{ key: "full", label: copy.full, amountCents: total, ...balanceDue }];
  }

  const depositDue = describeDue(
    terms.payment_deposit_due_rule ?? "on_acceptance",
    { days: 0, date: terms.payment_deposit_due_date },
    context
  );
  if (depositCents >= total) {
    return [{ key: "full", label: copy.full, amountCents: total, ...depositDue }];
  }
  return [
    {
      key: "deposit",
      label: copy.deposit(
        terms.payment_deposit_mode === "percent" ? terms.payment_deposit_percent : null
      ),
      amountCents: depositCents,
      ...depositDue,
    },
    { key: "balance", label: copy.balance, amountCents: total - depositCents, ...balanceDue },
  ];
}
