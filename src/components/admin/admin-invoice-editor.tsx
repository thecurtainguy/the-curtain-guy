"use client";

import {
  CustomTaxLinesEditor,
  newManualTaxDraft,
  storedManualTaxLines,
  TaxModePicker,
  type ManualTaxDraft,
} from "@/components/admin/custom-tax-lines";
import { SavedVenuePicker } from "@/components/admin/saved-venue-picker";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Ban,
  Banknote,
  BadgePercent,
  BellOff,
  BellRing,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  FilePenLine,
  FileText,
  History,
  Languages,
  Link2,
  ListOrdered,
  Lock,
  Package,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Truck,
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
  INVOICE_CLERICAL_FIELDS,
  invoicePaymentSchedule,
  isInvoiceLocked,
  paymentMethodLabel,
  todayIsoDate,
  visiblePaymentMethods,
  type DepositMode,
  type InvoiceWithRelations,
  type PaymentMethod,
} from "@/data/invoices";
import {
  computeLineTotalCents,
  formatMoneyFromCents,
  normalizeManualTaxLines,
  percentInputToRate,
  QUOTE_TAX_MODE_LABELS,
  rateToPercentInput,
  unitPriceCentsToDollarInput,
  unitPriceDollarsToCents,
  type QuoteTaxMode,
} from "@/data/quotes";
import type { CustomerLanguage } from "@/data/customer-language";
import { formatCustomerNumber, formatVenueAddress, type CustomerLinkSummary } from "@/data/customers";
import {
  lastInvoiceEmailRecipients,
  matchReminderPreset,
  REMINDER_PRESETS,
  reminderDueFor,
  reminderScheduleOf,
  reminderTimeline,
  resolveReminderRecipients,
  sentReminderStages,
} from "@/data/invoice-reminders";
import { AdminInvoiceAuditLog } from "@/components/admin/admin-invoice-audit-log";
import { OptionCard } from "@/components/estimate/option-card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { InvoiceCustomerCard } from "@/components/admin/invoice-customer-card";
import { InvoiceSavedView } from "@/components/admin/invoice-saved-view";
import { InvoiceLineEditor } from "@/components/admin/invoice-line-editor";
import { isLogisticsCategory } from "@/components/admin/line-thumb";
import {
  PipeDrapeCalculatorButton,
  type PipeDrapeLinePick,
} from "@/components/admin/pipe-drape/pipe-drape-calculator";
import { linearFootSources } from "@/lib/pipe-drape";
import { AddLineBar } from "@/components/admin/add-line-bar";
import { QuoteLineReorderGroup, QuoteLineReorderItem } from "@/components/admin/quote-line-reorder";
import {
  AdminInventoryPickerDialog,
  type InventoryPickResult,
} from "@/components/admin/admin-inventory-picker-dialog";
import {
  AdminLogisticsServiceDialog,
  type LogisticsServicePick,
} from "@/components/admin/admin-logistics-service-dialog";
import { AdminInvoiceSendDialog } from "@/components/admin/admin-invoice-send-dialog";
import { AdminInvoiceReminderDialog } from "@/components/admin/admin-invoice-reminder-dialog";
import { AdminInvoiceReminderSettingsDialog } from "@/components/admin/admin-invoice-reminder-settings-dialog";
import { AdminRecordPaymentDialog, type PaymentPreset } from "@/components/admin/admin-record-payment-dialog";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { useBrandConfirm } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { parseDollarInput } from "@/lib/money-input";
import { draftTranslation, onlyOneFilled, placeTranslation } from "@/lib/translate-draft";
import { cn } from "@/lib/utils";

type LineDraft = {
  key: string;
  description: string;
  /** Description in the other language, carried over from the quote. */
  description_translated?: string | null;
  quantity: string;
  unit_label: string;
  unit_price: string;
  is_taxable: boolean;
  product_id: string | null;
  category: string | null;
  category_label: string | null;
  category_label_fr: string | null;
  image_url: string | null;
  image_alt: string | null;
  source_quote_line_id: string | null;
};

const UNLINKED: Pick<
  LineDraft,
  "product_id" | "category" | "category_label" | "category_label_fr" | "image_url" | "image_alt" | "source_quote_line_id"
> = {
  product_id: null,
  category: null,
  category_label: null,
  category_label_fr: null,
  image_url: null,
  image_alt: null,
  source_quote_line_id: null,
};

function blankLine(): LineDraft {
  return { key: newLineKey(), description: "", quantity: "1", unit_label: "", unit_price: "0.00", is_taxable: true, ...UNLINKED };
}

function lineFromInventory(item: InventoryPickResult): LineDraft {
  return {
    key: newLineKey(),
    description: item.description,
    quantity: "1",
    unit_label: item.unitLabel,
    unit_price: unitPriceCentsToDollarInput(item.unitPriceCents),
    is_taxable: item.isTaxable,
    ...UNLINKED,
    product_id: item.productId,
    category: item.category,
    category_label: item.categoryLabel,
    image_url: item.imageUrl,
    image_alt: item.imageAlt,
  };
}

function lineFromHardware(pick: PipeDrapeLinePick): LineDraft {
  return {
    key: newLineKey(),
    description: pick.included ? `${pick.description} (included)` : pick.description,
    quantity: String(pick.quantity),
    unit_label: pick.unitLabel,
    unit_price: unitPriceCentsToDollarInput(pick.unitPriceCents),
    is_taxable: pick.isTaxable,
    ...UNLINKED,
    product_id: pick.productId,
    category: pick.category,
    category_label: pick.categoryLabel,
    image_url: pick.imageUrl,
    image_alt: pick.imageAlt,
  };
}

