import path from "node:path";
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import { customerLocaleTag } from "@/data/customer-language";
import { downloadPaymentDocument } from "@/lib/business-settings";
import { toPdfSafeImage } from "@/lib/pdf-image";
import {
  businessAddressLines,
  businessText,
  computeAmountDue,
  getInvoiceCopy,
  getInvoiceTaxRows,
  INVOICE_STATUS_LABELS,
  invoiceDisplayStatus,
  paymentMethodLabel,
  splitInvoiceTerms,
  hasActivePaymentDocument,
  invoicePaymentSchedule,
  visiblePaymentMethods,
  type InvoiceScheduleRow,
  type BusinessSettings,
  type CustomerSafeInvoice,
} from "@/data/invoices";
import {
  formatMoneyFromCents,
  formatQuoteQuantity,
  formatQuoteUnitPrice,
  quoteLineCategoryLabel,
} from "@/data/quotes";
import { formatQuoteDate, quoteEventTypeLabel } from "@/data/quote-copy";

/** Methods with more fields than this span the full page width in a 3-column grid. */
const WIDE_METHOD_FIELDS = 5;

const COLORS = {
  ink: "#1a1612",
  muted: "#6b635a",
  soft: "#9a9186",
  line: "#e8e0d4",
  cream: "#faf7f2",
  paper: "#fffdf9",
  navy: "#14121a",
  navySoft: "#1e1b24",
  gold: "#c4a035",
  goldDeep: "#8a6d1d",
  goldWash: "#f5efe0",
  white: "#ffffff",
  green: "#2f6b3a",
  red: "#9b2c2c",
};

const LOGO_PATH = path.join(process.cwd(), "public/images/brand/logo-full.png");

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 52,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.ink,
    backgroundColor: COLORS.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: 42, height: 42, objectFit: "contain" },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.gold,
    fontSize: 8,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  headerTitle: { color: COLORS.white, fontSize: 17, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: "#c8c2b8", fontSize: 8, marginTop: 2 },
  headerRight: { alignItems: "flex-end", maxWidth: 200 },
  headerRightStrong: { color: COLORS.white, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  headerRightText: { color: "#c8c2b8", fontSize: 7.5, marginTop: 1.5, textAlign: "right" },
  stamp: {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 9,
    backgroundColor: COLORS.white,
  },
  panelTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  strong: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  body: { fontSize: 8, color: COLORS.ink, lineHeight: 1.35 },
  bodyMuted: { fontSize: 8, color: COLORS.muted, lineHeight: 1.35 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 3 },
  metaLabel: { fontSize: 7.5, color: COLORS.soft },
  metaValue: { fontSize: 8, color: COLORS.ink, textAlign: "right", flex: 1 },
  duePanel: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: COLORS.goldWash,
    borderWidth: 1,
    borderColor: "#e2d4b0",
  },
  dueLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
  },
  dueAmount: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.ink, marginTop: 6 },
  dueHint: { fontSize: 8, color: COLORS.muted, marginTop: 3 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.navySoft,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  th: {
    color: COLORS.gold,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  colThumb: { width: "7%", paddingRight: 6 },
  colDesc: { width: "45%", paddingRight: 10 },
  lineThumb: { width: 22, height: 22, borderRadius: 3, objectFit: "cover" },
  lineThumbPlaceholder: { width: 22, height: 22, borderRadius: 3, backgroundColor: COLORS.goldWash },
  lineCategory: {
    marginTop: 2,
    color: COLORS.gold,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  colQty: { width: "14%", paddingRight: 6 },
  colUnit: { width: "18%", paddingRight: 6 },
  colTotal: { width: "16%" },
  right: { textAlign: "right" },
  totalsWrap: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  schedule: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 7,
    padding: 10,
    backgroundColor: COLORS.white,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  scheduleRowDivider: { borderTopWidth: 1, borderTopColor: COLORS.line },
  scheduleStep: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.navySoft,
    color: COLORS.gold,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 4.5,
  },
  scheduleStepPaid: { backgroundColor: COLORS.goldDeep, color: COLORS.white },
  scheduleName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  scheduleDate: { fontSize: 8.5, color: COLORS.ink, marginTop: 1.5 },
  scheduleAmount: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.ink, textAlign: "right" },
  scheduleStatus: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
    textAlign: "right",
    marginTop: 2,
  },
  totalsBox: {
    width: 230,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.goldWash,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2d4b0",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2.5 },
  totalLabel: { fontSize: 8, color: COLORS.muted },
  totalValue: { fontSize: 8, color: COLORS.ink },
  totalStrongLabel: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  totalStrongValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.goldDeep },
  divider: { borderTopWidth: 1, borderTopColor: "#e2d4b0", marginVertical: 4 },
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 9,
    backgroundColor: COLORS.cream,
  },
  termRow: { flexDirection: "row", gap: 6, marginBottom: 3 },
  termIndex: { width: 11, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: COLORS.goldDeep },
  termText: { flex: 1, fontSize: 7.5, lineHeight: 1.3, color: COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 30,
    right: 30,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  footerText: { fontSize: 6.5, color: COLORS.soft, maxWidth: "75%", lineHeight: 1.4 },
  footerRight: { fontSize: 6.5, color: COLORS.soft, textAlign: "right" },
  payTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  payIntro: { fontSize: 9, color: COLORS.muted, lineHeight: 1.45, marginBottom: 12 },
  refBox: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  refCell: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: COLORS.navy,
  },
  refLabel: {
    fontSize: 7.5,
    color: COLORS.gold,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  refValue: { fontSize: 14, color: COLORS.white, fontFamily: "Helvetica-Bold", marginTop: 4 },
  refHint: { fontSize: 7.5, color: "#c8c2b8", marginTop: 2 },
  methodsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  methodCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  methodHead: {
    backgroundColor: COLORS.goldWash,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2d4b0",
  },
  methodTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  methodCardWide: { width: "100%" },
  methodFieldsWide: { flexDirection: "row", flexWrap: "wrap" },
  methodFieldWide: { width: "33.33%", paddingRight: 8 },
  methodBody: { padding: 10 },
  methodFieldLabel: { fontSize: 7, color: COLORS.soft, textTransform: "uppercase", letterSpacing: 0.8 },
  methodFieldValue: { fontSize: 9, color: COLORS.ink, marginBottom: 5, marginTop: 1 },
  methodInstructions: { fontSize: 8, color: COLORS.muted, lineHeight: 1.4, marginTop: 2 },
});

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function stampStyle(status: string) {
  if (status === "paid") return { color: "#9fe0a9", borderColor: "#9fe0a9" };
  if (status === "void" || status === "overdue") return { color: "#f2a3a3", borderColor: "#f2a3a3" };
  return { color: COLORS.gold, borderColor: COLORS.gold };
}

