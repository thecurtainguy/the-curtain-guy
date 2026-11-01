"use client";

import type { ReactNode } from "react";
import {
  BadgePercent,
  CalendarClock,
  ClipboardCheck,
  Coins,
  Contact,
  CreditCard,
  Globe,
  Hash,
  Languages,
  Lock,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  ReceiptText,
  ShieldOff,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import { CUSTOMER_LANGUAGE_LABELS } from "@/data/customer-language";
import {
  CUSTOMER_KIND_LABELS,
  formatCustomerBillingAddress,
  formatCustomerNumber,
  type CustomerRow,
} from "@/data/customers";
import { CUSTOMER_KIND_ICONS } from "@/components/admin/customers/customer-ui";
import { SavedCard, SavedChip, SavedClampedText, SavedFact } from "@/components/admin/saved-view";

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function balanceDueLabel(customer: CustomerRow, defaultDays: number): string | null {
  const days = customer.balance_due_days ?? defaultDays;
  switch (customer.balance_due_rule) {
    case "event_date":
      return "On the event date";
    case "days_before_event":
      return `${plural(days, "day")} before event`;
    case "days_after_issue":
      return `Net ${days} · after issue`;
    default:
      return null;
  }
}

function externalHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function SubHeading({ icon: Icon, children }: { icon: typeof Wallet; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
      <Icon className="size-3" />
      {children}
    </p>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="font-normal text-muted-foreground">{children}</span>;
}

export function CustomerProfileSavedView({
  customer,
  paymentMethods,
  businessDefaults,
  editAction,
}: {
  customer: CustomerRow;
  paymentMethods: Array<{ id: string; label: string }>;
  businessDefaults: { depositPercent: number; dueDays: number };
  editAction: ReactNode;
}) {
  const KindIcon = CUSTOMER_KIND_ICONS[customer.kind];
  const company = customer.company_name?.trim() ?? "";
  const legal = customer.legal_name?.trim() ?? "";
  const phone = customer.phone?.trim() ?? "";
  const website = customer.website?.trim() ?? "";
  const address = formatCustomerBillingAddress(customer);
  const country = customer.billing_country?.trim() ?? "";
  const gst = customer.gst_number?.trim() ?? "";
  const qst = customer.qst_number?.trim() ?? "";
  const exemptReason = customer.tax_exempt_reason?.trim() ?? "";
  const defaultPo = customer.default_po_number?.trim() ?? "";
  const source = customer.source?.trim() ?? "";
  const notes = customer.internal_notes?.trim() ?? "";
  const tags = customer.tags.filter((tag) => tag.trim());
  const dueLabel = balanceDueLabel(customer, businessDefaults.dueDays);
  const paymentMethod = customer.preferred_payment_method
    ? (paymentMethods.find((method) => method.id === customer.preferred_payment_method)?.label ??
      customer.preferred_payment_method)
    : "";
  const tagChips =
    tags.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag, index) => (
          <SavedChip key={`${tag}-${index}`} tone="gold">
            <Tag className="size-3" />
            {tag}
          </SavedChip>
        ))}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <SavedCard
        icon={Contact}
        eyebrow="Saved profile"
        title="Who they are"
        aside={
          <div className="flex flex-wrap items-center gap-1.5">
            <SavedChip tone="gold">
              <KindIcon className="size-3" />
              {CUSTOMER_KIND_LABELS[customer.kind]}
            </SavedChip>
            <SavedChip tone="gold">
              <Languages className="size-3" />
              {CUSTOMER_LANGUAGE_LABELS[customer.preferred_language]}
            </SavedChip>
            <SavedChip tone="gold">
              <Coins className="size-3" />
              {customer.currency}
            </SavedChip>
            <span className="ml-1">{editAction}</span>
          </div>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <SavedFact icon={KindIcon} label="Name on file">
            <p className="truncate" title={customer.display_name}>
              {customer.display_name}
            </p>
            {company && company !== customer.display_name ? (
              <p className="truncate text-xs font-normal text-muted-foreground" title={company}>
                {company}
              </p>
            ) : null}
          </SavedFact>
          <SavedFact icon={Hash} label="Customer no.">
            <span className="tabular-nums">{formatCustomerNumber(customer.customer_number)}</span>
          </SavedFact>
          {legal && legal !== company && legal !== customer.display_name ? (
            <SavedFact icon={ReceiptText} label="Legal / billing name">
              <p className="truncate" title={legal}>
                {legal}
              </p>
            </SavedFact>
          ) : null}
          <SavedFact icon={Mail} label="Primary email">
            <a
              href={`mailto:${customer.primary_email}`}
              className="block truncate hover:text-primary"
              title={customer.primary_email}
            >
              {customer.primary_email}
            </a>
          </SavedFact>
          {phone ? (
            <SavedFact icon={Phone} label="Phone">
              <a href={`tel:${phone}`} className="block truncate hover:text-primary">
                {phone}
              </a>
            </SavedFact>
          ) : null}
          {website ? (
            <SavedFact icon={Globe} label="Website">
              <a
                href={externalHref(website)}
                target="_blank"
                rel="noreferrer"
                className="block truncate hover:text-primary"
                title={website}
              >
                {website.replace(/^https?:\/\//i, "")}
              </a>
            </SavedFact>
          ) : null}
        </div>
      </SavedCard>

      <SavedCard
        icon={Wallet}
        eyebrow="Billing & defaults"
        title="Billing, tax & payment"
        aside={
          customer.tax_exempt || customer.po_required ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {customer.tax_exempt ? (
                <SavedChip tone="amber">
                  <ShieldOff className="size-3" />
                  Tax exempt
                </SavedChip>
              ) : null}
              {customer.po_required ? (
                <SavedChip tone="amber">
                  <ClipboardCheck className="size-3" />
                  PO required
                </SavedChip>
              ) : null}
            </div>
          ) : null
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <SubHeading icon={MapPin}>Bill to & tax</SubHeading>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <SavedFact icon={MapPin} label="Billing address" className="sm:col-span-2">
                {address ? (
                  <>
                    <p className="whitespace-pre-line leading-snug">{address}</p>
                    {country && country.toLowerCase() === "canada" ? (
                      <p className="text-xs font-normal text-muted-foreground">{country}</p>
                    ) : null}
                  </>
                ) : (
                  <Muted>No address on file</Muted>
                )}
              </SavedFact>
              <SavedFact icon={ShieldOff} label="Tax status">
                {customer.tax_exempt ? "Exempt" : "Taxable"}
                {customer.tax_exempt && exemptReason ? (
                  <p className="text-xs font-normal text-muted-foreground">{exemptReason}</p>
                ) : !customer.tax_exempt ? (
                  <Muted> · GST/QST</Muted>
                ) : null}
              </SavedFact>
              {gst || qst ? (
                <SavedFact icon={Hash} label="Their tax numbers">
                  {gst ? (
                    <p className="truncate tabular-nums" title={gst}>
                      <Muted>GST </Muted>
                      {gst}
                    </p>
                  ) : null}
                  {qst ? (
                    <p className="truncate tabular-nums" title={qst}>
                      <Muted>QST </Muted>
                      {qst}
                    </p>
                  ) : null}
                </SavedFact>
              ) : null}
              {defaultPo ? (
                <SavedFact icon={ClipboardCheck} label="Default PO">
                  <p className="truncate tabular-nums" title={defaultPo}>
                    {defaultPo}
                  </p>
                </SavedFact>
              ) : null}
            </div>
          </div>

          <div>
            <SubHeading icon={BadgePercent}>Payment defaults</SubHeading>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <SavedFact icon={Coins} label="Currency">
                {customer.currency}
              </SavedFact>
              <SavedFact icon={BadgePercent} label="Deposit">
                {customer.default_deposit_percent !== null ? (
                  <span className="tabular-nums">{customer.default_deposit_percent}%</span>
                ) : (
                  <Muted>Default · {businessDefaults.depositPercent}%</Muted>
                )}
              </SavedFact>
              <SavedFact icon={CalendarClock} label="Balance due">
                {dueLabel ?? <Muted>Business default</Muted>}
              </SavedFact>
              {paymentMethod ? (
                <SavedFact icon={CreditCard} label="Usual method">
                  <p className="truncate" title={paymentMethod}>
                    {paymentMethod}
                  </p>
                </SavedFact>
              ) : null}
            </div>
          </div>
        </div>
      </SavedCard>

      {tags.length > 0 || source || notes ? (
        <SavedCard
          icon={NotebookPen}
          eyebrow="Internal · only visible to you"
          title="Tags & notes"
          aside={source || notes ? tagChips : null}
        >
          {source || notes ? (
            <div className="grid gap-2.5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              {source ? (
                <SavedFact icon={Sparkles} label="Source" className={notes ? undefined : "md:col-span-2"}>
                  {source}
                </SavedFact>
              ) : null}
              {notes ? (
                <SavedFact icon={Lock} label="Notes · internal" className={source ? undefined : "md:col-span-2"}>
                  <div className="font-normal">
                    <SavedClampedText text={notes} />
                  </div>
                </SavedFact>
              ) : null}
            </div>
          ) : (
            tagChips
          )}
        </SavedCard>
      ) : null}
    </div>
  );
}