function lineFromLogistics(item: LogisticsServicePick): LineDraft {
  return {
    key: newLineKey(),
    description: item.included ? `${item.description} (included)` : item.description,
    quantity: "1",
    unit_label: item.unitLabel,
    unit_price: item.included ? "0.00" : unitPriceCentsToDollarInput(item.unitPriceCents),
    is_taxable: item.isTaxable,
    ...UNLINKED,
    product_id: item.productId,
    category: item.category,
    category_label: item.categoryLabel,
    image_url: item.imageUrl,
    image_alt: item.imageAlt,
  };
}

type FormState = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string;
  billing_address: string;
  po_number: string;
  currency: "CAD" | "USD";
  event_date: string;
  venue_name: string;
  venue_address: string;
  customer_venue_id: string | null;
  issue_date: string;
  due_date: string;
  language: CustomerLanguage;
  tax_mode: QuoteTaxMode;
  gst_percent: string;
  qst_percent: string;
  manual_tax_lines: ManualTaxDraft[];
  deposit_mode: DepositMode;
  deposit_percent: string;
  deposit_fixed: string;
  deposit_due_date: string;
  notes: string;
  terms: string;
  notes_translated: string;
  terms_translated: string;
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
    po_number: invoice.po_number ?? "",
    currency: invoice.currency === "USD" ? "USD" : "CAD",
    event_date: invoice.event_date ?? "",
    venue_name: invoice.venue_name ?? "",
    venue_address: invoice.venue_address ?? "",
    customer_venue_id: invoice.customer_venue_id ?? null,
    issue_date: invoice.issue_date ?? "",
    due_date: invoice.due_date ?? "",
    language: invoice.language,
    tax_mode: invoice.tax_mode,
    gst_percent: rateToPercentInput(invoice.gst_rate),
    qst_percent: rateToPercentInput(invoice.qst_rate),
    manual_tax_lines: normalizeManualTaxLines(invoice.manual_tax_lines).map((line) => ({
      key: `tax-${crypto.randomUUID()}`,
      label: line.label,
      ratePercent: rateToPercentInput(line.rate),
    })),
    deposit_mode: invoice.deposit_mode,
    deposit_percent: String(invoice.deposit_percent),
    deposit_fixed: (invoice.deposit_cents / 100).toFixed(2),
    deposit_due_date: invoice.deposit_due_date ?? "",
    notes: invoice.notes ?? "",
    terms: invoice.terms ?? "",
    notes_translated: invoice.notes_translated ?? "",
    terms_translated: invoice.terms_translated ?? "",
    internal_notes: invoice.internal_notes ?? "",
    lines: invoice.line_items.map((line) => ({
      key: line.id,
      description: line.description,
      description_translated: line.description_translated ?? null,
      quantity: String(line.quantity),
      unit_label: line.unit_label ?? "",
      unit_price: unitPriceCentsToDollarInput(line.unit_price_cents),
      is_taxable: line.is_taxable,
      product_id: line.product_id ?? null,
      category: line.category ?? null,
      category_label: line.category_label ?? null,
      category_label_fr: line.category_label_fr ?? null,
      image_url: line.image_url ?? null,
      image_alt: line.image_alt ?? null,
      source_quote_line_id: line.source_quote_line_id ?? null,
    })),
  };
}

