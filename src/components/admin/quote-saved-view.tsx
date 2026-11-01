"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Hammer,
  Languages,
  ListChecks,
  Lock,
  MapPin,
  PackageOpen,
  ReceiptText,
  ScrollText,
  StickyNote,
  UserRound,
  Wallet,
} from "lucide-react";
import { formatQuoteDate, quoteEventTypeLabel } from "@/data/quote-copy";
import { formatTimeWindow } from "@/data/quote-schedule";
import { quotePaymentRows, type QuotePaymentTerms } from "@/data/quote-payment-terms";
import {
  QUOTE_LINE_STATUS_LABELS,
  formatMoneyFromCents,
  splitQuoteTerms,
  type QuoteLineStatus,
} from "@/data/quotes";
import type { QuoteScheduleDraft } from "@/components/admin/quote-schedule-fields";
import { DocumentTextPreviewButton } from "@/components/admin/document-text-preview";
import { LineThumb } from "@/components/admin/line-thumb";
import {
  SavedCard,
  SavedChip,
  SavedClampedText,
  SavedFact,
  SavedNumberedList,
} from "@/components/admin/saved-view";
import { cn } from "@/lib/utils";

export type SavedQuoteLine = {
  key: string;
  description: string;
  descriptionTranslated: string;
  categoryLabel: string;
  quantity: number;
  unitLabel: string;
  unitPriceCents: number;
  totalCents: number;
  status: QuoteLineStatus;
  isTaxable: boolean;
  /** Shown as "Included" instead of a price. */
  included: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  logistics: boolean;
};

type QuoteSavedViewProps = {
  customerName: string;
  customerEmail: string;
  eventType: string;
  venueName: string;
  venueAddress: string;
  cityArea: string;
  validUntil: string;
  eventDate: string;
  schedule: QuoteScheduleDraft;
  currency: string;
  languageLabel: string;
  otherLanguageLabel: string;
  missingTranslationCount: number;
  notices: string[];
  lines: SavedQuoteLine[];
  taxModeLabel: string;
  totals: ReactNode;
  totalCents: number;
  paymentTerms: QuotePaymentTerms;
  customerNotes: string;
  customerNotesTranslated: string;
  ownerNotes: string;
  terms: string;
  termsTranslated: string;
};

