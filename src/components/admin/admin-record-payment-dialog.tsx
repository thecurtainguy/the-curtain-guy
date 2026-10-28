"use client";

import { useState } from "react";
import { BadgePercent, Banknote, Check, CircleCheckBig, Mail, PenLine, Undo2 } from "lucide-react";
import {
  todayIsoDate,
  type InvoiceWithRelations,
  type PaymentKind,
  type PaymentMethod,
} from "@/data/invoices";
import { formatMoneyFromCents } from "@/data/quotes";
import { OptionCard } from "@/components/estimate/option-card";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent, BrandDialogSection } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const KIND_OPTIONS = [
  { id: "deposit", label: "Deposit", icon: BadgePercent },
  { id: "payment", label: "Payment", icon: Banknote },
  { id: "refund", label: "Refund", icon: Undo2 },
] as const;

/** "deposit" / "full" lock the amount to what's outstanding and ask only how it was paid. */
export type PaymentPreset = "deposit" | "full";

const PRESET_COPY: Record<PaymentPreset, { title: string; description: string; confirm: string; icon: typeof Banknote }> = {
  full: {
    title: "Mark paid in full",
    description: "Confirm how the client paid the remaining balance. The invoice switches to Paid.",
    confirm: "Mark paid in full",
    icon: CircleCheckBig,
  },
  deposit: {
    title: "Deposit received",
    description: "Confirm how the client paid the deposit. The balance stays open until the due date.",
    confirm: "Record deposit",
    icon: BadgePercent,
  },
};

export function AdminRecordPaymentDialog({
  invoice,
  paymentMethods,
  suggestedCents,
  suggestedKind,
  preset = null,
  presetCents = 0,
  balanceCents,
  preferredMethodId = null,
  open,
  onOpenChange,
  onRecorded,
}: {
  invoice: InvoiceWithRelations;
  paymentMethods: PaymentMethod[];
  suggestedCents: number;
  suggestedKind: PaymentKind;
  preset?: PaymentPreset | null;
  /** Outstanding deposit or remaining balance for the preset. */
  presetCents?: number;
  balanceCents: number;
  preferredMethodId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (invoice: InvoiceWithRelations, receiptTo: string | null) => void;
}) {
  const methods = [
    ...paymentMethods,
    { id: "other", kind: "custom", enabled: true, label: "Other", fields: [], instructions: "" } as PaymentMethod,
  ];
  const [mode, setMode] = useState<PaymentPreset | null>(preset);
  const [kind, setKind] = useState<PaymentKind>(preset === "deposit" ? "deposit" : preset ? "payment" : suggestedKind);
  const [amount, setAmount] = useState(
    (Math.max(0, preset ? presetCents : suggestedCents) / 100).toFixed(2)
  );
  const [paidOn, setPaidOn] = useState(todayIsoDate());
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const clientEmail = invoice.customer_email?.trim() || null;
  const [sendReceipt, setSendReceipt] = useState(Boolean(clientEmail));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const money = (cents: number) => formatMoneyFromCents(cents, "en", invoice.currency);
  const copy = mode ? PRESET_COPY[mode] : null;
  const methodLabel = methods.find((m) => m.id === method)?.label;

  async function submit() {
    if (!method) {
      setError("Choose how the client paid.");
      return;
    }
    const cents = mode
      ? presetCents
      : Math.round(Number.parseFloat(amount.replace(/[$\s]/g, "").replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError(mode === "deposit" ? "The deposit is already covered." : mode ? "Nothing left to pay." : "Enter an amount above $0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode ? { quick: mode } : { kind, amount_cents: cents }),
          paid_on: paidOn,
          method,
          reference,
          note,
          send_receipt: sendReceipt,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        invoice?: InvoiceWithRelations;
        receiptTo?: string | null;
      };
      if (!response.ok || !json.ok || !json.invoice) {
        setError(json.message ?? "Could not record payment.");
        return;
      }
      onRecorded(json.invoice, json.receiptTo ?? null);
      onOpenChange(false);
    } catch {
      setError("Could not record payment.");
    } finally {
      setBusy(false);
    }
  }

  function switchToCustom() {
    setMode(null);
    setKind(mode === "deposit" ? "deposit" : "payment");
  }

  const afterCents = Math.max(0, balanceCents - (mode ? presetCents : 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="md"
        icon={copy?.icon ?? Banknote}
        eyebrow={invoice.invoice_number}
        title={copy?.title ?? "Record a payment"}
        description={copy?.description ?? "Amounts are pre-filled with what’s due now — change them to any amount."}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <LoadingButton type="button" isLoading={busy} loadingText="Saving" icon={<Check className="size-4" />} onClick={() => void submit()}>
              {copy ? `${copy.confirm} · ${money(presetCents)}` : `Record ${kind}`}
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-5">
          {mode ? (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/40 bg-card/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Balance due</p>
                  <p className="mt-1 font-heading text-lg font-semibold tabular-nums">{money(balanceCents)}</p>
                </div>
                <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-primary">
                    {mode === "deposit" ? "Deposit received" : "Received now"}
                  </p>
                  <p className="mt-1 font-heading text-lg font-semibold tabular-nums">{money(presetCents)}</p>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border p-3",
                    afterCents === 0 ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/40 bg-card/30"
                  )}
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">After this</p>
                  <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                    {afterCents === 0 ? "Paid in full" : `${money(afterCents)} left`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={switchToCustom}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <PenLine className="size-3.5" />
                Received a different amount? Record it instead
              </button>
            </div>
          ) : (
            <>
              <BrandDialogSection label="Type">
                <div className="grid grid-cols-3 gap-2">
                  {KIND_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      selected={kind === option.id}
                      onSelect={() => setKind(option.id)}
                      className="p-3"
                    />
                  ))}
                </div>
              </BrandDialogSection>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount ({invoice.currency})</Label>
                <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </>
          )}

          <BrandDialogSection label="How did they pay?">
            <div className="grid grid-cols-2 gap-2">
              {methods.map((option) => (
                <OptionCard
                  key={option.id}
                  option={{
                    id: option.id,
                    label: option.label,
                    description: option.id === preferredMethodId ? "Client’s usual method" : undefined,
                  }}
                  selected={method === option.id}
                  onSelect={() => {
                    setMethod(option.id);
                    setError(null);
                  }}
                  className="p-3"
                />
              ))}
            </div>
          </BrandDialogSection>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date received</Label>
              <DateInput value={paidOn} onChange={setPaidOn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={methodLabel ? `${methodLabel} reference, cheque #…` : "e-Transfer ID, cheque #…"}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Note</Label>
            <Textarea id="pay-note" rows={1} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-8" />
          </div>

          <OptionCard
            mode="multi"
            option={{
              id: "receipt",
              label: kind === "refund" ? "Email the client a refund notice" : "Email the client a receipt",
              description: clientEmail
                ? `Bilingual, sent to ${clientEmail} with the remaining balance.`
                : "No client email on this invoice — add one in Client & billing.",
              icon: Mail,
            }}
            selected={sendReceipt && Boolean(clientEmail)}
            onSelect={() => clientEmail && setSendReceipt((value) => !value)}
            className="p-3"
          />

          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}
