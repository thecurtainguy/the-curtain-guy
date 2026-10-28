"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, Eye, Loader2, PenLine, Reply, Save, Users } from "lucide-react";
import { todayIsoDate, type InvoiceWithRelations } from "@/data/invoices";
import {
  daysBetweenIso,
  lastInvoiceEmailRecipients,
  reminderDueFor,
  resolveReminderRecipients,
} from "@/data/invoice-reminders";
import type { CustomerContactOption } from "@/data/customers";
import { formatMoneyFromCents } from "@/data/quotes";
import { RecipientInput, splitRecipientEmails } from "@/components/admin/recipient-input";
import { OptionCard } from "@/components/estimate/option-card";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Preview = { subject: string; html: string; from: string; replyTo: string };

const SOURCE_LABEL = {
  custom: "your saved reminder list",
  last_sent: "everyone who received the invoice email",
  client: "the client email on the invoice",
} as const;

function sameList(a: string[], b: string[]): boolean {
  const key = (list: string[]) => list.map((e) => e.toLowerCase()).sort().join(",");
  return key(a) === key(b);
}

export function AdminInvoiceReminderDialog({
  invoice,
  contacts = [],
  open,
  onOpenChange,
  onSent,
}: {
  invoice: InvoiceWithRelations;
  contacts?: CustomerContactOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: (invoice: InvoiceWithRelations, message: string) => void;
}) {
  const saved = useMemo(
    () => resolveReminderRecipients(invoice, lastInvoiceEmailRecipients(invoice.events ?? [])),
    [invoice]
  );
  const due = reminderDueFor(invoice);
  const daysLate = due ? daysBetweenIso(due.dueDate, todayIsoDate()) : 0;
  const late = daysLate >= 1;

  const [to, setTo] = useState(saved.to.join(", "));
  const [cc, setCc] = useState(saved.cc.join(", "));
  const [note, setNote] = useState("");
  const [saveForAutomatic, setSaveForAutomatic] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toList = splitRecipientEmails(to);
  const ccList = splitRecipientEmails(cc);
  const changedRecipients = !sameList(toList, saved.to) || !sameList(ccList, saved.cc);
  const people = toList.length + ccList.length;

  async function fetchPreview(): Promise<Preview | { error: string }> {
    const response = await fetch(`/api/admin/invoices/${invoice.id}/remind/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const json = (await response.json()) as { ok?: boolean; message?: string } & Partial<Preview>;
    if (!response.ok || !json.ok || typeof json.html !== "string") {
      return { error: json.message ?? "Could not build the preview." };
    }
    return json as Preview;
  }

  useEffect(() => {
    let cancelled = false;
    fetchPreview()
      .then((next) => {
        if (cancelled) return;
        if ("error" in next) setError(next.error);
        else setPreview(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Envelope (from / reply-to / subject) only needs loading once when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function showPreview() {
    setMode("preview");
    setPreviewLoading(true);
    setError(null);
    try {
      const next = await fetchPreview();
      if ("error" in next) setError(next.error);
      else setPreview(next);
    } catch {
      setError("Could not build the preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function send() {
    if (toList.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, note, saveForAutomatic: changedRecipients && saveForAutomatic }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok || !json.invoice) {
        setError(json.message ?? "Could not send the reminder.");
        return;
      }
      onSent(json.invoice, json.message ?? "Payment reminder sent.");
      onOpenChange(false);
    } catch {
      setError("Could not send the reminder.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="lg"
        icon={BellRing}
        eyebrow="Payment reminder"
        title={`Remind about ${invoice.invoice_number}`}
        description={
          <>
            {late ? "Polite “payment overdue” wording" : "Friendly “coming due” wording"}, in{" "}
            <span className="font-medium text-primary">{invoice.language === "fr" ? "French" : "French and English"}</span>{" "}
            with the secure invoice link.{invoice.reminders_enabled === false ? " Automatic reminders stay paused." : ""}
          </>
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              isLoading={sending}
              loadingText="Sending"
              icon={<BellRing className="size-4" />}
              onClick={() => void send()}
              disabled={toList.length === 0}
            >
              {people > 1 ? `Send to ${people} people` : "Send reminder"}
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-4">
          {due ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-primary">
                  {due.kind === "deposit" ? "Deposit due" : "Balance due"}
                </p>
                <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                  {formatMoneyFromCents(due.amountCents, "en", invoice.currency)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Due date</p>
                <p className="mt-1 font-heading text-lg font-semibold tabular-nums">{due.dueDate}</p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-3",
                  late ? "border-amber-500/40 bg-amber-500/10" : "border-border/40 bg-card/30"
                )}
              >
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                <p className="mt-1 flex items-center gap-1.5 font-heading text-lg font-semibold">
                  <CalendarClock className="size-4 text-primary" />
                  {late ? `${daysLate} day${daysLate === 1 ? "" : "s"} late` : daysLate === 0 ? "Due today" : `In ${-daysLate} days`}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="flex rounded-full border border-border/50 p-0.5">
              <button
                type="button"
                onClick={() => setMode("write")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  mode === "write" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <PenLine className="size-3.5" />
                Recipients & note
              </button>
              <button
                type="button"
                onClick={() => void showPreview()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  mode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Eye className="size-3.5" />
                Preview email
              </button>
            </div>
            {preview ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Reply className="size-3.5 text-primary" />
                Replies go to <span className="font-medium text-foreground">{preview.replyTo}</span>
              </span>
            ) : null}
          </div>

          {mode === "write" ? (
            <>
              <div className="space-y-3 rounded-2xl border border-border/40 bg-card/25 p-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-3.5 text-primary" />
                  Prefilled with {SOURCE_LABEL[saved.source]}.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-remind-to">To</Label>
                  <RecipientInput
                    id="inv-remind-to"
                    value={to}
                    onChange={setTo}
                    contacts={contacts}
                    usedElsewhere={{ Cc: cc }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-remind-cc">Cc — other contacts at the company</Label>
                  <RecipientInput
                    id="inv-remind-cc"
                    value={cc}
                    onChange={setCc}
                    contacts={contacts}
                    usedElsewhere={{ To: to }}
                    placeholder={
                      contacts.length > 1 ? "Click to pick other contacts" : "accounting@company.com, planner@company.com"
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Everyone in To and Cc gets the same email and can see each other. You get your own copy.
                  </p>
                </div>
              </div>

              {changedRecipients && invoice.reminders_enabled !== false ? (
                <OptionCard
                  mode="multi"
                  option={{
                    id: "save-for-auto",
                    label: "Use these recipients for automatic reminders too",
                    description: `Right now automatic reminders go to ${[...saved.to, ...saved.cc].join(", ") || "nobody"}.`,
                    icon: Save,
                  }}
                  selected={saveForAutomatic}
                  onSelect={() => setSaveForAutomatic((v) => !v)}
                  className="p-3"
                />
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="inv-remind-note">Personal note (optional)</Label>
                <Textarea
                  id="inv-remind-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Hi Andrea, just a friendly nudge — let me know if accounting needs anything from us."
                  className="resize-y text-sm leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Shown above the reminder exactly as you type it (not translated). The amount, due date and “View
                  invoice” button are added automatically.
                </p>
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/30">
              <dl className="grid gap-x-3 gap-y-1 border-b border-border/40 px-4 py-3 text-xs sm:grid-cols-[80px_minmax(0,1fr)]">
                {[
                  ["From", preview?.from ?? "…"],
                  ["Reply-to", preview?.replyTo ?? "…"],
                  ["To", toList.join(", ") || "—"],
                  ...(ccList.length ? [["Cc", ccList.join(", ")]] : []),
                  ["Subject", preview?.subject ?? "…"],
                ].map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="relative bg-[#0b0d12]">
                {previewLoading || !preview ? (
                  <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Building preview…
                  </div>
                ) : (
                  <iframe
                    title="Payment reminder preview"
                    srcDoc={preview.html}
                    sandbox=""
                    className="h-[420px] w-full border-0"
                  />
                )}
              </div>
            </div>
          )}

          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}
