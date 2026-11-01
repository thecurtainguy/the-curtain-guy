"use client";

import Link from "next/link";
import {
  BadgePercent,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Hash,
  Languages,
  ListChecks,
  Lock,
  MapPin,
  ReceiptText,
  ScrollText,
  StickyNote,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatQuoteDate, quoteEventTypeLabel } from "@/data/quote-copy";
import { formatMoneyFromCents, splitQuoteTerms, type QuoteTaxBreakdownRow } from "@/data/quotes";
import type { DepositMode, InvoiceScheduleRow } from "@/data/invoices";
import { formatCustomerNumber, type CustomerLinkSummary } from "@/data/customers";
import {
  SavedCard,
  SavedChip,
  SavedClampedText,
  SavedFact,
  SavedNumberedList,
} from "@/components/admin/saved-view";
import { cn } from "@/lib/utils";

export type SavedInvoiceLine = {
  key: string;
  description: string;
  descriptionTranslated: string;
  categoryLabel: string | null;
  quantity: number;
  unitLabel: string;
  unitPriceCents: number;
  totalCents: number;
  isTaxable: boolean;
  fromInventory: boolean;
};

type InvoiceSavedViewProps = {
  invoiceNumber: string;
  revisionNumber: number;
  replacesInvoiceNumber: string | null;
  sourceLabel: string;
  customerName: string;
  companyName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: string;
  poNumber: string;
  poRequired: boolean;
  customerLink: CustomerLinkSummary | null;
  eventType: string;
  venueName: string;
  venueAddress: string;
  issueDate: string;
  dueDate: string;
  eventDate: string;
  depositDueDate: string;
  currency: string;
  languageLabel: string;
  otherLanguageLabel: string;
  missingTranslationCount: number;
  paymentMethodLabels: string[];
  notices: string[];
  lines: SavedInvoiceLine[];
  taxModeLabel: string;
  taxRows: QuoteTaxBreakdownRow[];
  depositMode: DepositMode;
  depositLabel: string;
  depositCents: number;
  schedule: InvoiceScheduleRow[];
  totalCents: number;
  notes: string;
  notesTranslated: string;
  terms: string;
  termsTranslated: string;
  internalNotes: string;
};