export function QuoteSavedView(props: QuoteSavedViewProps) {
  const {
    schedule,
    eventDate,
    currency,
    lines,
    customerNotes,
    customerNotesTranslated,
    ownerNotes,
    terms,
    termsTranslated,
  } = props;
  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);
  const date = (value: string) => formatQuoteDate(value, "en", value);
  const eventTypeLabel = quoteEventTypeLabel(props.eventType, "en");

  const scheduleTiles = [
    {
      key: "install",
      icon: Hammer,
      title: "Install",
      date: schedule.installDate,
      window: formatTimeWindow(schedule.installStart, schedule.installEnd, "en"),
    },
    {
      key: "event",
      icon: CalendarDays,
      title: "Event",
      date: eventDate,
      window: formatTimeWindow(schedule.eventStart, schedule.eventEnd, "en"),
    },
    {
      key: "teardown",
      icon: PackageOpen,
      title: "Teardown",
      date: schedule.teardownDate,
      window: formatTimeWindow(schedule.teardownStart, schedule.teardownEnd, "en"),
    },
  ].filter((tile) => tile.date || tile.window);

  const paymentRows = quotePaymentRows(
    {
      ...props.paymentTerms,
      total_cents: props.totalCents,
      event_date: eventDate || null,
      valid_until: props.validUntil || null,
    },
    "en"
  );

  const termItems = splitQuoteTerms(terms);
  const translatedTermItems = splitQuoteTerms(termsTranslated);
  const hasNotes = Boolean(customerNotes.trim() || customerNotesTranslated.trim() || ownerNotes.trim());
  const pricedCount = lines.filter((line) => !line.included).length;

  return (
    <>
      <SavedCard
        icon={UserRound}
        eyebrow="Saved"
        title="Customer & event"
        aside={
          <div className="flex flex-wrap items-center gap-1.5">
            <SavedChip tone="gold">{currency}</SavedChip>
            <SavedChip tone="gold">
              <Languages className="size-3" />
              {props.languageLabel}
            </SavedChip>
            {props.missingTranslationCount > 0 ? (
              <SavedChip tone="amber">
                {props.otherLanguageLabel} · {props.missingTranslationCount} missing
              </SavedChip>
            ) : (
              <SavedChip>{props.otherLanguageLabel} ready</SavedChip>
            )}
          </div>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {props.customerName || props.customerEmail ? (
            <SavedFact icon={UserRound} label="Contact">
              <p className="truncate" title={props.customerName || props.customerEmail}>
                {props.customerName || props.customerEmail}
              </p>
              {props.customerName && props.customerEmail ? (
                <p className="truncate text-xs font-normal text-muted-foreground" title={props.customerEmail}>
                  {props.customerEmail}
                </p>
              ) : null}
            </SavedFact>
          ) : null}
          {eventTypeLabel ? <SavedFact label="Event type">{eventTypeLabel}</SavedFact> : null}
          {props.venueName || props.venueAddress || props.cityArea ? (
            <SavedFact icon={MapPin} label="Venue">
              <p className="truncate">{props.venueName || props.cityArea || props.venueAddress}</p>
              {[props.venueAddress, props.venueName ? props.cityArea : ""]
                .filter((part) => part && part !== props.venueName)
                .map((part) => (
                  <p key={part} className="truncate text-xs font-normal text-muted-foreground" title={part}>
                    {part}
                  </p>
                ))}
            </SavedFact>
          ) : null}
          {props.validUntil ? <SavedFact label="Valid until">{date(props.validUntil)}</SavedFact> : null}
        </div>

        {scheduleTiles.length > 0 ? (
          <div
            className={cn(
              "mt-2.5 grid gap-2.5",
              scheduleTiles.length === 2 && "sm:grid-cols-2",
              scheduleTiles.length === 3 && "sm:grid-cols-3"
            )}
          >
            {scheduleTiles.map((tile) => (
              <div
                key={tile.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                  tile.key === "event"
                    ? "border-primary/35 bg-primary/[0.06]"
                    : "border-border/40 bg-background/30"
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <tile.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {tile.title}
                  </p>
                  <p className="truncate text-sm font-medium">{tile.date ? date(tile.date) : "Date TBC"}</p>
                  {tile.window ? <p className="text-xs text-muted-foreground">{tile.window}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {props.notices.length > 0 ? (
          <div className="mt-2.5 space-y-1">
            {props.notices.map((notice) => (
              <p key={notice} className="text-xs text-amber-700 dark:text-amber-300">
                {notice}
              </p>
            ))}
          </div>
        ) : null}
      </SavedCard>

      <SavedCard
        icon={ListChecks}
        eyebrow={`${lines.length} ${lines.length === 1 ? "line" : "lines"}${
          pricedCount !== lines.length ? ` · ${lines.length - pricedCount} included` : ""
        }`}
        title="Line items"
        aside={<SavedChip tone="gold">{props.taxModeLabel}</SavedChip>}
      >
        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No line items yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/40">
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_120px] gap-4 border-b border-border/40 bg-background/40 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:grid">
              <span>Item</span>
              <span className="text-right">Qty × price</span>
              <span className="text-right">Total</span>
            </div>
            <ul className="divide-y divide-border/40">
              {lines.map((line, index) => {
                const showStatus = line.status !== "priced" && line.status !== "approved" && line.status !== "included";
                return (
                  <li
                    key={line.key}
                    className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:items-start"
                  >
                    <div className="flex min-w-0 gap-3">
                      <LineThumb
                        imageUrl={line.imageUrl}
                        imageAlt={line.imageAlt || line.description}
                        index={index}
                        logistics={line.logistics}
                      />
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {line.description || line.categoryLabel}
                        </p>
                        {line.descriptionTranslated ? (
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {line.descriptionTranslated}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums text-muted-foreground sm:text-right">
                      <p>
                        {line.quantity} {line.unitLabel}
                        {line.included ? null : (
                          <span className="block text-xs">× {money(line.unitPriceCents)}</span>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1 sm:justify-end">
                        <SavedChip>{line.categoryLabel}</SavedChip>
                        {line.isTaxable ? null : <SavedChip>Non-tax</SavedChip>}
                        {showStatus ? <SavedChip tone="amber">{QUOTE_LINE_STATUS_LABELS[line.status]}</SavedChip> : null}
                      </div>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums sm:text-right",
                        line.included && "text-primary"
                      )}
                    >
                      {line.included ? "Included" : money(line.totalCents)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              <Wallet className="size-3" />
              Payment terms
            </p>
            {paymentRows.length > 0 ? (
              <div className={cn("grid gap-2", paymentRows.length > 1 && "sm:grid-cols-2")}>
                {paymentRows.map((row) => (
                  <div key={row.key} className="rounded-xl border border-primary/25 bg-primary/[0.05] px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">{row.label}</p>
                    <p className="mt-0.5 font-heading text-base font-semibold tabular-nums">
                      {money(row.amountCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.due}
                      {row.detail ? ` · ${row.detail}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not shown on this quote.</p>
            )}
          </div>
          <div className="rounded-xl border border-border/40 bg-background/40 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              <ReceiptText className="size-3" />
              Totals
            </p>
            {props.totals}
          </div>
        </div>
      </SavedCard>

      {hasNotes || termItems.length > 0 || translatedTermItems.length > 0 ? (
        <SavedCard
          icon={ScrollText}
          eyebrow="On the proposal & PDF"
          title="Notes & terms"
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <DocumentTextPreviewButton kind="pdf_terms" label="Terms & conditions" body={terms} />
              <Link href="/admin/documents" className="text-xs font-medium text-primary hover:underline">
                Edit defaults
              </Link>
            </div>
          }
        >
          <div className="space-y-4">
            {hasNotes ? (
              <div className={cn("grid gap-2.5", customerNotes.trim() && ownerNotes.trim() && "md:grid-cols-2")}>
                {customerNotes.trim() || customerNotesTranslated.trim() ? (
                  <SavedFact icon={StickyNote} label={`Customer notes · ${props.languageLabel}`}>
                    <div className="font-normal">
                      {customerNotes.trim() ? <SavedClampedText text={customerNotes} /> : null}
                      {customerNotesTranslated.trim() ? (
                        <div className="mt-2 border-t border-border/40 pt-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {props.otherLanguageLabel}
                          </p>
                          <SavedClampedText text={customerNotesTranslated} className="text-muted-foreground" />
                        </div>
                      ) : null}
                    </div>
                  </SavedFact>
                ) : null}
                {ownerNotes.trim() ? (
                  <SavedFact icon={Lock} label="Owner notes · internal">
                    <div className="font-normal">
                      <SavedClampedText text={ownerNotes} />
                    </div>
                  </SavedFact>
                ) : null}
              </div>
            ) : null}

            {termItems.length > 0 || translatedTermItems.length > 0 ? (
            <div
              className={cn(
                "grid items-start gap-2.5",
                termItems.length > 0 && translatedTermItems.length > 0 && "lg:grid-cols-2"
              )}
            >
            {termItems.length > 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/30 px-3.5 py-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Terms & conditions · {props.languageLabel} · {termItems.length}
                </p>
                <SavedNumberedList items={termItems} />
              </div>
            ) : null}

            {translatedTermItems.length > 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/30 px-3.5 py-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Custom terms · {props.otherLanguageLabel} · {translatedTermItems.length}
                </p>
                <SavedNumberedList items={translatedTermItems} />
              </div>
            ) : null}
            </div>
            ) : null}
          </div>
        </SavedCard>
      ) : null}
    </>
  );
}
