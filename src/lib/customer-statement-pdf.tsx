import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { customerLocaleTag, type CustomerLanguage } from "@/data/customer-language";
import { formatCustomerBillingAddress, formatCustomerNumber, type CustomerRow } from "@/data/customers";
import {
  INVOICE_STATUS_LABELS,
  businessAddressLines,
  invoiceDisplayStatus,
  isInvoiceOverdue,
  visiblePaymentMethods,
  type BusinessSettings,
  type InvoicePaymentRow,
  type InvoiceRow,
} from "@/data/invoices";
import { formatMoneyFromCents } from "@/data/quotes";
import { formatQuoteDate } from "@/data/quote-copy";

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
  red: "#9b2c2c",
  green: "#2f6b3a",
};

const LOGO_PATH = path.join(process.cwd(), "public/images/brand/logo-full.png");

const COPY = {
  en: {
    title: "Statement of account",
    statementDate: "Statement date",
    customerNo: "Customer #",
    billTo: "Account",
    summary: "Summary",
    invoiced: "Total invoiced",
    paid: "Total paid",
    owing: "Balance owing",
    overdue: "Overdue",
    invoices: "Invoices",
    invoice: "Invoice",
    issued: "Issued",
    due: "Due",
    event: "Event",
    total: "Total",
    paidCol: "Paid",
    balance: "Balance",
    status: "Status",
    payments: "Payments received",
    date: "Date",
    method: "Method",
    reference: "Reference",
    amount: "Amount",
    refund: "Refund",
    noInvoices: "No invoices on this account yet.",
    noPayments: "No payments recorded.",
    howToPay: "How to pay",
    payRef: "Please include the invoice number with each payment.",
    allPaid: "Your account is fully paid — thank you!",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    onReceipt: "On receipt",
  },
  fr: {
    title: "État de compte",
    statementDate: "Date de l'état",
    customerNo: "Client n°",
    billTo: "Compte",
    summary: "Sommaire",
    invoiced: "Total facturé",
    paid: "Total payé",
    owing: "Solde à payer",
    overdue: "En retard",
    invoices: "Factures",
    invoice: "Facture",
    issued: "Émise",
    due: "Échéance",
    event: "Événement",
    total: "Total",
    paidCol: "Payé",
    balance: "Solde",
    status: "Statut",
    payments: "Paiements reçus",
    date: "Date",
    method: "Mode",
    reference: "Référence",
    amount: "Montant",
    refund: "Remboursement",
    noInvoices: "Aucune facture à ce compte pour l'instant.",
    noPayments: "Aucun paiement enregistré.",
    howToPay: "Modes de paiement",
    payRef: "Veuillez indiquer le numéro de facture avec chaque paiement.",
    allPaid: "Votre compte est entièrement payé — merci!",
    pageOf: (page: number, total: number) => `Page ${page} de ${total}`,
    onReceipt: "Sur réception",
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 52,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
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
  eyebrow: { color: COLORS.gold, fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 3 },
  headerTitle: { color: COLORS.white, fontSize: 17, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: "#c8c2b8", fontSize: 8, marginTop: 2 },
  headerRight: { alignItems: "flex-end", maxWidth: 200 },
  headerRightStrong: { color: COLORS.white, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  headerRightText: { color: "#c8c2b8", fontSize: 7.5, marginTop: 1.5, textAlign: "right" },
  grid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  panel: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 9, backgroundColor: COLORS.white },
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
  bodyMuted: { fontSize: 8, color: COLORS.muted, lineHeight: 1.35 },
  tiles: { flex: 1.4, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tile: { width: "48.5%", borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 8, backgroundColor: COLORS.white },
  tileAccent: { backgroundColor: COLORS.goldWash, borderColor: "#e2d4b0" },
  tileLabel: { fontSize: 7, color: COLORS.goldDeep, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  tileValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 3 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: COLORS.navySoft, borderRadius: 5, paddingVertical: 5, paddingHorizontal: 7 },
  th: { color: COLORS.gold, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 5.5, paddingHorizontal: 7, borderBottomWidth: 0.75, borderBottomColor: COLORS.line },
  td: { fontSize: 8 },
  right: { textAlign: "right" },
  status: { fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  empty: { fontSize: 8, color: COLORS.muted, paddingVertical: 8, paddingHorizontal: 7 },
  totalsRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 7, backgroundColor: COLORS.goldWash, borderRadius: 5, marginTop: 4 },
  methods: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  method: { width: "48.5%", borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 8, backgroundColor: COLORS.white },
  methodTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  methodLine: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.35 },
  note: { marginTop: 10, padding: 9, borderRadius: 8, backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.line },
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
});

const INVOICE_COLS = {
  number: { width: "17%" },
  issued: { width: "11%" },
  due: { width: "11%" },
  event: { width: "17%" },
  total: { width: "12%" },
  paid: { width: "11%" },
  balance: { width: "12%" },
  status: { width: "9%" },
} as const;

function statusColor(status: string): string {
  if (status === "paid") return COLORS.green;
  if (status === "overdue" || status === "void") return COLORS.red;
  return COLORS.goldDeep;
}