function DateTile({
  icon: Icon,
  title,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
        accent ? "border-primary/35 bg-primary/[0.06]" : "border-border/40 bg-background/30"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <p className="truncate text-sm font-medium">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function InvoiceSavedView(props: InvoiceSavedViewProps) {
  const { currency, lines, notes, notesTranslated, terms, termsTranslated, internalNotes } = props;
  const money = (cents: number) => formatMoneyFromCents(cents, "en", currency);
  const date = (value: string) => formatQuoteDate(value, "en", value);
  const eventTypeLabel = quoteEventTypeLabel(props.eventType, "en");
  const dueText = (value: string | null) => (value ? `Due ${date(value)}` : "Due on receipt");
  const hasDeposit = props.depositMode !== "none";
  const depositOnly = hasDeposit && props.depositCents > 0;

  const dateTiles = [
    { key: "issue", icon: FileText, title: "Issued", value: props.issueDate ? date(props.issueDate) : "Not set" },
    ...(hasDeposit
      ? [
          {
            key: "deposit",
            icon: BadgePercent,
            title: "Deposit due",
            value: props.depositDueDate ? date(props.depositDueDate) : "On receipt",
          },
        ]
      : []),
    {
      key: "balance",
      icon: Wallet,
      title: "Balance due",
      value: props.dueDate ? date(props.dueDate) : "On receipt",
      hint: props.eventDate && props.dueDate === props.eventDate ? "Event day" : undefined,
    },
    ...(props.eventDate
      ? [{ key: "event", icon: CalendarDays, title: "Event", value: date(props.eventDate), accent: true }]
      : []),
  ];

  const paymentTiles: Array<{ key: string; label: string; amountCents: number; due: string; chips: string[] }> =
    props.schedule.length > 0
      ? props.schedule.map((row) => ({
          key: row.kind,
          label: row.kind === "deposit" ? "Deposit" : "Balance",
          amountCents: row.amountCents,
          due: dueText(row.dueDate),
          chips: [row.isEventDay ? "Event day" : null, row.paid ? "Paid" : null].filter(
            (chip): chip is string => Boolean(chip)
          ),
        }))
      : [
          {
            key: "full",
            label: depositOnly ? "Deposit" : "Full payment",
            amountCents: depositOnly ? props.depositCents : props.totalCents,
            due: dueText(depositOnly ? props.depositDueDate || null : props.dueDate || null),
            chips: [],
          },
        ];

  const termItems = splitQuoteTerms(terms);
  const translatedTermItems = splitQuoteTerms(termsTranslated);
  const hasClientNotes = Boolean(notes.trim() || notesTranslated.trim());
  const pricedCount = lines.filter((line) => line.unitPriceCents > 0).length;
  const venueLines = [props.venueName, props.venueAddress].filter((part) => part.trim());
  const contactLines = [props.customerEmail, props.customerPhone].filter((part) => part.trim());
  const customer = props.customerLink;

  return (
    <>
      <SavedCard
        icon={UserRound}
        eyebrow="Bill to"
        title="Client & event"
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
          {props.customerName || contactLines.length > 0 ? (
            <SavedFact icon={UserRound} label="Contact">
              <p className="truncate" title={props.customerName || contactLines[0]}>
                {props.customerName || contactLines[0]}
              </p>
              {(props.customerName ? contactLines : contactLines.slice(1)).map((part) => (
                <p key={part} className="truncate text-xs font-normal text-muted-foreground" title={part}>
                  {part}
                </p>
              ))}
            </SavedFact>
          ) : null}
          {props.companyName ? (
            <SavedFact icon={Building2} label="Company">
              <p className="truncate" title={props.companyName}>
                {props.companyName}
              </p>
            </SavedFact>
          ) : null}
          {props.billingAddress.trim() ? (
            <SavedFact icon={MapPin} label="Billing address">
              <p className="whitespace-pre-line text-xs font-normal leading-relaxed text-muted-foreground">
                {props.billingAddress}
              </p>
            </SavedFact>
          ) : null}
          {props.poNumber.trim() ? (
            <SavedFact icon={Hash} label="PO number">
              {props.poNumber}
            </SavedFact>
          ) : props.poRequired ? (
            <SavedFact icon={Hash} label="PO number">
              <SavedChip tone="amber">Missing · required</SavedChip>
            </SavedFact>
          ) : null}
          <SavedFact icon={ReceiptText} label="Invoice">
            <p className="truncate">{props.invoiceNumber}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {props.revisionNumber > 0
                ? `Revision ${props.revisionNumber}${props.replacesInvoiceNumber ? ` of ${props.replacesInvoiceNumber}` : ""}`
                : props.sourceLabel}
            </p>
          </SavedFact>
          {eventTypeLabel ? <SavedFact label="Event type">{eventTypeLabel}</SavedFact> : null}
          {venueLines.length > 0 ? (
            <SavedFact icon={MapPin} label="Venue">
              <p className="truncate" title={venueLines[0]}>
                {venueLines[0]}
              </p>
              {venueLines.slice(1).map((part) => (
                <p key={part} className="truncate text-xs font-normal text-muted-foreground" title={part}>
                  {part}
                </p>
              ))}
            </SavedFact>
          ) : null}
          {customer ? (
            <SavedFact icon={UserRound} label="Customer profile">
              <Link href={`/admin/customers/${customer.id}`} className="block truncate hover:underline">
                <span className="text-primary">{formatCustomerNumber(customer.customer_number)}</span>{" "}
                {customer.display_name}
              </Link>
              {customer.tax_exempt || customer.invoiceCc.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {customer.tax_exempt ? <SavedChip tone="amber">Tax exempt</SavedChip> : null}
                  {customer.invoiceCc.map((email) => (
                    <SavedChip key={email}>Cc {email}</SavedChip>
                  ))}
                </div>
              ) : null}
            </SavedFact>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-2.5 grid gap-2.5 sm:grid-cols-2",
            dateTiles.length === 3 && "lg:grid-cols-3",
            dateTiles.length === 4 && "lg:grid-cols-4"
          )}
        >
          {dateTiles.map(({ key, ...tile }) => (
            <DateTile key={key} {...tile} />
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <CreditCard className="size-3 text-primary" />
            Client pays by
          </span>
          {props.paymentMethodLabels.length > 0 ? (
            props.paymentMethodLabels.map((label) => <SavedChip key={label}>{label}</SavedChip>)
          ) : (
            <SavedChip tone="amber">No payment methods for {currency} — check Billing settings</SavedChip>
          )}
        </div>

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
              {lines.map((line) => {
                const included = line.unitPriceCents === 0;
                return (
                  <li
                    key={line.key}
                    className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:items-start"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {line.description || line.categoryLabel || "Untitled line"}
                      </p>
                      {line.descriptionTranslated ? (
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {line.descriptionTranslated}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-sm tabular-nums text-muted-foreground sm:text-right">
                      <p>
                        {line.quantity} {line.unitLabel}
                        {included ? null : <span className="block text-xs">× {money(line.unitPriceCents)}</span>}
                      </p>
                      {line.categoryLabel || !line.isTaxable || line.fromInventory ? (
                        <div className="mt-1 flex flex-wrap gap-1 sm:justify-end">
                          {line.categoryLabel ? <SavedChip>{line.categoryLabel}</SavedChip> : null}
                          {line.isTaxable ? null : <SavedChip>Non-tax</SavedChip>}
                          {line.fromInventory ? <SavedChip>Inventory</SavedChip> : null}
                        </div>
                      ) : null}
                    </div>
                    <p className={cn("text-sm font-semibold tabular-nums sm:text-right", included && "text-primary")}>
                      {included ? "Included" : money(line.totalCents)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              <Wallet className="size-3" />
              Payment schedule
              <SavedChip>{props.depositLabel}</SavedChip>
            </p>
            <div className={cn("grid gap-2", paymentTiles.length > 1 && "sm:grid-cols-2")}>
              {paymentTiles.map((tile) => (
                <div key={tile.key} className="rounded-xl border border-primary/25 bg-primary/[0.05] px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">{tile.label}</p>
                  <p className="mt-0.5 font-heading text-base font-semibold tabular-nums">{money(tile.amountCents)}</p>
                  <p className="text-xs text-muted-foreground">{tile.due}</p>
                  {tile.chips.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tile.chips.map((chip) => (
                        <SavedChip key={chip} tone={chip === "Paid" ? "gold" : "muted"}>
                          {chip}
                        </SavedChip>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/40 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              <ReceiptText className="size-3" />
              Totals
            </p>
            {props.taxRows.map((row) => (
              <div
                key={row.key}
                className={cn(
                  "flex justify-between gap-3 py-0.5 text-sm tabular-nums",
                  row.emphasis === "muted" && "text-xs text-muted-foreground",
                  row.emphasis === "total" &&
                    "mt-2 border-t border-border/40 pt-2 font-heading text-lg font-semibold text-primary"
                )}
              >
                <span>{row.label}</span>
                <span>{money(row.amountCents)}</span>
              </div>
            ))}
          </div>
        </div>
      </SavedCard>

      <SavedCard
        icon={ScrollText}
        eyebrow="On the invoice & PDF"
        title="Notes & terms"
        aside={
          <Link href="/admin/billing" className="text-xs font-medium text-primary hover:underline">
            Billing settings
          </Link>
        }
      >
        <div className="space-y-4">
          {hasClientNotes || internalNotes.trim() ? (
            <div className={cn("grid gap-2.5", hasClientNotes && internalNotes.trim() && "md:grid-cols-2")}>
              {hasClientNotes ? (
                <SavedFact icon={StickyNote} label={`Notes to client · ${props.languageLabel}`}>
                  <div className="font-normal">
                    {notes.trim() ? <SavedClampedText text={notes} /> : null}
                    {notesTranslated.trim() ? (
                      <div className={cn(notes.trim() && "mt-2 border-t border-border/40 pt-2")}>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {props.otherLanguageLabel}
                        </p>
                        <SavedClampedText text={notesTranslated} className="text-muted-foreground" />
                      </div>
                    ) : null}
                  </div>
                </SavedFact>
              ) : null}
              {internalNotes.trim() ? (
                <SavedFact icon={Lock} label="Internal notes · only you">
                  <div className="font-normal">
                    <SavedClampedText text={internalNotes} />
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
                    Terms · {props.languageLabel} · {termItems.length}
                  </p>
                  <SavedNumberedList items={termItems} />
                </div>
              ) : null}
              {translatedTermItems.length > 0 ? (
                <div className="rounded-xl border border-border/40 bg-background/30 px-3.5 py-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Terms · {props.otherLanguageLabel} · {translatedTermItems.length}
                  </p>
                  <SavedNumberedList items={translatedTermItems} />
                </div>
              ) : null}
            </div>
          ) : (
            <SavedFact icon={ScrollText} label="Terms">
              <span className="font-normal text-muted-foreground">Billing settings default</span>
            </SavedFact>
          )}
        </div>
      </SavedCard>
    </>
  );
}