function parseQty(value: string): number {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function dollarsToCents(value: string): number {
  const n = parseDollarInput(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toPayload(form: FormState) {
  return {
    customer_name: form.customer_name,
    customer_email: form.customer_email,
    customer_phone: form.customer_phone,
    company_name: form.company_name,
    billing_address: form.billing_address,
    po_number: form.po_number,
    currency: form.currency,
    event_date: form.event_date || null,
    venue_name: form.venue_name,
    venue_address: form.venue_address,
    customer_venue_id: form.customer_venue_id,
    issue_date: form.issue_date || null,
    due_date: form.due_date || null,
    language: form.language,
    tax_mode: form.tax_mode,
    gst_rate: percentInputToRate(form.gst_percent),
    qst_rate: percentInputToRate(form.qst_percent),
    ...(form.tax_mode === "manual"
      ? { manual_tax_lines: storedManualTaxLines(form.manual_tax_lines) }
      : {}),
    deposit_mode: form.deposit_mode,
    deposit_percent: Number.parseFloat(form.deposit_percent) || 0,
    deposit_fixed_cents: dollarsToCents(form.deposit_fixed),
    deposit_due_date: form.deposit_due_date || null,
    notes: form.notes,
    terms: form.terms,
    notes_translated: form.notes_translated,
    terms_translated: form.terms_translated,
    internal_notes: form.internal_notes,
    line_items: form.lines.map((line) => ({
      description: line.description,
      description_translated: line.description_translated ?? null,
      quantity: parseQty(line.quantity),
      unit_label: line.unit_label || null,
      unit_price_cents: unitPriceDollarsToCents(line.unit_price || "0"),
      is_taxable: line.is_taxable,
      product_id: line.product_id,
      category: line.category,
      category_label: line.category_label,
      category_label_fr: line.category_label_fr,
      image_url: line.image_url,
      image_alt: line.image_alt,
      source_quote_line_id: line.source_quote_line_id,
    })),
  };
}

/** What a save may send once the invoice is issued (the server enforces the same list). */
function lockedPayload(payload: ReturnType<typeof toPayload>) {
  return Object.fromEntries(
    INVOICE_CLERICAL_FIELDS.map((key) => [key, payload[key]])
  ) as Partial<ReturnType<typeof toPayload>>;
}

const DEPOSIT_OPTIONS = [
  { id: "percent", label: "Percentage", description: "Auto-calculated from the total", icon: BadgePercent },
  { id: "fixed", label: "Custom amount", description: "Any dollar amount you set", icon: CircleDollarSign },
  { id: "none", label: "No deposit", description: "Full balance by the due date", icon: Ban },
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

/** Disables every control inside once the invoice is issued. */
function Lockable({ locked, children, className }: { locked: boolean; children: React.ReactNode; className?: string }) {
  return (
    <fieldset disabled={locked} className={cn("m-0 min-w-0 border-0 p-0", locked && "opacity-75", className)}>
      {children}
    </fieldset>
  );
}

function ChoiceToggleGroup<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  onSelect,
}: {
  label: string;
  icon?: LucideIcon;
  value: T;
  options: Array<{ id: T; label: string }>;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5" role="radiogroup" aria-label={label}>
      <Label className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 text-primary" /> : null}
        {label}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm transition-colors",
              value === option.id
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30"
            )}
          >
            {value === option.id ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
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
  customerLink = null,
  engagementPanel = null,
}: {
  invoice: InvoiceWithRelations;
  paymentMethods: PaymentMethod[];
  tradeName: string;
  initialPublicUrl: string | null;
  customerLink?: CustomerLinkSummary | null;
  /** Views and email delivery card rendered in the right rail. */
  engagementPanel?: React.ReactNode;
}) {
  const router = useRouter();
  const [confirm, confirmDialog] = useBrandConfirm();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [form, setForm] = useState(() => toForm(initialInvoice));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toPayload(toForm(initialInvoice))));
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPreset, setPaymentPreset] = useState<PaymentPreset | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [copied, setCopied] = useState(false);

  const money = (cents: number) => formatMoneyFromCents(cents, "en", form.currency);
  const payload = useMemo(() => toPayload(form), [form]);
  const isDirty = JSON.stringify(payload) !== baseline;
  const isVoid = invoice.status === "void";
  const locked = isInvoiceLocked(invoice.status);
  const editing = isEditing && !isVoid;
  const canRevertDraft =
    invoice.status === "sent" &&
    Boolean(invoice.sent_at) &&
    invoice.view_count === 0 &&
    !invoice.viewed_at &&
    invoice.payments.length === 0 &&
    !invoice.replaces_invoice_id;
  const otherLanguageName = form.language === "fr" ? "English" : "Français";

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
          manual_tax_lines:
            form.tax_mode === "manual"
              ? storedManualTaxLines(form.manual_tax_lines)
              : invoice.manual_tax_lines,
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
      manual_tax_lines:
        form.tax_mode === "manual" ? storedManualTaxLines(form.manual_tax_lines) : invoice.manual_tax_lines,
      currency: form.currency,
    },
    { variant: "admin" }
  );

  const remindersOn = invoice.reminders_enabled !== false;
  const reminderSchedule = reminderScheduleOf(invoice);
  const reminderPresetId = matchReminderPreset(reminderSchedule.steps, reminderSchedule.repeatWeekly);
  const reminderPresetLabel = REMINDER_PRESETS.find((p) => p.id === reminderPresetId)?.label ?? "Custom schedule";
  const reminderRecipients = resolveReminderRecipients(invoice, lastInvoiceEmailRecipients(invoice.events ?? []));
  const reminderPeople = reminderRecipients.to.length + reminderRecipients.cc.length;
  const reminderDue = reminderDueFor(invoice);
  const nextReminderEntry =
    reminderDue && remindersOn && invoice.status !== "draft"
      ? reminderTimeline({
          due: reminderDue,
          schedule: reminderSchedule,
          sentStages: sentReminderStages(invoice.events ?? [], reminderDue),
          today: todayIsoDate(),
          enabled: true,
        }).find((entry) => !entry.adminOnly && (entry.status === "next" || entry.status === "planned"))
      : null;
  const nextReminder = nextReminderEntry
    ? nextReminderEntry.status === "next"
      ? "at the next morning run"
      : new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(
          new Date(`${nextReminderEntry.date}T00:00:00Z`)
        )
    : null;

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

  function changeLanguage(language: CustomerLanguage) {
    setForm((prev) =>
      prev.language === language
        ? prev
        : {
            ...prev,
            language,
            lines: prev.lines.map((line) =>
              line.description_translated?.trim()
                ? { ...line, description: line.description_translated, description_translated: line.description }
                : line
            ),
          }
    );
  }

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
    setError(err ?? null);
    if (ok) toast.success(ok);
    if (err) toast.error(err);
  }

  function resetForm(source: InvoiceWithRelations) {
    const nextForm = toForm(source);
    setForm(nextForm);
    setBaseline(JSON.stringify(toPayload(nextForm)));
  }

  function applyInvoice(next: InvoiceWithRelations, reset: boolean) {
    setInvoice(next);
    // The read-only view renders form state, so a newly issued or voided invoice must drop unsaved draft edits.
    const becameLocked = isInvoiceLocked(next.status) && !isInvoiceLocked(invoice.status);
    const becameVoid = next.status === "void" && invoice.status !== "void";
    if (becameLocked || becameVoid) setIsEditing(false);
    if (reset || becameLocked || becameVoid) resetForm(next);
  }

  function startEditing() {
    flash();
    setIsEditing(true);
  }

  function cancelEditing() {
    resetForm(invoice);
    setIsEditing(false);
    flash();
  }

  async function saveAndClose() {
    if (!isDirty) {
      setIsEditing(false);
      return;
    }
    await save();
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    flash();
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locked ? lockedPayload(payload) : payload),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok || !json.invoice) {
        flash(null, json.message ?? "Could not save invoice.");
        return false;
      }
      applyInvoice(json.invoice, true);
      setIsEditing(false);
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

  async function openPayment(preset: PaymentPreset | null) {
    if (!(await ensureSaved())) return;
    setPaymentPreset(preset);
    setPaymentOpen(true);
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
    if (action === "mark_sent" && invoice.replaces_invoice_id) {
      const ok = await confirm({
        title: `Issue ${invoice.invoice_number} without emailing?`,
        description: `${invoice.replaces_invoice_number ?? "The original"} will be voided and its payments move here. Only do this if you sent the update yourself.`,
        confirmLabel: "Mark as sent",
      });
      if (!ok) return;
    }
    if (action === "mark_sent" && !(await ensureSaved())) return;
    const labels = {
      mark_sent: invoice.replaces_invoice_id
        ? `Marked as sent — ${invoice.replaces_invoice_number ?? "the original"} is now replaced.`
        : "Marked as sent.",
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

  async function reviseInvoice() {
    const ok = await confirm({
      eyebrow: "Correct an issued invoice",
      title: `Revise ${invoice.invoice_number}?`,
      description:
        "A draft copy opens for your changes. Nothing changes for the client until you send it — then it replaces this invoice, recorded payments carry over, and they get one “Updated invoice” email.",
      confirmLabel: "Start revision",
    });
    if (!ok || !(await ensureSaved())) return;
    setBusyAction("revise");
    flash();
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/revise`, { method: "POST" });
      const json = (await response.json()) as { ok?: boolean; message?: string; invoiceId?: string };
      if (!response.ok || !json.ok || !json.invoiceId) {
        flash(null, json.message ?? "Could not start a revision.");
        return;
      }
      flash("Revision draft created.");
      router.push(`/admin/invoices/${json.invoiceId}`);
    } catch {
      flash(null, "Could not start a revision.");
    } finally {
      setBusyAction(null);
    }
  }

  async function translateWording() {
    setBusyAction("translate");
    flash();
    try {
      const notesSource = onlyOneFilled(form.notes, form.notes_translated);
      const termsSource = onlyOneFilled(form.terms, form.terms_translated);
      const lineSources = form.lines.flatMap((line) => {
        const text = onlyOneFilled(line.description, line.description_translated);
        return text ? [{ key: line.key, text }] : [];
      });
      const sentByKey = new Map(lineSources.map((line) => [line.key, line.text]));
      const result = await draftTranslation({
        from: form.language,
        notes: notesSource,
        terms: termsSource,
        lines: lineSources,
      });
      if (!result.ok) {
        flash(null, result.message);
        return;
      }
      if (result.engine === "none") {
        flash("Nothing to translate — every line already has a translation.");
        return;
      }
      const json = result.draft;
      const lines = new Map(json.lines.map((line) => [line.key, line]));
      setForm((prev) => {
        const [notes, notesTranslated] =
          json.notes && notesSource && onlyOneFilled(prev.notes, prev.notes_translated) === notesSource
            ? placeTranslation(notesSource, json.notes)
            : [prev.notes, prev.notes_translated];
        const [terms, termsTranslated] =
          json.terms && termsSource && onlyOneFilled(prev.terms, prev.terms_translated) === termsSource
            ? placeTranslation(termsSource, json.terms)
            : [prev.terms, prev.terms_translated];
        return {
          ...prev,
          notes,
          notes_translated: notesTranslated,
          terms,
          terms_translated: termsTranslated,
          lines: prev.lines.map((line) => {
            const out = lines.get(line.key);
            const sent = onlyOneFilled(line.description, line.description_translated);
            if (!out || !sent || sent !== sentByKey.get(line.key)) return line;
            const [description, descriptionTranslated] = placeTranslation(sent, out);
            return { ...line, description, description_translated: descriptionTranslated };
          }),
        };
      });
      flash("Translation drafted — review it, then save.");
    } catch {
      flash(null, "Translation failed.");
    } finally {
      setBusyAction(null);
    }
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
    flash();
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, { method: "DELETE" });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) {
        flash(null, json.message ?? "Could not delete.");
        return;
      }
      flash(`${invoice.invoice_number} deleted.`);
      router.push(invoice.job_id ? `/admin/jobs/${invoice.job_id}` : "/admin/invoices");
    } catch {
      flash(null, "Could not delete.");
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
      const copiedOk = await navigator.clipboard.writeText(json.url).then(
        () => true,
        () => false
      );
      if (!copiedOk) {
        flash(
          null,
          regenerate
            ? "New link created, but it couldn’t be copied. The old link no longer works — copy the new one below."
            : "Couldn’t copy the link. Copy it from Invoice controls."
        );
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      flash(regenerate ? "New link copied. The old link no longer works." : "Client link copied.");
    } catch {
      flash(null, "Could not create link.");
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

  const hardwareCalculator = (editable: boolean) => (
    <PipeDrapeCalculatorButton
      planKey={`invoice:${invoice.id}`}
      documentLabel="invoice"
      documentRef={invoice.invoice_number}
      currency={form.currency}
      linearSources={linearFootSources(
        payload.line_items.map((line, index) => ({
          key: form.lines[index]?.key ?? String(index),
          description: line.description,
          quantity: line.quantity,
          unit: line.unit_label,
        }))
      )}
      onAddLines={
        editable
          ? (picks) => setForm((prev) => ({ ...prev, lines: [...prev.lines, ...picks.map(lineFromHardware)] }))
          : undefined
      }
      readOnlyHint={
        isVoid
          ? "This invoice is void."
          : locked && isEditing
            ? "This invoice is locked. Revise it to add hardware lines."
            : undefined
      }
    />
  );

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
            <span>
              {invoice.quote_id ? "Quote" : "Ref"} {invoice.opportunity_ref}
            </span>
            {customerLink ? (
              <Link href={`/admin/customers/${customerLink.id}`} className="text-primary hover:underline">
                · {formatCustomerNumber(customerLink.customer_number)} {customerLink.display_name}
              </Link>
            ) : null}
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
                if (customerLink?.po_required && !form.po_number.trim()) {
                  const proceed = await confirm({
                    eyebrow: "PO required",
                    title: `${customerLink.display_name} requires a PO number`,
                    description: "Their accounts payable may reject an invoice without one. Add it in Client & billing, or send anyway.",
                    confirmLabel: "Send without PO",
                    cancelLabel: "Add PO first",
                  });
                  if (!proceed) {
                    setIsEditing(true);
                    return;
                  }
                }
                if (await ensureSaved()) setSendOpen(true);
              }}
            >
              <Send className="size-4" />
              {invoice.sent_at
                ? "Resend invoice"
                : invoice.replaces_invoice_id
                  ? "Send updated invoice"
                  : "Send invoice"}
            </Button>
            {editing ? (
              <>
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={cancelEditing}>
                  Cancel
                </Button>
                <LoadingButton
                  type="button"
                  size="sm"
                  isLoading={saving}
                  icon={<Check className="size-4" />}
                  onClick={() => void saveAndClose()}
                >
                  Save invoice
                </LoadingButton>
              </>
            ) : isVoid ? null : (
              <Button type="button" size="sm" onClick={startEditing}>
                <Pencil className="size-4" />
                {locked ? "Edit details" : "Edit"}
              </Button>
            )}
          </>
        }
      />

      {error && (
        <p
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {isVoid && invoice.replaced_by_invoice_id ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/30 px-4 py-3 text-sm">
          <span className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <RotateCcw className="size-4" />
            </span>
            <span>
              <span className="block font-medium">
                Replaced by {invoice.replaced_by_invoice_number ?? "a revision"}
                {invoice.replaced_at ? ` on ${invoice.replaced_at.slice(0, 10)}` : ""}
              </span>
              <span className="text-muted-foreground">
                Kept for the record. Its payments moved to the revision, and the client’s old link opens the new invoice.
              </span>
            </span>
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/invoices/${invoice.replaced_by_invoice_id}`}>
              Open {invoice.replaced_by_invoice_number ?? "revision"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      ) : isVoid ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
          <span>This invoice is void. Clients see it marked VOID; payments can’t be recorded.</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void changeStatus("unvoid")}>
            <RotateCcw className="size-4" />
            Restore
          </Button>
        </div>
      ) : locked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3 text-sm">
          <span className="flex min-w-0 items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Lock className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">Issued · locked</span>
              <span className="text-muted-foreground">
                Amounts, lines, dates and terms match what the client received. Contact, billing address, PO,
                internal notes, payments and reminders stay editable. To correct anything else, revise it.
              </span>
            </span>
          </span>
          <LoadingButton
            type="button"
            size="sm"
            isLoading={busyAction === "revise"}
            icon={<FilePenLine className="size-4" />}
            onClick={() => void reviseInvoice()}
          >
            Revise invoice
          </LoadingButton>
        </div>
      ) : invoice.replaces_invoice_id ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3 text-sm">
          <span className="flex min-w-0 items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <FilePenLine className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">
                Revision of {invoice.replaces_invoice_number ?? "an issued invoice"} · draft
              </span>
              <span className="text-muted-foreground">
                The client still sees {invoice.replaces_invoice_number ?? "the original"}. When you send this one, it
                replaces it: the original is voided, its payments move here, and the client gets one “Updated invoice”
                email. Delete this draft to cancel the revision.
              </span>
            </span>
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/invoices/${invoice.replaces_invoice_id}`}>
              Open {invoice.replaces_invoice_number ?? "original"}
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Invoice total" value={money(liveTotals.total_cents)} hint={`incl. ${money(liveTotals.total_tax_cents)} tax`} />
        <StatTile label="Deposit" value={money(liveDeposit)} hint={depositHint} />
        <StatTile label="Paid" value={money(invoice.amount_paid_cents)} hint={`${invoice.payments.length} payment${invoice.payments.length === 1 ? "" : "s"}`} />
        <StatTile
          accent
          label={liveDue.dueNowKind === "deposit" ? "Deposit due now" : "Balance due"}
          value={money(liveDue.dueNowKind === "none" ? Math.max(0, liveBalance) : liveDue.dueNowCents)}
          hint={
            liveDue.dueNowKind === "none"
              ? liveBalance < 0
                ? `Overpaid by ${money(-liveBalance)}`
                : "Nothing owing"
              : liveDue.dueNowDate
                ? `Due ${liveDue.dueNowDate}`
                : "Due on receipt"
          }
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {editing ? (
          <>
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
                <div className="space-y-1.5">
                  <Label htmlFor="inv-po">
                    PO number
                    {customerLink?.po_required ? <span className="ml-1 text-primary">· required</span> : null}
                  </Label>
                  <Input
                    id="inv-po"
                    value={form.po_number}
                    onChange={(e) => set("po_number", e.target.value)}
                    placeholder={customerLink?.default_po_number ?? "Optional"}
                    className={cn(customerLink?.po_required && !form.po_number.trim() && "border-primary/60")}
                  />
                </div>
                <Lockable locked={locked} className="space-y-1.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceToggleGroup
                      label="Currency"
                      value={form.currency}
                      options={[
                        { id: "CAD", label: "CAD" },
                        { id: "USD", label: "USD" },
                      ]}
                      onSelect={(currency) => set("currency", currency)}
                    />
                    <ChoiceToggleGroup
                      label="Invoice language"
                      icon={Languages}
                      value={form.language}
                      options={[
                        { id: "en", label: "English" },
                        { id: "fr", label: "Français" },
                      ]}
                      onSelect={(lang) => changeLanguage(lang)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Client sees:{" "}
                    {visiblePaymentMethods(paymentMethods, "en", form.currency)
                      .map((m) => m.label)
                      .join(", ") || "no payment methods — check Billing settings"}
                  </p>
                </Lockable>
                {customerLink ? (
                  <Link
                    href={`/admin/customers/${customerLink.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2 text-xs hover:border-primary/40"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-primary">{formatCustomerNumber(customerLink.customer_number)}</span>{" "}
                      {customerLink.display_name}
                      {customerLink.tax_exempt ? " · tax exempt" : ""}
                      {customerLink.invoiceCc.length ? ` · Cc ${customerLink.invoiceCc.join(", ")}` : ""}
                    </span>
                    <span className="shrink-0 text-muted-foreground">Customer profile →</span>
                  </Link>
                ) : null}
              </div>
            </Panel>

            <Lockable locked={locked}>
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
                  <Input
                    id="inv-venue"
                    value={form.venue_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((prev) => {
                        const linked = customerLink?.venues.find((v) => v.id === prev.customer_venue_id);
                        return {
                          ...prev,
                          venue_name: value,
                          customer_venue_id: linked && linked.name !== value ? null : prev.customer_venue_id,
                        };
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inv-venue-address">Venue address</Label>
                  <Input
                    id="inv-venue-address"
                    value={form.venue_address}
                    onChange={(e) => set("venue_address", e.target.value)}
                    placeholder="Street, city, province, postal code — shown on the invoice and PDF"
                    maxLength={400}
                  />
                </div>
              </div>
              <SavedVenuePicker
                className="mt-4"
                customer={customerLink ?? null}
                selectedVenueId={form.customer_venue_id}
                venueName={form.venue_name}
                gridClassName="sm:grid-cols-2"
                onPick={(venue, linked) =>
                  setForm((prev) => ({
                    ...prev,
                    venue_name: venue.name,
                    venue_address: formatVenueAddress(venue),
                    customer_venue_id: linked ? venue.id : null,
                  }))
                }
              />
            </Panel>
            </Lockable>
          </div>

          <Panel
            icon={ListOrdered}
            eyebrow="Scope"
            title="Line items"
            actions={
              <div className="flex flex-wrap gap-2">
                {hardwareCalculator(!locked && !isVoid)}
                <Lockable locked={locked} className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={isVoid} onClick={() => setInventoryOpen(true)}>
                  <Package className="size-4" />
                  From inventory
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={isVoid} onClick={() => setLogisticsOpen(true)}>
                  <Truck className="size-4" />
                  Delivery / install
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={isVoid} onClick={() => set("lines", [...form.lines, blankLine()])}>
                  <Plus className="size-4" />
                  Custom line
                </Button>
                </Lockable>
              </div>
            }
          >
            <Lockable locked={locked}>
            {form.lines.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Package, title: "From inventory", body: "Drapes, backdrops and decor with photo and price.", onClick: () => setInventoryOpen(true) },
                  { icon: Truck, title: "Delivery / install", body: "Zone-priced transport, installation and teardown.", onClick: () => setLogisticsOpen(true) },
                  { icon: Plus, title: "Custom line", body: "Anything else, typed by hand.", onClick: () => set("lines", [...form.lines, blankLine()]) },
                ].map((tile) => (
                  <button
                    key={tile.title}
                    type="button"
                    disabled={isVoid}
                    onClick={tile.onClick}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border/60 bg-card/20 p-4 text-left transition hover:border-primary/50 hover:bg-primary/[0.05] disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                      <tile.icon className="size-4" />
                    </span>
                    <span className="font-heading text-sm text-foreground">{tile.title}</span>
                    <span className="text-xs text-muted-foreground">{tile.body}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <QuoteLineReorderGroup
                  as="div"
                  axis="y"
                  values={form.lines}
                  onReorder={(next) => set("lines", next)}
                  className="space-y-3"
                >
                  {form.lines.map((line, index) => (
                    <QuoteLineReorderItem
                      key={line.key}
                      value={line}
                      enabled={!locked && form.lines.length > 1}
                      label={line.description || "line item"}
                      onMove={(direction) => moveLine(index, direction)}
                      className="rounded-2xl border border-border/40 bg-background/40 p-3.5 backdrop-blur-md transition-colors hover:border-primary/25"
                    >
                      <InvoiceLineEditor
                        line={line}
                        index={index}
                        currency={form.currency}
                        language={form.language}
                        amountLabel={money(
                          computeLineTotalCents(parseQty(line.quantity), unitPriceDollarsToCents(line.unit_price || "0"))
                        )}
                        onChange={(patch) => updateLine(line.key, patch)}
                        onRemove={() => set("lines", form.lines.filter((l) => l.key !== line.key))}
                      />
                    </QuoteLineReorderItem>
                  ))}
                </QuoteLineReorderGroup>
                {locked ? null : (
                  <AddLineBar
                    title="Add another line"
                    onInventory={() => setInventoryOpen(true)}
                    onLogistics={() => setLogisticsOpen(true)}
                    onCustom={() => set("lines", [...form.lines, blankLine()])}
                  />
                )}
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Tax</p>
                <TaxModePicker
                  value={form.tax_mode}
                  disabled={locked}
                  onChange={(mode) =>
                    setForm((prev) => ({
                      ...prev,
                      tax_mode: mode,
                      manual_tax_lines:
                        mode === "manual" && prev.manual_tax_lines.length === 0
                          ? [newManualTaxDraft()]
                          : prev.manual_tax_lines,
                    }))
                  }
                />
                {form.tax_mode === "manual" ? (
                  <CustomTaxLinesEditor
                    lines={form.manual_tax_lines}
                    disabled={locked}
                    onChange={(manual_tax_lines) => set("manual_tax_lines", manual_tax_lines)}
                  />
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
                    <span>{money(row.amountCents)}</span>
                  </div>
                ))}
              </div>
            </div>
            </Lockable>
          </Panel>

          <Panel
            icon={ClipboardCheck}
            eyebrow="Wording"
            title="Notes & terms"
            actions={
              locked ? null : (
                <LoadingButton
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={busyAction === "translate"}
                  icon={<Sparkles className="size-4" />}
                  onClick={() => void translateWording()}
                >
                  Draft {otherLanguageName}
                </LoadingButton>
              )
            }
          >
            <div className="grid gap-4">
              <Lockable locked={locked} className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-notes">Notes to client</Label>
                    <Textarea id="inv-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Shown on the invoice" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-notes-tr" className="flex items-center gap-1.5">
                      <Languages className="size-3.5 text-primary" />
                      Notes · {otherLanguageName}
                    </Label>
                    <Textarea
                      id="inv-notes-tr"
                      rows={3}
                      value={form.notes_translated}
                      onChange={(e) => set("notes_translated", e.target.value)}
                      placeholder={form.language === "fr" ? "English version" : "Version française"}
                      className={cn(form.notes.trim() && !form.notes_translated.trim() && "border-amber-500/50")}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-terms">Terms</Label>
                    <Textarea id="inv-terms" rows={6} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-terms-tr" className="flex items-center gap-1.5">
                      <Languages className="size-3.5 text-primary" />
                      Terms · {otherLanguageName}
                    </Label>
                    <Textarea
                      id="inv-terms-tr"
                      rows={6}
                      value={form.terms_translated}
                      onChange={(e) => set("terms_translated", e.target.value)}
                      placeholder="Leave empty when using the Billing settings default"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  One term per line. The Billing settings defaults switch language automatically; custom wording uses
                  the {otherLanguageName} version here when the client views the other language.
                </p>
              </Lockable>
              <div className="space-y-1.5">
                <Label htmlFor="inv-internal">Internal notes</Label>
                <Textarea id="inv-internal" rows={2} value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} placeholder="Only you see this" />
              </div>
            </div>
          </Panel>
          </>
          ) : (
            <InvoiceSavedView
              lineItemsAction={hardwareCalculator(false)}
              invoiceNumber={invoice.invoice_number}
              revisionNumber={invoice.revision_number ?? 0}
              replacesInvoiceNumber={invoice.replaces_invoice_number ?? null}
              sourceLabel={`${invoice.quote_id ? "From quote" : "Ref"} ${invoice.opportunity_ref}`}
              customerName={form.customer_name}
              companyName={form.company_name}
              customerEmail={form.customer_email}
              customerPhone={form.customer_phone}
              billingAddress={form.billing_address}
              poNumber={form.po_number}
              poRequired={Boolean(customerLink?.po_required)}
              customerLink={customerLink}
              eventType={invoice.event_type ?? ""}
              venueName={form.venue_name}
              venueAddress={form.venue_address}
              issueDate={form.issue_date}
              dueDate={form.due_date}
              eventDate={form.event_date}
              depositDueDate={form.deposit_due_date}
              currency={form.currency}
              languageLabel={form.language === "fr" ? "Français" : "English"}
              otherLanguageLabel={otherLanguageName}
              missingTranslationCount={
                form.lines.filter((line) => line.description.trim() && !line.description_translated?.trim()).length +
                (form.notes.trim() && !form.notes_translated.trim() ? 1 : 0)
              }
              paymentMethodLabels={visiblePaymentMethods(paymentMethods, "en", form.currency).map((m) => m.label)}
              notices={[
                customerLink?.tax_exempt && form.tax_mode !== "none"
                  ? `${customerLink.display_name} is marked tax exempt on their profile.`
                  : null,
                customerLink && customerLink.currency !== form.currency
                  ? `${customerLink.display_name} is billed in ${customerLink.currency} by default.`
                  : null,
              ].filter((notice): notice is string => Boolean(notice))}
              lines={payload.line_items.map((line, index) => ({
                key: form.lines[index].key,
                description: line.description,
                descriptionTranslated: line.description_translated ?? "",
                categoryLabel: line.category_label || line.category?.replaceAll("_", " ") || null,
                quantity: line.quantity,
                unitLabel: line.unit_label ?? "",
                unitPriceCents: line.unit_price_cents,
                totalCents: computeLineTotalCents(line.quantity, line.unit_price_cents),
                isTaxable: line.is_taxable,
                fromInventory: Boolean(line.product_id),
                imageUrl: form.lines[index].image_url,
                imageAlt: form.lines[index].image_alt,
                logistics: isLogisticsCategory(line.category),
              }))}
              taxModeLabel={QUOTE_TAX_MODE_LABELS[form.tax_mode]}
              taxRows={taxRows}
              depositMode={payload.deposit_mode}
              depositLabel={depositHint}
              depositCents={liveDeposit}
              schedule={invoicePaymentSchedule({
                deposit_mode: payload.deposit_mode,
                deposit_cents: liveDeposit,
                deposit_due_date: payload.deposit_due_date,
                amount_paid_cents: invoice.amount_paid_cents,
                total_cents: liveTotals.total_cents,
                due_date: payload.due_date,
                event_date: payload.event_date,
                status: invoice.status,
              })}
              totalCents={liveTotals.total_cents}
              notes={form.notes}
              notesTranslated={form.notes_translated}
              terms={form.terms}
              termsTranslated={form.terms_translated}
              internalNotes={form.internal_notes}
            />
          )}
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <InvoiceCustomerCard
            customer={customerLink}
            contactName={form.customer_name}
            companyName={form.company_name}
            email={form.customer_email}
            currency={form.currency}
            poNumber={form.po_number}
          />
          {editing ? (
          <Lockable locked={locked}>
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
                  <span className="font-heading text-xl font-semibold tabular-nums">{money(liveDeposit)}</span>
                </div>
              </>
            ) : null}
          </Panel>
          </Lockable>
          ) : null}

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
              <Button
                type="button"
                variant="outline"
                disabled={isVoid || liveDue.dueNowKind !== "deposit"}
                onClick={() => void openPayment("deposit")}
              >
                <BadgePercent className="size-4" />
                Deposit received
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isVoid || liveBalance <= 0}
                onClick={() => void openPayment("full")}
              >
                <Check className="size-4" />
                Paid in full
              </Button>
              <Button
                type="button"
                className="sm:col-span-2 xl:col-span-1 2xl:col-span-2"
                disabled={isVoid}
                onClick={() => void openPayment(null)}
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
                        {money(payment.amount_cents)}
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

          {engagementPanel}

          <Panel icon={Link2} eyebrow="Status" title="Invoice controls">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {invoice.status === "draft" ? (
                <Button type="button" variant="outline" onClick={() => void changeStatus("mark_sent")}>
                  <Send className="size-4" />
                  Mark as sent (sent it myself)
                </Button>
              ) : null}
              {locked && !isVoid ? (
                <LoadingButton
                  type="button"
                  variant="outline"
                  isLoading={busyAction === "revise"}
                  icon={<FilePenLine className="size-4" />}
                  onClick={() => void reviseInvoice()}
                >
                  Revise invoice
                </LoadingButton>
              ) : null}
              {canRevertDraft ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void changeStatus("revert_draft")}>
                  <RotateCcw className="size-4" />
                  Revert to draft (not opened yet)
                </Button>
              ) : null}
              {(invoice.status === "sent" || invoice.status === "partially_paid") &&
              invoice.balance_due_cents > 0 &&
              invoice.customer_email ? (
                <LoadingButton
                  type="button"
                  variant="outline"
                  isLoading={busyAction === "remind"}
                  icon={<BellRing className="size-4" />}
                  onClick={() => setRemindOpen(true)}
                >
                  Send payment reminder now
                </LoadingButton>
              ) : null}
              {!isVoid ? (
                <button
                  type="button"
                  onClick={() => setReminderSettingsOpen(true)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                    "hover:-translate-y-px hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    remindersOn ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card/40"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    {remindersOn ? <BellRing className="size-4" /> : <BellOff className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      Automatic reminders · {remindersOn ? "On" : "Paused"}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {remindersOn
                        ? `${reminderPresetLabel} · ${reminderPeople} ${reminderPeople === 1 ? "person" : "people"}${nextReminder ? ` · next ${nextReminder}` : ""}`
                        : "Nothing goes out automatically. Send one yourself when ready."}
                    </span>
                  </span>
                  <span className="self-center text-xs font-medium text-primary group-hover:underline">Edit</span>
                </button>
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
        active={editing && isDirty}
        saving={saving}
        label="Save invoice"
        onSave={() => void save()}
      />

      <AdminInventoryPickerDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        onPick={(item) => setForm((prev) => ({ ...prev, lines: [...prev.lines, lineFromInventory(item)] }))}
      />
      <AdminLogisticsServiceDialog
        open={logisticsOpen}
        onOpenChange={setLogisticsOpen}
        onPick={(item) => {
          setForm((prev) => ({ ...prev, lines: [...prev.lines, lineFromLogistics(item)] }));
          if (item.needsPricing && !item.included) flash(null, "Venue area isn’t priced yet — set the delivery price on the new line.");
        }}
      />

      {sendOpen ? (
        <AdminInvoiceSendDialog
          invoice={invoice}
          tradeName={tradeName}
          defaultCc={customerLink?.invoiceCc ?? []}
          contacts={customerLink?.contactOptions ?? []}
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

      {remindOpen ? (
        <AdminInvoiceReminderDialog
          invoice={invoice}
          contacts={customerLink?.contactOptions ?? []}
          open={remindOpen}
          onOpenChange={setRemindOpen}
          onSent={(next, msg) => {
            applyInvoice(next, !isDirty);
            flash(msg);
            router.refresh();
          }}
        />
      ) : null}

      {reminderSettingsOpen ? (
        <AdminInvoiceReminderSettingsDialog
          invoice={invoice}
          contacts={customerLink?.contactOptions ?? []}
          open={reminderSettingsOpen}
          onOpenChange={setReminderSettingsOpen}
          onSaved={(next, msg) => {
            applyInvoice(next, !isDirty);
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
          preset={paymentPreset}
          presetCents={paymentPreset === "deposit" ? liveDue.depositOutstandingCents : Math.max(0, liveBalance)}
          balanceCents={Math.max(0, liveBalance)}
          preferredMethodId={customerLink?.preferred_payment_method ?? null}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onRecorded={(next, receiptTo) => {
            applyInvoice(next, true);
            const done = next.status === "paid" ? "Invoice marked paid in full." : "Payment recorded.";
            flash(receiptTo ? `${done} Receipt emailed to ${receiptTo}.` : done);
            router.refresh();
          }}
        />
      ) : null}

      {confirmDialog}
    </div>
  );
}
