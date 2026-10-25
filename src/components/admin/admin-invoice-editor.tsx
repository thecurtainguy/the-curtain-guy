"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Banknote,
  BadgePercent,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  FileText,
  History,
  Languages,
  Link2,
  ListOrdered,
  Plus,
  Receipt,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  addDaysIso,
  computeAmountDue,
  computeDepositCents,
  computeInvoiceTotals,
  getInvoiceTaxRows,
  paymentMethodLabel,
  todayIsoDate,
  type DepositMode,
  type InvoiceWithRelations,
  type PaymentMethod,
} from "@/data/invoices";
import {
  computeLineTotalCents,
  formatCadFromCents,
  percentInputToRate,
  rateToPercentInput,
  unitPriceCentsToDollarInput,
  unitPriceDollarsToCents,
  type QuoteTaxMode,
} from "@/data/quotes";
import type { CustomerLanguage } from "@/data/customer-language";
import { AdminInvoiceAuditLog } from "@/components/admin/admin-invoice-audit-log";
import { OptionCard } from "@/components/estimate/option-card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { AdminInvoiceSendDialog } from "@/components/admin/admin-invoice-send-dialog";
import { AdminRecordPaymentDialog } from "@/components/admin/admin-record-payment-dialog";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { useBrandConfirm } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  is_taxable: boolean;
};

type FormState = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string;
  billing_address: string;
  event_date: string;
  venue_name: string;
  issue_date: string;
  due_date: string;
  language: CustomerLanguage;
  tax_mode: QuoteTaxMode;
  gst_percent: string;
  qst_percent: string;
  deposit_mode: DepositMode;
  deposit_percent: string;
  deposit_fixed: string;
  deposit_due_date: string;
  notes: string;
  terms: string;
  internal_notes: string;
  lines: LineDraft[];
};

let lineKeySeed = 0;
function newLineKey() {
  lineKeySeed += 1;
  return `line-${Date.now()}-${lineKeySeed}`;
}

function toForm(invoice: InvoiceWithRelations): FormState {
  return {
    customer_name: invoice.customer_name ?? "",
    customer_email: invoice.customer_email ?? "",
    customer_phone: invoice.customer_phone ?? "",
    company_name: invoice.company_name ?? "",
    billing_address: invoice.billing_address ?? "",
    event_date: invoice.event_date ?? "",
    venue_name: invoice.venue_name ?? "",
    issue_date: invoice.issue_date ?? "",
    due_date: invoice.due_date ?? "",
    language: invoice.language,
    tax_mode: invoice.tax_mode,
    gst_percent: rateToPercentInput(invoice.gst_rate),
    qst_percent: rateToPercentInput(invoice.qst_rate),
    deposit_mode: invoice.deposit_mode,
    deposit_percent: String(invoice.deposit_percent),
    deposit_fixed: (invoice.deposit_cents / 100).toFixed(2),
    deposit_due_date: invoice.deposit_due_date ?? "",
    notes: invoice.notes ?? "",
    terms: invoice.terms ?? "",
    internal_notes: invoice.internal_notes ?? "",
    lines: invoice.line_items.map((line) => ({
      key: line.id,
      description: line.description,
      quantity: String(line.quantity),
      unit_label: line.unit_label ?? "",
      unit_price: unitPriceCentsToDollarInput(line.unit_price_cents),
      is_taxable: line.is_taxable,
    })),
  };
}