function InvoicePdfDocument({
  invoice,
  settings,
  publicUrl,
  generatedAt,
}: {
  invoice: CustomerSafeInvoice;
  settings: BusinessSettings;
  publicUrl?: string | null;
  generatedAt: string;
}) {
  const language = invoice.language;
  const t = getInvoiceCopy(language);
  const money = (cents: number) => formatMoneyFromCents(cents, language, invoice.currency);
  const date = (value: string | null | undefined) => formatQuoteDate(value, language, "—");
  const taxRows = getInvoiceTaxRows(invoice, { variant: "customer", language });
  const due = computeAmountDue(invoice);
  const displayStatus = invoiceDisplayStatus(invoice);
  const statusLabel = INVOICE_STATUS_LABELS[language][displayStatus];
  const addressLines = businessAddressLines(settings);
  const methods = visiblePaymentMethods(settings.payment_methods, language, invoice.currency);
  const terms = splitInvoiceTerms(invoice.terms);
  const footerText = businessText(settings, "invoice_footer", language);
  const payTitle = businessText(settings, "payment_page_title", language);
  const payIntro = businessText(settings, "payment_page_intro", language);
  const registrations = [
    settings.gst_number ? `${t.gst} ${settings.gst_number}` : null,
    settings.qst_number ? `${t.qst} ${settings.qst_number}` : null,
    settings.neq ? `${t.neq} ${settings.neq}` : null,
  ].filter(Boolean) as string[];
  const hasDeposit = invoice.deposit_mode !== "none" && invoice.deposit_cents > 0;
  const depositLabel =
    invoice.deposit_mode === "percent"
      ? `${t.depositRequired} (${String(invoice.deposit_percent).replace(".", language === "fr" ? "," : ".")}%)`
      : t.depositRequired;
  const schedule = invoicePaymentSchedule(invoice);
  const balanceRow = schedule.find((row) => row.kind === "balance");
  const scheduleDay = (row: InvoiceScheduleRow) =>
    row.dueDate ? `${date(row.dueDate)}${row.isEventDay ? ` (${t.scheduleEventDay})` : ""}` : t.dueOnReceipt;
  const scheduleDateText = (row: InvoiceScheduleRow) =>
    row.dueDate ? `${row.kind === "deposit" ? t.dueBy : t.scheduleDueOn} ${scheduleDay(row)}` : t.dueOnReceipt;
  const billToLines = [
    invoice.company_name,
    ...(invoice.billing_address || "").split(/\r?\n/),
    invoice.customer_email,
    invoice.customer_phone,
  ]
    .map((line) => line?.trim())
    .filter(Boolean) as string[];

  const dueNowTitle =
    due.dueNowKind === "deposit"
      ? t.depositDue
      : due.dueNowKind === "balance"
        ? t.balanceDue
        : t.balanceDue;
  const dueNowHint =
    due.dueNowKind === "none"
      ? invoice.status === "void"
        ? statusLabel
        : t.paidInFull
      : due.dueNowDate
        ? `${t.dueBy} ${date(due.dueNowDate)}`
        : t.dueOnReceipt;

  const footer = (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {settings.legal_name} · {settings.trade_name} · {settings.email} · {settings.phone}
        {registrations.length ? `\n${registrations.join("  ·  ")}` : ""}
        {footerText ? `\n${footerText}` : ""}
      </Text>
      <Text
        style={styles.footerRight}
        render={({ pageNumber, totalPages }) =>
          `${invoice.invoice_number}\n${t.pageOf(pageNumber, totalPages)}\n${generatedAt}`
        }
      />
    </View>
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
        <Image src={LOGO_PATH} style={styles.logo} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>{settings.trade_name}</Text>
        <Text style={styles.headerTitle}>
          {t.invoice} {invoice.invoice_number}
        </Text>
        <Text style={styles.headerMeta}>
          {t.issueDate} {date(invoice.issue_date)}
          {invoice.due_date ? `  ·  ${t.dueDate} ${date(invoice.due_date)}` : ""}
          {`  ·  ${invoice.currency === "USD" ? "USD" : "CAD"}`}
        </Text>
        <Text style={[styles.stamp, stampStyle(displayStatus), { alignSelf: "flex-start" }]}>
          {statusLabel}
        </Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerRightStrong}>{settings.legal_name}</Text>
        {addressLines.map((line) => (
          <Text key={line} style={styles.headerRightText}>
            {line}
          </Text>
        ))}
        <Text style={styles.headerRightText}>
          {settings.phone} · {settings.email}
        </Text>
        <Text style={styles.headerRightText}>{settings.website}</Text>
      </View>
    </View>
  );

  return (
    <Document
      title={`${t.invoice} ${invoice.invoice_number}`}
      author={settings.legal_name}
      language={customerLocaleTag(language)}
    >
      <Page size="LETTER" style={styles.page} wrap>
        {header}

        <View style={styles.grid} wrap={false}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t.billTo}</Text>
            <Text style={styles.strong}>{invoice.customer_name || "—"}</Text>
            {billToLines.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.bodyMuted}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t.event}</Text>
            <Meta label={t.invoiceNumber} value={invoice.invoice_number} />
            <Meta label={invoice.quote_id ? t.quoteRef : t.reference} value={invoice.opportunity_ref} />
            {invoice.po_number ? <Meta label={t.poNumber} value={invoice.po_number} /> : null}
            {invoice.event_type ? (
              <Meta
                label={t.event}
                value={quoteEventTypeLabel(invoice.event_type, language) || invoice.event_type}
              />
            ) : null}
            <Meta label={t.eventDate} value={date(invoice.event_date)} />
            <Meta label={t.venue} value={invoice.venue_name || "—"} />
          </View>
          <View style={styles.duePanel}>
            <Text style={styles.dueLabel}>{due.dueNowKind === "none" ? t.balanceDue : dueNowTitle}</Text>
            <Text style={styles.dueAmount}>{money(due.dueNowCents)}</Text>
            <Text style={styles.dueHint}>{dueNowHint}</Text>
            {due.dueNowKind === "deposit" && balanceRow ? (
              <Text style={[styles.dueHint, { color: COLORS.ink, fontFamily: "Helvetica-Bold", marginTop: 5 }]}>
                {t.remainingAfterDeposit(money(balanceRow.amountCents), scheduleDay(balanceRow))}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <View style={styles.colThumb} />
          <View style={styles.colDesc}>
            <Text style={styles.th}>{t.description}</Text>
          </View>
          <View style={styles.colQty}>
            <Text style={[styles.th, styles.right]}>{t.qty}</Text>
          </View>
          <View style={styles.colUnit}>
            <Text style={[styles.th, styles.right]}>{t.unitPrice}</Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={[styles.th, styles.right]}>{t.amount}</Text>
          </View>
        </View>
        {invoice.line_items.map((line) => (
          <View key={line.id} style={styles.tr} wrap={false}>
            <View style={styles.colThumb}>
              {line.image_url ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                <Image src={line.image_url} style={styles.lineThumb} />
              ) : (
                <View style={styles.lineThumbPlaceholder} />
              )}
            </View>
            <View style={styles.colDesc}>
              <Text style={styles.body}>{line.description || "—"}</Text>
              {line.category ? (
                <Text style={styles.lineCategory}>
                  {quoteLineCategoryLabel({ ...line, category: line.category }, language)}
                </Text>
              ) : null}
            </View>
            <View style={styles.colQty}>
              <Text style={[styles.body, styles.right]}>
                {formatQuoteQuantity(line.quantity, line.unit_label, language)}
              </Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={[styles.body, styles.right]}>
                {formatQuoteUnitPrice(line.unit_price_cents, line.unit_label, language, invoice.currency)}
              </Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={[styles.body, styles.right]}>{money(line.line_total_cents)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.totalsWrap} wrap={false}>
          {schedule.length > 0 ? (
            <View style={styles.schedule}>
              <Text style={styles.sectionTitle}>{t.scheduleTitle}</Text>
              {schedule.map((row, index) => (
                <View key={row.kind} style={[styles.scheduleRow, index > 0 ? styles.scheduleRowDivider : {}]}>
                  <Text style={[styles.scheduleStep, row.paid ? styles.scheduleStepPaid : {}]}>{index + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleName}>
                      {row.kind === "deposit" ? depositLabel.replace(t.depositRequired, t.scheduleDeposit) : t.scheduleBalance}
                    </Text>
                    <Text style={styles.scheduleDate}>{scheduleDateText(row)}</Text>
                  </View>
                  <View>
                    <Text style={styles.scheduleAmount}>{money(row.amountCents)}</Text>
                    <Text style={styles.scheduleStatus}>{row.paid ? t.schedulePaid : t.scheduleUpcoming}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.totalsBox}>
            {taxRows.map((row) => {
              const isTotal = row.emphasis === "total";
              return (
                <View key={row.key} style={styles.totalRow}>
                  <Text style={isTotal ? styles.totalStrongLabel : styles.totalLabel}>{row.label}</Text>
                  <Text style={isTotal ? styles.totalStrongValue : styles.totalValue}>
                    {money(row.amountCents)}
                  </Text>
                </View>
              );
            })}
            {hasDeposit || invoice.amount_paid_cents !== 0 ? <View style={styles.divider} /> : null}
            {hasDeposit ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {depositLabel}
                  {due.depositPaid ? ` · ${t.depositPaid}` : ""}
                </Text>
                <Text style={styles.totalValue}>{money(invoice.deposit_cents)}</Text>
              </View>
            ) : null}
            {invoice.amount_paid_cents !== 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t.amountPaid}</Text>
                <Text style={styles.totalValue}>−{money(invoice.amount_paid_cents)}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalStrongLabel}>{t.balanceDue}</Text>
              <Text style={styles.totalStrongValue}>{money(invoice.balance_due_cents)}</Text>
            </View>
          </View>
        </View>

        {invoice.payments.length > 0 ? (
          <View style={styles.card} wrap={false}>
            <Text style={styles.sectionTitle}>{t.payments}</Text>
            {invoice.payments.map((p) => (
              <View key={p.id} style={styles.metaRow}>
                <Text style={styles.bodyMuted}>
                  {date(p.paid_on)} · {paymentMethodLabel(settings.payment_methods, p.method, language)}
                </Text>
                <Text style={styles.body}>
                  {p.kind === "refund" ? "−" : ""}
                  {money(p.amount_cents)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={styles.card} wrap={false}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.body}>{invoice.notes}</Text>
          </View>
        ) : null}

        {terms.length > 0 ? (
          <View style={[styles.card, { backgroundColor: COLORS.white }]} wrap={false}>
            <Text style={styles.sectionTitle}>{t.terms}</Text>
            {terms.map((line, index) => (
              <View key={`${index}-${line.slice(0, 12)}`} style={styles.termRow}>
                <Text style={styles.termIndex}>{index + 1}.</Text>
                <Text style={styles.termText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {footer}
      </Page>

      {methods.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          {header}
          <Text style={styles.payTitle}>{payTitle}</Text>
          {payIntro ? <Text style={styles.payIntro}>{payIntro}</Text> : null}

          <View style={styles.refBox}>
            <View style={styles.refCell}>
              <Text style={styles.refLabel}>{t.paymentReference}</Text>
              <Text style={styles.refValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.refCell}>
              <Text style={styles.refLabel}>
                {due.dueNowKind === "none" ? t.balanceDue : dueNowTitle}
              </Text>
              <Text style={styles.refValue}>{money(due.dueNowCents)}</Text>
              <Text style={styles.refHint}>{dueNowHint}</Text>
            </View>
          </View>

          <View style={styles.methodsGrid}>
            {methods.map((method) => {
              const wide = method.fields.length > WIDE_METHOD_FIELDS;
              return (
                <View key={method.id} style={[styles.methodCard, wide ? styles.methodCardWide : {}]} wrap={false}>
                  <View style={styles.methodHead}>
                    <Text style={styles.methodTitle}>{method.label}</Text>
                  </View>
                  <View style={styles.methodBody}>
                    <View style={wide ? styles.methodFieldsWide : {}}>
                      {method.fields.map((field, index) => (
                        <View key={`${index}-${field.label}`} style={wide ? styles.methodFieldWide : {}}>
                          <Text style={styles.methodFieldLabel}>{field.label}</Text>
                          <Text style={styles.methodFieldValue}>{field.value}</Text>
                        </View>
                      ))}
                    </View>
                    {method.instructions ? (
                      <Text style={styles.methodInstructions}>{method.instructions}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }} wrap={false}>
            {hasActivePaymentDocument(settings) ? (
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.sectionTitle}>{businessText(settings, "payment_document_label", language)}</Text>
                <Text style={styles.body}>
                  {t.documentAttached(businessText(settings, "payment_document_label", language))}
                </Text>
              </View>
            ) : null}
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.sectionTitle}>{t.questions}</Text>
              <Text style={styles.body}>
                {settings.email} · {settings.phone} · {settings.website}
              </Text>
              {publicUrl ? (
                <Link src={publicUrl} style={[styles.bodyMuted, { marginTop: 3 }]}>
                  {publicUrl}
                </Link>
              ) : null}
            </View>
          </View>

          {footer}
        </Page>
      ) : null}
    </Document>
  );
}

export function invoicePdfFilename(invoiceNumber: string): string {
  return `${invoiceNumber}.pdf`;
}

export async function renderInvoicePdfBuffer(input: {
  invoice: CustomerSafeInvoice;
  settings: BusinessSettings;
  publicUrl?: string | null;
}): Promise<Buffer> {
  const generatedAt = new Date().toLocaleString(customerLocaleTag(input.invoice.language), {
    timeZone: "America/Toronto",
  });
  const lineItems = await Promise.all(
    input.invoice.line_items.map(async (line) => ({
      ...line,
      image_url: await toPdfSafeImage(line.image_url),
    }))
  );
  const buffer = await renderToBuffer(
    <InvoicePdfDocument
      invoice={{ ...input.invoice, line_items: lineItems }}
      settings={input.settings}
      publicUrl={input.publicUrl}
      generatedAt={generatedAt}
    />
  );
  if (!hasActivePaymentDocument(input.settings) || !input.settings.payment_document_path) {
    return Buffer.from(buffer);
  }
  return appendPaymentDocument(Buffer.from(buffer), input.settings.payment_document_path);
}

/** Appends the payment document (void cheque) pages; falls back to the invoice alone on any failure. */
async function appendPaymentDocument(invoicePdf: Buffer, documentPath: string): Promise<Buffer> {
  const documentBytes = await downloadPaymentDocument(documentPath);
  if (!documentBytes) return invoicePdf;
  try {
    const merged = await PDFDocument.load(invoicePdf);
    const extra = await PDFDocument.load(documentBytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(extra, extra.getPageIndices());
    for (const page of pages) merged.addPage(page);
    return Buffer.from(await merged.save());
  } catch (error) {
    console.error("[invoice-pdf] append payment document failed", error);
    return invoicePdf;
  }
}
