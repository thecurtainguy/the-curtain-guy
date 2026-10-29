"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  Coins,
  Contact,
  Languages,
  MapPin,
  NotebookPen,
  ReceiptText,
  Save,
  ShieldOff,
  Tags,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { SelectInput } from "@/components/ui/select-input";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { useBrandConfirm } from "@/components/ui/brand-dialog";
import { CUSTOMER_LANGUAGE_LABELS, type CustomerLanguage } from "@/data/customer-language";
import {
  CUSTOMER_CURRENCIES,
  type CustomerCurrency,
  type CustomerKind,
  type CustomerRow,
} from "@/data/customers";
import type { BalanceDueRule } from "@/data/invoices";
import { CUSTOMER_KIND_OPTIONS, readJson } from "@/components/admin/customers/customer-ui";
import { CustomerPanel, ToggleTile } from "@/components/admin/customers/customer-panel";
import { cn } from "@/lib/utils";

type FormState = {
  kind: CustomerKind;
  display_name: string;
  company_name: string;
  legal_name: string;
  primary_email: string;
  phone: string;
  website: string;
  preferred_language: CustomerLanguage;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
  billing_country: string;
  tax_exempt: boolean;
  tax_exempt_reason: string;
  gst_number: string;
  qst_number: string;
  po_required: boolean;
  default_po_number: string;
  currency: CustomerCurrency;
  preferred_payment_method: string;
  default_deposit_percent: string;
  balance_due_rule: BalanceDueRule | "";
  balance_due_days: string;
  tags: string;
  source: string;
  internal_notes: string;
};

function toForm(c: CustomerRow): FormState {
  return {
    kind: c.kind,
    display_name: c.display_name,
    company_name: c.company_name ?? "",
    legal_name: c.legal_name ?? "",
    primary_email: c.primary_email,
    phone: c.phone ?? "",
    website: c.website ?? "",
    preferred_language: c.preferred_language,
    billing_address_line1: c.billing_address_line1 ?? "",
    billing_address_line2: c.billing_address_line2 ?? "",
    billing_city: c.billing_city ?? "",
    billing_province: c.billing_province ?? "",
    billing_postal_code: c.billing_postal_code ?? "",
    billing_country: c.billing_country ?? "Canada",
    tax_exempt: c.tax_exempt,
    tax_exempt_reason: c.tax_exempt_reason ?? "",
    gst_number: c.gst_number ?? "",
    qst_number: c.qst_number ?? "",
    po_required: c.po_required,
    default_po_number: c.default_po_number ?? "",
    currency: c.currency,
    preferred_payment_method: c.preferred_payment_method ?? "",
    default_deposit_percent: c.default_deposit_percent === null ? "" : String(c.default_deposit_percent),
    balance_due_rule: c.balance_due_rule ?? "",
    balance_due_days: c.balance_due_days === null ? "" : String(c.balance_due_days),
    tags: c.tags.join(", "),
    source: c.source ?? "",
    internal_notes: c.internal_notes ?? "",
  };
}

function toPayload(form: FormState) {
  return {
    ...form,
    company_name: form.company_name || null,
    legal_name: form.legal_name || null,
    phone: form.phone || null,
    website: form.website || null,
    tax_exempt_reason: form.tax_exempt_reason || null,
    gst_number: form.gst_number || null,
    qst_number: form.qst_number || null,
    default_po_number: form.default_po_number || null,
    preferred_payment_method: form.preferred_payment_method || null,
    default_deposit_percent: form.default_deposit_percent === "" ? null : form.default_deposit_percent,
    balance_due_rule: form.balance_due_rule || null,
    balance_due_days:
      form.balance_due_rule && form.balance_due_rule !== "event_date" && form.balance_due_days !== ""
        ? form.balance_due_days
        : null,
    tags: form.tags,
    source: form.source || null,
    internal_notes: form.internal_notes || null,
  };
}

