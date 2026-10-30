"use client";

import { SavedVenuePicker } from "@/components/admin/saved-venue-picker";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  CalendarDays,
  Check,
  Copy,
  FileText,
  Layers,
  Package,
  Paperclip,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { EventTypeInput } from "@/components/ui/event-type-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { OptionCard } from "@/components/estimate/option-card";
import { CustomerLanguagePicker } from "@/components/quotes/customer-language-picker";
import { CustomerCurrencyPicker } from "@/components/quotes/customer-currency-picker";
import { LineItemThumb } from "@/components/quotes/line-item-thumb";
import {
  QuoteScheduleFields,
  scheduleDraftFromQuote,
  scheduleDraftPayload,
  type QuoteScheduleDraft,
} from "@/components/admin/quote-schedule-fields";
import type { OpportunityFileItem } from "@/components/estimates/opportunity-files-panel";
import {
  CONTACT_ROLE_LABELS,
  formatVenueAddress,
  type CustomerCurrency,
  type CustomerLinkSummary,
  type CustomerVenueRow,
} from "@/data/customers";
import { normalizeCustomerLanguage, type CustomerLanguage } from "@/data/customer-language";
import { estimateFileKindLabel } from "@/data/estimate-file-kinds";
import {
  QUOTE_DUPLICATE_COPY_KEYS,
  QUOTE_DUPLICATE_COPY_LABELS,
  defaultQuoteDuplicateCopy,
  type QuoteDuplicateCopy,
  type QuoteDuplicateCopyKey,
  type QuoteDuplicateRequest,
} from "@/data/quote-duplicate";
import {
  computeLineTotalCents,
  formatMoneyFromCents,
  formatQuoteUnitSuffix,
  quoteLineCategoryLabel,
  unitPriceCentsToDollarInput,
  unitPriceDollarsToCents,
} from "@/data/quotes";
import { formatFileSize } from "@/lib/estimate-files-shared";
import type { QuoteWithRelations } from "@/lib/quotes";
import { cn } from "@/lib/utils";

type DraftLine = {
  sourceId: string;
  include: boolean;
  quantity: string;
  unitPriceDollars: string;
};

const COPY_ICONS: Record<QuoteDuplicateCopyKey, LucideIcon> = {
  paymentTerms: CalendarDays,
  terms: FileText,
  customerNotes: UserRound,
  ownerNotes: Star,
  brief: Layers,
  studioDesigns: Building,
};

function dateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function quoteCurrency(value: string | null | undefined): CustomerCurrency {
  return value === "USD" ? "USD" : "CAD";
}

