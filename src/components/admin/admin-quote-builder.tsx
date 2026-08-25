"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
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
import type { QuoteWithRelations } from "@/lib/quotes";
import {
  centsToDollarInput,
  dollarsToCents,
} from "@/lib/quote-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

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

export function AdminQuoteBuilder({ quote }: { quote: QuoteWithRelations }) {
  const router = useRouter();
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

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingLines, setSavingLines] = useState(false);
  const [sending, setSending] = useState(false);
  const [revising, setRevising] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [convertFor, setConvertFor] = useState<string | null>(null);
  const [convertCategory, setConvertCategory] =
    useState<QuoteLineCategory>("custom");
  const [convertDescription, setConvertDescription] = useState("");
  const [convertQty, setConvertQty] = useState(1);
  const [convertPrice, setConvertPrice] = useState("0.00");
  const [requestBusy, setRequestBusy] = useState<string | null>(null);

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
  function flash(okMessage?: string, err?: string) {
    setMessage(okMessage ?? null);
    setError(err ?? null);
  }

  async function saveDetails() {
    setSavingDetails(true);
    flash();
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        flash(undefined, payload.message ?? "Could not save details.");
        return;
      }
      flash("Details saved.");
      router.refresh();
    } catch {
      flash(undefined, "Could not save details.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveLineItems() {
    setSavingLines(true);
    flash();
    try {
      const items = lines.map((line, index) => ({
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
      }));
      const response = await fetch(`/api/admin/quotes/${quote.id}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          tax_mode: taxMode,
          manual_tax_label: manualTaxLabel,
          manual_tax_cents: dollarsToCents(manualTaxDollars),
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        flash(undefined, payload.message ?? "Could not save line items.");
        return;
      }
      const refreshed = await fetch(`/api/admin/quotes/${quote.id}`);
      const refreshedPayload = (await refreshed.json()) as {
        ok?: boolean;
        quote?: QuoteWithRelations;
      };
      if (refreshed.ok && refreshedPayload.quote) {
        const next = refreshedPayload.quote;
        setLines(linesFromQuote(next));
        setTaxMode(next.tax_mode || "quebec_gst_qst");
        setManualTaxLabel(next.manual_tax_label ?? "Sales tax");
        setManualTaxDollars(centsToDollarInput(next.manual_tax_cents || 0));
      }
      flash("Line items & tax saved.");
      router.refresh();
    } catch {
      flash(undefined, "Could not save line items.");
    } finally {
      setSavingLines(false);
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/25 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
            <Link href="/admin/quotes">← All quotes</Link>
          </Button>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Quote builder
          </p>
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            {resolveQuoteDisplayRef(quote)}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
          </div>
          {quote.estimate_request_id ? (
            <p className="text-xs text-muted-foreground">
              From{" "}
              <Link
                href={`/admin/estimates/${quote.estimate_request_id}`}
                className="text-primary hover:underline"
              >
                estimate
              </Link>
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Total CAD
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold text-primary">
            {formatCadFromCents(draftTotals.total_cents)}
          </p>
          {draftTotals.total_cents !== quote.total_cents ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
              Saved: {formatCadFromCents(quote.total_cents)} · unsaved changes
            </p>
          ) : null}
        </div>
      </header>

      {(message || error) && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? message}
        </div>
      )}

      <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Customer & event</h2>
          <Button
            type="button"
            onClick={() => void saveDetails()}
            disabled={savingDetails}
          >
            {savingDetails ? <Loader2 className="size-4 animate-spin" /> : null}
            Save details
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Name</Label>
            <Input
              id="customer_name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_email">Email</Label>
            <Input
              id="customer_email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_date">Event date</Label>
            <Input
              id="event_date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_type">Event type</Label>
            <Input
              id="event_type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue_name">Venue</Label>
            <Input
              id="venue_name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city_area">City / area</Label>
            <Input
              id="city_area"
              value={cityArea}
              onChange={(e) => setCityArea(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid until</Label>
            <Input
              id="valid_until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_notes">Owner notes</Label>
            <Textarea
              id="owner_notes"
              rows={4}
              value={ownerNotes}
              onChange={(e) => setOwnerNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <Textarea
              id="terms"
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Line items</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Unit prices in CAD dollars. Includes teardown when needed for
              event close-out.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="size-4" />
              Add row
            </Button>
            <Button
              type="button"
              onClick={() => void saveLineItems()}
              disabled={savingLines}
            >
              {savingLines ? <Loader2 className="size-4 animate-spin" /> : null}
              Save line items
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {lines.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/40 px-4 py-8 text-center text-sm text-muted-foreground">
              No line items yet. Add a row to start pricing.
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
                  className="grid gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 lg:grid-cols-[1.1fr_1.6fr_0.55fr_0.75fr_1fr_0.7fr_auto]"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Category
                    </Label>
                    <select
                      className={selectClass}
                      value={line.category}
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
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Tax</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Quebec GST 5% + QST 9.975% on taxable line items. CAD.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void saveLineItems()}
            disabled={savingLines}
          >
            {savingLines ? <Loader2 className="size-4 animate-spin" /> : null}
            Save tax & lines
          </Button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_mode">Tax mode</Label>
              <select
                id="tax_mode"
                className={selectClass}
                value={taxMode}
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

            {taxMode === "manual" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual_tax_label">Manual tax label</Label>
                  <Input
                    id="manual_tax_label"
                    value={manualTaxLabel}
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

      <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Send & share</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer sees{" "}
          <code className="text-xs text-primary">/quote/[token]</code> after
          send. Account preview is not available for the owner here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
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
              Download PDF
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
                  <Check className="size-4 text-emerald-300" />
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
        <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div>
            <dt>Sent</dt>
            <dd className="font-medium text-foreground">
              {quote.sent_at
                ? new Date(quote.sent_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Viewed</dt>
            <dd className="font-medium text-foreground">
              {quote.viewed_at
                ? new Date(quote.viewed_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Accepted</dt>
            <dd className="font-medium text-foreground">
              {quote.accepted_at
                ? new Date(quote.accepted_at).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
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

      <section className="rounded-3xl border border-border/40 bg-card/25 p-5">
        <h2 className="font-heading text-lg font-semibold">Change log</h2>
        <p className="mt-1 text-xs text-muted-foreground">Admin only</p>
        <ul className="mt-4 space-y-2">
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
    </div>
  );
}