const LANGUAGE_OPTIONS = (["en", "fr"] as const).map((lang) => ({
  id: lang,
  label: CUSTOMER_LANGUAGE_LABELS[lang],
  description:
    lang === "en"
      ? "Quotes, invoices, statements and emails in English"
      : "Soumissions, factures, relevés et courriels en français",
  icon: Languages,
}));

const CURRENCY_OPTIONS = CUSTOMER_CURRENCIES.map((currency) => ({
  id: currency,
  label: currency === "CAD" ? "Canadian dollars (CAD)" : "US dollars (USD)",
  description: currency === "CAD" ? "Default for Quebec and Canadian clients" : "Cross-border clients billed in USD",
  icon: Coins,
}));

const DUE_RULE_OPTIONS: Array<{ id: BalanceDueRule | ""; label: string; description: string; icon: typeof CalendarCheck }> = [
  { id: "", label: "Business default", description: "Use the rule from Billing settings.", icon: ReceiptText },
  { id: "event_date", label: "On the event date", description: "Balance due the day of the event.", icon: CalendarCheck },
  { id: "days_before_event", label: "Days before event", description: "e.g. 7 days before the event.", icon: CalendarClock },
  { id: "days_after_issue", label: "Days after issue", description: "Net terms, e.g. net 30 for corporate AP.", icon: CalendarPlus },
];

export type OpenDocumentCounts = { quotes: number; invoices: number; estimates: number };

