import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  renderToBuffer,
  Svg,
  Path,
  Circle,
} from "@react-pdf/renderer";
import {
  DEFAULT_QUOTE_TERMS,
  QUOTE_CATEGORY_LABELS,
  formatCadFromCents,
  getQuoteTaxBreakdownRows,
  type CustomerSafeQuote,
  type QuoteLineCategory,
} from "@/data/quotes";
import { siteConfig } from "@/data/site";
import { formatDisplayDate, parseISODate } from "@/lib/date";

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
};

const LOGO_PATH = path.join(
  process.cwd(),
  "public/images/brand/logo-full.png"
);

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 56,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.ink,
    backgroundColor: COLORS.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandEyebrow: {
    color: COLORS.gold,
    fontSize: 8,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  headerMeta: {
    color: "#c8c2b8",
    fontSize: 8.5,
    marginTop: 3,
  },
  headerTag: {
    color: "#a39e95",
    fontSize: 7.5,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  actionsCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.cream,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  actionsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#d9cdb8",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  actionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  actionLabelOnDark: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  actionUrl: {
    marginTop: 8,
    fontSize: 7.5,
    color: COLORS.muted,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 11,
    backgroundColor: COLORS.white,
  },
  panelTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: COLORS.soft,
    width: "38%",
  },
  metaValue: {
    fontSize: 8.5,
    color: COLORS.ink,
    textAlign: "right",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: COLORS.ink,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.navySoft,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: COLORS.gold,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  colDesc: { width: "44%" },
  colCat: { width: "20%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "13%", textAlign: "right" },
  colTotal: { width: "13%", textAlign: "right" },
  cell: { fontSize: 8.5, color: COLORS.ink },
  cellMuted: { fontSize: 8, color: COLORS.muted },
  totalsWrap: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsBox: {
    width: 220,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.goldWash,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2d4b0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalLabel: { fontSize: 8.5, color: COLORS.muted },
  totalValue: { fontSize: 8.5, color: COLORS.ink },
  totalFinalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLORS.ink,
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#e2d4b0",
  },
  totalFinalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: COLORS.goldDeep,
    marginTop: 3,
  },
  notesCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 11,
    backgroundColor: COLORS.cream,
  },
  notesBody: {
    fontSize: 8.5,
    lineHeight: 1.35,
    color: COLORS.ink,
  },
  termsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 11,
    backgroundColor: COLORS.white,
  },
  termRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 4,
  },
  termIndex: {
    width: 12,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.goldDeep,
  },
  termText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 1.3,
    color: COLORS.muted,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.line,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.soft,
    maxWidth: "70%",
  },
  footerRight: {
    fontSize: 7,
    color: COLORS.soft,
    textAlign: "right",
  },
});

function formatPdfDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed);
  try {
    return formatDisplayDate(new Date(value));
  } catch {
    return value;
  }
}

function splitTerms(terms: string | null | undefined): string[] {
  const raw = (terms?.trim() || DEFAULT_QUOTE_TERMS).trim();
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^currency is cad\.?$/i.test(line));
}

