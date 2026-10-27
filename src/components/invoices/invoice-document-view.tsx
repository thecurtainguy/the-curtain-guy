import Image from "next/image";
import {
  Banknote,
  Building2,
  CalendarDays,
  Check,
  Download,
  FileCheck2,
  FileSignature,
  Landmark,
  Mail,
  Package,
  Receipt,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  businessAddressLines,
  businessText,
  computeAmountDue,
  getInvoiceCopy,
  getInvoiceTaxRows,
  hasActivePaymentDocument,
  invoicePaymentSchedule,
  paymentMethodLabel,
  splitInvoiceTerms,
  visiblePaymentMethods,
  type BusinessSettings,
  type CustomerSafeInvoice,
  type InvoiceScheduleRow,
  type PaymentMethod,
} from "@/data/invoices";
import {
  formatMoneyFromCents,
  formatQuoteQuantity,
  formatQuoteUnitPrice,
  quoteLineCategoryLabel,
} from "@/data/quotes";
import { formatQuoteDate, quoteEventTypeLabel } from "@/data/quote-copy";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const METHOD_ICONS: Record<PaymentMethod["kind"], typeof Wallet> = {
  etransfer: Mail,
  cheque: FileSignature,
  wire: Landmark,
  cash: Banknote,
  custom: Wallet,
};

