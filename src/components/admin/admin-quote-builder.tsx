"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Languages,
  Loader2,
  Lock,
  Package,
  Pencil,
  Plus,
  Send,
  Star,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { PRODUCT_UNIT_LABELS } from "@/data/products";
import {
  buildQuoteCategoryOptions,
  type ProductCategoryRow,
  type QuoteCategoryOption,
} from "@/data/product-categories";
import {
  QUOTE_LINE_STATUS_LABELS,
  QUOTE_LINE_STATUSES,
  QUOTE_TAX_MODE_LABELS,
  QUOTE_TAX_MODES,
  computeLineTotalCents,
  computeQuoteTaxTotals,
  unitPriceCentsForLineTotal,
  unitPriceCentsToDollarInput,
  unitPriceDollarsToCents,
  formatMoneyFromCents,
  formatQuoteRevisionLabel,
  getQuoteCategoryDefaultDescription,
  isQuoteLocked,
  isZeroPricedQuoteLine,
  normalizeManualTaxLines,
  formatQuoteUnitSuffix,
  percentInputToRate,
  quoteLineCategoryLabel,
  rateToPercentInput,
  resolveQuoteDisplayRef,
  shouldAutofillQuoteDescription,
  splitQuoteTerms,
  type QuoteLineStatus,
  type QuoteManualTaxLine,
  type QuoteRequestStatus,
  type QuoteTaxMode,
} from "@/data/quotes";
import {
  QuoteRequestStatusBadge,
  QuoteStatusBadge,
} from "@/components/quotes/quote-status-badge";
import { QuoteTaxBreakdown } from "@/components/quotes/quote-tax-breakdown";
import { QuoteTermsList } from "@/components/quotes/quote-terms-list";
import { CustomerLanguagePicker } from "@/components/quotes/customer-language-picker";
import { CustomerLanguageBadge } from "@/components/quotes/customer-language-badge";
import { CustomerCurrencyPicker } from "@/components/quotes/customer-currency-picker";
import {
  CONTACT_ROLE_LABELS,
  formatVenueAddress,
  type CustomerCurrency,
  type CustomerLinkSummary,
  type CustomerVenueRow,
} from "@/data/customers";
import {
  quotePaymentTermsFrom,
  type QuotePaymentDefaults,
  type QuotePaymentTerms,
} from "@/data/quote-payment-terms";
import { QuotePaymentTermsFields } from "@/components/admin/quote-payment-terms-fields";
import { OptionCard } from "@/components/estimate/option-card";
import {
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import { localizedDocumentTextSlug } from "@/data/document-texts";
import { DocumentTextPreviewButton } from "@/components/admin/document-text-preview";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { AdminQuotePreviewDialog } from "@/components/admin/admin-quote-preview-dialog";
import { AdminQuoteSendDialog } from "@/components/admin/admin-quote-send-dialog";
import { draftTranslation } from "@/lib/translate-draft";
import { toast } from "@/components/ui/sonner";
import { AdminQuoteDuplicateDialog } from "@/components/admin/admin-quote-duplicate-dialog";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { QuoteGuestProposalCard } from "@/components/quotes/quote-guest-proposal-card";
import { QuoteCustomerCard } from "@/components/admin/quote-customer-card";
import {
  OpportunityFilesPanel,
  type OpportunityFileItem,
} from "@/components/estimates/opportunity-files-panel";
import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import type { QuoteWithRelations } from "@/lib/quotes";
import { formatEventPlanReference } from "@/data/event-plans";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  QuoteScheduleFields,
  scheduleDraftFromQuote,
  scheduleDraftPayload,
  type QuoteScheduleDraft,
} from "@/components/admin/quote-schedule-fields";
import type { FileActivityItem } from "@/data/estimate-file-events";
import { EventTypeInput } from "@/components/ui/event-type-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectInput } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStickyRail } from "@/hooks/use-sticky-rail";
import {
  AdminInventoryPickerDialog,
  type InventoryPickResult,
} from "@/components/admin/admin-inventory-picker-dialog";
import {
  AdminLogisticsServiceDialog,
  type LogisticsServicePick,
} from "@/components/admin/admin-logistics-service-dialog";
import {
  QuoteLineReorderGroup,
  QuoteLineReorderItem,
} from "@/components/admin/quote-line-reorder";
import Image from "next/image";

type QuoteSourceEventPlan = {
  id: string;
  reference: string | null;
};

