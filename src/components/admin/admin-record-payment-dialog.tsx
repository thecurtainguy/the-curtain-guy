"use client";

import { useState } from "react";
import { BadgePercent, Banknote, Check, Undo2 } from "lucide-react";
import {
  todayIsoDate,
  type InvoiceWithRelations,
  type PaymentKind,
  type PaymentMethod,
} from "@/data/invoices";
import { OptionCard } from "@/components/estimate/option-card";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent, BrandDialogSection } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";

const KIND_OPTIONS = [
  { id: "deposit", label: "Deposit", icon: BadgePercent },
  { id: "payment", label: "Payment", icon: Banknote },
  { id: "refund", label: "Refund", icon: Undo2 },
] as const;

export function AdminRecordPaymentDialog({
  invoice,
  paymentMethods,
  suggestedCents,
  suggestedKind,
  preferredMethodId = null,
  open,
  onOpenChange,
  onRecorded,
}: {
  invoice: InvoiceWithRelations;
  paymentMethods: PaymentMethod[];
  suggestedCents: number;
  suggestedKind: PaymentKind;
  preferredMethodId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (invoice: InvoiceWithRelations) => void;
}) {
  const methods = [
    ...paymentMethods,
    { id: "other", kind: "custom", enabled: true, label: "Other", fields: [], instructions: "" } as PaymentMethod,
  ];
  const [kind, setKind] = useState<PaymentKind>(suggestedKind);
  const [amount, setAmount] = useState((Math.max(0, suggestedCents) / 100).toFixed(2));
  const [paidOn, setPaidOn] = useState(todayIsoDate());
  const [method, setMethod] = useState(
    methods.find((m) => m.enabled && m.id === preferredMethodId)?.id ??
      methods.find((m) => m.enabled)?.id ??
      "other"
  );
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const cents = Math.round(Number.parseFloat(amount.replace(/[$\s]/g, "").replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount above $0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amount_cents: cents, paid_on: paidOn, method, reference, note }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok || !json.invoice) {
        setError(json.message ?? "Could not record payment.");
        return;
      }
      onRecorded(json.invoice);
      onOpenChange(false);
    } catch {
      setError("Could not record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="md"
        icon={Banknote}
        eyebrow={invoice.invoice_number}
        title="Record a payment"
        description="Amounts are pre-filled with what’s due now — change them to any amount."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <LoadingButton type="button" isLoading={busy} loadingText="Saving" icon={<Check className="size-4" />} onClick={() => void submit()}>
              Record {kind}
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-5">
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount (CAD)</Label>
              <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date received</Label>
              <DateInput value={paidOn} onChange={setPaidOn} />
            </div>
          </div>

          <BrandDialogSection label="Method">
            <div className="grid grid-cols-2 gap-2">
              {methods.map((option) => (
                <OptionCard
                  key={option.id}
                  option={{ id: option.id, label: option.label }}
                  selected={method === option.id}
                  onSelect={() => setMethod(option.id)}
                  className="p-3"
                />
              ))}
            </div>
          </BrandDialogSection>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e-Transfer ID, cheque #…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-note">Note</Label>
              <Textarea id="pay-note" rows={1} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-8" />
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}