export function AdminCustomerProfileForm({
  customer,
  paymentMethods,
  businessDefaults,
  openDocuments,
}: {
  customer: CustomerRow;
  paymentMethods: Array<{ id: string; label: string }>;
  businessDefaults: { depositPercent: number; dueDays: number };
  openDocuments: OpenDocumentCounts;
}) {
  const router = useRouter();
  const initial = useMemo(() => toForm(customer), [customer]);
  const [form, setForm] = useState<FormState>(initial);
  const [syncedAt, setSyncedAt] = useState(customer.updated_at);
  if (syncedAt !== customer.updated_at) {
    setSyncedAt(customer.updated_at);
    setForm(initial);
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useBrandConfirm();

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function save() {
    let applyLanguage = true;
    const languageChanged = form.preferred_language !== initial.preferred_language;
    const openCount = openDocuments.quotes + openDocuments.invoices + openDocuments.estimates;
    if (languageChanged && openCount > 0) {
      const label = CUSTOMER_LANGUAGE_LABELS[form.preferred_language];
      applyLanguage = await confirm({
        eyebrow: "Language",
        title: `Switch open documents to ${label}?`,
        description: `This customer has ${[
          openDocuments.quotes ? `${openDocuments.quotes} open quote${openDocuments.quotes === 1 ? "" : "s"}` : null,
          openDocuments.invoices ? `${openDocuments.invoices} unpaid invoice${openDocuments.invoices === 1 ? "" : "s"}` : null,
          openDocuments.estimates ? `${openDocuments.estimates} active request${openDocuments.estimates === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(", ")}. Switch them too so the next email and PDF match? Paid and closed documents are never changed.`,
        icon: Languages,
        confirmLabel: `Yes, switch to ${label}`,
        cancelLabel: "Only future documents",
      });
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toPayload(form), applyLanguageToOpenDocuments: applyLanguage }),
      });
      const json = await readJson<{
        cascade?: { quotes: string[]; invoices: string[]; estimates: number } | null;
      }>(response);
      if (!response.ok || !json.ok) {
        const message = json.message ?? "Could not save.";
        setError(message);
        toast.error(message);
        return;
      }
      const cascade = json.cascade;
      const moved = cascade ? [...cascade.quotes, ...cascade.invoices] : [];
      toast.success(
        moved.length
          ? `Customer saved. Also switched ${moved.join(", ")} to ${CUSTOMER_LANGUAGE_LABELS[form.preferred_language]}.`
          : "Customer saved."
      );
      router.refresh();
    } catch {
      setError("Could not save.");
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const needsDays = form.balance_due_rule === "days_before_event" || form.balance_due_rule === "days_after_issue";

  return (
    <div className="space-y-6">
      {confirmDialog}

      <CustomerPanel
        icon={Contact}
        eyebrow="Profile"
        title="Who they are"
        description="Main identity used on quotes, invoices and statements."
      >
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {CUSTOMER_KIND_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={form.kind === option.id}
                onSelect={() => set("kind", option.id as CustomerKind)}
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-name" label="Name on file">
              <Input id="c-name" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
            </Field>
            <Field id="c-company" label="Company">
              <Input id="c-company" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </Field>
            <Field id="c-email" label="Primary email" hint="Portal login and default invoice recipient.">
              <Input
                id="c-email"
                type="email"
                value={form.primary_email}
                onChange={(e) => set("primary_email", e.target.value)}
              />
            </Field>
            <Field id="c-phone" label="Phone">
              <Input id="c-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field id="c-legal" label="Legal / billing name" hint="Shown on invoices when different from the company.">
              <Input id="c-legal" value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
            </Field>
            <Field id="c-website" label="Website">
              <Input id="c-website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </Field>
          </div>
        </div>
      </CustomerPanel>

      <CustomerPanel
        icon={Languages}
        eyebrow="Language"
        title="Preferred language"
        description="The single source for this customer: new quotes, invoices, statements, emails and their portal all follow it."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {LANGUAGE_OPTIONS.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={form.preferred_language === option.id}
              onSelect={() => set("preferred_language", option.id)}
            />
          ))}
        </div>
      </CustomerPanel>

      <CustomerPanel
        icon={MapPin}
        eyebrow="Billing"
        title="Billing address & tax"
        description="Printed in the Bill-to block of every new invoice."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-addr1" label="Address" className="sm:col-span-2">
              <Input
                id="c-addr1"
                value={form.billing_address_line1}
                onChange={(e) => set("billing_address_line1", e.target.value)}
                placeholder="123 rue Sainte-Catherine"
              />
            </Field>
            <Field id="c-addr2" label="Suite / unit" className="sm:col-span-2">
              <Input
                id="c-addr2"
                value={form.billing_address_line2}
                onChange={(e) => set("billing_address_line2", e.target.value)}
              />
            </Field>
            <Field id="c-city" label="City">
              <Input id="c-city" value={form.billing_city} onChange={(e) => set("billing_city", e.target.value)} />
            </Field>
            <Field id="c-prov" label="Province / state">
              <Input
                id="c-prov"
                value={form.billing_province}
                onChange={(e) => set("billing_province", e.target.value)}
                placeholder="QC"
              />
            </Field>
            <Field id="c-postal" label="Postal code">
              <Input
                id="c-postal"
                value={form.billing_postal_code}
                onChange={(e) => set("billing_postal_code", e.target.value)}
              />
            </Field>
            <Field id="c-country" label="Country">
              <Input
                id="c-country"
                value={form.billing_country}
                onChange={(e) => set("billing_country", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ToggleTile
              checked={form.tax_exempt}
              onChange={(checked) => set("tax_exempt", checked)}
              title="Tax exempt"
              description="New invoices are created without GST/QST."
              icon={ShieldOff}
            />
            <ToggleTile
              checked={form.po_required}
              onChange={(checked) => set("po_required", checked)}
              title="PO number required"
              description="Warns before sending an invoice without a PO."
              icon={ClipboardCheck}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {form.tax_exempt ? (
              <Field id="c-exempt" label="Exemption reason / certificate" className="sm:col-span-2">
                <Input
                  id="c-exempt"
                  value={form.tax_exempt_reason}
                  onChange={(e) => set("tax_exempt_reason", e.target.value)}
                  placeholder="Registered charity, First Nations, out of country…"
                />
              </Field>
            ) : null}
            <Field id="c-po" label="Default PO number" hint="Pre-filled on new invoices.">
              <Input
                id="c-po"
                value={form.default_po_number}
                onChange={(e) => set("default_po_number", e.target.value)}
              />
            </Field>
            <Field id="c-gst" label="Their GST / QST numbers" hint="For corporate clients who need them on file.">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="c-gst"
                  value={form.gst_number}
                  onChange={(e) => set("gst_number", e.target.value)}
                  placeholder="GST"
                />
                <Input
                  aria-label="QST number"
                  value={form.qst_number}
                  onChange={(e) => set("qst_number", e.target.value)}
                  placeholder="QST"
                />
              </div>
            </Field>
          </div>
        </div>
      </CustomerPanel>

      <CustomerPanel
        icon={BadgePercent}
        eyebrow="Defaults"
        title="Payment terms"
        description="Overrides Billing settings for this customer's new invoices only."
      >
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {CURRENCY_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={form.currency === option.id}
                onSelect={() => set("currency", option.id)}
              />
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DUE_RULE_OPTIONS.map((option) => (
              <OptionCard
                key={option.id || "default"}
                option={{ ...option, id: option.id || "default" }}
                selected={form.balance_due_rule === option.id}
                onSelect={() => set("balance_due_rule", option.id)}
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {needsDays ? (
              <Field id="c-days" label="Days">
                <Input
                  id="c-days"
                  inputMode="numeric"
                  value={form.balance_due_days}
                  onChange={(e) => set("balance_due_days", e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={String(businessDefaults.dueDays)}
                />
              </Field>
            ) : null}
            <Field id="c-deposit" label="Deposit %" hint={`Blank = business default (${businessDefaults.depositPercent}%).`}>
              <Input
                id="c-deposit"
                inputMode="decimal"
                value={form.default_deposit_percent}
                onChange={(e) => set("default_deposit_percent", e.target.value.replace(/[^\d.]/g, ""))}
                placeholder={String(businessDefaults.depositPercent)}
              />
            </Field>
            <Field id="c-method" label="Usual payment method">
              <SelectInput
                id="c-method"
                value={form.preferred_payment_method}
                onChange={(value) => set("preferred_payment_method", value)}
                options={paymentMethods.map((m) => ({ value: m.id, label: m.label }))}
                placeholder="No preference"
                allowClear
                clearLabel="No preference"
              />
            </Field>
          </div>
        </div>
      </CustomerPanel>

      <CustomerPanel
        icon={NotebookPen}
        eyebrow="Internal"
        title="Tags & notes"
        description="Only visible to you."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="c-tags" label="Tags" hint="Comma separated, e.g. VIP, repeat, wedding planner">
            <div className="space-y-2">
              <Input id="c-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
              <TagPreview value={form.tags} />
            </div>
          </Field>
          <Field id="c-source" label="Source" hint="How they found you.">
            <Input
              id="c-source"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="Instagram, referral from…, venue partner"
            />
          </Field>
          <Field id="c-notes" label="Notes" className="sm:col-span-2">
            <Textarea
              id="c-notes"
              rows={4}
              value={form.internal_notes}
              onChange={(e) => set("internal_notes", e.target.value)}
              placeholder="Preferences, past issues, who to call first…"
            />
          </Field>
        </div>
      </CustomerPanel>

      <div
        className={cn(
          "sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md transition-colors",
          dirty ? "border-primary/40 bg-card/90 shadow-lg" : "border-border/40 bg-card/70"
        )}
      >
        <p
          className={cn(
            "text-sm",
            error ? "text-destructive" : "text-muted-foreground"
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? (dirty ? "You have unsaved changes." : "All changes saved.")}
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setForm(initial);
                setError(null);
              }}
            >
              Discard
            </button>
          ) : null}
          <LoadingButton
            type="button"
            onClick={() => void save()}
            disabled={!dirty}
            isLoading={saving}
            loadingText="Saving…"
            icon={<Save className="size-4" />}
          >
            Save customer
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TagPreview({ value }: { value: string }) {
  const tags = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs"
        >
          <Tags className="size-3 text-primary" />
          {tag}
        </span>
      ))}
    </div>
  );
}
