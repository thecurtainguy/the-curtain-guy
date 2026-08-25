"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  QUOTE_CATEGORY_LABELS,
  QUOTE_LINE_CATEGORIES,
  QUOTE_LINE_STATUS_LABELS,
  QUOTE_LINE_STATUSES,
  QUOTE_TAX_MODE_LABELS,
  QUOTE_TAX_MODES,
  computeLineTotalCents,
  computeQuoteTaxTotals,
  formatCadFromCents,
  formatQuoteRevisionLabel,
  resolveQuoteDisplayRef,
  type QuoteLineCategory,
  type QuoteLineStatus,
  type QuoteRequestStatus,
  type QuoteTaxMode,
} from "@/data/quotes";
import {
  QuoteRequestStatusBadge,
  QuoteStatusBadge,
} from "@/components/quotes/quote-status-badge";
import { QuoteTaxBreakdown } from "@/components/quotes/quote-tax-breakdown";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { QuoteGuestProposalCard } from "@/components/quotes/quote-guest-proposal-card";
import {
  OpportunityFilesPanel,
  type OpportunityFileItem,
} from "@/components/estimates/opportunity-files-panel";
import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import type { QuoteWithRelations } from "@/lib/quotes";
import {
  centsToDollarInput,
  dollarsToCents,
} from "@/lib/quote-tokens";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { EventTypeInput } from "@/components/ui/event-type-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-70";

type DraftLine = {
  key: string;
  id?: string;
  category: QuoteLineCategory;
  description: string;
  quantity: number;
  unitPriceDollars: string;
  status: QuoteLineStatus;
  isTaxable: boolean;
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
    description: item.description,
    quantity: item.quantity,
    unitPriceDollars: centsToDollarInput(item.unit_price_cents),
    status: item.status,
    isTaxable: item.is_taxable !== false,
  }));
}

function emptyLine(): DraftLine {
  return {
    key: `new-${crypto.randomUUID()}`,
    category: "drape_rental",
    description: "",
    quantity: 1,
    unitPriceDollars: "0.00",
    status: "priced",
    isTaxable: true,
  };
}

