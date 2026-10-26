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
  DEFAULT_QUOTE_TERMS_FR,
  formatCadFromCents,
  formatQuoteQuantity,
  formatQuoteUnitPrice,
  getQuoteTaxBreakdownRows,
  quoteLineCategoryLabel,
  quoteStatusLabel,
  splitQuoteTerms,
  type CustomerSafeQuote,
} from "@/data/quotes";
import { customerLocaleTag } from "@/data/customer-language";
import {
  formatQuoteDate,
  getQuoteCopy,
  quoteEventTypeLabel,
} from "@/data/quote-copy";
import { siteConfig } from "@/data/site";
import { getLocalizedDocumentTexts } from "@/lib/document-texts";
import { toPdfSafeImage } from "@/lib/pdf-image";

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
    flexDirection: "column",
    paddingTop: 22,
    paddingBottom: 48,
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
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 38,
    height: 38,
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
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
  },
  headerMeta: {
    color: "#c8c2b8",
    fontSize: 8,
    marginTop: 2,
  },
  headerTag: {
    color: "#a39e95",
    fontSize: 7,
    marginTop: 1,
    letterSpacing: 0.4,
  },
  actionsCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.cream,
    borderRadius: 8,
    padding: 9,
    marginBottom: 10,
  },
  actionsTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#d9cdb8",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 8,
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
    marginTop: 6,
    fontSize: 7,
    color: COLORS.muted,
  },
  grid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
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
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 7.5,
    color: COLORS.soft,
    width: "38%",
  },
  metaValue: {
    fontSize: 8,
    color: COLORS.ink,
    textAlign: "right",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: COLORS.ink,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navySoft,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginBottom: 1,
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
    alignItems: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  colThumb: {
    width: "7%",
    paddingRight: 6,
  },
  lineThumb: {
    width: 18,
    height: 18,
    borderRadius: 3,
    objectFit: "cover",
  },
  lineThumbPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: COLORS.goldWash,
  },
  colDesc: {
    width: "34%",
    paddingRight: 10,
  },
  colCat: {
    width: "15%",
    paddingRight: 8,
  },
  colQty: {
    width: "11%",
    paddingRight: 6,
  },
  colUnit: {
    width: "19%",
    paddingRight: 6,
  },
  colTotal: {
    width: "14%",
  },
  cell: {
    fontSize: 8,
    color: COLORS.ink,
    lineHeight: 1.3,
  },
  cellMuted: {
    fontSize: 7.5,
    color: COLORS.muted,
    lineHeight: 1.3,
  },
  cellRight: {
    textAlign: "right",
  },
  headerRight: {
    textAlign: "right",
  },
  totalsWrap: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsBox: {
    width: 200,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.goldWash,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2d4b0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  totalLabel: { fontSize: 8, color: COLORS.muted },
  totalValue: { fontSize: 8, color: COLORS.ink },
  totalFinalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: COLORS.ink,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e2d4b0",
  },
  totalFinalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLORS.goldDeep,
    marginTop: 2,
  },
  notesCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 9,
    backgroundColor: COLORS.cream,
  },
  notesBody: {
    fontSize: 8,
    lineHeight: 1.3,
    color: COLORS.ink,
  },
  termsDock: {
    marginTop: "auto",
    justifyContent: "flex-end",
    paddingTop: 10,
  },
  termsCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: COLORS.white,
  },
  termRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 3,
  },
  termIndex: {
    width: 11,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.goldDeep,
  },
  termText: {
    flex: 1,
    fontSize: 7.5,
    lineHeight: 1.28,
    color: COLORS.muted,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 30,
    right: 30,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  footerText: {
    fontSize: 6.5,
    color: COLORS.soft,
    maxWidth: "70%",
  },
  footerRight: {
    fontSize: 6.5,
    color: COLORS.soft,
    textAlign: "right",
  },
});

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
  pdfFooter,
}: {
  quote: CustomerSafeQuote;
  publicUrl?: string | null;
  generatedAt: string;
  siteUrl: string;
  pdfFooter: string;
}) {
  const language = quote.language;
  const t = getQuoteCopy(language);
  const p = t.pdf;
  const formatPdfDate = (value: string | null | undefined) =>
    formatQuoteDate(value, language, "—");
  const pricedItems = quote.line_items.filter(
    (item) => item.status === "priced" || item.status === "included"
  );
  const taxRows = getQuoteTaxBreakdownRows(quote, {
    variant: "customer",
    language,
  });
  const terms = splitQuoteTerms(
    quote.terms,
    language === "fr" ? DEFAULT_QUOTE_TERMS_FR : DEFAULT_QUOTE_TERMS
  );
  const proposalUrl = publicUrl || quote.share_url || null;
  const base = siteUrl.replace(/\/$/, "");
  const websiteUrl = `https://${siteConfig.domain}`;
  const mailSubject = encodeURIComponent(
    `${quote.quote_display_ref} · ${siteConfig.name}`
  );
  const mailBody = encodeURIComponent(
    proposalUrl
      ? p.mailBodyWithUrl(proposalUrl)
      : p.mailBodyNoUrl(quote.quote_display_ref)
  );
  const mailHref = `mailto:${siteConfig.email}?subject=${mailSubject}&body=${mailBody}`;
  const whatsappText = encodeURIComponent(
    proposalUrl
      ? t.shareWhatsApp(quote.quote_display_ref, siteConfig.name, proposalUrl)
      : quote.quote_display_ref
  );
  const whatsappHref = `https://wa.me/?text=${whatsappText}`;

  return (
    <Document
      title={quote.quote_display_ref}
      author={siteConfig.name}
      subject={p.subject(quote.opportunity_ref)}
      language={customerLocaleTag(language)}
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
              {p.opportunity} {quote.opportunity_ref}
              {quote.valid_until
                ? `  ·  ${p.validUntil} ${formatPdfDate(quote.valid_until)}`
                : ""}
              {"  ·  CAD"}
            </Text>
            <Text style={styles.headerTag}>
              {p.tagline} · {p.motto}
            </Text>
          </View>
        </View>

        <View style={styles.actionsCard} wrap={false}>
          <Text style={styles.actionsTitle}>{p.respondTitle}</Text>
          <View style={styles.actionsRow}>
            {proposalUrl ? (
              <Link src={proposalUrl} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <IconLink />
                <Text style={styles.actionLabelOnDark}>{p.openProposal}</Text>
              </Link>
            ) : (
              <Link src={websiteUrl} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <IconLink />
                <Text style={styles.actionLabelOnDark}>{p.visitWebsite}</Text>
              </Link>
            )}
            <Link src={mailHref} style={styles.actionBtn}>
              <IconMail />
              <Text style={styles.actionLabel}>{t.email}</Text>
            </Link>
            <Link src={whatsappHref} style={styles.actionBtn}>
              <IconChat />
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </Link>
            <Link src={siteConfig.phoneHref} style={styles.actionBtn}>
              <IconPhone />
              <Text style={styles.actionLabel}>{p.call}</Text>
            </Link>
            <Link src={websiteUrl} style={styles.actionBtn}>
              <IconDot />
              <Text style={styles.actionLabel}>{siteConfig.domain}</Text>
            </Link>
          </View>
          {proposalUrl ? (
            <Text style={styles.actionUrl}>
              {p.interactiveProposal} {proposalUrl}
            </Text>
          ) : (
            <Text style={styles.actionUrl}>
              {p.noLinkHint} · {base}
            </Text>
          )}
        </View>

        <View style={styles.grid} wrap={false}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{p.event}</Text>
            <Meta
              label={p.type}
              value={quoteEventTypeLabel(quote.event_type, language) || "—"}
            />
            <Meta label={p.date} value={formatPdfDate(quote.event_date)} />
            <Meta label={p.venue} value={quote.venue_name || "—"} />
            <Meta label={p.cityArea} value={quote.city_area || "—"} />
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{p.client}</Text>
            <Meta label={p.name} value={quote.customer_name || "—"} />
            <Meta label={t.email} value={quote.customer_email || "—"} />
            <Meta
              label={p.status}
              value={quoteStatusLabel(quote.status, language)}
            />
            <Meta label={p.currency} value="CAD" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{p.scopePricing}</Text>
        <View style={styles.tableHeader}>
          <View style={styles.colThumb}>
            <Text style={styles.tableHeaderText}> </Text>
          </View>
          <View style={styles.colDesc}>
            <Text style={styles.tableHeaderText}>{p.description}</Text>
          </View>
          <View style={styles.colCat}>
            <Text style={styles.tableHeaderText}>{p.category}</Text>
          </View>
          <View style={styles.colQty}>
            <Text style={[styles.tableHeaderText, styles.headerRight]}>
              {t.colQty}
            </Text>
          </View>
          <View style={styles.colUnit}>
            <Text style={[styles.tableHeaderText, styles.headerRight]}>
              {t.colPrice}
            </Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={[styles.tableHeaderText, styles.headerRight]}>
              {p.total}
            </Text>
          </View>
        </View>
        {pricedItems.length === 0 ? (
          <Text style={styles.cellMuted}>{p.noPricedItems}</Text>
        ) : (
          pricedItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <View style={styles.colThumb}>
                {item.image_url ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                  <Image src={item.image_url} style={styles.lineThumb} />
                ) : (
                  <View style={styles.lineThumbPlaceholder} />
                )}
              </View>
              <View style={styles.colDesc}>
                <Text style={styles.cell}>
                  {item.description}
                  {item.status === "included" ? p.includedSuffix : ""}
                </Text>
              </View>
              <View style={styles.colCat}>
                <Text style={styles.cellMuted}>
                  {quoteLineCategoryLabel(item, language)}
                </Text>
              </View>
              <View style={styles.colQty}>
                <Text style={[styles.cell, styles.cellRight]}>
                  {formatQuoteQuantity(item.quantity, item.unit_label, language)}
                </Text>
              </View>
              <View style={styles.colUnit}>
                <Text style={[styles.cell, styles.cellRight]}>
                  {item.status === "included"
                    ? "—"
                    : formatQuoteUnitPrice(
                        item.unit_price_cents,
                        item.unit_label,
                        language
                      )}
                </Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={[styles.cell, styles.cellRight]}>
                  {item.status === "included"
                    ? t.included
                    : formatCadFromCents(item.line_total_cents, language)}
                </Text>
              </View>
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
                    {formatCadFromCents(row.amountCents, language)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {quote.customer_notes ? (
          <View style={styles.notesCard} wrap={false}>
            <Text style={styles.sectionTitle}>{t.notesForYou}</Text>
            <Text style={styles.notesBody}>{quote.customer_notes}</Text>
          </View>
        ) : null}

        <View style={styles.termsDock} wrap={false}>
          <View style={styles.termsCard}>
            <Text style={styles.sectionTitle}>{t.termsTitle}</Text>
            {terms.map((line, index) => (
              <View
                key={`${index}-${line.slice(0, 16)}`}
                style={styles.termRow}
                wrap={false}
              >
                <Text style={styles.termIndex}>{index + 1}.</Text>
                <Text style={styles.termText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {siteConfig.name} · {siteConfig.email} · {siteConfig.phone} ·{" "}
            {p.location}
            {"\n"}
            {pdfFooter}
          </Text>
          <Text style={styles.footerRight}>
            {p.generated} {generatedAt}
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
  const language = input.quote.language;
  const generatedAt = new Date().toLocaleString(customerLocaleTag(language), {
    timeZone: "America/Toronto",
  });
  const siteUrl =
    input.siteUrl?.replace(/\/$/, "") ||
    `https://${siteConfig.domain}`;
  const copy = await getLocalizedDocumentTexts(language);
  const lineItems = await Promise.all(
    input.quote.line_items.map(async (item) => ({
      ...item,
      image_url: await toPdfSafeImage(item.image_url),
    }))
  );
  const quote = {
    ...input.quote,
    line_items: lineItems,
    terms: input.quote.terms?.trim() || copy["quote.terms"],
  };
  const buffer = await renderToBuffer(
    <QuotePdfDocument
      quote={quote}
      publicUrl={input.publicUrl}
      generatedAt={generatedAt}
      siteUrl={siteUrl}
      pdfFooter={copy["quote.pdf_footer"]}
    />
  );
  return Buffer.from(buffer);
}