function Card({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: typeof Wallet;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/40 bg-card/30", className)}>
      <div className="flex items-center gap-3 border-b border-border/40 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 py-3.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function InvoiceDocumentView({
  invoice,
  settings,
  pdfUrl,
}: {
  invoice: CustomerSafeInvoice;
  settings: BusinessSettings;
  pdfUrl: string;
}) {
  const language = invoice.language;
  const t = getInvoiceCopy(language);
  const money = (cents: number) => formatMoneyFromCents(cents, language, invoice.currency);
  const date = (value: string | null | undefined) => formatQuoteDate(value, language, "—");
  const due = computeAmountDue(invoice);
  const taxRows = getInvoiceTaxRows(invoice, { variant: "customer", language });
  const methods = visiblePaymentMethods(settings.payment_methods, language, invoice.currency);
  const terms = splitInvoiceTerms(invoice.terms);
  const hasDeposit = invoice.deposit_mode !== "none" && invoice.deposit_cents > 0;
  const schedule = invoicePaymentSchedule(invoice);
  const balanceRow = schedule.find((row) => row.kind === "balance");
  const scheduleDay = (row: InvoiceScheduleRow) =>
    row.dueDate ? `${date(row.dueDate)}${row.isEventDay ? ` (${t.scheduleEventDay})` : ""}` : t.dueOnReceipt;
  const scheduleDateText = (row: InvoiceScheduleRow) =>
    row.dueDate ? `${row.kind === "deposit" ? t.dueBy : t.scheduleDueOn} ${scheduleDay(row)}` : t.dueOnReceipt;
  const registrations = [
    settings.gst_number ? `${t.gst} ${settings.gst_number}` : null,
    settings.qst_number ? `${t.qst} ${settings.qst_number}` : null,
    settings.neq ? `${t.neq} ${settings.neq}` : null,
  ].filter(Boolean) as string[];
  const dueTitle =
    due.dueNowKind === "deposit" ? t.depositDue : t.balanceDue;
  const dueHint =
    due.dueNowKind === "none"
      ? invoice.status === "void"
        ? null
        : t.paidInFull
      : due.dueNowDate
        ? `${t.dueBy} ${date(due.dueNowDate)}`
        : t.dueOnReceipt;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[min(var(--radius-4xl),28px)] border border-primary/25 bg-card/40">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(212,175,55,0.16),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">{settings.trade_name}</p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.invoice} {invoice.invoice_number}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <InvoiceStatusBadge invoice={invoice} language={language} />
              <span className="rounded-full border border-border/50 px-3 py-1">
                {t.issueDate}: {date(invoice.issue_date)}
              </span>
              {invoice.due_date ? (
                <span className="rounded-full border border-border/50 px-3 py-1">
                  {t.dueDate}: {date(invoice.due_date)}
                </span>
              ) : null}
              <span className="rounded-full border border-border/50 px-3 py-1">
                {invoice.quote_id ? t.quoteRef : t.reference} {invoice.opportunity_ref}
              </span>
              {invoice.po_number ? (
                <span className="rounded-full border border-border/50 px-3 py-1">
                  {t.poNumber} {invoice.po_number}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary">{dueTitle}</p>
            <p className="mt-2 font-heading text-4xl font-semibold tabular-nums">{money(due.dueNowCents)}</p>
            {dueHint ? <p className="mt-1 text-sm text-muted-foreground">{dueHint}</p> : null}
            {due.dueNowKind === "deposit" && balanceRow ? (
              <p className="mt-2 text-sm font-medium">
                {t.remainingAfterDeposit(money(balanceRow.amountCents), scheduleDay(balanceRow))}
              </p>
            ) : null}
            <Button asChild className="mt-4 w-full">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Download className="size-4" />
                {t.downloadPdf}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={UserRound} title={t.billTo}>
          <p className="font-medium">{invoice.customer_name || "—"}</p>
          {invoice.company_name ? <p className="text-sm text-muted-foreground">{invoice.company_name}</p> : null}
          {invoice.billing_address ? (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.billing_address}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>
        </Card>
        <Card icon={CalendarDays} title={t.event}>
          {invoice.event_type ? (
            <p className="font-medium">{quoteEventTypeLabel(invoice.event_type, language) || invoice.event_type}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{date(invoice.event_date)}</p>
          <p className="text-sm text-muted-foreground">{invoice.venue_name || "—"}</p>
        </Card>
        <Card icon={Building2} title={settings.trade_name}>
          <p className="font-medium">{settings.legal_name}</p>
          {businessAddressLines(settings).map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
          <p className="text-sm text-muted-foreground">
            {settings.phone} · {settings.email}
          </p>
          {registrations.length ? (
            <p className="mt-2 text-xs text-muted-foreground">{registrations.join(" · ")}</p>
          ) : null}
        </Card>
      </div>

      <Card icon={Receipt} title={t.invoice}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="pb-2 font-medium">{t.description}</th>
                <th className="pb-2 text-right font-medium">{t.qty}</th>
                <th className="pb-2 text-right font-medium">{t.unitPrice}</th>
                <th className="pb-2 text-right font-medium">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((line) => (
                <tr key={line.id} className="border-b border-border/30 align-top">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-start gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/30">
                        {line.image_url ? (
                          <Image
                            src={line.image_url}
                            alt={line.image_alt || line.description}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-primary/50">
                            <Package className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p>{line.description}</p>
                        {line.category ? (
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                            {quoteLineCategoryLabel({ ...line, category: line.category }, language)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatQuoteQuantity(line.quantity, line.unit_label, language)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatQuoteUnitPrice(line.unit_price_cents, line.unit_label, language, invoice.currency)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{money(line.line_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-end">
          {schedule.length > 0 ? (
            <div className="w-full flex-1 rounded-2xl border border-border/40 bg-background/30 p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{t.scheduleTitle}</p>
              <ol className="divide-y divide-border/30">
                {schedule.map((row, index) => (
                  <li key={row.kind} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        row.paid ? "bg-primary text-primary-foreground" : "border border-primary/40 text-primary"
                      )}
                    >
                      {row.paid ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {row.kind === "deposit"
                          ? `${t.scheduleDeposit}${invoice.deposit_mode === "percent" ? ` (${invoice.deposit_percent}%)` : ""}`
                          : t.scheduleBalance}
                      </p>
                      <p className="text-xs text-muted-foreground">{scheduleDateText(row)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-base font-semibold tabular-nums">{money(row.amountCents)}</p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-primary">
                        {row.paid ? t.schedulePaid : t.scheduleUpcoming}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="w-full max-w-sm rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
            {taxRows.map((row) => (
              <div
                key={row.key}
                className={cn(
                  "flex justify-between py-0.5 text-sm tabular-nums",
                  row.emphasis === "muted" && "text-xs text-muted-foreground",
                  row.emphasis === "total" && "mt-1 border-t border-primary/20 pt-2 font-semibold"
                )}
              >
                <span>{row.label}</span>
                <span>{money(row.amountCents)}</span>
              </div>
            ))}
            {hasDeposit ? (
              <div className="flex justify-between py-0.5 text-sm text-muted-foreground tabular-nums">
                <span>
                  {t.depositRequired}
                  {invoice.deposit_mode === "percent" ? ` (${invoice.deposit_percent}%)` : ""}
                </span>
                <span>{money(invoice.deposit_cents)}</span>
              </div>
            ) : null}
            {invoice.amount_paid_cents !== 0 ? (
              <div className="flex justify-between py-0.5 text-sm text-muted-foreground tabular-nums">
                <span>{t.amountPaid}</span>
                <span>−{money(invoice.amount_paid_cents)}</span>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between border-t border-primary/20 pt-2 font-heading text-lg font-semibold text-primary tabular-nums">
              <span>{t.balanceDue}</span>
              <span>{money(invoice.balance_due_cents)}</span>
            </div>
          </div>
        </div>
        {invoice.payments.length > 0 ? (
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{t.payments}</p>
            <div className="flex flex-wrap gap-2">
              {invoice.payments.map((p) => (
                <span key={p.id} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs tabular-nums">
                  {date(p.paid_on)} · {paymentMethodLabel(settings.payment_methods, p.method, language)} ·{" "}
                  {p.kind === "refund" ? "−" : ""}
                  {money(p.amount_cents)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      {methods.length > 0 && due.dueNowKind !== "none" ? (
        <Card icon={Wallet} title={businessText(settings, "payment_page_title", language)}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-muted-foreground">
              {businessText(settings, "payment_page_intro", language)}
            </p>
            <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
              <span className="text-[10px] uppercase tracking-[0.14em] text-primary">{t.paymentReference}</span>
              <p className="font-heading text-lg font-semibold">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {methods.map((method) => {
              const Icon = METHOD_ICONS[method.kind];
              return (
                <div key={method.id} className="rounded-2xl border border-border/40 bg-background/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <p className="font-heading text-base font-semibold">{method.label}</p>
                  </div>
                  {method.fields.length ? (
                    <dl className="mt-3 space-y-1.5">
                      {method.fields.map((field, index) => (
                        <div key={`${index}-${field.label}`} className="flex justify-between gap-3 text-sm">
                          <dt className="text-muted-foreground">{field.label}</dt>
                          <dd className="text-right font-medium">{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {method.instructions ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{method.instructions}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
          {hasActivePaymentDocument(settings) ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <FileCheck2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-sm font-semibold">
                  {businessText(settings, "payment_document_label", language)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t.documentAttached(businessText(settings, "payment_document_label", language))}
                </span>
              </span>
              <Download className="size-4 shrink-0 text-primary" />
            </a>
          ) : null}
        </Card>
      ) : null}

      {invoice.notes || terms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {invoice.notes ? (
            <Card icon={FileSignature} title={t.notes}>
              <p className="whitespace-pre-line text-sm">{invoice.notes}</p>
            </Card>
          ) : null}
          {terms.length > 0 ? (
            <Card icon={FileSignature} title={t.terms} className={invoice.notes ? "" : "md:col-span-2"}>
              <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                {terms.map((line, index) => (
                  <li key={`${index}-${line.slice(0, 12)}`}>{line}</li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
