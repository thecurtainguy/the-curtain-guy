"use client";

import { useEffect, useState } from "react";
import { Eye, FileText, Loader2, PenLine, Reply, Send, X } from "lucide-react";
import {
  computeAmountDue,
  getInvoiceCopy,
  type InvoiceWithRelations,
} from "@/data/invoices";
import { CUSTOMER_LANGUAGE_LABELS } from "@/data/customer-language";
import { formatCadFromCents } from "@/data/quotes";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DEFAULT_BCC = "admin@thecurtainguy.com";

type Preview = { subject: string; html: string; from: string; replyTo: string; attachment: string | null };

function splitEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function RecipientChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const emails = splitEmails(value);
  if (emails.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {emails.map((email, index) => (
        <span
          key={`${index}-${email}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
            looksLikeEmail(email)
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          {email}
          <button
            type="button"
            aria-label={`Remove ${email}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onChange(emails.filter((_, i) => i !== index).join(", "))}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function AdminInvoiceSendDialog({
  invoice,
  tradeName,
  open,
  onOpenChange,
  onSent,
}: {
  invoice: InvoiceWithRelations;
  tradeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: (invoice: InvoiceWithRelations, publicUrl: string | null, message: string) => void;
}) {
  const t = getInvoiceCopy(invoice.language);
  const due = computeAmountDue(invoice);
  const [to, setTo] = useState(invoice.customer_email ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState(DEFAULT_BCC);
  const [subject, setSubject] = useState(t.emailSubject(invoice.invoice_number, tradeName));
  const [bodyText, setBodyText] = useState(
    [t.emailGreeting(invoice.customer_name?.trim() || null), "", t.emailBody].join("\n")
  );
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function fetchPreview(): Promise<Preview | null> {
    const response = await fetch(`/api/admin/invoices/${invoice.id}/email-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, bodyText, attachPdf }),
    });
    const json = (await response.json()) as { ok?: boolean } & Partial<Preview>;
    if (!response.ok || !json.ok || typeof json.html !== "string") return null;
    return json as Preview;
  }

  useEffect(() => {
    let cancelled = false;
    fetchPreview()
      .then((next) => {
        if (!cancelled && next) setPreview(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Envelope (from / reply-to) only needs loading once when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function showPreview() {
    setMode("preview");
    setPreviewLoading(true);
    try {
      const next = await fetchPreview();
      if (next) setPreview(next);
      else setError("Could not build the preview.");
    } catch {
      setError("Could not build the preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc, bcc, subject, bodyText, attachPdf }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        publicUrl?: string;
        invoice?: InvoiceWithRelations;
      };
      if (!response.ok || !json.ok || !json.invoice) {
        setError(json.message ?? "Could not send invoice.");
        return;
      }
      onSent(json.invoice, json.publicUrl ?? null, json.message ?? "Invoice sent.");
      onOpenChange(false);
    } catch {
      setError("Could not send invoice.");
    } finally {
      setSending(false);
    }
  }

  const toList = splitEmails(to);
  const ccList = splitEmails(cc);
  const bccList = splitEmails(bcc);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="lg"
        icon={Send}
        eyebrow="Invoice email"
        title={`Send ${invoice.invoice_number}`}
        description={
          <>
            The client gets a branded email with the PDF and a secure link. Written in{" "}
            <span className="font-medium text-primary">{CUSTOMER_LANGUAGE_LABELS[invoice.language]}</span>.
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
              icon={<Send className="size-4" />}
              onClick={() => void send()}
            >
              {ccList.length ? `Send to ${toList.length + ccList.length} people` : "Send invoice"}
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/40 bg-card/30 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total</p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums">{formatCadFromCents(invoice.total_cents)}</p>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 sm:col-span-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-primary">
                {due.dueNowKind === "deposit" ? "Deposit requested" : "Amount due"}
              </p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums">{formatCadFromCents(due.dueNowCents)}</p>
            </div>
          </div>

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
                Write
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inv-send-to">To</Label>
                  <Input id="inv-send-to" value={to} onChange={(e) => setTo(e.target.value)} />
                  <RecipientChips value={to} onChange={setTo} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inv-send-cc">Cc — other contacts at the company</Label>
                  <Input
                    id="inv-send-cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="accounting@company.com, planner@company.com"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Separate with commas. Everyone in To and Cc gets the same email and PDF and can see each other.
                  </p>
                  <RecipientChips value={cc} onChange={setCc} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inv-send-bcc">Bcc (hidden copy)</Label>
                  <Input id="inv-send-bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inv-send-subject">Subject</Label>
                  <Input id="inv-send-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-send-body">Message</Label>
                <Textarea
                  id="inv-send-body"
                  rows={7}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="resize-y text-sm leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Invoice summary, amount due, and the “View invoice” button are added below your message.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={attachPdf}
                  onChange={(e) => setAttachPdf(e.target.checked)}
                />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-3.5 text-primary" />
                  Attach {invoice.invoice_number}.pdf (with payment page)
                </span>
              </label>
            </>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/30">
              <dl className="grid gap-x-3 gap-y-1 border-b border-border/40 px-4 py-3 text-xs sm:grid-cols-[80px_minmax(0,1fr)]">
                {[
                  ["From", preview?.from ?? "…"],
                  ["Reply-to", preview?.replyTo ?? "…"],
                  ["To", toList.join(", ") || "—"],
                  ...(ccList.length ? [["Cc", ccList.join(", ")]] : []),
                  ...(bccList.length ? [["Bcc", bccList.join(", ")]] : []),
                  ["Subject", subject],
                ].map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {preview?.attachment ? (
                <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2 text-xs">
                  <FileText className="size-3.5 text-primary" />
                  {preview.attachment}
                  <span className="text-muted-foreground">· same PDF as the Download button</span>
                </div>
              ) : null}
              <div className="relative bg-[#0b0d12]">
                {previewLoading || !preview ? (
                  <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Building preview…
                  </div>
                ) : (
                  <iframe
                    title="Invoice email preview"
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