type DraftLine = {
  key: string;
  id?: string;
  category: string;
  categoryLabel: string | null;
  description: string;
  /** The description in the other customer language. */
  descriptionTranslated: string;
  quantity: number;
  unitLabel: string;
  unitPriceDollars: string;
  /** Raw text while typing a line total; the unit price is derived from it. */
  lineTotalDraft?: string;
  status: QuoteLineStatus;
  isTaxable: boolean;
  productId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

type DraftManualTaxLine = {
  key: string;
  label: string;
  /** Percent string for the input, e.g. "13" or "9.975" */
  ratePercent: string;
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function linesFromQuote(quote: QuoteWithRelations): DraftLine[] {
  return (quote.line_items || []).map((item) => ({
    key: item.id,
    id: item.id,
    category: item.category,
    categoryLabel: item.category_label ?? null,
    description: item.description,
    descriptionTranslated: item.description_translated ?? "",
    quantity: item.quantity,
    unitLabel: item.unit_label?.trim() || "each",
    unitPriceDollars: unitPriceCentsToDollarInput(item.unit_price_cents),
    status: item.status,
    isTaxable: item.is_taxable !== false,
    productId: item.product_id ?? null,
    imageUrl: item.image_url ?? null,
    imageAlt: item.image_alt ?? null,
  }));
}

function emptyManualTaxLine(): DraftManualTaxLine {
  return {
    key: `tax-${crypto.randomUUID()}`,
    label: "Sales tax",
    ratePercent: "0",
  };
}

function manualTaxLinesFromQuote(
  quote: QuoteWithRelations
): DraftManualTaxLine[] {
  const stored = normalizeManualTaxLines(quote.manual_tax_lines);
  if (stored.length > 0) {
    return stored.map((line) => ({
      key: `tax-${crypto.randomUUID()}`,
      label: line.label,
      ratePercent: rateToPercentInput(line.rate),
    }));
  }

  // Legacy fixed-dollar → approximate % from taxable subtotal when possible
  if (quote.manual_tax_label || (quote.manual_tax_cents || 0) > 0) {
    const taxable = quote.taxable_subtotal_cents || 0;
    const cents = quote.manual_tax_cents || 0;
    const rate = taxable > 0 ? cents / taxable : 0;
    return [
      {
        key: `tax-${crypto.randomUUID()}`,
        label: quote.manual_tax_label?.trim() || "Sales tax",
        ratePercent: rateToPercentInput(rate),
      },
    ];
  }

  return [emptyManualTaxLine()];
}

function toStoredManualTaxLines(
  drafts: DraftManualTaxLine[]
): QuoteManualTaxLine[] {
  return drafts
    .map((line) => ({
      label: line.label.trim() || "Tax",
      rate: percentInputToRate(line.ratePercent),
    }))
    .filter((line) => line.rate > 0 || line.label.length > 0);
}

function emptyLine(first: QuoteCategoryOption | undefined): DraftLine {
  const category = first?.value ?? "custom";
  return {
    key: `new-${crypto.randomUUID()}`,
    category,
    categoryLabel: first?.label ?? null,
    description: getQuoteCategoryDefaultDescription(category),
    descriptionTranslated: "",
    quantity: 1,
    unitLabel: "each",
    unitPriceDollars: "0.00",
    status: "priced",
    isTaxable: true,
    productId: null,
    imageUrl: null,
    imageAlt: null,
  };
}

function lineFromInventory(item: InventoryPickResult): DraftLine {
  return {
    key: `new-${crypto.randomUUID()}`,
    category: item.category,
    categoryLabel: item.categoryLabel,
    description: item.description,
    descriptionTranslated: "",
    quantity: 1,
    unitLabel: item.unitLabel,
    unitPriceDollars: unitPriceCentsToDollarInput(item.unitPriceCents),
    status: "priced",
    isTaxable: item.isTaxable,
    productId: item.productId,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
  };
}

function quoteCurrency(value: string | null | undefined): CustomerCurrency {
  return value === "USD" ? "USD" : "CAD";
}

function lineFromLogistics(item: LogisticsServicePick): DraftLine {
  return {
    key: `new-${crypto.randomUUID()}`,
    category: item.category,
    categoryLabel: item.categoryLabel,
    description: item.description,
    descriptionTranslated: "",
    quantity: 1,
    unitLabel: item.unitLabel,
    unitPriceDollars: unitPriceCentsToDollarInput(item.unitPriceCents),
    status: item.included
      ? "included"
      : item.needsPricing
        ? "not_priced_yet"
        : "priced",
    isTaxable: item.isTaxable,
    productId: item.productId,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
  };
}

const FALLBACK_PAYMENT_DEFAULTS: QuotePaymentDefaults = {
  deposit_percent: 50,
  balance_due_rule: "event_date",
  balance_due_days: 0,
};

export function AdminQuoteBuilder({
  quote,
  initialGuestUrl = null,
  opportunityFiles = [],
  deletedOpportunityFiles = [],
  fileActivity = [],
  sourceEventPlan = null,
  categories = [],
  defaultCc = [],
  customer = null,
  studioPanel = null,
  engagementPanel = null,
  bookingActions = null,
  paymentDefaults = FALLBACK_PAYMENT_DEFAULTS,
  hasStudioDesigns = false,
}: {
  quote: QuoteWithRelations;
  initialGuestUrl?: string | null;
  opportunityFiles?: OpportunityFileItem[];
  deletedOpportunityFiles?: OpportunityFileItem[];
  /** Merged into the change log so file deletes and PDF attachments are audited with the quote. */
  fileActivity?: FileActivityItem[];
  sourceEventPlan?: QuoteSourceEventPlan | null;
  categories?: ProductCategoryRow[];
  defaultCc?: string[];
  customer?: CustomerLinkSummary | null;
  /** Studio card rendered in the right rail. */
  studioPanel?: ReactNode;
  /** Views and email delivery card rendered under the quote summary. */
  engagementPanel?: ReactNode;
  /** Mark accepted / job / invoice buttons for the Actions grid (2 columns). */
  bookingActions?: ReactNode;
  /** Customer defaults, falling back to the business defaults, for new payment terms. */
  paymentDefaults?: QuotePaymentDefaults;
  /** Offers copying studio designs in the duplicate dialog. */
  hasStudioDesigns?: boolean;
}) {
  const categoryOptions = useMemo(
    () => buildQuoteCategoryOptions(categories),
    [categories]
  );

  function optionsIncluding(value: string, label: string | null) {
    if (categoryOptions.some((option) => option.value === value)) {
      return categoryOptions;
    }
    return [
      ...categoryOptions,
      { value, label: label || quoteLineCategoryLabel({ category: value }) },
    ];
  }

  function unitOptionsIncluding(value: string) {
    const options = PRODUCT_UNIT_LABELS.map((unit) => ({
      value: unit as string,
      label: unit === "linear ft" ? "ft (linear)" : unit,
    }));
    return options.some((option) => option.value === value)
      ? options
      : [...options, { value, label: value }];
  }

  function labelForCategory(value: string) {
    return (
      categoryOptions.find((option) => option.value === value)?.label ??
      quoteLineCategoryLabel({ category: value })
    );
  }

  const eventPlanRef = sourceEventPlan
    ? formatEventPlanReference(sourceEventPlan.id, sourceEventPlan.reference)
    : null;
  const stickyRailRef = useStickyRail<HTMLElement>();
  const changeLog = useMemo(
    () =>
      [
        ...(quote.events ?? []).map((event) => ({ ...event, fileName: null as string | null })),
        ...fileActivity.map((item) => ({ ...item, fileName: item.file_name })),
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [quote.events, fileActivity]
  );
  const booked = quote.status === "accepted";
  const locked = isQuoteLocked(quote.status);
  const timeline = [
    { label: "Sent", at: quote.sent_at, by: null },
    { label: "Viewed", at: quote.viewed_at, by: null },
    { label: "Accepted", at: quote.accepted_at, by: quote.accepted_by_name },
    { label: "Declined", at: quote.declined_at, by: quote.declined_by_name },
  ].filter((row): row is { label: string; at: string; by: string | null } => Boolean(row.at));
  const router = useRouter();
  const { setDirty, clearDirty } = useOptionalUnsavedChanges();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState(quote.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(quote.customer_email ?? "");
  const [eventDate, setEventDate] = useState(toDateInput(quote.event_date));
  const [schedule, setSchedule] = useState<QuoteScheduleDraft>(() =>
    scheduleDraftFromQuote(quote)
  );
  const [eventType, setEventType] = useState(quote.event_type ?? "");
  const [venueName, setVenueName] = useState(quote.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(quote.venue_address ?? "");
  const [venueId, setVenueId] = useState<string | null>(quote.customer_venue_id ?? null);
  const [paymentTerms, setPaymentTerms] = useState<QuotePaymentTerms>(() =>
    quotePaymentTermsFrom(quote)
  );
  const [cityArea, setCityArea] = useState(quote.city_area ?? "");
  const [validUntil, setValidUntil] = useState(toDateInput(quote.valid_until));
  const [customerNotes, setCustomerNotes] = useState(quote.customer_notes ?? "");
  const [customerNotesTranslated, setCustomerNotesTranslated] = useState(
    quote.customer_notes_translated ?? ""
  );
  const [ownerNotes, setOwnerNotes] = useState(quote.owner_notes ?? "");
  const [terms, setTerms] = useState(quote.terms ?? "");
  const [termsTranslated, setTermsTranslated] = useState(quote.terms_translated ?? "");
  const [translating, setTranslating] = useState(false);
  const [language, setLanguage] = useState<CustomerLanguage>(
    normalizeCustomerLanguage(quote.language)
  );
  const [currency, setCurrency] = useState<CustomerCurrency>(
    quoteCurrency(quote.currency)
  );
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromQuote(quote));
  const [taxMode, setTaxMode] = useState<QuoteTaxMode>(
    quote.tax_mode || "quebec_gst_qst"
  );
  const [manualTaxLines, setManualTaxLines] = useState<DraftManualTaxLine[]>(
    () => manualTaxLinesFromQuote(quote)
  );

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendDialogKey, setSendDialogKey] = useState(0);
  const [revising, setRevising] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateKey, setDuplicateKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(initialGuestUrl);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [applyingDefaultTerms, setApplyingDefaultTerms] = useState(false);

  const [convertFor, setConvertFor] = useState<string | null>(null);
  const [convertCategory, setConvertCategory] = useState("custom");
  const [convertDescription, setConvertDescription] = useState("");
  const [convertQty, setConvertQty] = useState(1);
  const [convertPrice, setConvertPrice] = useState("0.00");
  const [requestBusy, setRequestBusy] = useState<string | null>(null);

  function resetFromQuote(source: QuoteWithRelations) {
    setCustomerName(source.customer_name ?? "");
    setCustomerEmail(source.customer_email ?? "");
    setEventDate(toDateInput(source.event_date));
    setSchedule(scheduleDraftFromQuote(source));
    setEventType(source.event_type ?? "");
    setVenueName(source.venue_name ?? "");
    setVenueAddress(source.venue_address ?? "");
    setVenueId(source.customer_venue_id ?? null);
    setPaymentTerms(quotePaymentTermsFrom(source));
    setCityArea(source.city_area ?? "");
    setValidUntil(toDateInput(source.valid_until));
    setCustomerNotes(source.customer_notes ?? "");
    setCustomerNotesTranslated(source.customer_notes_translated ?? "");
    setOwnerNotes(source.owner_notes ?? "");
    setTerms(source.terms ?? "");
    setTermsTranslated(source.terms_translated ?? "");
    setLanguage(normalizeCustomerLanguage(source.language));
    setCurrency(quoteCurrency(source.currency));
    setLines(linesFromQuote(source));
    setTaxMode(source.tax_mode || "quebec_gst_qst");
    setManualTaxLines(manualTaxLinesFromQuote(source));
  }

  // Sync when the server quote refreshes while viewing (never mid-edit).
  const quoteSyncKey = `${quote.id}|${quote.updated_at}|${isEditing}`;
  const [syncedQuoteKey, setSyncedQuoteKey] = useState(quoteSyncKey);
  if (syncedQuoteKey !== quoteSyncKey) {
    setSyncedQuoteKey(quoteSyncKey);
    if (!isEditing) resetFromQuote(quote);
  }

  const draftManualLines = useMemo(
    () => toStoredManualTaxLines(manualTaxLines),
    [manualTaxLines]
  );

  const draftTotals = useMemo(() => {
    const draftItems = lines.map((line) => ({
      status: line.status,
      line_total_cents: computeLineTotalCents(
        line.quantity,
        unitPriceDollarsToCents(line.unitPriceDollars)
      ),
      is_taxable: line.isTaxable,
    }));
    return computeQuoteTaxTotals(draftItems, {
      tax_mode: taxMode,
      gst_rate: quote.gst_rate,
      qst_rate: quote.qst_rate,
      manual_tax_lines: draftManualLines,
    });
  }, [lines, taxMode, draftManualLines, quote.gst_rate, quote.qst_rate]);

  const draftBreakdownQuote = useMemo(
    () => ({
      tax_mode: taxMode,
      subtotal_cents: draftTotals.subtotal_cents,
      taxable_subtotal_cents: draftTotals.taxable_subtotal_cents,
      nontaxable_subtotal_cents: draftTotals.nontaxable_subtotal_cents,
      gst_cents: draftTotals.gst_cents,
      qst_cents: draftTotals.qst_cents,
      gst_rate: Number(quote.gst_rate) || 0.05,
      qst_rate: Number(quote.qst_rate) || 0.09975,
      manual_tax_label: draftManualLines[0]?.label ?? null,
      manual_tax_cents: draftTotals.manual_tax_cents,
      manual_tax_lines: draftManualLines,
      total_cents: draftTotals.total_cents,
    }),
    [draftTotals, taxMode, draftManualLines, quote.gst_rate, quote.qst_rate]
  );

  useEffect(() => {
    setDirty(isEditing);
  }, [isEditing, setDirty]);

  useEffect(() => {
    return () => {
      clearDirty();
    };
  }, [clearDirty]);

  function flash(okMessage?: string, err?: string) {
    setError(err ?? null);
    if (okMessage) toast.success(okMessage);
    if (err) toast.error(err);
  }

  function startEditing() {
    flash();
    setIsEditing(true);
  }

  function cancelEditing() {
    resetFromQuote(quote);
    setIsEditing(false);
    flash();
    clearDirty();
  }

  function detailsPayload() {
    return {
      customer_name: customerName,
      customer_email: customerEmail,
      event_date: eventDate || null,
      ...scheduleDraftPayload(schedule),
      event_type: eventType,
      venue_name: venueName,
      venue_address: venueAddress,
      customer_venue_id: venueId,
      ...paymentTerms,
      city_area: cityArea,
      valid_until: validUntil || null,
      customer_notes: customerNotes,
      customer_notes_translated: customerNotesTranslated,
      owner_notes: ownerNotes,
      terms,
      terms_translated: termsTranslated,
      language,
      currency,
    };
  }

  function applySavedVenue(venue: CustomerVenueRow) {
    setVenueName(venue.name);
    setVenueAddress(formatVenueAddress(venue));
    setVenueId(venue.id);
    if (venue.city) setCityArea(venue.city);
  }

  function changeVenueName(value: string) {
    setVenueName(value);
    const linked = customer?.venues.find((v) => v.id === venueId);
    if (linked && linked.name !== value) setVenueId(null);
  }

  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);
  const otherLanguageLabel = language === "fr" ? "English" : "French";
  const missingTranslationCount =
    lines.filter((line) => line.description.trim() && !line.descriptionTranslated.trim()).length +
    (customerNotes.trim() && !customerNotesTranslated.trim() ? 1 : 0);

  async function fetchDefaultTerms(): Promise<Record<
    CustomerLanguage,
    string
  > | null> {
    const response = await fetch("/api/admin/document-texts");
    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      texts?: Array<{ slug: string; body: string }>;
    };
    if (!response.ok || !json.ok) {
      flash(undefined, json.message || "Could not load default terms.");
      return null;
    }
    const bodyFor = (lang: CustomerLanguage) =>
      json.texts?.find(
        (item) => item.slug === localizedDocumentTextSlug("quote.terms", lang)
      )?.body ?? "";
    return { en: bodyFor("en"), fr: bodyFor("fr") };
  }

  async function applyDefaultTerms() {
    setApplyingDefaultTerms(true);
    setError(null);
    try {
      const defaults = await fetchDefaultTerms();
      if (!defaults) return;
      if (!defaults[language]) {
        flash(undefined, "Default terms are not configured.");
        return;
      }
      setTerms(defaults[language]);
      setTermsTranslated("");
      toast.success("Default terms applied.");
    } catch {
      flash(undefined, "Could not load default terms.");
    } finally {
      setApplyingDefaultTerms(false);
    }
  }

  async function changeLanguage(next: CustomerLanguage) {
    if (next === language) return;
    const previous = language;
    setLanguage(next);
    // Text written in the new language moves into the main fields.
    setLines((prev) =>
      prev.map((line) =>
        line.descriptionTranslated.trim()
          ? { ...line, description: line.descriptionTranslated, descriptionTranslated: line.description }
          : line
      )
    );
    if (customerNotesTranslated.trim()) {
      setCustomerNotes(customerNotesTranslated);
      setCustomerNotesTranslated(customerNotes);
    }
    try {
      const defaults = await fetchDefaultTerms();
      const same = (a: string, b: string) =>
        splitQuoteTerms(a).join("\n") === splitQuoteTerms(b).join("\n");
      const isDefault = Boolean(defaults && (!terms.trim() || same(terms, defaults[previous])));
      if (isDefault && defaults?.[next]) {
        setTerms(defaults[next]);
        setTermsTranslated("");
      } else if (termsTranslated.trim()) {
        setTerms(termsTranslated);
        setTermsTranslated(terms);
      }
    } catch {
      // Keep current terms; owner can use "Use default terms".
    }
  }

  async function translateMissing() {
    setTranslating(true);
    flash();
    try {
      const result = await draftTranslation({
        from: language,
        lines: lines
          .filter((line) => line.description.trim() && !line.descriptionTranslated.trim())
          .map((line) => ({ key: line.key, text: line.description })),
        notes: customerNotes.trim() && !customerNotesTranslated.trim() ? customerNotes : null,
        terms: terms.trim() && !termsTranslated.trim() ? terms : null,
      });
      if (!result.ok) {
        flash(undefined, result.message);
        return;
      }
      if (result.engine === "none") {
        flash(`Nothing to translate — the ${otherLanguageLabel} version is complete.`);
        return;
      }
      const json = result.draft;
      const byKey = new Map(json.lines.map((line) => [line.key, line.text]));
      setLines((prev) =>
        prev.map((line) =>
          !line.descriptionTranslated.trim() && byKey.get(line.key)
            ? { ...line, descriptionTranslated: byKey.get(line.key)! }
            : line
        )
      );
      if (json.notes) setCustomerNotesTranslated((current) => current.trim() || json.notes!);
      if (json.terms) setTermsTranslated((current) => current.trim() || json.terms!);
      flash(`Draft ${otherLanguageLabel} added — review it before saving.`);
    } catch {
      flash(undefined, "Could not translate.");
    } finally {
      setTranslating(false);
    }
  }

  function lineItemsPayload() {
    return {
      items: lines.map((line, index) => ({
        id: line.id,
        category: line.category,
        category_label: line.categoryLabel,
        description: line.description,
        description_translated: line.descriptionTranslated,
        quantity: line.quantity,
        unit_label: line.unitLabel,
        unit_price_cents: unitPriceDollarsToCents(line.unitPriceDollars),
        status: line.status,
        customer_visible: true,
        is_taxable: line.isTaxable,
        tax_category: line.isTaxable ? "standard" : "exempt",
        sort_order: index,
        product_id: line.productId,
        image_url: line.imageUrl,
        image_alt: line.imageAlt,
      })),
      tax_mode: taxMode,
      manual_tax_lines: draftManualLines,
    };
  }

  async function saveAll() {
    setSaving(true);
    flash();
    try {
      const detailsResponse = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailsPayload()),
      });
      const detailsPayloadResult = (await detailsResponse.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!detailsResponse.ok || !detailsPayloadResult.ok) {
        flash(
          undefined,
          detailsPayloadResult.message ?? "Could not save quote details."
        );
        return;
      }

      const linesResponse = await fetch(
        `/api/admin/quotes/${quote.id}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lineItemsPayload()),
        }
      );
      const linesResult = (await linesResponse.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!linesResponse.ok || !linesResult.ok) {
        flash(
          undefined,
          linesResult.message ??
            "Customer & event details were saved, but line items and tax could not be saved. Fix and save again."
        );
        return;
      }

      const refreshed = await fetch(`/api/admin/quotes/${quote.id}`);
      const refreshedPayload = (await refreshed.json()) as {
        ok?: boolean;
        quote?: QuoteWithRelations;
      };
      if (refreshed.ok && refreshedPayload.quote) {
        resetFromQuote(refreshedPayload.quote);
      }
      setIsEditing(false);
      clearDirty();
      flash("Quote saved.");
      router.refresh();
    } catch {
      flash(undefined, "Could not save quote.");
    } finally {
      setSaving(false);
    }
  }

  function applyQuebecTaxToAll() {
    setTaxMode("quebec_gst_qst");
    setLines((prev) => prev.map((line) => ({ ...line, isTaxable: true })));
    flash("Quebec GST/QST applied to all line items. Save to persist.");
  }

  function markAllNonTaxable() {
    setLines((prev) => prev.map((line) => ({ ...line, isTaxable: false })));
    flash("All line items marked non-taxable. Save to persist.");
  }
  async function sendQuote() {
    if (isEditing) {
      flash(undefined, "Save or cancel edits before sending.");
      return;
    }
    if (!customerEmail.trim() && !quote.customer_email?.trim()) {
      flash(undefined, "Customer email is required before sending.");
      return;
    }
    setSendDialogKey((key) => key + 1);
    setSendDialogOpen(true);
  }

  async function createRevision() {
    setRevising(true);
    flash();
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/revision`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        quoteId?: string;
      };
      if (!response.ok || !payload.ok || !payload.quoteId) {
        flash(undefined, payload.message ?? "Could not create revision.");
        return;
      }
      flash("Revision draft created.");
      router.push(`/admin/quotes/${payload.quoteId}`);
    } catch {
      flash(undefined, "Could not create revision.");
    } finally {
      setRevising(false);
    }
  }

  async function reviewRequest(
    requestId: string,
    status: QuoteRequestStatus,
    convert?: boolean
  ) {
    setRequestBusy(requestId);
    flash();
    try {
      const body: Record<string, unknown> = { requestId, status };
      if (convert) {
        body.status = "converted_to_line_item";
        body.convertToLineItem = {
          category: convertCategory,
          category_label: labelForCategory(convertCategory),
          description: convertDescription,
          quantity: convertQty,
          unit_price_cents: unitPriceDollarsToCents(convertPrice),
        };
      }
      const response = await fetch(`/api/admin/quotes/${quote.id}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        flash(undefined, payload.message ?? "Could not update request.");
        return;
      }
      setConvertFor(null);
      flash(convert ? "Request added as a line item." : "Request updated.");
      router.refresh();
    } catch {
      flash(undefined, "Could not update request.");
    } finally {
      setRequestBusy(null);
    }
  }

  function moveLine(key: string, direction: -1 | 1) {
    setLines((prev) => {
      const from = prev.findIndex((line) => line.key === key);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;

        if (patch.category && patch.category !== line.category) {
          const nextCategory = patch.category;
          const shouldFill = shouldAutofillQuoteDescription(
            line.description,
            line.category
          );
          return {
            ...line,
            ...patch,
            category: nextCategory,
            description: shouldFill
              ? getQuoteCategoryDefaultDescription(nextCategory)
              : (patch.description ?? line.description),
          };
        }

        return { ...line, ...patch };
      })
    );
  }

  /** Typing a line total back-solves the unit price so the total is exact. */
  function setLineTotal(key: string, text: string) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const totalCents = Math.round(unitPriceDollarsToCents(text));
        if (!text.trim() || line.quantity <= 0) {
          return { ...line, lineTotalDraft: text };
        }
        return {
          ...line,
          lineTotalDraft: text,
          unitPriceDollars: unitPriceCentsToDollarInput(
            unitPriceCentsForLineTotal(totalCents, line.quantity)
          ),
        };
      })
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Quote builder"
        title={resolveQuoteDisplayRef(quote)}
        icon={FileText}
        backHref="/admin/quotes"
        backLabel="All quotes"
        meta={
          <>
            <span>{quote.opportunity_ref}</span>
            {(() => {
              const revLabel = formatQuoteRevisionLabel(quote.revision_number, {
                hideOriginal: true,
              });
              return revLabel ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{revLabel}</span>
                </>
              ) : null;
            })()}
            <QuoteStatusBadge status={quote.status} validUntil={quote.valid_until} />
            <CustomerLanguageBadge language={quote.language} />
            {sourceEventPlan && eventPlanRef ? (
              <span>
                From event plan{" "}
                <Link
                  href={`/admin/event-plans/${sourceEventPlan.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {eventPlanRef}
                </Link>
              </span>
            ) : quote.estimate_request_id ? (
              <span>
                From{" "}
                <Link
                  href={`/admin/estimates/${quote.estimate_request_id}`}
                  className="text-primary hover:underline"
                >
                  estimate
                </Link>
              </span>
            ) : null}
          </>
        }
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Total {currency}
              </p>
              <p className="mt-1 font-heading text-3xl font-semibold text-primary">
                {money(draftTotals.total_cents)}
              </p>
              {isEditing && draftTotals.total_cents !== quote.total_cents ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Saved: {formatMoneyFromCents(quote.total_cents, "en", quote.currency)} · unsaved changes
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEditing ? "Editing" : "Saved"}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void saveAll()}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Save quote
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="size-4" />
                    Preview as customer
                  </Button>
                  {locked ? (
                    <Button
                      type="button"
                      onClick={() => void createRevision()}
                      disabled={revising || quote.status === "superseded"}
                    >
                      {revising ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
                      Create revision
                    </Button>
                  ) : (
                    <Button type="button" onClick={startEditing}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        }
      />

      {locked ? (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.08] px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              {quote.status === "superseded" ? "Replaced" : "Accepted · locked"}
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {quote.status === "superseded"
                ? "A later revision replaced this version. It stays on file with its signature, if any."
                : "The signed agreement must match this quote, so it can't be edited. Create a revision — once the customer signs it, it replaces this version and the job moves over."}
            </p>
          </div>
        </section>
      ) : null}

      {sourceEventPlan && eventPlanRef ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/[0.08] px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Source
            </p>
            <p className="mt-1 text-sm text-foreground">
              Converted from event plan{" "}
              <span className="font-semibold text-primary">{eventPlanRef}</span>
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/admin/event-plans/${sourceEventPlan.id}`}>
              Open {eventPlanRef}
            </Link>
          </Button>
        </section>
      ) : null}

      {error && (
        <div
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Customer & event</h2>
        </div>
        {isEditing && customer ? (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label>Quote contact</Label>
              <Link
                href={`/admin/customers/${customer.id}`}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {customer.contactOptions.length > 1 ? "Manage contacts" : "Add contacts on the customer profile"}
              </Link>
            </div>
            {customer.contactOptions.length > 1 ? (
              <div className="@container">
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
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Name</Label>
            <Input
              id="customer_name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_email">Email</Label>
            <Input
              id="customer_email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_type">Event type</Label>
            <EventTypeInput
              id="event_type"
              value={eventType}
              onChange={setEventType}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue_name">Venue</Label>
            <Input
              id="venue_name"
              value={venueName}
              onChange={(e) => changeVenueName(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city_area">City / area</Label>
            <Input
              id="city_area"
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid until</Label>
            <DateInput
              id="valid_until"
              value={validUntil}
              onChange={setValidUntil}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="venue_address">Venue address</Label>
            <Input
              id="venue_address"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Street, city, province, postal code — shown on the proposal and PDF"
              maxLength={400}
              disabled={!isEditing}
            />
          </div>
        </div>

        {isEditing && customer?.venues.length ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Saved venues for {customer.display_name}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {customer.venues.map((venue) => {
                const active = venue.id === venueId;
                return (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => applySavedVenue(venue)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3 text-left text-sm transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/40 bg-card/40 hover:border-primary/30"
                    )}
                  >
                    <Building className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{venue.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatVenueAddress(venue) || "No address"}
                      </span>
                    </span>
                    {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <QuoteScheduleFields
          eventDate={eventDate}
          onEventDateChange={setEventDate}
          draft={schedule}
          onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
          disabled={!isEditing}
        />

        <div className="mt-4 rounded-2xl border border-border/40 bg-background/30 p-4">
          <Label>Currency & language</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Applies to the proposal, PDF, and email. Currency carries over to
            the job and its invoices; default terms follow the language unless
            you edited them.
          </p>
          <div className="@container mt-3">
            <div className="grid gap-4 @[34rem]:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Currency
                  {customer ? (
                    <span className="normal-case tracking-normal">
                      {" "}· customer default {customer.currency}
                    </span>
                  ) : null}
                </p>
                <CustomerCurrencyPicker
                  value={currency}
                  onChange={setCurrency}
                  disabled={!isEditing}
                  customerDefault={customer?.currency ?? null}
                  compact
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Language
                </p>
                <CustomerLanguagePicker
                  value={language}
                  onChange={(next) => void changeLanguage(next)}
                  disabled={!isEditing}
                  compact
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Languages className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {otherLanguageLabel} version
                  {missingTranslationCount > 0 ? (
                    <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      {missingTranslationCount} missing
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Ready
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Needed only when sending French + English (Québec customers).
                  Standard terms translate automatically.
                </p>
              </div>
            </div>
            {isEditing ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void translateMissing()}
                disabled={translating}
              >
                {translating ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
                {translating ? "Translating…" : "Translate missing"}
              </Button>
            ) : null}
          </div>
          {customer && customer.currency !== currency ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              {customer.display_name} is billed in {customer.currency} by default.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Line items</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unit prices in {currency} dollars. Includes teardown when needed for
              event close-out.
            </p>
          </div>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInventoryOpen(true)}
              >
                <Package className="size-4" />
                Add from inventory
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLogisticsOpen(true)}
              >
                <Truck className="size-4" />
                Add installation / transport
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((prev) => [...prev, emptyLine(categoryOptions[0])])
                }
              >
                <Plus className="size-4" />
                Add row
              </Button>
            </div>
          ) : null}
        </div>

        <AdminInventoryPickerDialog
          open={inventoryOpen}
          onOpenChange={setInventoryOpen}
          onPick={(item) =>
            setLines((prev) => [...prev, lineFromInventory(item)])
          }
        />
        <AdminLogisticsServiceDialog
          open={logisticsOpen}
          onOpenChange={setLogisticsOpen}
          onPick={(item) =>
            setLines((prev) => [...prev, lineFromLogistics(item)])
          }
        />

        {lines.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {isEditing
              ? "No line items yet. Add from inventory or add a blank row."
              : "No line items yet."}
          </p>
        ) : (
          <QuoteLineReorderGroup
            as="div"
            axis="y"
            values={lines}
            onReorder={setLines}
            className="mt-4 space-y-3"
          >
            {lines.map((line) => {
              const lineTotal = computeLineTotalCents(
                line.quantity,
                unitPriceDollarsToCents(line.unitPriceDollars)
              );
              return (
                <QuoteLineReorderItem
                  key={line.key}
                  value={line}
                  enabled={isEditing && lines.length > 1}
                  label={line.description || "line item"}
                  onMove={(direction) => moveLine(line.key, direction)}
                  className="rounded-2xl border border-border/40 bg-background/40 p-4 backdrop-blur-md"
                >
                <div className="grid grid-cols-1 gap-3 @min-[30rem]:grid-cols-[56px_repeat(4,minmax(0,1fr))] @min-[60rem]:grid-cols-[56px_170px_minmax(0,1fr)_168px_112px_116px_96px_120px] @min-[60rem]:items-end">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30 @min-[30rem]:row-span-2 @min-[60rem]:row-span-1">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.imageAlt || line.description}
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1.5 @min-[30rem]:col-span-2 @min-[60rem]:col-span-1">
                    <Label className="text-xs text-muted-foreground">
                      Category
                    </Label>
                    <SelectInput
                      value={line.category}
                      disabled={!isEditing}
                      onChange={(next) =>
                        updateLine(line.key, {
                          category: next,
                          categoryLabel: labelForCategory(next),
                        })
                      }
                      options={optionsIncluding(
                        line.category,
                        line.categoryLabel
                      )}
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5 @min-[30rem]:col-span-2 @min-[60rem]:col-span-1">
                    <Label className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <Input
                      value={line.description}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, { description: e.target.value })
                      }
                      placeholder="What is included"
                    />
                    <Input
                      value={line.descriptionTranslated}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, { descriptionTranslated: e.target.value })
                      }
                      aria-label={`${otherLanguageLabel} description`}
                      placeholder={language === "fr" ? "English version" : "Version française"}
                      className={cn(
                        "h-8 text-xs",
                        line.description.trim() && !line.descriptionTranslated.trim()
                          ? "border-amber-500/50"
                          : "border-border/40"
                      )}
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5 @min-[30rem]:col-span-2 @min-[60rem]:col-span-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={line.quantity}
                        disabled={!isEditing}
                        className="w-16 shrink-0"
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: Number(e.target.value) || 0,
                            lineTotalDraft: undefined,
                          })
                        }
                      />
                      <SelectInput
                        aria-label="Unit"
                        value={line.unitLabel}
                        disabled={!isEditing}
                        className="min-w-0 flex-1"
                        onChange={(next) =>
                          updateLine(line.key, { unitLabel: next })
                        }
                        options={unitOptionsIncluding(line.unitLabel)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {currency} {formatQuoteUnitSuffix(line.unitLabel)}
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={line.unitPriceDollars}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, {
                          unitPriceDollars: e.target.value,
                          lineTotalDraft: undefined,
                        })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <SelectInput
                      value={line.status}
                      disabled={!isEditing}
                      onChange={(next) =>
                        updateLine(line.key, {
                          status: next as QuoteLineStatus,
                        })
                      }
                      options={QUOTE_LINE_STATUSES.map((status) => ({
                        value: status,
                        label: QUOTE_LINE_STATUS_LABELS[status],
                      }))}
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5 @min-[30rem]:col-span-2 @min-[60rem]:col-span-1">
                    <Label className="text-xs text-muted-foreground">Tax</Label>
                    <label className="flex h-8 items-center gap-2 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-border accent-primary"
                        checked={line.isTaxable}
                        disabled={!isEditing}
                        onChange={(e) =>
                          updateLine(line.key, {
                            isTaxable: e.target.checked,
                          })
                        }
                      />
                      <span className="truncate text-xs text-foreground">
                        {line.isTaxable ? "Taxable" : "Non-tax"}
                      </span>
                    </label>
                  </div>
                  <div className="flex min-w-0 items-end justify-between gap-2 @min-[30rem]:col-span-3 @min-[60rem]:col-span-1 @min-[60rem]:flex-col @min-[60rem]:items-end @min-[60rem]:justify-end">
                    {line.status === "included" ||
                    isZeroPricedQuoteLine({
                      status: line.status,
                      unit_price_cents: unitPriceDollarsToCents(line.unitPriceDollars),
                    }) ? (
                      <p
                        className="w-full text-right text-sm font-medium text-primary"
                        title="$0 lines show as Included / Inclus to the customer"
                      >
                        Included
                      </p>
                    ) : isEditing ? (
                      <div className="w-full min-w-0 space-y-1.5">
                        <Label
                          htmlFor={`line-total-${line.key}`}
                          className="justify-end text-xs text-muted-foreground"
                        >
                          Line total
                        </Label>
                        <Input
                          id={`line-total-${line.key}`}
                          inputMode="decimal"
                          value={
                            line.lineTotalDraft ?? (lineTotal / 100).toFixed(2)
                          }
                          title="Type a total — the unit price is worked out so the total is exact"
                          className="text-right font-medium tabular-nums"
                          onChange={(e) => setLineTotal(line.key, e.target.value)}
                          onBlur={() =>
                            updateLine(line.key, { lineTotalDraft: undefined })
                          }
                        />
                      </div>
                    ) : (
                      <p className="w-full text-right text-sm font-medium tabular-nums">
                        {money(lineTotal)}
                      </p>
                    )}
                    {isEditing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((row) => row.key !== line.key)
                          )
                        }
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : (
                      <span className="hidden h-8 @min-[60rem]:block" aria-hidden />
                    )}
                  </div>
                </div>
                </QuoteLineReorderItem>
              );
            })}
          </QuoteLineReorderGroup>
        )}
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Tax</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {taxMode === "manual"
                ? `Manual percentage lines on taxable line items. ${currency}.`
                : taxMode === "quebec_gst_qst"
                  ? `Quebec GST 5% + QST 9.975% on taxable line items. ${currency}.`
                  : `No tax applied. ${currency}.`}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_mode">Tax mode</Label>
              <SelectInput
                id="tax_mode"
                value={taxMode}
                disabled={!isEditing}
                onChange={(next) => setTaxMode(next as QuoteTaxMode)}
                options={QUOTE_TAX_MODES.map((mode) => ({
                  value: mode,
                  label: QUOTE_TAX_MODE_LABELS[mode],
                }))}
              />
            </div>

            {customer?.tax_exempt && taxMode !== "none" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <span>{customer.display_name} is marked tax exempt on their profile.</span>
                {isEditing ? (
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setTaxMode("none")}
                  >
                    Set to no tax
                  </button>
                ) : null}
              </div>
            ) : null}

            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyQuebecTaxToAll}
                >
                  Apply Quebec GST/QST to all line items
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={markAllNonTaxable}
                >
                  Mark all non-taxable
                </Button>
              </div>
            ) : null}

            {taxMode === "manual" ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Each line is a percentage of the taxable subtotal.
                </p>
                {manualTaxLines.map((line) => (
                  <div
                    key={line.key}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_110px_auto]"
                  >
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Tax label
                      </Label>
                      <Input
                        value={line.label}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setManualTaxLines((prev) =>
                            prev.map((row) =>
                              row.key === line.key
                                ? { ...row, label: e.target.value }
                                : row
                            )
                          )
                        }
                        placeholder="Sales tax"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Rate %
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={line.ratePercent}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setManualTaxLines((prev) =>
                            prev.map((row) =>
                              row.key === line.key
                                ? { ...row, ratePercent: e.target.value }
                                : row
                            )
                          )
                        }
                        placeholder="13"
                      />
                    </div>
                    {isEditing ? (
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove tax line"
                          disabled={manualTaxLines.length <= 1}
                          onClick={() =>
                            setManualTaxLines((prev) =>
                              prev.length <= 1
                                ? prev
                                : prev.filter((row) => row.key !== line.key)
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                ))}
                {isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setManualTaxLines((prev) => [
                        ...prev,
                        emptyManualTaxLine(),
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    Add tax line
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Totals preview
            </p>
            <QuoteTaxBreakdown quote={draftBreakdownQuote} variant="admin" currency={currency} />
          </div>
        </div>
        <QuotePaymentTermsFields
          value={paymentTerms}
          onChange={setPaymentTerms}
          defaults={paymentDefaults}
          totalCents={draftTotals.total_cents}
          eventDate={eventDate || null}
          validUntil={validUntil || null}
          currency={currency}
          disabled={!isEditing}
        />
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Customer requests</h2>
        <div className="mt-4 space-y-3">
          {(quote.requests || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No customer requests yet.</p>
          ) : (
            quote.requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-border/40 bg-background/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{req.title}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {req.request_type.replaceAll("_", " ")} ·{" "}
                      {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <QuoteRequestStatusBadge status={req.status} />
                </div>
                {req.message ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {req.message}
                  </p>
                ) : null}
                {req.owner_response ? (
                  <p className="mt-2 text-sm text-foreground">
                    Owner response: {req.owner_response}
                  </p>
                ) : null}

                {req.status === "pending_owner_review" ||
                req.status === "needs_info" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={requestBusy === req.id}
                      onClick={() =>
                        void reviewRequest(req.id, "approved")
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={requestBusy === req.id}
                      onClick={() =>
                        void reviewRequest(req.id, "declined")
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={requestBusy === req.id}
                      onClick={() =>
                        void reviewRequest(req.id, "needs_info")
                      }
                    >
                      Needs info
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConvertFor(req.id);
                        setConvertDescription(req.title);
                        setConvertCategory("custom");
                        setConvertQty(1);
                        setConvertPrice("0.00");
                      }}
                    >
                      Convert to line item
                    </Button>
                  </div>
                ) : null}

                {convertFor === req.id ? (
                  <div className="mt-3 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <SelectInput
                        value={convertCategory}
                        onChange={(category) => {
                          setConvertCategory(category);
                          setConvertDescription((prev) =>
                            shouldAutofillQuoteDescription(prev, convertCategory)
                              ? getQuoteCategoryDefaultDescription(category)
                              : prev
                          );
                        }}
                        options={optionsIncluding(convertCategory, null)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={convertDescription}
                        onChange={(e) =>
                          setConvertDescription(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        value={convertQty}
                        onChange={(e) =>
                          setConvertQty(Number(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit {currency}</Label>
                      <Input
                        value={convertPrice}
                        onChange={(e) => setConvertPrice(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
                      <Button
                        type="button"
                        size="sm"
                        disabled={requestBusy === req.id}
                        onClick={() =>
                          void reviewRequest(
                            req.id,
                            "converted_to_line_item",
                            true
                          )
                        }
                      >
                        {requestBusy === req.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Confirm convert
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConvertFor(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Notes & terms</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Customer notes and terms appear on the proposal and PDF. Owner notes
          stay internal.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_notes">Customer notes</Label>
            <Textarea
              id="customer_notes"
              rows={4}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              disabled={!isEditing}
            />
            {customerNotes.trim() || customerNotesTranslated.trim() ? (
              <>
                <Label htmlFor="customer_notes_translated" className="text-xs text-muted-foreground">
                  Customer notes · {otherLanguageLabel}
                </Label>
                <Textarea
                  id="customer_notes_translated"
                  rows={3}
                  value={customerNotesTranslated}
                  onChange={(e) => setCustomerNotesTranslated(e.target.value)}
                  disabled={!isEditing}
                  className={cn(
                    customerNotes.trim() && !customerNotesTranslated.trim() ? "border-amber-500/50" : undefined
                  )}
                />
              </>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_notes">Owner notes</Label>
            <Textarea
              id="owner_notes"
              rows={4}
              value={ownerNotes}
              onChange={(e) => setOwnerNotes(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-background/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label htmlFor="terms">Terms & conditions</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                One term per line — same numbered list as the PDF.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DocumentTextPreviewButton
                kind="pdf_terms"
                label="Terms & conditions"
                body={terms}
              />
              {isEditing ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  onClick={() => void applyDefaultTerms()}
                  disabled={applyingDefaultTerms}
                >
                  {applyingDefaultTerms ? "Loading…" : "Use default terms"}
                </button>
              ) : (
                <Link
                  href="/admin/documents"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Edit defaults
                </Link>
              )}
            </div>
          </div>
          {isEditing ? (
            <Textarea
              id="terms"
              rows={8}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="min-h-32 resize-y"
            />
          ) : null}
          <QuoteTermsList terms={terms} />
          {isEditing || termsTranslated.trim() ? (
            <div className="space-y-2 border-t border-border/40 pt-3">
              <Label htmlFor="terms_translated" className="text-xs text-muted-foreground">
                Custom terms · {otherLanguageLabel} — leave empty when using the
                default terms
              </Label>
              <Textarea
                id="terms_translated"
                rows={5}
                value={termsTranslated}
                onChange={(e) => setTermsTranslated(e.target.value)}
                disabled={!isEditing}
                className="min-h-24 resize-y"
              />
            </div>
          ) : null}
        </div>
      </section>
      </div>

      <aside
        ref={stickyRailRef}
        className="min-w-0 space-y-4 xl:sticky"
      >
        <QuoteGuestProposalCard
          ensureEndpoint={`/api/admin/quotes/${quote.id}/guest-link`}
          initialUrl={publicUrl}
        />

        {customer ? (
          <QuoteCustomerCard
            customer={customer}
            contactName={customerName}
            contactEmail={customerEmail}
          />
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold">Quote summary</h2>
            <QuoteStatusBadge status={quote.status} validUntil={quote.valid_until} />
          </div>
          <div className="mt-3 rounded-2xl border border-border/40 bg-background/40 p-3">
            <QuoteTaxBreakdown quote={draftBreakdownQuote} variant="admin" currency={currency} />
          </div>
          {timeline.length > 0 ? (
            <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {timeline.map((row) => (
                <div key={row.label} className="flex justify-between gap-2">
                  <dt>{row.label}</dt>
                  <dd className="text-right font-medium text-foreground">
                    {new Date(row.at).toLocaleString()}
                    {row.by ? (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        by {row.by}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {(sourceEventPlan && eventPlanRef) || quote.estimate_request_id ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {sourceEventPlan && eventPlanRef ? (
                <Button asChild variant="outline" size="sm" className="min-w-0">
                  <Link href={`/admin/event-plans/${sourceEventPlan.id}`}>
                    <span className="truncate">Plan {eventPlanRef}</span>
                  </Link>
                </Button>
              ) : null}
              {quote.estimate_request_id ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn("min-w-0", !(sourceEventPlan && eventPlanRef) && "col-span-2")}
                >
                  <Link href={`/admin/estimates/${quote.estimate_request_id}`}>
                    Linked estimate
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        {engagementPanel}

        <section className="rounded-2xl border border-border/40 bg-card/25 p-4">
          <h2 className="font-heading text-lg font-semibold">Actions</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {booked ? <Fragment key="booking">{bookingActions}</Fragment> : null}
            {locked ? null : (
              <Button
                type="button"
                className="col-span-2"
                onClick={() => void sendQuote()}
              >
                <Send className="size-4" />
                Send quote
              </Button>
            )}
            {booked ? null : <Fragment key="booking">{bookingActions}</Fragment>}
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              Preview
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="size-4" />
                PDF
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  flash(undefined, "Save or cancel edits before duplicating.");
                  return;
                }
                setDuplicateKey((key) => key + 1);
                setDuplicateOpen(true);
              }}
            >
              <Copy className="size-4" />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void createRevision()}
              disabled={revising || quote.status === "superseded"}
            >
              {revising ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
              Create revision
            </Button>
          </div>
        </section>

        {studioPanel}

        {quote.estimate_request_id ? (
          <OpportunityFilesPanel
            estimateRequestId={quote.estimate_request_id}
            files={opportunityFiles}
            deletedFiles={deletedOpportunityFiles}
            audience="admin"
            title="Opportunity files"
          />
        ) : null}

        <details className="group rounded-2xl border border-border/40 bg-card/25">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-heading text-lg font-semibold">Change log</span>
                <span className="rounded-full border border-border/50 bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {changeLog.length}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {changeLog[0]
                  ? `Latest: ${changeLog[0].summary} · ${new Date(changeLog[0].created_at).toLocaleDateString()}`
                  : "Admin only · no events yet"}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ul className="max-h-80 space-y-2 overflow-y-auto px-4 pb-4">
            {changeLog.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl border border-border/30 bg-background/30 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{event.summary}</p>
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                </div>
                {event.fileName ? (
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-foreground/80">
                    <FileText className="size-3 shrink-0 text-primary" aria-hidden />
                    <span className="truncate" title={event.fileName}>
                      {event.fileName}
                    </span>
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.actor_type}
                  {event.actor_email ? ` · ${event.actor_email}` : ""}
                  {" · "}
                  {event.event_type.replaceAll("_", " ")}
                </p>
              </li>
            ))}
          </ul>
        </details>
      </aside>
      </div>
      <AdminFloatingSaveButton
        active={isEditing}
        saving={saving}
        label="Save quote"
        onSave={() => void saveAll()}
      />
      <AdminQuotePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        quote={quote}
        publicUrl={publicUrl}
        hasUnsavedChanges={isEditing}
        onSend={() => void sendQuote()}
      />
      {duplicateOpen ? (
        <AdminQuoteDuplicateDialog
          key={duplicateKey}
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
          quote={quote}
          customer={customer}
          opportunityFiles={opportunityFiles}
          hasStudioDesigns={hasStudioDesigns}
        />
      ) : null}
      {sendDialogOpen ? (
        <AdminQuoteSendDialog
          key={sendDialogKey}
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          quote={quote}
          opportunityFiles={opportunityFiles}
          publicQuoteUrlPreview={publicUrl}
          defaultCc={defaultCc}
          contacts={customer?.contactOptions ?? []}
          onSent={(result) => {
            if (result.publicUrl) setPublicUrl(result.publicUrl);
            if (result.emailSent === false) {
              flash(undefined, result.message ?? "Email failed to send.");
            } else {
              flash(result.to ? `Quote sent to ${result.to}.` : (result.message ?? "Quote sent."));
            }
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
