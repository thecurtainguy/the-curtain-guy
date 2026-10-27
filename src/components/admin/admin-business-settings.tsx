"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  Banknote,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Check,
  Eye,
  FileCheck2,
  FileSignature,
  FileText,
  Landmark,
  Mail,
  Plus,
  Receipt,
  ScrollText,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  defaultPaymentMethodCurrencies,
  formatInvoiceNumber,
  PAYMENT_CURRENCIES,
  type BalanceDueRule,
  type BusinessSettings,
  type PaymentMethod,
} from "@/data/invoices";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { OptionCard } from "@/components/estimate/option-card";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BALANCE_RULE_OPTIONS: Array<{
  id: BalanceDueRule;
  label: string;
  description: string;
  icon: typeof Wallet;
}> = [
  {
    id: "event_date",
    label: "On the day of the event",
    description: "Balance due date = that client's event date.",
    icon: CalendarCheck,
  },
  {
    id: "days_before_event",
    label: "Days before the event",
    description: "e.g. 7 days before the event date.",
    icon: CalendarClock,
  },
  {
    id: "days_after_issue",
    label: "Days after the invoice is issued",
    description: "e.g. net 14, regardless of the event date.",
    icon: CalendarPlus,
  },
];

const METHOD_ICONS: Record<PaymentMethod["kind"], typeof Wallet> = {
  etransfer: Mail,
  cheque: FileSignature,
  wire: Landmark,
  cash: Banknote,
  custom: Wallet,
};