function IconLink({ size = 9 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={COLORS.white}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={COLORS.white}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

function IconMail({ size = 9 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 6h16v12H4z"
        stroke={COLORS.ink}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M4 7l8 6 8-6"
        stroke={COLORS.ink}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

function IconPhone({ size = 9 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3A2 2 0 0 1 18 19 14 14 0 0 1 4 5a2 2 0 0 1 2.5-1.5z"
        stroke={COLORS.ink}
        strokeWidth={1.6}
        fill="none"
      />
    </Svg>
  );
}

function IconChat({ size = 9 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        stroke={COLORS.ink}
        strokeWidth={1.8}
        fill="none"
      />
    </Svg>
  );
}

function IconDot({ color = COLORS.gold }: { color?: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={2.5} fill={color} />
    </Svg>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function QuotePdfDocument({
  quote,
  publicUrl,
  generatedAt,
  siteUrl,
}: {
  quote: CustomerSafeQuote;
  publicUrl?: string | null;
  generatedAt: string;
  siteUrl: string;
}) {
  const pricedItems = quote.line_items.filter(
    (item) => item.status === "priced" || item.status === "included"
  );
  const taxRows = getQuoteTaxBreakdownRows(quote, { variant: "customer" });
  const terms = splitTerms(quote.terms);
  const proposalUrl = publicUrl || quote.share_url || null;
  const base = siteUrl.replace(/\/$/, "");
  const websiteUrl = `https://${siteConfig.domain}`;
  const mailSubject = encodeURIComponent(
    `${quote.quote_display_ref} · ${siteConfig.name}`
  );
  const mailBody = encodeURIComponent(
    proposalUrl
      ? `Regarding your draping proposal:\n\n${proposalUrl}`
      : `Regarding proposal ${quote.quote_display_ref}`
  );
  const mailHref = `mailto:${siteConfig.email}?subject=${mailSubject}&body=${mailBody}`;
  const whatsappText = encodeURIComponent(
    proposalUrl
      ? `${quote.quote_display_ref} from ${siteConfig.name}: ${proposalUrl}`
      : `${quote.quote_display_ref} from ${siteConfig.name}`
  );
  const whatsappHref = `https://wa.me/?text=${whatsappText}`;

  return (
    <Document
      title={quote.quote_display_ref}
      author={siteConfig.name}
      subject={`Proposal ${quote.opportunity_ref}`}
      keywords="event draping, proposal, Montreal"
    >
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed={false}>
          <View style={styles.logoWrap}>
            <Image src={LOGO_PATH} style={styles.logo} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.brandEyebrow}>{siteConfig.name}</Text>
            <Text style={styles.headerTitle}>{quote.quote_display_ref}</Text>
            <Text style={styles.headerMeta}>
              Opportunity {quote.opportunity_ref}
              {quote.valid_until
                ? `  ·  Valid until ${formatPdfDate(quote.valid_until)}`
                : ""}
              {"  ·  CAD"}
            </Text>
            <Text style={styles.headerTag}>
              {siteConfig.tagline} · {siteConfig.motto}
            </Text>
          </View>
        </View>

        <View style={styles.actionsCard} wrap={false}>
          <Text style={styles.actionsTitle}>Respond & share online</Text>
          <View style={styles.actionsRow}>
            {proposalUrl ? (
              <Link src={proposalUrl} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <IconLink />
                <Text style={styles.actionLabelOnDark}>Open proposal</Text>
              </Link>
            ) : (
              <Link src={websiteUrl} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <IconLink />
                <Text style={styles.actionLabelOnDark}>Visit website</Text>
              </Link>
            )}
            <Link src={mailHref} style={styles.actionBtn}>
              <IconMail />
              <Text style={styles.actionLabel}>Email</Text>
            </Link>
            <Link src={whatsappHref} style={styles.actionBtn}>
              <IconChat />
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </Link>
            <Link src={siteConfig.phoneHref} style={styles.actionBtn}>
              <IconPhone />
              <Text style={styles.actionLabel}>Call</Text>
            </Link>
            <Link src={websiteUrl} style={styles.actionBtn}>
              <IconDot />
              <Text style={styles.actionLabel}>{siteConfig.domain}</Text>
            </Link>
          </View>
          {proposalUrl ? (
            <Text style={styles.actionUrl}>
              Interactive proposal: {proposalUrl}
            </Text>
          ) : (
            <Text style={styles.actionUrl}>
              Accept, request changes, or ask questions from your guest proposal
              link when available · {base}
            </Text>
          )}
        </View>

        <View style={styles.grid} wrap={false}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Event</Text>
            <Meta label="Type" value={quote.event_type || "—"} />
            <Meta label="Date" value={formatPdfDate(quote.event_date)} />
            <Meta label="Venue" value={quote.venue_name || "—"} />
            <Meta label="City / area" value={quote.city_area || "—"} />
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Client</Text>
            <Meta label="Name" value={quote.customer_name || "—"} />
            <Meta label="Email" value={quote.customer_email || "—"} />
            <Meta
              label="Status"
              value={
                quote.status.replaceAll("_", " ").replace(/^\w/, (c) =>
                  c.toUpperCase()
                )
              }
            />
            <Meta label="Currency" value="CAD" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Scope & pricing</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.tableHeaderText]}>
            Description
          </Text>
          <Text style={[styles.colCat, styles.tableHeaderText]}>Category</Text>
          <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
          <Text style={[styles.colUnit, styles.tableHeaderText]}>Unit</Text>
          <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
        </View>
        {pricedItems.length === 0 ? (
          <Text style={styles.cellMuted}>No priced line items yet.</Text>
        ) : (
          pricedItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.colDesc, styles.cell]}>
                {item.description}
                {item.status === "included" ? " (Included)" : ""}
              </Text>
              <Text style={[styles.colCat, styles.cellMuted]}>
                {QUOTE_CATEGORY_LABELS[item.category as QuoteLineCategory] ||
                  item.category}
              </Text>
              <Text style={[styles.colQty, styles.cell]}>
                {String(item.quantity)}
              </Text>
              <Text style={[styles.colUnit, styles.cell]}>
                {item.status === "included"
                  ? "—"
                  : formatCadFromCents(item.unit_price_cents)}
              </Text>
              <Text style={[styles.colTotal, styles.cell]}>
                {item.status === "included"
                  ? "Included"
                  : formatCadFromCents(item.line_total_cents)}
              </Text>
            </View>
          ))
        )}

        <View style={styles.totalsWrap} wrap={false}>
          <View style={styles.totalsBox}>
            {taxRows.map((row) => {
              const isTotal = row.emphasis === "total";
              return (
                <View key={row.key} style={styles.totalRow}>
                  <Text
                    style={isTotal ? styles.totalFinalLabel : styles.totalLabel}
                  >
                    {row.label}
                  </Text>
                  <Text
                    style={isTotal ? styles.totalFinalValue : styles.totalValue}
                  >
                    {formatCadFromCents(row.amountCents)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {quote.customer_notes ? (
          <View style={styles.notesCard} wrap={false}>
            <Text style={styles.sectionTitle}>Notes for you</Text>
            <Text style={styles.notesBody}>{quote.customer_notes}</Text>
          </View>
        ) : null}

        <View style={styles.termsCard} wrap={false} minPresenceAhead={80}>
          <Text style={styles.sectionTitle}>Terms & conditions</Text>
          {terms.map((line, index) => (
            <View key={`${index}-${line.slice(0, 16)}`} style={styles.termRow}>
              <Text style={styles.termIndex}>{index + 1}.</Text>
              <Text style={styles.termText}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {siteConfig.name} · {siteConfig.email} · {siteConfig.phone} ·{" "}
            {siteConfig.location}
            {"\n"}
            Planning proposal only. Booking confirmed separately in writing.
          </Text>
          <Text style={styles.footerRight}>
            Generated {generatedAt}
            {"\n"}
            {siteConfig.domain}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdfBuffer(input: {
  quote: CustomerSafeQuote;
  publicUrl?: string | null;
  siteUrl?: string | null;
}): Promise<Buffer> {
  const generatedAt = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto",
  });
  const siteUrl =
    input.siteUrl?.replace(/\/$/, "") ||
    `https://${siteConfig.domain}`;
  const buffer = await renderToBuffer(
    <QuotePdfDocument
      quote={input.quote}
      publicUrl={input.publicUrl}
      generatedAt={generatedAt}
      siteUrl={siteUrl}
    />
  );
  return Buffer.from(buffer);
}