function parseQty(value: string): number {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function dollarsToCents(value: string): number {
  const n = Number.parseFloat(value.replace(/[$\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toPayload(form: FormState) {
  return {
    customer_name: form.customer_name,
    customer_email: form.customer_email,
    customer_phone: form.customer_phone,
    company_name: form.company_name,
    billing_address: form.billing_address,
    event_date: form.event_date || null,
    venue_name: form.venue_name,
    issue_date: form.issue_date || null,
    due_date: form.due_date || null,
    language: form.language,
    tax_mode: form.tax_mode,
    gst_rate: percentInputToRate(form.gst_percent),
    qst_rate: percentInputToRate(form.qst_percent),
    deposit_mode: form.deposit_mode,
    deposit_percent: Number.parseFloat(form.deposit_percent) || 0,
    deposit_fixed_cents: dollarsToCents(form.deposit_fixed),
    deposit_due_date: form.deposit_due_date || null,
    notes: form.notes,
    terms: form.terms,
    internal_notes: form.internal_notes,
    line_items: form.lines.map((line) => ({
      description: line.description,
      quantity: parseQty(line.quantity),
      unit_label: line.unit_label || null,
      unit_price_cents: unitPriceDollarsToCents(line.unit_price || "0"),
      is_taxable: line.is_taxable,
    })),
  };
}

const DEPOSIT_OPTIONS = [
  { id: "percent", label: "Percentage", description: "Auto-calculated from the total", icon: BadgePercent },
  { id: "fixed", label: "Custom amount", description: "Any dollar amount you set", icon: CircleDollarSign },
  { id: "none", label: "No deposit", description: "Full balance by the due date", icon: Ban },
] as const;

const TAX_OPTIONS = [
  { id: "quebec_gst_qst", label: "Québec GST + QST", description: "5% + 9.975% on taxable lines", icon: Receipt },
  { id: "none", label: "No tax", description: "Exempt or out-of-province", icon: Ban },
] as const;

const QUICK_PERCENTS = [25, 30, 50, 100];

function Panel({
  icon: Icon,
  eyebrow,
  title,
  children,
  actions,
  className,
}: {
  icon: typeof Receipt;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/40 bg-card/25", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h2 className="font-heading text-base font-semibold">{title}</h2>
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card/30"
      )}
    >
      <p className={cn("text-[10px] uppercase tracking-[0.16em]", accent ? "text-primary" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type DueShortcut = { label: string; date: string };

function DueDateShortcuts({
  shortcuts,
  value,
  onPick,
}: {
  shortcuts: DueShortcut[];
  value: string;
  onPick: (date: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.label}
          type="button"
          onClick={() => onPick(shortcut.date)}
          title={shortcut.date}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
            value === shortcut.date
              ? "border-primary bg-primary/15 text-primary"
              : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {shortcut.label}
        </button>
      ))}
    </div>
  );
}

export function AdminInvoiceEditor({
  invoice: initialInvoice,
  paymentMethods,
  tradeName,
  initialPublicUrl,
}: {
  invoice: InvoiceWithRelations;
  paymentMethods: PaymentMethod[];
  tradeName: string;
  initialPublicUrl: string | null;
}) {
  const router = useRouter();
  const [confirm, confirmDialog] = useBrandConfirm();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [form, setForm] = useState(() => toForm(initialInvoice));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toPayload(toForm(initialInvoice))));
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => toPayload(form), [form]);
  const isDirty = JSON.stringify(payload) !== baseline;
  const isVoid = invoice.status === "void";

  const liveTotals = useMemo(
    () =>
      computeInvoiceTotals(
        payload.line_items.map((line) => ({
          quantity: line.quantity,
          unit_price_cents: line.unit_price_cents,
          is_taxable: line.is_taxable,
        })),
        {
          tax_mode: payload.tax_mode,
          gst_rate: payload.gst_rate,
          qst_rate: payload.qst_rate,
          manual_tax_lines: invoice.manual_tax_lines,
        }
      ),
    [payload, invoice.manual_tax_lines]
  );
  const liveDeposit = computeDepositCents({
    mode: payload.deposit_mode,
    percent: payload.deposit_percent,
    fixedCents: payload.deposit_fixed_cents,
    totalCents: liveTotals.total_cents,
  });
  const liveBalance = liveTotals.total_cents - invoice.amount_paid_cents;
  const liveDue = computeAmountDue({
    deposit_mode: payload.deposit_mode,
    deposit_cents: liveDeposit,
    deposit_due_date: payload.deposit_due_date,
    amount_paid_cents: invoice.amount_paid_cents,
    balance_due_cents: liveBalance,
    due_date: payload.due_date,
    status: invoice.status,
  });
  const taxRows = getInvoiceTaxRows(
    {
      ...liveTotals,
      tax_mode: payload.tax_mode,
      gst_rate: payload.gst_rate,
      qst_rate: payload.qst_rate,
      manual_tax_lines: invoice.manual_tax_lines,
    },
    { variant: "admin" }
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const shortcutIssueDate = form.issue_date || todayIsoDate();
  const beforeEvent = (days: number) => {
    const target = addDaysIso(form.event_date, -days);
    return target < shortcutIssueDate ? shortcutIssueDate : target;
  };
  const balanceShortcuts: DueShortcut[] = [
    { label: "On receipt", date: shortcutIssueDate },
    ...(form.event_date
      ? [
          { label: "Event day", date: form.event_date },
          { label: "7 days before event", date: beforeEvent(7) },
        ]
      : []),
    { label: "Net 14", date: addDaysIso(shortcutIssueDate, 14) },
    { label: "Net 30", date: addDaysIso(shortcutIssueDate, 30) },
  ];
  const depositShortcuts: DueShortcut[] = [
    { label: "On receipt", date: shortcutIssueDate },
    { label: "In 7 days", date: addDaysIso(shortcutIssueDate, 7) },
    ...(form.event_date ? [{ label: "30 days before event", date: beforeEvent(30) }] : []),
  ];

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));
  }

  function moveLine(index: number, delta: number) {
    setForm((prev) => {
      const lines = [...prev.lines];
      const target = index + delta;
      if (target < 0 || target >= lines.length) return prev;
      [lines[index], lines[target]] = [lines[target], lines[index]];
      return { ...prev, lines };
    });
  }

  function flash(ok?: string | null, err?: string | null) {
    setMessage(ok ?? null);
    setError(err ?? null);
  }

  function applyInvoice(next: InvoiceWithRelations, resetForm: boolean) {
    setInvoice(next);
    if (resetForm) {
      const nextForm = toForm(next);
      setForm(nextForm);
      setBaseline(JSON.stringify(toPayload(nextForm)));
    }
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    flash();
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok || !json.invoice) {
        flash(null, json.message ?? "Could not save invoice.");
        return false;
      }
      applyInvoice(json.invoice, true);
      flash("Invoice saved.");
      router.refresh();
      return true;
    } catch {
      flash(null, "Could not save invoice.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function ensureSaved(): Promise<boolean> {
    return isDirty ? save() : true;
  }

  async function runAction(
    key: string,
    request: () => Promise<Response>,
    success: string
  ): Promise<boolean> {
    setBusyAction(key);
    flash();
    try {
      const response = await request();
      const json = (await response.json()) as { ok?: boolean; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok) {
        flash(null, json.message ?? "Something went wrong.");
        return false;
      }
      if (json.invoice) applyInvoice(json.invoice, !isDirty);
      flash(success);
      router.refresh();
      return true;
    } catch {
      flash(null, "Something went wrong.");
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function quickPayment(kind: "deposit" | "full") {
    if (!(await ensureSaved())) return;
    const method = paymentMethods.find((m) => m.enabled)?.id ?? "";
    await runAction(
      kind,
      () =>
        fetch(`/api/admin/invoices/${invoice.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quick: kind, method }),
        }),
      kind === "deposit" ? "Deposit marked as received." : "Invoice marked paid in full."
    );
  }

  async function markUnpaid() {
    const ok = await confirm({
      title: "Mark this invoice unpaid?",
      description: "Every recorded payment on this invoice will be removed.",
      confirmLabel: "Mark unpaid",
      destructive: true,
    });
    if (!ok) return;
    await runAction(
      "unpaid",
      () => fetch(`/api/admin/invoices/${invoice.id}/payments`, { method: "DELETE" }),
      "All payments removed."
    );
  }

  async function removePayment(paymentId: string) {
    const ok = await confirm({
      title: "Remove this payment?",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    await runAction(
      `pay-${paymentId}`,
      () => fetch(`/api/admin/invoices/${invoice.id}/payments/${paymentId}`, { method: "DELETE" }),
      "Payment removed."
    );
  }

  async function changeStatus(action: "mark_sent" | "revert_draft" | "void" | "unvoid") {
    if (action === "void") {
      const ok = await confirm({
        title: `Void ${invoice.invoice_number}?`,
        description: "The invoice stays on record marked VOID. You can restore it later.",
        confirmLabel: "Void invoice",
        destructive: true,
      });
      if (!ok) return;
    }
    const labels = {
      mark_sent: "Marked as sent.",
      revert_draft: "Reverted to draft.",
      void: "Invoice voided.",
      unvoid: "Invoice restored.",
    };
    await runAction(
      action,
      () =>
        fetch(`/api/admin/invoices/${invoice.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      labels[action]
    );
  }

  async function deleteDraft() {
    const ok = await confirm({
      title: `Delete ${invoice.invoice_number}?`,
      description: "This draft will be permanently removed.",
      confirmLabel: "Delete draft",
      destructive: true,
    });
    if (!ok) return;
    setBusyAction("delete");
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, { method: "DELETE" });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) {
        flash(null, json.message ?? "Could not delete.");
        return;
      }
      router.push(invoice.job_id ? `/admin/jobs/${invoice.job_id}` : "/admin/invoices");
    } finally {
      setBusyAction(null);
    }
  }

  async function copyLink(regenerate = false) {
    setBusyAction(regenerate ? "regen" : "link");
    flash();
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const json = (await response.json()) as { ok?: boolean; url?: string; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok || !json.url) {
        flash(null, json.message ?? "Could not create link.");
        return;
      }
      setPublicUrl(json.url);
      if (json.invoice) applyInvoice(json.invoice, !isDirty);
      await navigator.clipboard.writeText(json.url).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      flash(regenerate ? "New link copied. The old link no longer works." : "Client link copied.");
    } finally {
      setBusyAction(null);
    }
  }

  const depositHint =
    payload.deposit_mode === "percent"
      ? `${payload.deposit_percent}% of total`
      : payload.deposit_mode === "fixed"
        ? "Custom amount"
        : "No deposit";

  return (
    <div className="space-y-6 pb-20">
      <PortalPageHeader
        eyebrow="Invoice"
        title={invoice.invoice_number}
        description={`${invoice.customer_name || "—"} · ${invoice.customer_email || "no email"}`}
        icon={Receipt}
        backHref={invoice.job_id ? `/admin/jobs/${invoice.job_id}` : "/admin/invoices"}
        backLabel={invoice.job_id ? "Back to job" : "All invoices"}
        meta={
          <>
            <InvoiceStatusBadge invoice={invoice} />
            <span>Quote {invoice.opportunity_ref}</span>
            {invoice.sent_at ? <span>· sent {invoice.sent_at.slice(0, 10)}</span> : null}
            {invoice.viewed_at ? <span>· viewed {invoice.viewed_at.slice(0, 10)}</span> : null}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                <FileText className="size-4" />
                Preview PDF
              </a>
            </Button>
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              isLoading={busyAction === "link"}
              icon={copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
              onClick={() => void copyLink()}
            >
              Copy client link
            </LoadingButton>
            <Button
              type="button"
              size="sm"
              disabled={isVoid}
              onClick={async () => {
                if (await ensureSaved()) setSendOpen(true);
              }}
            >
              <Send className="size-4" />
              {invoice.sent_at ? "Resend invoice" : "Send invoice"}
            </Button>
          </>
        }
      />

      {(message || error) && (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/25 bg-primary/10 text-foreground"
          )}
          role={error ? "alert" : undefined}
        >
          {error || message}
        </p>
      )}

      {isVoid ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
          <span>This invoice is void. Clients see it marked VOID; payments can’t be recorded.</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void changeStatus("unvoid")}>
            <RotateCcw className="size-4" />
            Restore
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Invoice total" value={formatCadFromCents(liveTotals.total_cents)} hint={`incl. ${formatCadFromCents(liveTotals.total_tax_cents)} tax`} />
        <StatTile label="Deposit" value={formatCadFromCents(liveDeposit)} hint={depositHint} />
        <StatTile label="Paid" value={formatCadFromCents(invoice.amount_paid_cents)} hint={`${invoice.payments.length} payment${invoice.payments.length === 1 ? "" : "s"}`} />
        <StatTile
          accent
          label={liveDue.dueNowKind === "deposit" ? "Deposit due now" : "Balance due"}
          value={formatCadFromCents(liveDue.dueNowKind === "none" ? Math.max(0, liveBalance) : liveDue.dueNowCents)}
          hint={
            liveDue.dueNowKind === "none"
              ? liveBalance < 0
                ? `Overpaid by ${formatCadFromCents(-liveBalance)}`
                : "Nothing owing"
              : liveDue.dueNowDate
                ? `Due ${liveDue.dueNowDate}`
                : "Due on receipt"
          }
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel icon={UserRound} eyebrow="Bill to" title="Client & billing">
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-name">Client name</Label>
                    <Input id="inv-name" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-company">Company</Label>
                    <Input id="inv-company" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-email">Email</Label>
                    <Input id="inv-email" type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-phone">Phone</Label>
                    <Input id="inv-phone" value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-address">Billing address</Label>
                  <Textarea id="inv-address" rows={3} value={form.billing_address} onChange={(e) => set("billing_address", e.target.value)} placeholder={"123 Rue Example\nMontréal, QC H2X 1Y4"} />
                </div>
              </div>
            </Panel>

            <Panel icon={CalendarDays} eyebrow="Dates" title="Schedule & event">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Issue date</Label>
                  <DateInput value={form.issue_date} onChange={(v) => set("issue_date", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Balance due date</Label>
                  <DateInput value={form.due_date} onChange={(v) => set("due_date", v)} placeholder="Due on receipt" />
                  <DueDateShortcuts shortcuts={balanceShortcuts} value={form.due_date} onPick={(v) => set("due_date", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Event date</Label>
                  <DateInput
                    value={form.event_date}
                    onChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        event_date: v,
                        due_date: prev.due_date && prev.due_date === prev.event_date ? v : prev.due_date,
                      }))
                    }
                  />
                  {form.event_date && form.due_date === form.event_date ? (
                    <p className="text-xs text-muted-foreground">Balance due date follows this date.</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-venue">Venue</Label>
                  <Input id="inv-venue" value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Languages className="size-3.5 text-primary" />
                  Invoice language
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["en", "fr"] as const).map((lang) => (
                    <OptionCard
                      key={lang}
                      option={{ id: lang, label: lang === "en" ? "English" : "Français" }}
                      selected={form.language === lang}
                      onSelect={() => set("language", lang)}
                      className="p-3"
                    />
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <Panel
            icon={ListOrdered}
            eyebrow="Scope"
            title="Line items"
            actions={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  set("lines", [
                    ...form.lines,
                    { key: newLineKey(), description: "", quantity: "1", unit_label: "", unit_price: "0.00", is_taxable: true },
                  ])
                }
              >
                <Plus className="size-4" />
                Add line
              </Button>
            }
          >
            {form.lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No lines yet. Add what you’re billing for.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="hidden grid-cols-[minmax(0,1fr)_80px_90px_120px_110px_auto] gap-2 px-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:grid">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Unit price</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {form.lines.map((line, index) => {
                  const amount = computeLineTotalCents(parseQty(line.quantity), unitPriceDollarsToCents(line.unit_price || "0"));
                  return (
                    <div
                      key={line.key}
                      className="grid gap-2 rounded-xl border border-border/40 bg-background/30 p-3 md:grid-cols-[minmax(0,1fr)_80px_90px_120px_110px_auto] md:items-start md:border-0 md:bg-transparent md:p-1"
                    >
                      <Textarea
                        rows={1}
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        className="min-h-9 resize-y text-sm"
                        aria-label="Description"
                        placeholder="Description"
                      />
                      <Input inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value })} aria-label="Quantity" />
                      <Input value={line.unit_label} onChange={(e) => updateLine(line.key, { unit_label: e.target.value })} aria-label="Unit" placeholder="ft, set…" />
                      <Input inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(line.key, { unit_price: e.target.value })} aria-label="Unit price" />
                      <div className="flex h-8 items-center justify-end text-sm tabular-nums">{formatCadFromCents(amount)}</div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateLine(line.key, { is_taxable: !line.is_taxable })}
                          className={cn(
                            "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            line.is_taxable ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
                          )}
                          title="Toggle taxable"
                        >
                          {line.is_taxable ? "Tax" : "No tax"}
                        </button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => moveLine(index, -1)}>
                          ↑
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label="Move down" disabled={index === form.lines.length - 1} onClick={() => moveLine(index, 1)}>
                          ↓
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Remove line"
                          onClick={() => set("lines", form.lines.filter((l) => l.key !== line.key))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Tax</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TAX_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      selected={form.tax_mode === option.id}
                      onSelect={() => set("tax_mode", option.id)}
                    />
                  ))}
                </div>
                {form.tax_mode === "manual" ? (
                  <p className="text-xs text-muted-foreground">Using the custom tax rates copied from the quote.</p>
                ) : null}
                {form.tax_mode === "quebec_gst_qst" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-gst">GST %</Label>
                      <Input id="inv-gst" inputMode="decimal" value={form.gst_percent} onChange={(e) => set("gst_percent", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-qst">QST %</Label>
                      <Input id="inv-qst" inputMode="decimal" value={form.qst_percent} onChange={(e) => set("qst_percent", e.target.value)} />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
                {taxRows.map((row) => (
                  <div
                    key={row.key}
                    className={cn(
                      "flex justify-between gap-3 py-0.5 text-sm tabular-nums",
                      row.emphasis === "muted" && "text-xs text-muted-foreground",
                      row.emphasis === "total" && "mt-2 border-t border-primary/20 pt-2 font-heading text-lg font-semibold text-primary"
                    )}
                  >
                    <span>{row.label}</span>
                    <span>{formatCadFromCents(row.amountCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel icon={ClipboardCheck} eyebrow="Wording" title="Notes & terms">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-notes">Notes to client</Label>
                <Textarea id="inv-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Shown on the invoice" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-terms">Terms</Label>
                <Textarea id="inv-terms" rows={6} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
                <p className="text-xs text-muted-foreground">One term per line. Defaults come from Billing settings.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-internal">Internal notes</Label>
                <Textarea id="inv-internal" rows={2} value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} placeholder="Only you see this" />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Panel icon={BadgePercent} eyebrow="Deposit" title="Deposit request">
            <div className="space-y-2">
              {DEPOSIT_OPTIONS.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  selected={form.deposit_mode === option.id}
                  onSelect={() => set("deposit_mode", option.id)}
                />
              ))}
            </div>
            {form.deposit_mode === "percent" ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="inv-dep-pct">Deposit %</Label>
                <div className="flex items-center gap-2">
                  <Input id="inv-dep-pct" inputMode="decimal" value={form.deposit_percent} onChange={(e) => set("deposit_percent", e.target.value)} className="w-24" />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PERCENTS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => set("deposit_percent", String(pct))}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium",
                          Number(form.deposit_percent) === pct ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {form.deposit_mode === "fixed" ? (
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="inv-dep-fixed">Deposit amount (CAD)</Label>
                <Input id="inv-dep-fixed" inputMode="decimal" value={form.deposit_fixed} onChange={(e) => set("deposit_fixed", e.target.value)} />
              </div>
            ) : null}
            {form.deposit_mode !== "none" ? (
              <>
                <div className="mt-4 space-y-1.5">
                  <Label>Deposit due date</Label>
                  <DateInput value={form.deposit_due_date} onChange={(v) => set("deposit_due_date", v)} placeholder="Due on receipt" />
                  <DueDateShortcuts shortcuts={depositShortcuts} value={form.deposit_due_date} onPick={(v) => set("deposit_due_date", v)} />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                  <span className="text-xs uppercase tracking-[0.14em] text-primary">Deposit</span>
                  <span className="font-heading text-xl font-semibold tabular-nums">{formatCadFromCents(liveDeposit)}</span>
                </div>
              </>
            ) : null}
          </Panel>

          <Panel
            icon={Wallet}
            eyebrow="Payments"
            title="Paid / not paid"
            actions={
              invoice.payments.length > 0 ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => void markUnpaid()} disabled={busyAction === "unpaid"}>
                  <Undo2 className="size-4" />
                  Mark unpaid
                </Button>
              ) : null
            }
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <LoadingButton
                type="button"
                variant="outline"
                disabled={isVoid || liveDue.dueNowKind !== "deposit"}
                isLoading={busyAction === "deposit"}
                icon={<BadgePercent className="size-4" />}
                onClick={() => void quickPayment("deposit")}
              >
                Deposit received
              </LoadingButton>
              <LoadingButton
                type="button"
                variant="outline"
                disabled={isVoid || liveBalance <= 0}
                isLoading={busyAction === "full"}
                icon={<Check className="size-4" />}
                onClick={() => void quickPayment("full")}
              >
                Paid in full
              </LoadingButton>
              <Button
                type="button"
                className="sm:col-span-2 xl:col-span-1 2xl:col-span-2"
                disabled={isVoid}
                onClick={async () => {
                  if (await ensureSaved()) setPaymentOpen(true);
                }}
              >
                <Banknote className="size-4" />
                Record a payment
              </Button>
            </div>

            {invoice.payments.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/30 px-3 py-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                        payment.kind === "refund" ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                      )}
                    >
                      {payment.kind === "refund" ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium tabular-nums">
                        {payment.kind === "refund" ? "−" : ""}
                        {formatCadFromCents(payment.amount_cents)}
                        <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{payment.kind}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paid_on} · {paymentMethodLabel(paymentMethods, payment.method)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                      {payment.note ? <p className="mt-0.5 text-xs text-muted-foreground">{payment.note}</p> : null}
                    </div>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove payment" onClick={() => void removePayment(payment.id)}>
                      <XCircle className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-center text-xs text-muted-foreground">No payments recorded yet.</p>
            )}
          </Panel>

          <Panel icon={Link2} eyebrow="Status" title="Invoice controls">
            <div className="grid gap-2">
              {invoice.status === "draft" ? (
                <Button type="button" variant="outline" onClick={() => void changeStatus("mark_sent")}>
                  <Send className="size-4" />
                  Mark as sent (sent it myself)
                </Button>
              ) : null}
              {invoice.sent_at && invoice.status === "sent" ? (
                <Button type="button" variant="outline" onClick={() => void changeStatus("revert_draft")}>
                  <RotateCcw className="size-4" />
                  Revert to draft
                </Button>
              ) : null}
              {publicUrl ? (
                <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{publicUrl}</span>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Copy link" onClick={() => void copyLink()}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              ) : null}
              {publicUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink(true)} disabled={busyAction === "regen"}>
                  Reset client link
                </Button>
              ) : null}
              {!isVoid ? (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void changeStatus("void")}>
                  <Ban className="size-4" />
                  Void invoice
                </Button>
              ) : null}
              {invoice.status === "draft" && invoice.payments.length === 0 ? (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteDraft()}>
                  <Trash2 className="size-4" />
                  Delete draft
                </Button>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {invoice.job_id ? (
                  <Link className="text-primary hover:underline" href={`/admin/jobs/${invoice.job_id}`}>Open job</Link>
                ) : null}
                {invoice.quote_id ? (
                  <Link className="text-primary hover:underline" href={`/admin/quotes/${invoice.quote_id}`}>Open quote</Link>
                ) : null}
                <Link className="text-primary hover:underline" href="/admin/billing">Billing settings</Link>
              </div>
            </div>
          </Panel>

          <Panel icon={History} eyebrow="Audit trail" title="Change log">
            <p className="-mt-1 mb-3 text-xs text-muted-foreground">
              Every edit, payment, email, view and status change, with who did it. Entries can’t be edited or deleted.
            </p>
            <AdminInvoiceAuditLog events={invoice.events ?? []} />
          </Panel>
        </div>
      </div>

      <AdminFloatingSaveButton
        active={isDirty}
        saving={saving}
        label="Save invoice"
        onSave={() => void save()}
      />

      {sendOpen ? (
        <AdminInvoiceSendDialog
          invoice={invoice}
          tradeName={tradeName}
          open={sendOpen}
          onOpenChange={setSendOpen}
          onSent={(next, url, msg) => {
            applyInvoice(next, true);
            if (url) setPublicUrl(url);
            flash(msg);
            router.refresh();
          }}
        />
      ) : null}

      {paymentOpen ? (
        <AdminRecordPaymentDialog
          invoice={invoice}
          paymentMethods={paymentMethods}
          suggestedCents={liveDue.dueNowCents}
          suggestedKind={liveDue.dueNowKind === "deposit" ? "deposit" : "payment"}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onRecorded={(next) => {
            applyInvoice(next, true);
            flash("Payment recorded.");
            router.refresh();
          }}
        />
      ) : null}

      {confirmDialog}
    </div>
  );
}
