import type { CustomerLanguage } from "@/data/customer-language";
import {
  addDaysIso,
  clampPercent,
  computeDepositCents,
  isBalanceDueRule,
  isDepositMode,
  type BalanceDueRule,
  type DepositMode,
} from "@/data/invoices";
import { formatQuoteDate } from "@/data/quote-copy";

/** Optional payment terms on a quote. All null = the quote has no payment terms. */
export type QuotePaymentTerms = {
  payment_deposit_mode: DepositMode | null;
  payment_deposit_percent: number | null;
  payment_deposit_fixed_cents: number | null;
  payment_balance_due_rule: BalanceDueRule | null;
  payment_balance_due_days: number | null;
};

export const QUOTE_PAYMENT_TERM_FIELDS = [
  "payment_deposit_mode",
  "payment_deposit_percent",
  "payment_deposit_fixed_cents",
  "payment_balance_due_rule",
  "payment_balance_due_days",
] as const;

export const NO_QUOTE_PAYMENT_TERMS: QuotePaymentTerms = {
  payment_deposit_mode: null,
  payment_deposit_percent: null,
  payment_deposit_fixed_cents: null,
  payment_balance_due_rule: null,
  payment_balance_due_days: null,
};

export type QuotePaymentDefaults = {
  deposit_percent: number;
  balance_due_rule: BalanceDueRule;
  balance_due_days: number;
};

export function hasQuotePaymentTerms(quote: Partial<QuotePaymentTerms>): boolean {
  return Boolean(quote.payment_deposit_mode && quote.payment_balance_due_rule);
}

export function quotePaymentTermsFrom(quote: Partial<QuotePaymentTerms>): QuotePaymentTerms {
  if (!hasQuotePaymentTerms(quote)) return NO_QUOTE_PAYMENT_TERMS;
  return {
    payment_deposit_mode: quote.payment_deposit_mode ?? null,
    payment_deposit_percent:
      quote.payment_deposit_percent == null ? null : Number(quote.payment_deposit_percent),
    payment_deposit_fixed_cents:
      quote.payment_deposit_fixed_cents == null ? null : Number(quote.payment_deposit_fixed_cents),
    payment_balance_due_rule: quote.payment_balance_due_rule ?? null,
    payment_balance_due_days:
      quote.payment_balance_due_days == null ? null : Number(quote.payment_balance_due_days),
  };
}

export function defaultQuotePaymentTerms(defaults: QuotePaymentDefaults): QuotePaymentTerms {
  const percent = clampPercent(defaults.deposit_percent);
  return {
    payment_deposit_mode: percent > 0 ? "percent" : "none",
    payment_deposit_percent: percent,
    payment_deposit_fixed_cents: null,
    payment_balance_due_rule: defaults.balance_due_rule,
    payment_balance_due_days: Math.max(0, Math.round(defaults.balance_due_days)),
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
  if (!isBalanceDueRule(rule)) return { error: "Pick when the balance is due." };
  const percent = Number(body.payment_deposit_percent);
  if (mode === "percent" && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) {
    return { error: "Deposit % must be between 0 and 100." };
  }
  const fixed = Math.round(Number(body.payment_deposit_fixed_cents));
  if (mode === "fixed" && (!Number.isFinite(fixed) || fixed <= 0)) {
    return { error: "Enter the deposit amount." };
  }
  const days = Math.round(Number(body.payment_balance_due_days ?? 0));
  if (rule !== "event_date" && (!Number.isFinite(days) || days < 0 || days > 365)) {
    return { error: "Balance days must be between 0 and 365." };
  }
  return {
    terms: {
      payment_deposit_mode: mode,
      payment_deposit_percent: mode === "percent" ? clampPercent(percent) : null,
      payment_deposit_fixed_cents: mode === "fixed" ? fixed : null,
      payment_balance_due_rule: rule,
      payment_balance_due_days: rule === "event_date" ? 0 : days,
    },
  };
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

/** Deposit + balance (or payment in full) rows for the customer, or [] when the quote has no terms. */
export function quotePaymentRows(
  quote: Partial<QuotePaymentTerms> & { total_cents: number; event_date: string | null },
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

  const days = terms.payment_balance_due_days ?? 0;
  const date = (iso: string) => formatQuoteDate(iso, language, iso);
  let due: string;
  let detail: string | null = null;
  if (terms.payment_balance_due_rule === "event_date") {
    due = quote.event_date ? copy.due(date(quote.event_date)) : copy.onEventDate;
  } else if (terms.payment_balance_due_rule === "days_before_event") {
    if (quote.event_date) {
      due = copy.due(date(addDaysIso(quote.event_date, -days)));
      detail = copy.beforeEvent(days);
    } else {
      due = `${language === "fr" ? "Payable" : "Due"} ${copy.beforeEvent(days)}`;
    }
  } else {
    due = copy.afterInvoice(days);
  }

  if (depositCents <= 0) {
    return [{ key: "full", label: copy.full, amountCents: total, due, detail }];
  }
  return [
    {
      key: "deposit",
      label: copy.deposit(
        terms.payment_deposit_mode === "percent" ? terms.payment_deposit_percent : null
      ),
      amountCents: depositCents,
      due: copy.onAcceptance,
      detail: null,
    },
    { key: "balance", label: copy.balance, amountCents: total - depositCents, due, detail },
  ];
}