function Section({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  icon: typeof Wallet;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h2 className="font-heading text-base font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function LanguageToggle({ value, onChange }: { value: "en" | "fr"; onChange: (value: "en" | "fr") => void }) {
  return (
    <div className="flex rounded-full border border-border/50 p-0.5">
      {(["en", "fr"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            value === option ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {option === "en" ? "English" : "Français"}
        </button>
      ))}
    </div>
  );
}

function pickDocumentFields(settings: BusinessSettings) {
  return {
    payment_document_path: settings.payment_document_path,
    payment_document_name: settings.payment_document_name,
    payment_document_uploaded_at: settings.payment_document_uploaded_at,
  };
}

export function AdminBusinessSettings({ initial }: { initial: BusinessSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [lang, setLang] = useState<"en" | "fr">("en");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);

  const isDirty = JSON.stringify(settings) !== baseline;
  const numberPreview = useMemo(
    () => [
      formatInvoiceNumber(settings.invoice_prefix, "TCG-10030", 0),
      formatInvoiceNumber(settings.invoice_prefix, "TCG-10030", 1),
    ],
    [settings.invoice_prefix]
  );

  function set<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateMethod(index: number, patch: Partial<PaymentMethod>) {
    setSettings((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
  }

  function moveMethod(index: number, delta: number) {
    setSettings((prev) => {
      const list = [...prev.payment_methods];
      const target = index + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, payment_methods: list };
    });
  }

  async function changeDocument(action: "upload" | "remove", file?: File) {
    setDocumentBusy(true);
    setMessage(null);
    setError(null);
    try {
      let response: Response;
      if (action === "upload" && file) {
        const form = new FormData();
        form.append("file", file);
        response = await fetch("/api/admin/business-settings/payment-document", { method: "POST", body: form });
      } else {
        response = await fetch("/api/admin/business-settings/payment-document", { method: "DELETE" });
      }
      const json = (await response.json()) as { ok?: boolean; message?: string; settings?: BusinessSettings };
      if (!response.ok || !json.ok || !json.settings) {
        setError(json.message ?? "Could not update the payment document.");
        return;
      }
      const fields = pickDocumentFields(json.settings);
      setSettings((prev) => ({ ...prev, ...fields }));
      setBaseline((prev) => JSON.stringify({ ...(JSON.parse(prev) as BusinessSettings), ...fields }));
      setMessage(
        action === "upload"
          ? "Document uploaded. It’s now the last page of every invoice PDF."
          : "Document removed. Invoice PDFs no longer include it."
      );
      router.refresh();
    } catch {
      setError("Could not update the payment document.");
    } finally {
      setDocumentBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/business-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; settings?: BusinessSettings };
      if (!response.ok || !json.ok || !json.settings) {
        setError(json.message ?? "Could not save settings.");
        return;
      }
      setSettings(json.settings);
      setBaseline(JSON.stringify(json.settings));
      setMessage("Saved. New PDFs and emails use these details right away.");
      router.refresh();
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const fr = lang === "fr";
  const sfx = fr ? "_fr" : "";
  const textKey = <K extends "invoice_notes" | "invoice_terms" | "invoice_footer" | "payment_page_title" | "payment_page_intro">(key: K) =>
    `${key}${sfx}` as K | `${K}_fr`;

  return (
    <div className="space-y-6 pb-20">
      <section className="relative overflow-hidden rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card/25">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.1),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Invoice identity</p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              {settings.legal_name || "Your company"}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Everything here prints on invoices: the header, the tax numbers, and the payment page.
              Changes apply to every invoice PDF you generate from now on.
            </p>
            <div className="flex flex-wrap gap-2">
              {[settings.trade_name, ...numberPreview, `Deposit ${settings.default_deposit_percent}%`].map((label) => (
                <Badge key={label} variant="outline" className="h-auto border-primary/20 bg-primary/5 py-1.5 text-foreground">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="relative min-h-[180px]">
            <SiteMediaImage mediaKey="home.cta.atmosphere" sizes="(max-width: 1024px) 100vw, 40vw" className="absolute inset-0" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            <div className="absolute inset-4 flex items-end">
              <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Page 2 of every invoice</p>
                <p className="mt-1 font-heading text-sm text-white">
                  {settings.payment_methods.filter((m) => m.enabled).length} payment methods shown
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/25 bg-primary/10"
          )}
        >
          {error || message}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section icon={Building2} eyebrow="Company" title="Business identity" description="Shown in the invoice header and footer.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="bs-legal" label="Legal name" value={settings.legal_name} onChange={(v) => set("legal_name", v)} className="sm:col-span-2" />
            <Field id="bs-trade" label="Trade name" value={settings.trade_name} onChange={(v) => set("trade_name", v)} />
            <Field id="bs-web" label="Website" value={settings.website} onChange={(v) => set("website", v)} />
            <Field id="bs-addr1" label="Address" value={settings.address_line1} onChange={(v) => set("address_line1", v)} className="sm:col-span-2" />
            <Field id="bs-addr2" label="Address line 2" value={settings.address_line2} onChange={(v) => set("address_line2", v)} className="sm:col-span-2" placeholder="Suite, unit (optional)" />
            <Field id="bs-city" label="City" value={settings.city} onChange={(v) => set("city", v)} />
            <Field id="bs-prov" label="Province" value={settings.province} onChange={(v) => set("province", v)} />
            <Field id="bs-postal" label="Postal code" value={settings.postal_code} onChange={(v) => set("postal_code", v)} />
            <Field id="bs-country" label="Country" value={settings.country} onChange={(v) => set("country", v)} />
            <Field id="bs-phone" label="Phone" value={settings.phone} onChange={(v) => set("phone", v)} />
            <Field id="bs-email" label="Email" value={settings.email} onChange={(v) => set("email", v)} />
          </div>
        </Section>

        <div className="space-y-6">
          <Section icon={Receipt} eyebrow="Tax" title="Registration numbers" description="Required on Québec invoices once you’re registered.">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="bs-gst" label="GST #" value={settings.gst_number} onChange={(v) => set("gst_number", v)} placeholder="123456789 RT0001" />
              <Field id="bs-qst" label="QST #" value={settings.qst_number} onChange={(v) => set("qst_number", v)} placeholder="1234567890 TQ0001" />
              <Field id="bs-neq" label="NEQ" value={settings.neq} onChange={(v) => set("neq", v)} placeholder="Optional" />
            </div>
          </Section>

          <Section icon={BadgePercent} eyebrow="Defaults" title="New invoice defaults" description="Every new invoice starts with these; change them per invoice anytime.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bs-prefix">Invoice prefix</Label>
                <Input id="bs-prefix" value={settings.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value.toUpperCase())} />
                <p className="text-xs text-muted-foreground">
                  {numberPreview[0]}, then {numberPreview[1]}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bs-dep">Default deposit %</Label>
                <Input
                  id="bs-dep"
                  inputMode="decimal"
                  value={String(settings.default_deposit_percent)}
                  onChange={(e) => set("default_deposit_percent", Number.parseFloat(e.target.value) || 0)}
                />
                <div className="flex gap-1.5">
                  {[25, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => set("default_deposit_percent", pct)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs",
                        settings.default_deposit_percent === pct ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bs-depdue">Deposit due (days after issue)</Label>
                <Input id="bs-depdue" inputMode="numeric" className="sm:max-w-40" value={String(settings.default_deposit_due_days)} onChange={(e) => set("default_deposit_due_days", Number.parseInt(e.target.value, 10) || 0)} />
                <p className="text-xs text-muted-foreground">0 = due on receipt</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Balance due</Label>
                <div className="grid gap-2">
                  {BALANCE_RULE_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      selected={settings.default_balance_due_rule === option.id}
                      onSelect={() => set("default_balance_due_rule", option.id)}
                      className="p-3"
                    />
                  ))}
                </div>
                {settings.default_balance_due_rule !== "event_date" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      id="bs-due"
                      inputMode="numeric"
                      aria-label="Number of days"
                      className="w-24"
                      value={String(settings.default_due_days)}
                      onChange={(e) => set("default_due_days", Number.parseInt(e.target.value, 10) || 0)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.default_balance_due_rule === "days_before_event" ? "days before the event" : "days after the invoice is issued"}
                    </span>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Each invoice uses its own event date. Without an event date, the balance is due {settings.default_due_days} days after issue.
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <Section
        icon={ScrollText}
        eyebrow="Wording"
        title="Invoice text"
        description="French versions are used for French-language clients; blank French fields fall back to English."
        actions={<LanguageToggle value={lang} onChange={setLang} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Terms (one per line)</Label>
            <Textarea
              rows={10}
              value={settings[textKey("invoice_terms")]}
              onChange={(e) => set(textKey("invoice_terms"), e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Each line is numbered separately on the invoice page and PDF.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Default notes to client</Label>
            <Textarea rows={3} value={settings[textKey("invoice_notes")]} onChange={(e) => set(textKey("invoice_notes"), e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Footer line</Label>
            <Textarea rows={3} value={settings[textKey("invoice_footer")]} onChange={(e) => set(textKey("invoice_footer"), e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment page title</Label>
            <Input value={settings[textKey("payment_page_title")]} onChange={(e) => set(textKey("payment_page_title"), e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment page intro</Label>
            <Textarea rows={3} value={settings[textKey("payment_page_intro")]} onChange={(e) => set(textKey("payment_page_intro"), e.target.value)} />
          </div>
        </div>
      </Section>

      <Section
        icon={Wallet}
        eyebrow="Payment page"
        title="Payment methods"
        description={
          lang === "fr"
            ? "Editing the French version. Blank French fields fall back to the English text shown in grey."
            : "Enabled methods appear on page 2 of every invoice and on the client’s invoice page, only for the invoice currencies you tick. Empty fields are hidden."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle value={lang} onChange={setLang} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("payment_methods", [
                ...settings.payment_methods,
                {
                  id: `custom-${Date.now()}`,
                  kind: "custom",
                  enabled: true,
                  label: "New method",
                  fields: [{ label: "Details", value: "" }],
                  instructions: "",
                  currencies: ["CAD", "USD"],
                },
              ])
            }
          >
            <Plus className="size-4" />
            Add method
          </Button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {settings.payment_methods.map((method, index) => {
            const Icon = METHOD_ICONS[method.kind];
            return (
              <div
                key={method.id}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-colors",
                  method.enabled ? "border-primary/35 bg-primary/[0.04]" : "border-border/40 bg-card/20 opacity-75"
                )}
              >
                <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <Input
                    value={fr ? method.label_fr ?? "" : method.label}
                    placeholder={fr ? method.label : undefined}
                    onChange={(e) => updateMethod(index, fr ? { label_fr: e.target.value } : { label: e.target.value })}
                    className="h-8 flex-1 font-medium"
                    aria-label={fr ? "Method name (French)" : "Method name"}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={method.enabled}
                    onClick={() => updateMethod(index, { enabled: !method.enabled })}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      method.enabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className="sr-only">Show on invoices</span>
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-background shadow transition-all",
                        method.enabled ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Offer on</span>
                    {PAYMENT_CURRENCIES.map((currency) => {
                      const current = method.currencies ?? defaultPaymentMethodCurrencies(method.kind);
                      const on = current.includes(currency);
                      return (
                        <button
                          key={currency}
                          type="button"
                          role="switch"
                          aria-checked={on}
                          disabled={on && current.length === 1}
                          title={on && current.length === 1 ? "Turn the method off instead" : undefined}
                          onClick={() =>
                            updateMethod(index, {
                              currencies: on ? current.filter((c) => c !== currency) : PAYMENT_CURRENCIES.filter((c) => c === currency || current.includes(c)),
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                            on ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <span className={cn("flex size-3.5 items-center justify-center rounded-full border", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50")}>
                            {on ? <Check className="size-2.5" /> : null}
                          </span>
                          {currency} invoices
                        </button>
                      );
                    })}
                  </div>
                  {method.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="grid grid-cols-[120px_minmax(0,1fr)_auto] gap-2">
                      <Input
                        value={fr ? field.label_fr ?? "" : field.label}
                        placeholder={fr ? field.label : undefined}
                        onChange={(e) =>
                          updateMethod(index, {
                            fields: method.fields.map((f, i) =>
                              i === fieldIndex ? { ...f, ...(fr ? { label_fr: e.target.value } : { label: e.target.value }) } : f
                            ),
                          })
                        }
                        aria-label={fr ? "Field label (French)" : "Field label"}
                        className="text-xs"
                      />
                      <Input
                        value={fr ? field.value_fr ?? "" : field.value}
                        onChange={(e) =>
                          updateMethod(index, {
                            fields: method.fields.map((f, i) =>
                              i === fieldIndex ? { ...f, ...(fr ? { value_fr: e.target.value } : { value: e.target.value }) } : f
                            ),
                          })
                        }
                        aria-label={`${field.label} value${fr ? " (French)" : ""}`}
                        placeholder={fr ? field.value || "Same as English" : "Leave blank to hide"}
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove field"
                        onClick={() => updateMethod(index, { fields: method.fields.filter((_, i) => i !== fieldIndex) })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => updateMethod(index, { fields: [...method.fields, { label: "Label", value: "" }] })}
                  >
                    <Plus className="size-3.5" />
                    Add field
                  </Button>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{fr ? "Instructions (French)" : "Instructions"}</Label>
                    <Textarea
                      rows={2}
                      value={fr ? method.instructions_fr ?? "" : method.instructions}
                      placeholder={fr ? method.instructions : undefined}
                      onChange={(e) =>
                        updateMethod(index, fr ? { instructions_fr: e.target.value } : { instructions: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => moveMethod(index, -1)}>
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Move down"
                        disabled={index === settings.payment_methods.length - 1}
                        onClick={() => moveMethod(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => set("payment_methods", settings.payment_methods.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        icon={FileCheck2}
        eyebrow="Payment package"
        title="Payment documents"
        description="Added as the last page of every invoice PDF: emails, secure links, client portal and admin downloads."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {settings.payment_document_path ? (
            <div
              className={cn(
                "flex flex-col gap-4 rounded-2xl border p-4",
                settings.payment_document_enabled ? "border-primary/35 bg-primary/[0.04]" : "border-border/40 bg-card/20"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-semibold">{settings.payment_document_name || "Payment document.pdf"}</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.payment_document_uploaded_at
                      ? `Uploaded ${new Date(settings.payment_document_uploaded_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" })}`
                      : "Uploaded"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    settings.payment_document_enabled ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  {settings.payment_document_enabled ? "On every invoice" : "Not attached"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild type="button" size="sm" variant="outline">
                  <a
                    href={`/api/admin/business-settings/payment-document?v=${encodeURIComponent(settings.payment_document_uploaded_at ?? "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </a>
                </Button>
                <Button asChild type="button" size="sm" variant="outline" disabled={documentBusy}>
                  <label className="cursor-pointer">
                    <Upload className="size-3.5" />
                    {documentBusy ? "Uploading…" : "Replace PDF"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      disabled={documentBusy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void changeDocument("upload", file);
                      }}
                    />
                  </label>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={documentBusy}
                  onClick={() => {
                    if (window.confirm("Remove this document from all invoice PDFs?")) void changeDocument("remove");
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/[0.03] p-6 text-center transition-colors hover:border-primary/60",
                documentBusy && "pointer-events-none opacity-60"
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Upload className="size-5" />
              </span>
              <span className="font-heading text-sm font-semibold">{documentBusy ? "Uploading…" : "Upload a PDF"}</span>
              <span className="text-xs text-muted-foreground">Void cheque or direct deposit form · PDF up to 10 MB</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={documentBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void changeDocument("upload", file);
                }}
              />
            </label>
          )}

          <div className="space-y-3 rounded-2xl border border-border/40 bg-card/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Attach to every invoice</p>
                <p className="text-xs text-muted-foreground">Turn off to keep the file without sending it.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.payment_document_enabled}
                onClick={() => set("payment_document_enabled", !settings.payment_document_enabled)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  settings.payment_document_enabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span className="sr-only">Attach to every invoice</span>
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-background shadow transition-all",
                    settings.payment_document_enabled ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </div>
            <Field
              id="bs-doc-label"
              label="Name shown to clients (English)"
              value={settings.payment_document_label}
              onChange={(v) => set("payment_document_label", v)}
            />
            <Field
              id="bs-doc-label-fr"
              label="Name shown to clients (French)"
              value={settings.payment_document_label_fr}
              onChange={(v) => set("payment_document_label_fr", v)}
            />
            <p className="text-xs text-muted-foreground">Switch and name changes are applied when you save billing settings.</p>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <LoadingButton type="button" isLoading={saving} loadingText="Saving" disabled={!isDirty} onClick={() => void save()}>
          Save billing settings
        </LoadingButton>
      </div>

      <AdminFloatingSaveButton active={isDirty} saving={saving} label="Save billing settings" onSave={() => void save()} />
    </div>
  );
}