function SelectCircle({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/50 text-transparent hover:border-primary/50"
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-semibold leading-tight">{title}</h3>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminQuoteDuplicateDialog({
  open,
  onOpenChange,
  quote,
  customer,
  opportunityFiles,
  hasStudioDesigns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithRelations;
  customer: CustomerLinkSummary | null;
  opportunityFiles: OpportunityFileItem[];
  hasStudioDesigns: boolean;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(quote.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(quote.customer_email ?? "");
  const [eventType, setEventType] = useState(quote.event_type ?? "");
  const [eventDate, setEventDate] = useState(dateInput(quote.event_date));
  const [schedule, setSchedule] = useState<QuoteScheduleDraft>(() => scheduleDraftFromQuote(quote));
  const [venueName, setVenueName] = useState(quote.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(quote.venue_address ?? "");
  const [venueId, setVenueId] = useState<string | null>(quote.customer_venue_id ?? null);
  const [cityArea, setCityArea] = useState(quote.city_area ?? "");
  const [validUntil, setValidUntil] = useState(dateInput(quote.valid_until));
  const [language, setLanguage] = useState<CustomerLanguage>(normalizeCustomerLanguage(quote.language));
  const [currency, setCurrency] = useState<CustomerCurrency>(quoteCurrency(quote.currency));
  const [lines, setLines] = useState<DraftLine[]>(() =>
    quote.line_items.map((item) => ({
      sourceId: item.id,
      include: true,
      quantity: String(item.quantity),
      unitPriceDollars: unitPriceCentsToDollarInput(item.unit_price_cents),
    }))
  );
  const files = useMemo(
    () => opportunityFiles.filter((file) => file.upload_status === "uploaded" && !file.deleted_at),
    [opportunityFiles]
  );
  const [fileIds, setFileIds] = useState<Set<string>>(() => new Set(files.map((file) => file.id)));
  const [copy, setCopy] = useState<QuoteDuplicateCopy>(defaultQuoteDuplicateCopy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ quoteId: string; ref: string; warnings: string[] } | null>(
    null
  );

  const copyKeys = QUOTE_DUPLICATE_COPY_KEYS.filter(
    (key) => key !== "studioDesigns" || hasStudioDesigns
  );
  const itemsById = useMemo(
    () => new Map(quote.line_items.map((item) => [item.id, item])),
    [quote.line_items]
  );
  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);
  const lineCents = (line: DraftLine) =>
    computeLineTotalCents(Number(line.quantity) || 0, unitPriceDollarsToCents(line.unitPriceDollars));
  const included = lines.filter((line) => line.include);
  const subtotal = included.reduce((sum, line) => sum + lineCents(line), 0);
  const allLines = included.length === lines.length;
  const allFiles = fileIds.size === files.length;

  function updateLine(sourceId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line) => (line.sourceId === sourceId ? { ...line, ...patch } : line)));
  }

  function applySavedVenue(venue: CustomerVenueRow, linked = true) {
    setVenueName(venue.name);
    setVenueAddress(formatVenueAddress(venue));
    setVenueId(linked ? venue.id : null);
    if (venue.city) setCityArea(venue.city);
  }

  function changeVenueName(value: string) {
    setVenueName(value);
    const linked = customer?.venues.find((venue) => venue.id === venueId);
    if (linked && linked.name.trim().toLowerCase() !== value.trim().toLowerCase()) {
      setVenueId(null);
    }
  }

  function toggleFile(id: string) {
    setFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function duplicate() {
    setError(null);
    if (!customerEmail.trim().includes("@")) {
      setError("A valid customer email is required.");
      return;
    }
    const payload: QuoteDuplicateRequest = {
      details: {
        customer_name: customerName.trim() || null,
        customer_email: customerEmail.trim(),
        event_type: eventType.trim() || null,
        event_date: eventDate || null,
        venue_name: venueName.trim() || null,
        venue_address: venueAddress.trim() || null,
        customer_venue_id: venueId,
        city_area: cityArea.trim() || null,
        valid_until: validUntil || null,
        language,
        currency,
        ...scheduleDraftPayload(schedule),
      },
      lines: lines.map((line) => ({
        sourceId: line.sourceId,
        include: line.include,
        quantity: Number(line.quantity) || 0,
        unitPriceCents: unitPriceDollarsToCents(line.unitPriceDollars),
      })),
      copy: hasStudioDesigns ? copy : { ...copy, studioDesigns: false },
      fileIds: Array.from(fileIds),
    };
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        quoteId?: string;
        opportunityRef?: string;
        warnings?: string[];
      };
      if (!response.ok || !data.ok || !data.quoteId) {
        const failure = data.message ?? "Could not duplicate the quote.";
        setError(failure);
        toast.error(failure);
        return;
      }
      toast.success(
        data.opportunityRef ? `Quote duplicated as ${data.opportunityRef}.` : "Quote duplicated."
      );
      if (data.warnings?.length) {
        setResult({ quoteId: data.quoteId, ref: data.opportunityRef ?? "", warnings: data.warnings });
        return;
      }
      router.push(`/admin/quotes/${data.quoteId}`);
      onOpenChange(false);
    } catch {
      setError("Could not duplicate the quote.");
      toast.error("Could not duplicate the quote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? null : onOpenChange(next))}>
      <BrandDialogContent
        size="xl"
        icon={Copy}
        eyebrow={`Duplicate ${quote.opportunity_ref}`}
        title="Duplicate quote"
        description="Everything is pre-filled from this quote. Change only what's different; the copy starts as a draft under a new opportunity number, and the original stays untouched."
        footer={
          result ? (
            <Button type="button" onClick={() => router.push(`/admin/quotes/${result.quoteId}`)}>
              Open {result.ref || "new quote"}
            </Button>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {included.length} of {lines.length} line{lines.length === 1 ? "" : "s"} ·{" "}
                <span className="font-medium text-foreground">{money(subtotal)}</span> before tax ·{" "}
                {fileIds.size} file{fileIds.size === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="button"
                  isLoading={saving}
                  loadingText="Duplicating"
                  onClick={() => void duplicate()}
                  icon={<Copy className="size-4" />}
                >
                  Duplicate quote
                </LoadingButton>
              </div>
            </div>
          )
        }
      >
        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold text-primary">{result.ref}</span> was created, with a
              few things to check:
            </p>
            <ul className="space-y-1.5">
              {result.warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            <Section
              icon={UserRound}
              title="Customer"
              hint={customer ? `Stays linked to ${customer.display_name}` : "Same customer details"}
            >
              {customer && customer.contactOptions.length > 1 ? (
                <div className="@container mb-3">
                  <div className="grid grid-cols-1 gap-2 @[34rem]:grid-cols-2 @[52rem]:grid-cols-3">
                    {customer.contactOptions.map((contact) => (
                      <OptionCard
                        key={contact.id}
                        className="p-3"
                        option={{
                          id: contact.id,
                          label: contact.name,
                          description: [
                            contact.email,
                            contact.primary
                              ? "Primary"
                              : contact.title || (contact.role ? CONTACT_ROLE_LABELS[contact.role] : null),
                          ]
                            .filter(Boolean)
                            .join(" · "),
                          icon: contact.primary ? Star : UserRound,
                        }}
                        selected={customerEmail.trim().toLowerCase() === contact.email.toLowerCase()}
                        onSelect={() => {
                          setCustomerName(contact.name);
                          setCustomerEmail(contact.email);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dup_customer_name">Name</Label>
                  <Input
                    id="dup_customer_name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dup_customer_email">Email</Label>
                  <Input
                    id="dup_customer_email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Building} title="Event & venue" hint="Pick a saved venue or type a new one">
              <SavedVenuePicker
                className="mb-4"
                customer={customer}
                selectedVenueId={venueId}
                venueName={venueName}
                onPick={applySavedVenue}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label htmlFor="dup_venue_name">Venue</Label>
                  <Input
                    id="dup_venue_name"
                    value={venueName}
                    onChange={(e) => changeVenueName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dup_city_area">City / area</Label>
                  <Input
                    id="dup_city_area"
                    value={cityArea}
                    onChange={(e) => setCityArea(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dup_event_type">Event type</Label>
                  <EventTypeInput id="dup_event_type" value={eventType} onChange={setEventType} allowCreate />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="dup_venue_address">Venue address</Label>
                  <Input
                    id="dup_venue_address"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="Street, city, province, postal code"
                    maxLength={400}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dup_valid_until">Valid until</Label>
                  <DateInput id="dup_valid_until" value={validUntil} onChange={setValidUntil} />
                </div>
              </div>
              <QuoteScheduleFields
                idPrefix="dup_"
                eventDate={eventDate}
                onEventDateChange={setEventDate}
                draft={schedule}
                onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
                disabled={false}
              />
              <div className="@container mt-4">
                <div className="grid gap-4 @[34rem]:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Currency
                    </p>
                    <CustomerCurrencyPicker
                      value={currency}
                      onChange={setCurrency}
                      customerDefault={customer?.currency ?? null}
                      compact
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Language
                    </p>
                    <CustomerLanguagePicker value={language} onChange={setLanguage} compact />
                  </div>
                </div>
              </div>
            </Section>

            <Section
              icon={Package}
              title="Line items"
              hint={`Unit prices in ${currency}. Untick a line to leave it out.`}
              action={
                lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLines((prev) => prev.map((line) => ({ ...line, include: !allLines })))
                    }
                  >
                    {allLines ? "Untick all" : "Tick all"}
                  </Button>
                ) : null
              }
            >
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">This quote has no line items.</p>
              ) : (
                <ul className="space-y-2">
                  {lines.map((line) => {
                    const item = itemsById.get(line.sourceId);
                    if (!item) return null;
                    const suffix = formatQuoteUnitSuffix(item.unit_label, "en");
                    return (
                      <li
                        key={line.sourceId}
                        className={cn(
                          "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-opacity",
                          line.include
                            ? "border-border/40 bg-background/30"
                            : "border-border/20 bg-background/10 opacity-55"
                        )}
                      >
                        <SelectCircle
                          checked={line.include}
                          onToggle={() => updateLine(line.sourceId, { include: !line.include })}
                          label={`Include ${item.description}`}
                        />
                        <LineItemThumb
                          src={item.image_url}
                          alt={item.image_alt || item.description}
                          sizes="40px"
                          className="size-10 rounded-lg"
                        />
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="truncate text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.category_label || quoteLineCategoryLabel({ category: item.category })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            aria-label={`Quantity for ${item.description}`}
                            inputMode="decimal"
                            className="h-9 w-20 text-right tabular-nums"
                            value={line.quantity}
                            disabled={!line.include}
                            onChange={(e) => updateLine(line.sourceId, { quantity: e.target.value })}
                          />
                          <span className="text-xs text-muted-foreground">×</span>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              $
                            </span>
                            <Input
                              aria-label={`Unit price for ${item.description}`}
                              inputMode="decimal"
                              className="h-9 w-32 pl-5 text-right tabular-nums"
                              value={line.unitPriceDollars}
                              disabled={!line.include}
                              onChange={(e) =>
                                updateLine(line.sourceId, { unitPriceDollars: e.target.value })
                              }
                            />
                          </div>
                          {suffix ? (
                            <span className="w-12 text-xs text-muted-foreground">{suffix}</span>
                          ) : null}
                        </div>
                        <p className="w-28 text-right text-sm font-semibold tabular-nums whitespace-nowrap">
                          {money(lineCents(line))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {files.length > 0 ? (
              <Section
                icon={Paperclip}
                title="Attachments"
                hint="Files are copied into the new opportunity with the same sharing settings."
                action={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFileIds(allFiles ? new Set() : new Set(files.map((file) => file.id)))
                    }
                  >
                    {allFiles ? "Untick all" : "Tick all"}
                  </Button>
                }
              >
                <ul className="grid gap-2 sm:grid-cols-2">
                  {files.map((file) => {
                    const checked = fileIds.has(file.id);
                    return (
                      <li key={file.id}>
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3",
                            checked
                              ? "border-primary/40 bg-primary/[0.06]"
                              : "border-border/40 bg-background/30"
                          )}
                        >
                          <SelectCircle
                            checked={checked}
                            onToggle={() => toggleFile(file.id)}
                            label={`Copy ${file.original_file_name}`}
                          />
                          <FileText className="size-4 shrink-0 text-primary" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" title={file.original_file_name}>
                              {file.caption || file.original_file_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                file.file_kind ? estimateFileKindLabel(file.file_kind) : null,
                                formatFileSize(file.file_size_bytes),
                                file.customer_visible === false ? "Internal" : null,
                                file.include_in_quote ? "On quote" : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            ) : null}

            <Section icon={Layers} title="Also copy" hint="All on by default">
              <div className="@container">
                <div className="grid grid-cols-1 gap-2 @[34rem]:grid-cols-2 @[52rem]:grid-cols-3">
                  {copyKeys.map((key) => (
                    <OptionCard
                      key={key}
                      mode="multi"
                      className="p-3"
                      option={{
                        id: key,
                        label: QUOTE_DUPLICATE_COPY_LABELS[key].label,
                        description: QUOTE_DUPLICATE_COPY_LABELS[key].description,
                        icon: COPY_ICONS[key],
                      }}
                      selected={copy[key]}
                      onSelect={() => setCopy((prev) => ({ ...prev, [key]: !prev[key] }))}
                    />
                  ))}
                </div>
              </div>
            </Section>
          </div>
        )}
      </BrandDialogContent>
    </Dialog>
  );
}