export function AdminQuoteBuilder({
  quote,
  initialGuestUrl = null,
  opportunityFiles = [],
}: {
  quote: QuoteWithRelations;
  initialGuestUrl?: string | null;
  opportunityFiles?: OpportunityFileItem[];
}) {
  const router = useRouter();
  const { setDirty, clearDirty } = useOptionalUnsavedChanges();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState(quote.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(quote.customer_email ?? "");
  const [eventDate, setEventDate] = useState(toDateInput(quote.event_date));
  const [eventType, setEventType] = useState(quote.event_type ?? "");
  const [venueName, setVenueName] = useState(quote.venue_name ?? "");
  const [cityArea, setCityArea] = useState(quote.city_area ?? "");
  const [validUntil, setValidUntil] = useState(toDateInput(quote.valid_until));
  const [customerNotes, setCustomerNotes] = useState(quote.customer_notes ?? "");
  const [ownerNotes, setOwnerNotes] = useState(quote.owner_notes ?? "");
  const [terms, setTerms] = useState(quote.terms ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromQuote(quote));
  const [taxMode, setTaxMode] = useState<QuoteTaxMode>(
    quote.tax_mode || "quebec_gst_qst"
  );
  const [manualTaxLabel, setManualTaxLabel] = useState(
    quote.manual_tax_label ?? "Sales tax"
  );
  const [manualTaxDollars, setManualTaxDollars] = useState(
    centsToDollarInput(quote.manual_tax_cents || 0)
  );

  const [sending, setSending] = useState(false);
  const [revising, setRevising] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(initialGuestUrl);
  const [copied, setCopied] = useState(false);

  const [convertFor, setConvertFor] = useState<string | null>(null);
  const [convertCategory, setConvertCategory] =
    useState<QuoteLineCategory>("custom");
  const [convertDescription, setConvertDescription] = useState("");
  const [convertQty, setConvertQty] = useState(1);
  const [convertPrice, setConvertPrice] = useState("0.00");
  const [requestBusy, setRequestBusy] = useState<string | null>(null);

  function resetFromQuote(source: QuoteWithRelations) {
    setCustomerName(source.customer_name ?? "");
    setCustomerEmail(source.customer_email ?? "");
    setEventDate(toDateInput(source.event_date));
    setEventType(source.event_type ?? "");
    setVenueName(source.venue_name ?? "");
    setCityArea(source.city_area ?? "");
    setValidUntil(toDateInput(source.valid_until));
    setCustomerNotes(source.customer_notes ?? "");
    setOwnerNotes(source.owner_notes ?? "");
    setTerms(source.terms ?? "");
    setLines(linesFromQuote(source));
    setTaxMode(source.tax_mode || "quebec_gst_qst");
    setManualTaxLabel(source.manual_tax_label ?? "Sales tax");
    setManualTaxDollars(centsToDollarInput(source.manual_tax_cents || 0));
  }

  useEffect(() => {
    if (!isEditing) {
      resetFromQuote(quote);
    }
    // Sync when server quote refreshes while viewing
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when quote identity/content updates outside edit
  }, [quote.id, quote.updated_at, isEditing]);

  const draftTotals = useMemo(() => {
    const draftItems = lines.map((line) => ({
      status: line.status,
      line_total_cents: computeLineTotalCents(
        line.quantity,
        dollarsToCents(line.unitPriceDollars)
      ),
      is_taxable: line.isTaxable,
    }));
    return computeQuoteTaxTotals(draftItems, {
      tax_mode: taxMode,
      gst_rate: quote.gst_rate,
      qst_rate: quote.qst_rate,
      manual_tax_cents: dollarsToCents(manualTaxDollars),
    });
  }, [lines, taxMode, manualTaxDollars, quote.gst_rate, quote.qst_rate]);

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
      manual_tax_label: manualTaxLabel,
      manual_tax_cents:
        taxMode === "manual"
          ? draftTotals.manual_tax_cents
          : dollarsToCents(manualTaxDollars),
      total_cents: draftTotals.total_cents,
    }),
    [draftTotals, taxMode, manualTaxLabel, manualTaxDollars, quote.gst_rate, quote.qst_rate]
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
    setMessage(okMessage ?? null);
    setError(err ?? null);
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
      event_type: eventType,
      venue_name: venueName,
      city_area: cityArea,
      valid_until: validUntil || null,
      customer_notes: customerNotes,
      owner_notes: ownerNotes,
      terms,
    };
  }

  function lineItemsPayload() {
    return {
      items: lines.map((line, index) => ({
        id: line.id,
        category: line.category,
        description: line.description,
        quantity: line.quantity,
        unit_price_cents: dollarsToCents(line.unitPriceDollars),
        status: line.status,
        customer_visible: true,
        is_taxable: line.isTaxable,
        tax_category: line.isTaxable ? "standard" : "exempt",
        sort_order: index,
      })),
      tax_mode: taxMode,
      manual_tax_label: manualTaxLabel,
      manual_tax_cents: dollarsToCents(manualTaxDollars),
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
    setSending(true);
    flash();
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/send`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        publicUrl?: string;
      };
      if (!response.ok || !payload.ok) {
        flash(undefined, payload.message ?? "Could not send quote.");
        return;
      }
      if (payload.publicUrl) setPublicUrl(payload.publicUrl);
      flash(payload.message ?? "Quote sent.");
      router.refresh();
    } catch {
      flash(undefined, "Could not send quote.");
    } finally {
      setSending(false);
    }
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
      router.push(`/admin/quotes/${payload.quoteId}`);
    } catch {
      flash(undefined, "Could not create revision.");
    } finally {
      setRevising(false);
    }
  }

  async function copyPublicUrl() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      flash(undefined, "Could not copy link.");
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
          description: convertDescription,
          quantity: convertQty,
          unit_price_cents: dollarsToCents(convertPrice),
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
      flash("Request updated.");
      router.refresh();
    } catch {
      flash(undefined, "Could not update request.");
    } finally {
      setRequestBusy(null);
    }
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
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
            <QuoteStatusBadge status={quote.status} />
            {quote.estimate_request_id ? (
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
                Total CAD
              </p>
              <p className="mt-1 font-heading text-3xl font-semibold text-primary">
                {formatCadFromCents(draftTotals.total_cents)}
              </p>
              {isEditing && draftTotals.total_cents !== quote.total_cents ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Saved: {formatCadFromCents(quote.total_cents)} · unsaved changes
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
                <Button type="button" onClick={startEditing}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        }
      />

      {(message || error) && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Customer & event</h2>
        </div>
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
            <Label htmlFor="event_date">Event date</Label>
            <DateInput
              id="event_date"
              value={eventDate}
              onChange={setEventDate}
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
              onChange={(e) => setVenueName(e.target.value)}
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
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="customer_notes">Customer notes</Label>
            <Textarea
              id="customer_notes"
              rows={4}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              disabled={!isEditing}
            />
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
          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <Textarea
              id="terms"
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Line items</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unit prices in CAD dollars. Includes teardown when needed for
              event close-out.
            </p>
          </div>
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="size-4" />
              Add row
            </Button>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {lines.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/40 px-4 py-8 text-center text-sm text-muted-foreground">
              {isEditing
                ? "No line items yet. Add a row to start pricing."
                : "No line items yet."}
            </p>
          ) : (
            lines.map((line) => {
              const lineTotal = computeLineTotalCents(
                line.quantity,
                dollarsToCents(line.unitPriceDollars)
              );
              return (
                <div
                  key={line.key}
                  className="grid gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 xl:grid-cols-[minmax(140px,0.9fr)_minmax(0,1.8fr)_72px_100px_minmax(110px,0.9fr)_120px_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Category
                    </Label>
                    <select
                      className={selectClass}
                      value={line.category}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, {
                          category: e.target.value as QuoteLineCategory,
                        })
                      }
                    >
                      {QUOTE_LINE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {QUOTE_CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
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
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={line.quantity}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Unit CAD
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={line.unitPriceDollars}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, {
                          unitPriceDollars: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <select
                      className={selectClass}
                      value={line.status}
                      disabled={!isEditing}
                      onChange={(e) =>
                        updateLine(line.key, {
                          status: e.target.value as QuoteLineStatus,
                        })
                      }
                    >
                      {QUOTE_LINE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {QUOTE_LINE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tax</Label>
                    <label className="flex h-8 items-center gap-2 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border accent-primary"
                        checked={line.isTaxable}
                        disabled={!isEditing}
                        onChange={(e) =>
                          updateLine(line.key, {
                            isTaxable: e.target.checked,
                          })
                        }
                      />
                      <span className="text-xs text-foreground">
                        {line.isTaxable ? "Taxable" : "Non-taxable"}
                      </span>
                    </label>
                  </div>
                  <div className="flex items-end justify-between gap-3 lg:flex-col lg:items-end">
                    <p className="text-sm font-medium tabular-nums">
                      {formatCadFromCents(lineTotal)}
                    </p>
                    {isEditing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((row) => row.key !== line.key)
                          )
                        }
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Tax</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Quebec GST 5% + QST 9.975% on taxable line items. CAD.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_mode">Tax mode</Label>
              <select
                id="tax_mode"
                className={selectClass}
                value={taxMode}
                disabled={!isEditing}
                onChange={(e) =>
                  setTaxMode(e.target.value as QuoteTaxMode)
                }
              >
                {QUOTE_TAX_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {QUOTE_TAX_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>

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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual_tax_label">Manual tax label</Label>
                  <Input
                    id="manual_tax_label"
                    value={manualTaxLabel}
                    disabled={!isEditing}
                    onChange={(e) => setManualTaxLabel(e.target.value)}
                    placeholder="Sales tax"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual_tax_amount">Manual tax CAD</Label>
                  <Input
                    id="manual_tax_amount"
                    inputMode="decimal"
                    value={manualTaxDollars}
                    disabled={!isEditing}
                    onChange={(e) => setManualTaxDollars(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Totals preview
            </p>
            <QuoteTaxBreakdown quote={draftBreakdownQuote} variant="admin" />
          </div>
        </div>
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
                      <select
                        className={selectClass}
                        value={convertCategory}
                        onChange={(e) =>
                          setConvertCategory(
                            e.target.value as QuoteLineCategory
                          )
                        }
                      >
                        {QUOTE_LINE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {QUOTE_CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>
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
                      <Label className="text-xs">Unit CAD</Label>
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
      </div>

      <aside className="space-y-6 xl:sticky xl:top-4">
      <QuoteGuestProposalCard
        ensureEndpoint={`/api/admin/quotes/${quote.id}/guest-link`}
        initialUrl={publicUrl}
      />
      {quote.estimate_request_id ? (
        <OpportunityFilesPanel
          estimateRequestId={quote.estimate_request_id}
          files={opportunityFiles}
          audience="admin"
          title="Opportunity files"
        />
      ) : null}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Quote summary</h2>
        <div className="mt-4 rounded-2xl border border-border/40 bg-background/40 p-4">
          <QuoteTaxBreakdown quote={draftBreakdownQuote} variant="admin" />
        </div>
        <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Status</dt>
            <dd>
              <QuoteStatusBadge status={quote.status} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Sent</dt>
            <dd className="font-medium text-foreground">
              {quote.sent_at ? new Date(quote.sent_at).toLocaleString() : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Viewed</dt>
            <dd className="font-medium text-foreground">
              {quote.viewed_at
                ? new Date(quote.viewed_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Accepted</dt>
            <dd className="font-medium text-foreground">
              {quote.accepted_at
                ? new Date(quote.accepted_at).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
        {quote.estimate_request_id ? (
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href={`/admin/estimates/${quote.estimate_request_id}`}>
              Open linked estimate
            </Link>
          </Button>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Send & share</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer sees{" "}
          <code className="text-xs text-primary">/quote/[token]</code> after
          send.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" onClick={() => void sendQuote()} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send quote
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void createRevision()}
            disabled={revising}
          >
            {revising ? <Loader2 className="size-4 animate-spin" /> : null}
            Create revision
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="size-4" />
              View PDF
            </a>
          </Button>
          {publicUrl ? (
            <>
              <Button asChild variant="outline">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open public link
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void copyPublicUrl()}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </>
          ) : null}
        </div>
        {publicUrl ? (
          <p className="mt-3 break-all rounded-2xl border border-border/40 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            {publicUrl}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Change log</h2>
        <p className="mt-1 text-xs text-muted-foreground">Admin only</p>
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {(quote.events || []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No events yet.</li>
          ) : (
            quote.events!.map((event) => (
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.actor_type}
                  {event.actor_email ? ` · ${event.actor_email}` : ""}
                  {" · "}
                  {event.event_type.replaceAll("_", " ")}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
      </aside>
      </div>
    </div>
  );
}
