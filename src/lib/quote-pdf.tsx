import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  QUOTE_CATEGORY_LABELS,
  formatCadFromCents,
  type CustomerSafeQuote,
  type QuoteLineCategory,
} from "@/data/quotes";
import { siteConfig } from "@/data/site";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  headerBar: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 22,
    borderRadius: 8,
  },
  brand: {
    color: "#d4af37",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: "#f8fafc",
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 8,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  muted: {
    color: "#6b7280",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4af37",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  colDesc: { width: "46%" },
  colCat: { width: "18%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "13%", textAlign: "right" },
  colTotal: { width: "13%", textAlign: "right" },
  totalBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#f8f5ec",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e7d7a5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#8a6d1d",
  },
  notes: {
    marginTop: 8,
    lineHeight: 1.45,
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
});

function QuotePdfDocument({
  quote,
  publicUrl,
  generatedAt,
}: {
  quote: CustomerSafeQuote;
  publicUrl?: string | null;
  generatedAt: string;
}) {
  const pricedItems = quote.line_items.filter(
    (item) => item.status === "priced" || item.status === "included"
  );

  return (
    <Document
      title={quote.quote_display_ref}
      author={siteConfig.name}
      subject={`Proposal ${quote.opportunity_ref}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.brand}>{siteConfig.name}</Text>
          <Text style={styles.title}>{quote.quote_display_ref}</Text>
          <Text style={styles.subtitle}>
            Opportunity {quote.opportunity_ref} · CAD proposal
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Event & customer</Text>
        <View style={styles.row}>
          <Text>Customer</Text>
          <Text>{quote.customer_name || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text>Email</Text>
          <Text>{quote.customer_email}</Text>
        </View>
        <View style={styles.row}>
          <Text>Event type</Text>
          <Text>{quote.event_type || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text>Event date</Text>
          <Text>{quote.event_date || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text>Venue</Text>
          <Text>{quote.venue_name || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text>City / area</Text>
          <Text>{quote.city_area || "—"}</Text>
        </View>
        {quote.valid_until ? (
          <View style={styles.row}>
            <Text>Valid until</Text>
            <Text>{quote.valid_until}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Scope & pricing</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, { fontFamily: "Helvetica-Bold" }]}>
            Description
          </Text>
          <Text style={[styles.colCat, { fontFamily: "Helvetica-Bold" }]}>
            Category
          </Text>
          <Text style={[styles.colQty, { fontFamily: "Helvetica-Bold" }]}>
            Qty
          </Text>
          <Text style={[styles.colUnit, { fontFamily: "Helvetica-Bold" }]}>
            Unit
          </Text>
          <Text style={[styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
            Total
          </Text>
        </View>
        {pricedItems.length === 0 ? (
          <Text style={styles.muted}>No priced line items yet.</Text>
        ) : (
          pricedItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colDesc}>
                {item.description}
                {item.status === "included" ? " (Included)" : ""}
              </Text>
              <Text style={styles.colCat}>
                {QUOTE_CATEGORY_LABELS[item.category as QuoteLineCategory] ||
                  item.category}
              </Text>
              <Text style={styles.colQty}>{String(item.quantity)}</Text>
              <Text style={styles.colUnit}>
                {item.status === "included"
                  ? "—"
                  : formatCadFromCents(item.unit_price_cents)}
              </Text>
              <Text style={styles.colTotal}>
                {item.status === "included"
                  ? "Included"
                  : formatCadFromCents(item.line_total_cents)}
              </Text>
            </View>
          ))
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Proposal total (CAD)</Text>
          <Text style={styles.totalValue}>
            {formatCadFromCents(quote.total_cents)}
          </Text>
        </View>

        {quote.customer_notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{quote.customer_notes}</Text>
          </>
        ) : null}

        {quote.terms ? (
          <>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={styles.notes}>{quote.terms}</Text>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text>
            {siteConfig.name} · {siteConfig.email} · {siteConfig.phone} ·{" "}
            {siteConfig.location}
          </Text>
          <Text>
            Generated {generatedAt}
            {publicUrl ? ` · ${publicUrl}` : ""}
          </Text>
          <Text>
            Planning proposal only. Availability confirmed separately. Setup,
            installation, and teardown scheduled around your event.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdfBuffer(input: {
  quote: CustomerSafeQuote;
  publicUrl?: string | null;
}): Promise<Buffer> {
  const generatedAt = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto",
  });
  const buffer = await renderToBuffer(
    <QuotePdfDocument
      quote={input.quote}
      publicUrl={input.publicUrl}
      generatedAt={generatedAt}
    />
  );
  return Buffer.from(buffer);
}
