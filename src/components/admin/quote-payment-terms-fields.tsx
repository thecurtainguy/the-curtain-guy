"use client";

import {
  BadgePercent,
  Banknote,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  FileClock,
  Handshake,
  Hourglass,
  Wallet,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { ToggleTile } from "@/components/admin/customers/customer-panel";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeDepositCents, type DepositMode } from "@/data/invoices";
import {
  defaultQuotePaymentTerms,
  hasQuotePaymentTerms,
  NO_QUOTE_PAYMENT_TERMS,
  quoteDueRuleUsesDays,
  quotePaymentRows,
  type QuoteBalanceDueRule,
  type QuoteDepositDueRule,
  type QuotePaymentDefaults,
  type QuotePaymentTerms,
} from "@/data/quote-payment-terms";
import { formatQuoteDate } from "@/data/quote-copy";
import { formatMoneyFromCents } from "@/data/quotes";
import { cn } from "@/lib/utils";

type Option<T extends string> = { id: T; label: string; description: string; icon: typeof Wallet };

const DEPOSIT_OPTIONS: Array<Option<DepositMode>> = [
  { id: "none", label: "Pay in full", description: "One payment, no deposit", icon: Wallet },
  { id: "percent", label: "Percentage deposit", description: "Share of the quote total", icon: BadgePercent },
  { id: "fixed", label: "Fixed deposit", description: "Same amount whatever the total", icon: Banknote },
];

function dueOptions(validUntil: string | null): Array<Option<QuoteBalanceDueRule>> {
  return [
    { id: "on_acceptance", label: "On acceptance", description: "As soon as the customer accepts", icon: Handshake },
    { id: "fixed_date", label: "On a date I choose", description: "Pick any date", icon: CalendarDays },
    {
      id: "quote_expiry",
      label: "When the quote expires",
      description: validUntil ? `Valid-until date · ${formatQuoteDate(validUntil, "en", validUntil)}` : "Uses the valid-until date",
      icon: Hourglass,
    },
    { id: "event_date", label: "On the event date", description: "The day of the event", icon: CalendarCheck },
    { id: "days_before_event", label: "Days before the event", description: "e.g. 7 days before", icon: CalendarClock },
    { id: "days_after_issue", label: "Days after the invoice", description: "e.g. net 15", icon: FileClock },
  ];
}

const DEPOSIT_DUE_RULES: ReadonlyArray<QuoteDepositDueRule> = ["on_acceptance", "fixed_date", "quote_expiry"];

const QUICK_PERCENTS = [25, 30, 50, 100];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{children}</p>;
}

function ExpiryHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-xs text-amber-400/90">
      Set a &quot;Valid until&quot; date on the quote so the customer sees the actual due date.
    </p>
  );
}

