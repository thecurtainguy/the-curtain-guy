"use client";

import {
  BadgePercent,
  Banknote,
  CalendarCheck,
  CalendarClock,
  CircleSlash,
  FileClock,
  Wallet,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { ToggleTile } from "@/components/admin/customers/customer-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BalanceDueRule, DepositMode } from "@/data/invoices";
import {
  defaultQuotePaymentTerms,
  hasQuotePaymentTerms,
  NO_QUOTE_PAYMENT_TERMS,
  quotePaymentRows,
  type QuotePaymentDefaults,
  type QuotePaymentTerms,
} from "@/data/quote-payment-terms";
import { formatMoneyFromCents } from "@/data/quotes";
import { cn } from "@/lib/utils";

const DEPOSIT_OPTIONS: Array<{ id: DepositMode; label: string; description: string; icon: typeof Wallet }> = [
  { id: "none", label: "No deposit", description: "Full amount on the balance date", icon: CircleSlash },
  { id: "percent", label: "Percentage", description: "Share of the quote total", icon: BadgePercent },
  { id: "fixed", label: "Fixed amount", description: "Same amount whatever the total", icon: Banknote },
];

const BALANCE_OPTIONS: Array<{ id: BalanceDueRule; label: string; description: string; icon: typeof Wallet }> = [
  { id: "event_date", label: "On the event date", description: "Balance due the day of the event", icon: CalendarCheck },
  { id: "days_before_event", label: "Days before the event", description: "e.g. 7 days before", icon: CalendarClock },
  { id: "days_after_issue", label: "Days after the invoice", description: "e.g. net 15", icon: FileClock },
];

const QUICK_PERCENTS = [25, 30, 50];

export function QuotePaymentTermsFields({
  value,
  onChange,
  defaults,
  totalCents,
  eventDate,
  currency,
  disabled,
}: {
  value: QuotePaymentTerms;
  onChange: (next: QuotePaymentTerms) => void;
  defaults: QuotePaymentDefaults;
  totalCents: number;
  eventDate: string | null;
  currency: string;
  disabled?: boolean;
}) {
  const enabled = hasQuotePaymentTerms(value);
  const rows = quotePaymentRows({ ...value, total_cents: totalCents, event_date: eventDate }, "en");
  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);
  const patch = (next: Partial<QuotePaymentTerms>) => onChange({ ...value, ...next });

  return (
    <div className="mt-4 rounded-2xl border border-border/40 bg-background/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Wallet className="size-4" />
        </span>
        <div className="min-w-0">
          <Label>Payment terms</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown on the proposal and PDF. The deposit is due on acceptance, and the job&apos;s
            first invoice uses these terms.
          </p>
        </div>
      </div>

      {disabled ? null : (
        <div className="mt-3">
          <ToggleTile
            checked={enabled}
            onChange={(on) => onChange(on ? defaultQuotePaymentTerms(defaults) : NO_QUOTE_PAYMENT_TERMS)}
            title="Show payment terms on this quote"
            description={`Starts from this customer's defaults (${defaults.deposit_percent}% deposit).`}
          />
        </div>
      )}

      {enabled && !disabled ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Deposit</p>
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

          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Balance due</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {BALANCE_OPTIONS.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  selected={value.payment_balance_due_rule === option.id}
                  onSelect={() =>
                    patch({
                      payment_balance_due_rule: option.id,
                      payment_balance_due_days:
                        option.id === "event_date"
                          ? 0
                          : value.payment_balance_due_days || defaults.balance_due_days || 7,
                    })
                  }
                  className="p-3"
                />
              ))}
            </div>
            {value.payment_balance_due_rule && value.payment_balance_due_rule !== "event_date" ? (
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
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <div className={cn("grid gap-2", disabled ? "mt-3" : "mt-4", rows.length > 1 && "sm:grid-cols-2")}>
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