export type StatementInput = {
  customer: CustomerRow;
  invoices: InvoiceRow[];
  payments: Array<InvoicePaymentRow & { invoice_number: string }>;
  settings: BusinessSettings;
  language: CustomerLanguage;
  openOnly?: boolean;
};

function StatementDocument({ customer, invoices, payments, settings, language, generatedAt, today }: StatementInput & { generatedAt: string; today: string }) {
  const t = COPY[language];
  const statusLabels = INVOICE_STATUS_LABELS[language];
  const currency = customer.currency;
  const money = (cents: number, cur: string | null = currency) => formatMoneyFromCents(cents, language, cur);
  const date = (value: string | null) => (value ? formatQuoteDate(value, language, "—") : "—");
  const shortDate = (value: string | null) => {
    if (!value) return "—";
    const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(customerLocaleTag(language), { day: "numeric", month: "short", year: "numeric" });
  };

  const totals = invoices.reduce(
    (acc, inv) => {
      acc.invoiced += inv.total_cents;
      acc.paid += inv.amount_paid_cents;
      acc.owing += Math.max(0, inv.balance_due_cents);
      if (isInvoiceOverdue(inv, today)) acc.overdue += Math.max(0, inv.balance_due_cents);
      return acc;
    },
    { invoiced: 0, paid: 0, owing: 0, overdue: 0 }
  );
  const address = formatCustomerBillingAddress(customer);
  const methods = visiblePaymentMethods(settings.payment_methods, language, currency);
  const footer = (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {settings.legal_name} · {settings.trade_name} · {settings.email} · {settings.phone}
      </Text>
      <Text
        style={styles.footerRight}
        render={({ pageNumber, totalPages }) => `${t.title}\n${t.pageOf(pageNumber, totalPages)}\n${generatedAt}`}
      />
    </View>
  );

  return (
    <Document title={`${t.title} — ${customer.display_name}`} author={settings.legal_name} language={customerLocaleTag(language)}>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image src={LOGO_PATH} style={styles.logo} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{settings.trade_name}</Text>
            <Text style={styles.headerTitle}>{t.title}</Text>
            <Text style={styles.headerMeta}>
              {t.statementDate} {date(today)}  ·  {t.customerNo} {formatCustomerNumber(customer.customer_number)}  ·  {currency}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerRightStrong}>{settings.legal_name}</Text>
            {businessAddressLines(settings).map((line) => (
              <Text key={line} style={styles.headerRightText}>
                {line}
              </Text>
            ))}
            <Text style={styles.headerRightText}>
              {settings.phone} · {settings.email}
            </Text>
          </View>
        </View>

        <View style={styles.grid} wrap={false}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t.billTo}</Text>
            <Text style={styles.strong}>{customer.display_name}</Text>
            {customer.company_name && customer.company_name !== customer.display_name ? (
              <Text style={styles.bodyMuted}>{customer.company_name}</Text>
            ) : null}
            {address.split("\n").filter(Boolean).map((line) => (
              <Text key={line} style={styles.bodyMuted}>
                {line}
              </Text>
            ))}
            <Text style={styles.bodyMuted}>{customer.primary_email}</Text>
            {customer.phone ? <Text style={styles.bodyMuted}>{customer.phone}</Text> : null}
          </View>
          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>{t.invoiced}</Text>
              <Text style={styles.tileValue}>{money(totals.invoiced)}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>{t.paid}</Text>
              <Text style={styles.tileValue}>{money(totals.paid)}</Text>
            </View>
            <View style={[styles.tile, styles.tileAccent]}>
              <Text style={styles.tileLabel}>{t.owing}</Text>
              <Text style={styles.tileValue}>{money(totals.owing)}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>{t.overdue}</Text>
              <Text style={[styles.tileValue, totals.overdue > 0 ? { color: COLORS.red } : {}]}>{money(totals.overdue)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.invoices}</Text>
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, INVOICE_COLS.number]}>{t.invoice}</Text>
          <Text style={[styles.th, INVOICE_COLS.issued]}>{t.issued}</Text>
          <Text style={[styles.th, INVOICE_COLS.due]}>{t.due}</Text>
          <Text style={[styles.th, INVOICE_COLS.event]}>{t.event}</Text>
          <Text style={[styles.th, styles.right, INVOICE_COLS.total]}>{t.total}</Text>
          <Text style={[styles.th, styles.right, INVOICE_COLS.paid]}>{t.paidCol}</Text>
          <Text style={[styles.th, styles.right, INVOICE_COLS.balance]}>{t.balance}</Text>
          <Text style={[styles.th, styles.right, INVOICE_COLS.status]}>{t.status}</Text>
        </View>
        {invoices.length === 0 ? <Text style={styles.empty}>{t.noInvoices}</Text> : null}
        {invoices.map((inv) => {
          const display = invoiceDisplayStatus(inv);
          const label = display === "overdue" ? t.overdue : statusLabels[display];
          return (
            <View key={inv.id} style={styles.tr} wrap={false}>
              <Text style={[styles.td, INVOICE_COLS.number, { fontFamily: "Helvetica-Bold" }]}>{inv.invoice_number}</Text>
              <Text style={[styles.td, INVOICE_COLS.issued]}>{shortDate(inv.issue_date)}</Text>
              <Text style={[styles.td, INVOICE_COLS.due]}>{inv.due_date ? shortDate(inv.due_date) : t.onReceipt}</Text>
              <Text style={[styles.td, INVOICE_COLS.event]}>
                {[inv.event_date ? shortDate(inv.event_date) : null, inv.venue_name].filter(Boolean).join(" · ") || "—"}
              </Text>
              <Text style={[styles.td, styles.right, INVOICE_COLS.total]}>{money(inv.total_cents, inv.currency)}</Text>
              <Text style={[styles.td, styles.right, INVOICE_COLS.paid]}>{money(inv.amount_paid_cents, inv.currency)}</Text>
              <Text style={[styles.td, styles.right, INVOICE_COLS.balance, { fontFamily: "Helvetica-Bold" }]}>
                {money(Math.max(0, inv.balance_due_cents), inv.currency)}
              </Text>
              <Text style={[styles.status, styles.right, INVOICE_COLS.status, { color: statusColor(display) }]}>{label}</Text>
            </View>
          );
        })}
        {invoices.length > 0 ? (
          <View style={styles.totalsRow} wrap={false}>
            <Text style={[styles.td, { width: "56%", fontFamily: "Helvetica-Bold" }]}>{t.owing}</Text>
            <Text style={[styles.td, styles.right, INVOICE_COLS.total]}>{money(totals.invoiced)}</Text>
            <Text style={[styles.td, styles.right, INVOICE_COLS.paid]}>{money(totals.paid)}</Text>
            <Text style={[styles.td, styles.right, INVOICE_COLS.balance, { fontFamily: "Helvetica-Bold", color: COLORS.goldDeep }]}>
              {money(totals.owing)}
            </Text>
            <Text style={[styles.td, INVOICE_COLS.status]} />
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t.payments}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "16%" }]}>{t.date}</Text>
          <Text style={[styles.th, { width: "22%" }]}>{t.invoice}</Text>
          <Text style={[styles.th, { width: "22%" }]}>{t.method}</Text>
          <Text style={[styles.th, { width: "22%" }]}>{t.reference}</Text>
          <Text style={[styles.th, styles.right, { width: "18%" }]}>{t.amount}</Text>
        </View>
        {payments.length === 0 ? <Text style={styles.empty}>{t.noPayments}</Text> : null}
        {payments.map((payment) => (
          <View key={payment.id} style={styles.tr} wrap={false}>
            <Text style={[styles.td, { width: "16%" }]}>{shortDate(payment.paid_on)}</Text>
            <Text style={[styles.td, { width: "22%" }]}>{payment.invoice_number}</Text>
            <Text style={[styles.td, { width: "22%" }]}>
              {payment.kind === "refund" ? `${t.refund} · ` : ""}
              {payment.method || "—"}
            </Text>
            <Text style={[styles.td, { width: "22%" }]}>{payment.reference || "—"}</Text>
            <Text style={[styles.td, styles.right, { width: "18%" }]}>
              {payment.kind === "refund" ? "−" : ""}
              {money(payment.amount_cents)}
            </Text>
          </View>
        ))}

        {totals.owing > 0 && methods.length > 0 ? (
          <View wrap={false}>
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t.howToPay}</Text>
            <View style={styles.methods}>
              {methods.map((method) => (
                <View key={method.id} style={styles.method}>
                  <Text style={styles.methodTitle}>{method.label}</Text>
                  {method.fields.map((field) => (
                    <Text key={`${field.label}-${field.value}`} style={styles.methodLine}>
                      {field.label}: {field.value}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
            <Text style={[styles.bodyMuted, { marginTop: 6 }]}>{t.payRef}</Text>
          </View>
        ) : null}
        {totals.owing <= 0 && invoices.length > 0 ? (
          <View style={styles.note}>
            <Text style={[styles.strong, { color: COLORS.green }]}>{t.allPaid}</Text>
          </View>
        ) : null}

        {footer}
      </Page>
    </Document>
  );
}

export function statementPdfFilename(customer: Pick<CustomerRow, "customer_number">, today: string): string {
  return `Statement-${formatCustomerNumber(customer.customer_number)}-${today}.pdf`;
}

export async function renderCustomerStatementPdf(input: StatementInput): Promise<Buffer> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const generatedAt = new Date().toLocaleString(customerLocaleTag(input.language), { timeZone: "America/Toronto" });
  const issued = input.invoices.filter((inv) => inv.status !== "draft" && inv.status !== "void");
  const invoices = (input.openOnly ? issued.filter((inv) => inv.balance_due_cents > 0) : issued).sort((a, b) =>
    a.issue_date.localeCompare(b.issue_date)
  );
  const included = new Set(invoices.map((inv) => inv.id));
  const payments = input.payments
    .filter((payment) => included.has(payment.invoice_id))
    .sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const buffer = await renderToBuffer(
    <StatementDocument {...input} invoices={invoices} payments={payments} generatedAt={generatedAt} today={today} />
  );
  return Buffer.from(buffer);
}