export function QuotePaymentTermsFields({
  value,
  onChange,
  defaults,
  totalCents,
  eventDate,
  validUntil,
  currency,
  disabled,
}: {
  value: QuotePaymentTerms;
  onChange: (next: QuotePaymentTerms) => void;
  defaults: QuotePaymentDefaults;
  totalCents: number;
  eventDate: string | null;
  validUntil: string | null;
  currency: string;
  disabled?: boolean;
}) {
  const enabled = hasQuotePaymentTerms(value);
  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);
  const patch = (next: Partial<QuotePaymentTerms>) => onChange({ ...value, ...next });
  const hasDeposit = value.payment_deposit_mode != null && value.payment_deposit_mode !== "none";
  const depositRule = value.payment_deposit_due_rule ?? "on_acceptance";
  const missingDepositAmount =
    (value.payment_deposit_mode === "fixed" && !((value.payment_deposit_fixed_cents ?? 0) > 0)) ||
    (value.payment_deposit_mode === "percent" && !((value.payment_deposit_percent ?? 0) > 0));
  const depositCents = hasDeposit
    ? computeDepositCents({
        mode: value.payment_deposit_mode!,
        percent: value.payment_deposit_percent ?? 0,
        fixedCents: value.payment_deposit_fixed_cents ?? 0,
        totalCents,
      })
    : 0;
  const depositCoversTotal = hasDeposit && !missingDepositAmount && totalCents > 0 && depositCents >= totalCents;
  const rows = missingDepositAmount
    ? []
    : quotePaymentRows(
        { ...value, total_cents: totalCents, event_date: eventDate, valid_until: validUntil },
        "en"
      );
  const switchToPayInFull = () =>
    patch({
      payment_deposit_mode: "none",
      payment_deposit_percent: null,
      payment_deposit_fixed_cents: null,
      payment_deposit_due_rule: null,
      payment_deposit_due_date: null,
      payment_balance_due_rule: depositRule,
      payment_balance_due_days: 0,
      payment_balance_due_date: depositRule === "fixed_date" ? value.payment_deposit_due_date : null,
    });
  const balanceRule = value.payment_balance_due_rule;
  const options = dueOptions(validUntil);
  const depositOptions = options.filter((option) =>
    (DEPOSIT_DUE_RULES as readonly string[]).includes(option.id)
  ) as Array<Option<QuoteDepositDueRule>>;

  return (
    <div className="mt-4 rounded-2xl border border-border/40 bg-background/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Wallet className="size-4" />
        </span>
        <div className="min-w-0">
          <Label>Payment terms</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown on the proposal and PDF. The job&apos;s first invoice uses these amounts and due dates.
          </p>
        </div>
      </div>

      <fieldset
        disabled={disabled}
        className={cn("min-w-0", disabled && "pointer-events-none select-none opacity-60")}
      >
        <div className="mt-3">
          <ToggleTile
            checked={enabled}
            onChange={(on) => onChange(on ? defaultQuotePaymentTerms(defaults) : NO_QUOTE_PAYMENT_TERMS)}
            title="Show payment terms on this quote"
            description={`Starts from this customer's defaults (${defaults.deposit_percent}% deposit).`}
          />
        </div>

        {enabled ? (
          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <SectionLabel>How is it paid?</SectionLabel>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEPOSIT_OPTIONS.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={value.payment_deposit_mode === option.id}
                    onSelect={() =>
                      patch({
                        payment_deposit_mode: option.id,
                        payment_deposit_percent:
                          option.id === "percent"
                            ? value.payment_deposit_percent || defaults.deposit_percent || 50
                            : null,
                        payment_deposit_fixed_cents:
                          option.id === "fixed" ? value.payment_deposit_fixed_cents ?? null : null,
                        payment_deposit_due_rule:
                          option.id === "none" ? null : value.payment_deposit_due_rule ?? "on_acceptance",
                        payment_deposit_due_date: option.id === "none" ? null : value.payment_deposit_due_date,
                      })
                    }
                    className="p-3"
                  />
                ))}
              </div>
              {value.payment_deposit_mode === "percent" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-32 space-y-1.5">
                    <Label htmlFor="payment-deposit-percent">Deposit %</Label>
                    <Input
                      id="payment-deposit-percent"
                      inputMode="decimal"
                      value={value.payment_deposit_percent ?? ""}
                      onChange={(e) => {
                        const n = Number.parseFloat(e.target.value.replace(",", "."));
                        patch({ payment_deposit_percent: Number.isFinite(n) ? n : null });
                      }}
                    />
                  </div>
                  <div className="flex gap-1.5 pb-1">
                    {QUICK_PERCENTS.map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => patch({ payment_deposit_percent: percent })}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                          value.payment_deposit_percent === percent
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {value.payment_deposit_mode === "fixed" ? (
                <div className="w-44 space-y-1.5">
                  <Label htmlFor="payment-deposit-fixed">Deposit amount ({currency})</Label>
                  <Input
                    key={disabled ? "view" : "edit"}
                    id="payment-deposit-fixed"
                    inputMode="decimal"
                    defaultValue={
                      value.payment_deposit_fixed_cents != null
                        ? (value.payment_deposit_fixed_cents / 100).toFixed(2)
                        : ""
                    }
                    onChange={(e) => {
                      const n = Number.parseFloat(e.target.value.replace(/[$\s]/g, "").replace(",", "."));
                      patch({ payment_deposit_fixed_cents: Number.isFinite(n) ? Math.round(n * 100) : null });
                    }}
                  />
                </div>
              ) : null}
            </div>

            {hasDeposit ? (
              <div className="space-y-2">
                <SectionLabel>Deposit due</SectionLabel>
                <div className="grid gap-2 sm:grid-cols-3">
                  {depositOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      selected={depositRule === option.id}
                      onSelect={() =>
                        patch({
                          payment_deposit_due_rule: option.id,
                          payment_deposit_due_date: option.id === "fixed_date" ? value.payment_deposit_due_date : null,
                        })
                      }
                      className="p-3"
                    />
                  ))}
                </div>
                {depositRule === "fixed_date" ? (
                  <div className="w-48 space-y-1.5">
                    <Label htmlFor="payment-deposit-date">Deposit due date</Label>
                    <DateInput
                      id="payment-deposit-date"
                      value={value.payment_deposit_due_date ?? ""}
                      onChange={(next) => patch({ payment_deposit_due_date: next || null })}
                    />
                  </div>
                ) : null}
                <ExpiryHint show={depositRule === "quote_expiry" && !validUntil} />
              </div>
            ) : null}

            {depositCoversTotal ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/[0.05] p-4">
                <div className="min-w-0">
                  <SectionLabel>No balance</SectionLabel>
                  <p className="mt-1 text-sm text-foreground">The deposit covers the full total.</p>
                  <p className="text-xs text-muted-foreground">
                    Pay in full keeps the whole amount due if the total changes later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={switchToPayInFull}
                  className="rounded-xl border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Switch to Pay in full
                </button>
              </div>
            ) : (
            <div className="space-y-2">
              <SectionLabel>{hasDeposit ? "Balance due" : "Payment due"}</SectionLabel>
              <div className="grid gap-2 sm:grid-cols-3">
                {options.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    selected={balanceRule === option.id}
                    onSelect={() =>
                      patch({
                        payment_balance_due_rule: option.id,
                        payment_balance_due_days: quoteDueRuleUsesDays(option.id)
                          ? value.payment_balance_due_days || defaults.balance_due_days || 7
                          : 0,
                        payment_balance_due_date: option.id === "fixed_date" ? value.payment_balance_due_date : null,
                      })
                    }
                    className="p-3"
                  />
                ))}
              </div>
              {quoteDueRuleUsesDays(balanceRule) ? (
                <div className="w-32 space-y-1.5">
                  <Label htmlFor="payment-balance-days">Days</Label>
                  <Input
                    id="payment-balance-days"
                    inputMode="numeric"
                    value={value.payment_balance_due_days ?? ""}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      patch({ payment_balance_due_days: Number.isFinite(n) ? n : null });
                    }}
                  />
                </div>
              ) : null}
              {balanceRule === "fixed_date" ? (
                <div className="w-48 space-y-1.5">
                  <Label htmlFor="payment-balance-date">{hasDeposit ? "Balance due date" : "Payment due date"}</Label>
                  <DateInput
                    id="payment-balance-date"
                    value={value.payment_balance_due_date ?? ""}
                    onChange={(next) => patch({ payment_balance_due_date: next || null })}
                  />
                </div>
              ) : null}
              <ExpiryHint show={balanceRule === "quote_expiry" && !validUntil} />
            </div>
            )}
          </div>
        ) : null}
      </fieldset>

      {enabled && !disabled && missingDepositAmount ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
          Enter the deposit amount to see the payment schedule. Charging the whole amount? Choose Pay in full.
        </p>
      ) : null}

      {rows.length ? (
        <div className={cn("mt-4 grid gap-2", rows.length > 1 && "sm:grid-cols-2")}>
          {rows.map((row) => (
            <div key={row.key} className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">{row.label}</p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums">{money(row.amountCents)}</p>
              <p className="text-xs text-muted-foreground">
                {row.due}
                {row.detail ? ` · ${row.detail}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : disabled ? (
        <p className="mt-3 text-xs text-muted-foreground">No payment terms on this quote.</p>
      ) : null}
    </div>
  );
}
