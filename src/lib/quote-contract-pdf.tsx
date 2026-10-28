import path from "node:path";
import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { customerLocaleTag, type CustomerLanguage } from "@/data/customer-language";
import { formatQuoteDate, quoteEventTypeLabel } from "@/data/quote-copy";
import { quotePaymentRows } from "@/data/quote-payment-terms";
import { quoteScheduleRows } from "@/data/quote-schedule";
import type { QuoteAgreementAudit } from "@/data/quote-signing";
import {
  DEFAULT_QUOTE_TERMS,
  DEFAULT_QUOTE_TERMS_FR,
  formatMoneyFromCents,
  formatQuoteFilenameStem,
  formatQuoteQuantity,
  formatQuoteUnitPrice,
  getQuoteTaxBreakdownRows,
  quoteLineCategoryLabel,
  splitQuoteTerms,
  type CustomerSafeQuote,
  type QuoteContractProvider,
} from "@/data/quotes";

const COLORS = {
  ink: "#1a1612",
  muted: "#6b635a",
  soft: "#9a9186",
  line: "#e8e0d4",
  cream: "#faf7f2",
  paper: "#fffdf9",
  navy: "#14121a",
  gold: "#c4a035",
  goldDeep: "#8a6d1d",
  goldWash: "#f5efe0",
  green: "#2f6b45",
  white: "#ffffff",
};

const LOGO_PATH = path.join(process.cwd(), "public/images/brand/logo-full.png");

const COPY = {
  en: {
    title: "Event Services & Rental Agreement",
    agreementNo: "Agreement no.",
    effective: "Effective date",
    effectivePending: "On countersignature",
    proposal: "Accepted quote",
    executed: "Fully executed",
    awaiting: "Awaiting countersignature",
    between: "Between",
    and: "And",
    providerRole: "Service provider",
    clientRole: "Client",
    providerDefined: "(the “Provider”)",
    clientDefined: "(the “Client”)",
    operatingAs: (name: string) => `operating as ${name}`,
    representedBy: "Represented by",
    neq: "NEQ",
    gst: "GST",
    qst: "QST",
    purposeTitle: "1. Purpose",
    purpose:
      "The Provider agrees to supply the event rentals and services specified in the accepted quote identified above and described in Schedule A — which may include, as applicable, draping, pipe and drape, audiovisual, lighting, sound, staging, equipment rentals and full event production, together with delivery, installation and removal — for the event and on the dates set out there. The Client agrees to pay the price set out in Schedule B. Both parties agree to the terms and conditions in Schedule C.",
    documentsTitle: "2. Documents forming this agreement",
    documentsNote:
      "These documents are read together and form a single agreement. The accepted quote is incorporated into it; Schedules A and B reproduce that quote exactly as it stood when the Client signed. In case of conflict, a written amendment approved by both parties prevails, then Schedules A and B, then Schedule C.",
    documents: [
      ["Schedule A", "Event, schedule & scope"],
      ["Schedule B", "Price & payment schedule"],
      ["Schedule C", "Terms & conditions"],
      ["Signatures", "Signature page"],
      ["Certificate", "Signature & audit certificate"],
    ],
    keyTermsTitle: "3. Key terms",
    eventDate: "Event date",
    venue: "Venue",
    install: "Installation",
    teardown: "Teardown",
    total: "Agreement total",
    firstPayment: "First payment",
    schedule: "Schedule",
    scheduleATitle: "Event, schedule & scope",
    scheduleBTitle: "Price & payment schedule",
    scheduleCTitle: "Terms & conditions",
    eventDetails: "Event details",
    eventType: "Event type",
    event: "Event",
    cityArea: "City / area",
    scopeTitle: "Scope of services and rentals",
    colItem: "#",
    colDescription: "Description",
    colCategory: "Category",
    colQty: "Qty",
    colUnit: "Unit price",
    colAmount: "Amount",
    included: "Included",
    noItems: "No priced items.",
    notes: "Special notes",
    priceTitle: "Price",
    currencyNote: (currency: string) => `All amounts are in ${currency}.`,
    paymentTitle: "Payment schedule",
    colInstalment: "Instalment",
    colDue: "Due",
    noPaymentSchedule: "Payable in full as set out in Schedule C.",
    article: "Article",
    termsIntro:
      "The following terms and conditions apply to the services and rentals described in this agreement.",
    signaturesTitle: "Signatures",
    witness:
      "In witness whereof, the parties have signed this agreement electronically on the dates indicated below. Each party confirms it has read and accepts this agreement, including the accepted quote reproduced in Schedules A and B and the terms and conditions in Schedule C.",
    theClient: "The Client",
    theProvider: "The Provider",
    forParty: (name: string) => `For ${name}`,
    name: "Name",
    titleLabel: "Title",
    date: "Date",
    clientMethod: "Signed electronically · identity verified by one-time email code",
    providerMethod: "Countersigned electronically",
    pending: "Awaiting countersignature",
    fingerprint: "Agreement fingerprint (SHA-256)",
    initialsLabel: "Client initials",
    initialsNote:
      "The initials shown at the foot of each page are those adopted by the Client during electronic signing.",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
  },
  fr: {
    title: "Contrat de services et de location pour événement",
    agreementNo: "No de contrat",
    effective: "Date d’entrée en vigueur",
    effectivePending: "À la contresignature",
    proposal: "Soumission acceptée",
    executed: "Pleinement exécuté",
    awaiting: "En attente de contresignature",
    between: "Entre",
    and: "Et",
    providerRole: "Prestataire de services",
    clientRole: "Client",
    providerDefined: "(le « Prestataire »)",
    clientDefined: "(le « Client »)",
    operatingAs: (name: string) => `faisant affaire sous le nom ${name}`,
    representedBy: "Représenté par",
    neq: "NEQ",
    gst: "TPS",
    qst: "TVQ",
    purposeTitle: "1. Objet",
    purpose:
      "Le Prestataire s’engage à fournir les locations et services pour événement précisés à la soumission acceptée indiquée ci-dessus et décrits à l’annexe A — lesquels peuvent comprendre, selon le cas, le drapage, les structures de rideaux sur tubes (pipe and drape), l’audiovisuel, l’éclairage, la sonorisation, les scènes, la location d’équipement et la production complète d’événements, ainsi que la livraison, l’installation et le démontage —, pour l’événement et aux dates qui y sont indiquées. Le Client s’engage à payer le prix prévu à l’annexe B. Les parties acceptent les conditions générales de l’annexe C.",
    documentsTitle: "2. Documents formant le contrat",
    documentsNote:
      "Ces documents se lisent ensemble et forment un seul contrat. La soumission acceptée y est intégrée; les annexes A et B la reproduisent exactement telle qu’elle existait au moment de la signature du Client. En cas de conflit, une modification écrite approuvée par les deux parties prévaut, suivie des annexes A et B, puis de l’annexe C.",
    documents: [
      ["Annexe A", "Événement, horaire et portée"],
      ["Annexe B", "Prix et calendrier de paiement"],
      ["Annexe C", "Conditions générales"],
      ["Signatures", "Page des signatures"],
      ["Certificat", "Certificat de signature et d’audit"],
    ],
    keyTermsTitle: "3. Modalités principales",
    eventDate: "Date de l’événement",
    venue: "Lieu",
    install: "Installation",
    teardown: "Démontage",
    total: "Total du contrat",
    firstPayment: "Premier paiement",
    schedule: "Annexe",
    scheduleATitle: "Événement, horaire et portée",
    scheduleBTitle: "Prix et calendrier de paiement",
    scheduleCTitle: "Conditions générales",
    eventDetails: "Détails de l’événement",
    eventType: "Type d’événement",
    event: "Événement",
    cityArea: "Ville / secteur",
    scopeTitle: "Portée des services et des locations",
    colItem: "No",
    colDescription: "Description",
    colCategory: "Catégorie",
    colQty: "Qté",
    colUnit: "Prix unitaire",
    colAmount: "Montant",
    included: "Inclus",
    noItems: "Aucun article tarifé.",
    notes: "Notes particulières",
    priceTitle: "Prix",
    currencyNote: (currency: string) => `Tous les montants sont en ${currency}.`,
    paymentTitle: "Calendrier de paiement",
    colInstalment: "Versement",
    colDue: "Échéance",
    noPaymentSchedule: "Payable en totalité selon l’annexe C.",
    article: "Article",
    termsIntro:
      "Les conditions générales suivantes s’appliquent aux services et aux locations décrits dans le présent contrat.",
    signaturesTitle: "Signatures",
    witness:
      "En foi de quoi, les parties ont signé le présent contrat par voie électronique aux dates indiquées ci-dessous. Chaque partie confirme avoir lu et accepté le présent contrat, y compris la soumission acceptée reproduite aux annexes A et B et les conditions générales de l’annexe C.",
    theClient: "Le Client",
    theProvider: "Le Prestataire",
    forParty: (name: string) => `Pour ${name}`,
    name: "Nom",
    titleLabel: "Titre",
    date: "Date",
    clientMethod: "Signé électroniquement · identité vérifiée par code à usage unique envoyé par courriel",
    providerMethod: "Contresigné électroniquement",
    pending: "En attente de contresignature",
    fingerprint: "Empreinte du contrat (SHA-256)",
    initialsLabel: "Initiales du client",
    initialsNote:
      "Les initiales figurant au bas de chaque page sont celles adoptées par le Client lors de la signature électronique.",
    pageOf: (page: number, total: number) => `Page ${page} de ${total}`,
  },
} satisfies Record<CustomerLanguage, unknown>;

export type ContractCopy = (typeof COPY)[CustomerLanguage];

export function contractCopy(language: CustomerLanguage): ContractCopy {
  return COPY[language];
}

/** "TCG-10040" or "TCG-10041-R1"; shared by the agreement, its certificate and its filename. */
export function contractNumber(snapshot: Pick<CustomerSafeQuote, "opportunity_ref" | "revision_number">) {
  return formatQuoteFilenameStem(snapshot.opportunity_ref, snapshot.revision_number);
}

const styles = StyleSheet.create({
  // A page-level lineHeight stops react-pdf from drawing the fixed footer; set it per text style.
  page: {
    paddingTop: 30,
    paddingBottom: 70,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.ink,
    backgroundColor: COLORS.paper,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 130, height: 58, objectFit: "contain", objectPositionX: 0 },
  idBlock: { alignItems: "flex-end", gap: 2 },
  idLabel: { fontSize: 7, color: COLORS.soft, letterSpacing: 1.2, textTransform: "uppercase" },
  idValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  idRow: { flexDirection: "row", gap: 6, alignItems: "baseline" },
  badge: {
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  badgeDone: { backgroundColor: "#e3f1e7", color: COLORS.green },
  badgePending: { backgroundColor: COLORS.goldWash, color: COLORS.goldDeep },
  goldRule: { height: 1.5, backgroundColor: COLORS.gold, marginTop: 10, marginBottom: 14 },
  hairline: { height: 0.75, backgroundColor: COLORS.line, marginVertical: 10 },
  title: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    textAlign: "center",
    lineHeight: 1.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 7.5,
    color: COLORS.goldDeep,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  betweenLabel: {
    marginTop: 14,
    marginBottom: 7,
    fontSize: 7.5,
    color: COLORS.goldDeep,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  partiesRow: { flexDirection: "row", gap: 12, alignItems: "stretch" },
  partyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderTopWidth: 2.5,
    borderTopColor: COLORS.gold,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  partyRole: {
    fontSize: 7,
    color: COLORS.goldDeep,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  partySub: { fontSize: 8.5, color: COLORS.muted, marginTop: 1 },
  partyLine: { fontSize: 8.5, color: COLORS.ink, marginTop: 1, lineHeight: 1.35 },
  partyIds: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  partyId: { fontSize: 7.5, color: COLORS.muted },
  partyDefined: { marginTop: 8, fontSize: 8, fontFamily: "Helvetica-Oblique", color: COLORS.goldDeep },
  andLabel: {
    width: 22,
    alignSelf: "center",
    textAlign: "center",
    fontSize: 7.5,
    color: COLORS.soft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  clauseTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
  },
  body: { fontSize: 9, color: COLORS.ink, lineHeight: 1.5, textAlign: "justify" },
  docRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  docPart: { width: 82, fontFamily: "Helvetica-Bold", color: COLORS.goldDeep, fontSize: 8.5 },
  docTitle: { flex: 1, fontSize: 8.5 },
  note: { marginTop: 5, fontSize: 8, color: COLORS.muted, fontFamily: "Helvetica-Oblique" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "31.9%",
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: COLORS.cream,
  },
  tileStrong: { backgroundColor: COLORS.goldWash, borderColor: "#e6d7ad" },
  tileLabel: { fontSize: 6.8, color: COLORS.goldDeep, letterSpacing: 1.1, textTransform: "uppercase" },
  tileValue: { marginTop: 3, fontSize: 9.5, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  tileSub: { marginTop: 1, fontSize: 7.5, color: COLORS.muted },
  scheduleHead: { marginBottom: 14 },
  scheduleEyebrow: {
    fontSize: 8,
    color: COLORS.goldDeep,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  scheduleTitle: { marginTop: 3, fontSize: 16, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  scheduleRule: { marginTop: 8, height: 1.5, width: 54, backgroundColor: COLORS.gold },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.goldDeep,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  kvTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 6 },
  kvRow: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: COLORS.line },
  kvRowFirst: { flexDirection: "row" },
  kvLabel: { width: 130, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: COLORS.cream, color: COLORS.muted },
  kvValue: { flex: 1, paddingVertical: 6, paddingHorizontal: 8 },
  tHead: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tHeadText: { color: "#efe6cf", fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  tRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
    borderLeftWidth: 0.75,
    borderLeftColor: COLORS.line,
    borderRightWidth: 0.75,
    borderRightColor: COLORS.line,
  },
  tRowAlt: { backgroundColor: COLORS.cream },
  cNum: { width: 20 },
  cDesc: { flex: 1, paddingRight: 8 },
  cCat: { width: 82, paddingRight: 6 },
  cQty: { width: 54, textAlign: "right" },
  cUnit: { width: 74, textAlign: "right" },
  cAmount: { width: 72, textAlign: "right" },
  cellMuted: { color: COLORS.muted, fontSize: 8 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.line,
  },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: COLORS.navy,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  totalFinalText: { color: COLORS.white, fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  totalBox: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 6 },
  notesBox: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.gold,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  articleRow: { flexDirection: "row", marginBottom: 8 },
  articleNum: {
    width: 62,
    fontSize: 7.5,
    color: COLORS.goldDeep,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingTop: 1.5,
  },
  articleText: { flex: 1, fontSize: 9, lineHeight: 1.5, textAlign: "justify" },
  sigBlock: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 14,
    marginTop: 14,
    backgroundColor: COLORS.white,
  },
  sigHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sigParty: { fontSize: 7.5, color: COLORS.goldDeep, letterSpacing: 1.4, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  sigEntity: { fontSize: 8.5, color: COLORS.muted },
  sigLine: {
    marginTop: 8,
    height: 66,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    justifyContent: "flex-end",
    paddingBottom: 3,
  },
  sigImage: { height: 58, maxWidth: 260, objectFit: "contain", objectPositionX: 0 },
  sigPending: { color: COLORS.soft, fontSize: 10, fontFamily: "Helvetica-Oblique", marginBottom: 6 },
  sigFields: { flexDirection: "row", gap: 12, marginTop: 7 },
  sigField: { flex: 1 },
  sigFieldLabel: { fontSize: 6.8, color: COLORS.soft, letterSpacing: 1, textTransform: "uppercase" },
  sigFieldValue: { marginTop: 2, fontSize: 9, color: COLORS.ink },
  sigMethod: { marginTop: 8, fontSize: 7.5, color: COLORS.muted, fontFamily: "Helvetica-Oblique" },
  hashBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 6,
    padding: 10,
    backgroundColor: COLORS.cream,
  },
  hash: { fontFamily: "Courier", fontSize: 7.8, marginTop: 3 },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.75,
    borderTopColor: COLORS.line,
    paddingTop: 7,
  },
  footerText: { fontSize: 6.8, color: COLORS.soft, lineHeight: 1.4 },
  footerLeft: { width: 220 },
  footerRight: { width: 140, textAlign: "right", fontSize: 7, color: COLORS.soft },
  initialsWrap: { alignItems: "center" },
  initialsBox: {
    width: 58,
    height: 24,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsImage: { height: 19, maxWidth: 52, objectFit: "contain" },
  initialsText: { fontFamily: "Helvetica-BoldOblique", fontSize: 10.5, color: COLORS.ink },
  initialsLabel: { fontSize: 5.8, color: COLORS.soft, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 },
});

function longDate(iso: string | null | undefined, language: CustomerLanguage): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(customerLocaleTag(language), {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function KeyValueTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={styles.kvTable}>
      {rows.map(([label, value], index) => (
        <View key={label} style={index === 0 ? styles.kvRowFirst : styles.kvRow} wrap={false}>
          <Text style={styles.kvLabel}>{label}</Text>
          <Text style={styles.kvValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ScheduleHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.scheduleHead}>
      <Text style={styles.scheduleEyebrow}>{eyebrow}</Text>
      <Text style={styles.scheduleTitle}>{title}</Text>
      <View style={styles.scheduleRule} />
    </View>
  );
}

function ContractFooter({
  c,
  number,
  hash,
  initials,
  initialsImage,
  appendedPages,
}: {
  c: ContractCopy;
  number: string;
  hash: string;
  initials: string | null;
  initialsImage: string | null;
  appendedPages: number;
}) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerText}>
          {c.agreementNo} {number}
          {"\n"}
          SHA-256 {hash.slice(0, 12)}…{hash.slice(-8)}
        </Text>
      </View>
      <View style={styles.initialsWrap}>
        <View style={styles.initialsBox}>
          {initialsImage ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
            <Image src={initialsImage} style={styles.initialsImage} />
          ) : (
            <Text style={styles.initialsText}>{initials || ""}</Text>
          )}
        </View>
        <Text style={styles.initialsLabel}>{c.initialsLabel}</Text>
      </View>
      <Text
        style={styles.footerRight}
        render={({ pageNumber, totalPages }) => c.pageOf(pageNumber, totalPages + appendedPages)}
      />
    </View>
  );
}

function SignatureBlock({
  party,
  entity,
  image,
  pendingLabel,
  name,
  title,
  date,
  method,
  c,
}: {
  party: string;
  entity: string;
  image: string | null;
  pendingLabel: string | null;
  name: string;
  title: string;
  date: string;
  method: string | null;
  c: ContractCopy;
}) {
  return (
    <View style={styles.sigBlock} wrap={false}>
      <View style={styles.sigHead}>
        <Text style={styles.sigParty}>{party}</Text>
        <Text style={styles.sigEntity}>{entity}</Text>
      </View>
      <View style={styles.sigLine}>
        {image ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
          <Image src={image} style={styles.sigImage} />
        ) : (
          <Text style={styles.sigPending}>{pendingLabel}</Text>
        )}
      </View>
      <View style={styles.sigFields}>
        <View style={styles.sigField}>
          <Text style={styles.sigFieldLabel}>{c.name}</Text>
          <Text style={styles.sigFieldValue}>{name}</Text>
        </View>
        <View style={styles.sigField}>
          <Text style={styles.sigFieldLabel}>{c.titleLabel}</Text>
          <Text style={styles.sigFieldValue}>{title}</Text>
        </View>
        <View style={styles.sigField}>
          <Text style={styles.sigFieldLabel}>{c.date}</Text>
          <Text style={styles.sigFieldValue}>{date}</Text>
        </View>
      </View>
      {method ? <Text style={styles.sigMethod}>{method}</Text> : null}
    </View>
  );
}

/** Cover, schedules A–C and the signature page of a signed agreement. */
export function SignedContractPages({
  snapshot,
  audit,
  provider,
  initialsImage,
  appendedPages = 0,
}: {
  snapshot: CustomerSafeQuote;
  audit: QuoteAgreementAudit;
  provider: QuoteContractProvider;
  initialsImage: string | null;
  /** Pages merged after rendering (PDF attachments), counted in "Page X of Y". */
  appendedPages?: number;
}) {
  const language = audit.language;
  const c = COPY[language];
  const number = contractNumber(snapshot);
  const executed = audit.status === "countersigned";
  const currency = snapshot.currency === "USD" ? "USD" : "CAD";
  const money = (cents: number) => formatMoneyFromCents(cents, language, currency);
  const day = (value: string | null | undefined) => formatQuoteDate(value, language, "—");
  const providerName = provider.legal_name || provider.trade_name;
  const tradeName =
    provider.trade_name && provider.trade_name !== provider.legal_name ? provider.trade_name : null;
  const clientCompany = snapshot.bill_to?.company_name?.trim() || null;
  const clientName = clientCompany || snapshot.customer_name || audit.signerName;
  const scheduleRows = quoteScheduleRows(snapshot, language);
  const when = (key: string) => {
    const row = scheduleRows.find((r) => r.key === key);
    if (!row) return null;
    return [row.date ? day(row.date) : null, row.window].filter(Boolean).join(" · ") || null;
  };
  const venue = [snapshot.venue_name, snapshot.venue_address].filter(Boolean).join("\n");
  const pricedItems = snapshot.line_items.filter(
    (item) => item.status === "priced" || item.status === "included"
  );
  const taxRows = getQuoteTaxBreakdownRows(snapshot, { variant: "customer", language, currency });
  const paymentRows = quotePaymentRows(snapshot, language);
  const firstPayment = paymentRows.length > 1 ? paymentRows[0] : null;
  const terms = splitQuoteTerms(
    snapshot.terms,
    language === "fr" ? DEFAULT_QUOTE_TERMS_FR : DEFAULT_QUOTE_TERMS
  );
  const notes = snapshot.customer_notes?.trim() || "";
  const providerIds = [
    provider.neq ? `${c.neq} ${provider.neq}` : null,
    provider.gst_number ? `${c.gst} ${provider.gst_number}` : null,
    provider.qst_number ? `${c.qst} ${provider.qst_number}` : null,
  ].filter((v): v is string => Boolean(v));

  const footer = (
    <ContractFooter
      c={c}
      number={number}
      hash={audit.documentHash}
      initials={audit.initials}
      initialsImage={initialsImage}
      appendedPages={appendedPages}
    />
  );

  const eventRows: Array<[string, string]> = [
    [c.eventType, quoteEventTypeLabel(snapshot.event_type, language) || "—"],
    [c.event, when("event") || "—"],
    [c.install, when("install") || "—"],
    [c.teardown, when("teardown") || "—"],
    venue ? [c.venue, venue] : [c.cityArea, snapshot.city_area || "—"],
  ];

  const tiles: Array<{ label: string; value: string; sub?: string; strong?: boolean }> = [
    { label: c.eventDate, value: day(snapshot.event_date) },
    {
      label: c.venue,
      value: snapshot.venue_name || snapshot.city_area || "—",
      sub: snapshot.venue_name ? snapshot.venue_address?.split("\n")[0] : undefined,
    },
    { label: c.install, value: when("install") || "—" },
    { label: c.teardown, value: when("teardown") || "—" },
    { label: c.total, value: money(snapshot.total_cents), sub: currency, strong: true },
    firstPayment
      ? { label: c.firstPayment, value: money(firstPayment.amountCents), sub: `${firstPayment.label} · ${firstPayment.due}` }
      : { label: c.firstPayment, value: money(snapshot.total_cents), sub: paymentRows[0]?.due },
  ];

  return (
    <>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.topRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
          <Image src={LOGO_PATH} style={styles.logo} />
          <View style={styles.idBlock}>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>{c.agreementNo}</Text>
              <Text style={styles.idValue}>{number}</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>{c.effective}</Text>
              <Text style={styles.idValue}>
                {executed ? longDate(audit.countersignedAt, language) : c.effectivePending}
              </Text>
            </View>
            <Text style={[styles.badge, executed ? styles.badgeDone : styles.badgePending]}>
              {executed ? c.executed : c.awaiting}
            </Text>
          </View>
        </View>
        <View style={styles.goldRule} />

        <Text style={styles.title} hyphenationCallback={(word) => [word]}>
          {c.title}
        </Text>
        <Text style={styles.subtitle}>
          {c.proposal} {snapshot.quote_display_ref.replace(/^(Quote|Soumission)\s+/i, "")}
        </Text>

        <Text style={styles.betweenLabel}>{c.between}</Text>
        <View style={styles.partiesRow} wrap={false}>
          <View style={styles.partyCard}>
            <Text style={styles.partyRole}>{c.providerRole}</Text>
            <Text style={styles.partyName}>{providerName}</Text>
            {tradeName ? <Text style={styles.partySub}>{c.operatingAs(tradeName)}</Text> : null}
            {provider.address ? <Text style={[styles.partyLine, { marginTop: 5 }]}>{provider.address}</Text> : null}
            {[provider.phone, provider.email].filter(Boolean).length ? (
              <Text style={styles.partyLine}>{[provider.phone, provider.email].filter(Boolean).join(" · ")}</Text>
            ) : null}
            {providerIds.length ? (
              <View style={styles.partyIds}>
                {providerIds.map((id) => (
                  <Text key={id} style={styles.partyId}>
                    {id}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.partyDefined}>{c.providerDefined}</Text>
          </View>
          <Text style={styles.andLabel}>{c.and}</Text>
          <View style={styles.partyCard}>
            <Text style={styles.partyRole}>{c.clientRole}</Text>
            <Text style={styles.partyName}>{clientName}</Text>
            {snapshot.bill_to?.address ? (
              <Text style={[styles.partyLine, { marginTop: 5 }]}>{snapshot.bill_to.address}</Text>
            ) : null}
            <Text style={[styles.partyLine, snapshot.bill_to?.address ? {} : { marginTop: 5 }]}>
              {snapshot.customer_email || audit.signerEmail}
            </Text>
            <Text style={[styles.partySub, { marginTop: 6 }]}>
              {c.representedBy} {audit.signerName}
              {audit.signerTitle ? `, ${audit.signerTitle}` : ""}
            </Text>
            <Text style={styles.partyDefined}>{c.clientDefined}</Text>
          </View>
        </View>

        <Text style={styles.clauseTitle}>{c.purposeTitle}</Text>
        <Text style={styles.body}>{c.purpose}</Text>

        <Text style={styles.clauseTitle}>{c.documentsTitle}</Text>
        {c.documents.map(([part, title]) => (
          <View key={part} style={styles.docRow}>
            <Text style={styles.docPart}>{part}</Text>
            <Text style={styles.docTitle}>{title}</Text>
          </View>
        ))}
        <Text style={styles.note}>{c.documentsNote}</Text>

        <Text style={styles.clauseTitle}>{c.keyTermsTitle}</Text>
        <View style={styles.tiles} wrap={false}>
          {tiles.map((tile) => (
            <View key={tile.label} style={tile.strong ? [styles.tile, styles.tileStrong] : styles.tile}>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              <Text style={styles.tileValue}>{tile.value}</Text>
              {tile.sub ? <Text style={styles.tileSub}>{tile.sub}</Text> : null}
            </View>
          ))}
        </View>
        {footer}
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <ScheduleHeading eyebrow={`${c.schedule} A`} title={c.scheduleATitle} />
        <Text style={styles.sectionTitle}>{c.eventDetails}</Text>
        <KeyValueTable rows={eventRows} />

        <Text style={styles.sectionTitle} minPresenceAhead={60}>
          {c.scopeTitle}
        </Text>
        <View style={styles.tHead} fixed={false}>
          <Text style={[styles.tHeadText, styles.cNum]}>{c.colItem}</Text>
          <Text style={[styles.tHeadText, styles.cDesc]}>{c.colDescription}</Text>
          <Text style={[styles.tHeadText, styles.cCat]}>{c.colCategory}</Text>
          <Text style={[styles.tHeadText, styles.cQty]}>{c.colQty}</Text>
          <Text style={[styles.tHeadText, styles.cUnit]}>{c.colUnit}</Text>
          <Text style={[styles.tHeadText, styles.cAmount]}>{c.colAmount}</Text>
        </View>
        {pricedItems.length === 0 ? (
          <View style={styles.tRow}>
            <Text style={styles.cellMuted}>{c.noItems}</Text>
          </View>
        ) : (
          pricedItems.map((item, index) => (
            <View
              key={item.id}
              style={index % 2 === 1 ? [styles.tRow, styles.tRowAlt] : styles.tRow}
              wrap={false}
            >
              <Text style={[styles.cNum, styles.cellMuted]}>{index + 1}</Text>
              <Text style={styles.cDesc}>{item.description}</Text>
              <Text style={[styles.cCat, styles.cellMuted]}>{quoteLineCategoryLabel(item, language)}</Text>
              <Text style={styles.cQty}>{formatQuoteQuantity(item.quantity, item.unit_label, language)}</Text>
              <Text style={styles.cUnit}>
                {item.status === "included"
                  ? "—"
                  : formatQuoteUnitPrice(item.unit_price_cents, item.unit_label, language, currency)}
              </Text>
              <Text style={styles.cAmount}>
                {item.status === "included" ? c.included : money(item.line_total_cents)}
              </Text>
            </View>
          ))
        )}

        {notes ? (
          <>
            <Text style={styles.sectionTitle} minPresenceAhead={40}>
              {c.notes}
            </Text>
            <View style={styles.notesBox}>
              <Text style={styles.body} orphans={3} widows={3}>
                {notes}
              </Text>
            </View>
          </>
        ) : null}

        <View break>
          <ScheduleHeading eyebrow={`${c.schedule} B`} title={c.scheduleBTitle} />
        </View>
        <Text style={styles.sectionTitle}>{c.priceTitle}</Text>
        <View style={styles.totalBox} wrap={false}>
          {taxRows.map((row) =>
            row.emphasis === "total" ? (
              <View key={row.key} style={styles.totalFinal}>
                <Text style={styles.totalFinalText}>{row.label}</Text>
                <Text style={styles.totalFinalText}>{money(row.amountCents)}</Text>
              </View>
            ) : (
              <View key={row.key} style={styles.totalRow}>
                <Text style={{ color: COLORS.muted }}>{row.label}</Text>
                <Text>{money(row.amountCents)}</Text>
              </View>
            )
          )}
        </View>
        <Text style={styles.note}>{c.currencyNote(currency)}</Text>

        <Text style={styles.sectionTitle}>{c.paymentTitle}</Text>
        {paymentRows.length ? (
          <View wrap={false}>
            <View style={styles.tHead}>
              <Text style={[styles.tHeadText, { width: 150 }]}>{c.colInstalment}</Text>
              <Text style={[styles.tHeadText, { flex: 1 }]}>{c.colDue}</Text>
              <Text style={[styles.tHeadText, styles.cAmount]}>{c.colAmount}</Text>
            </View>
            {paymentRows.map((row, index) => (
              <View key={row.key} style={index % 2 === 1 ? [styles.tRow, styles.tRowAlt] : styles.tRow}>
                <Text style={{ width: 150, fontFamily: "Helvetica-Bold" }}>{row.label}</Text>
                <Text style={{ flex: 1, paddingRight: 8 }}>
                  {row.due}
                  {row.detail ? ` · ${row.detail}` : ""}
                </Text>
                <Text style={styles.cAmount}>{money(row.amountCents)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>{c.noPaymentSchedule}</Text>
        )}

        <View break>
          <ScheduleHeading eyebrow={`${c.schedule} C`} title={c.scheduleCTitle} />
        </View>
        <Text style={[styles.body, { marginBottom: 10, color: COLORS.muted }]}>{c.termsIntro}</Text>
        {terms.map((line, index) => (
          <View key={`${index}-${line.slice(0, 16)}`} style={styles.articleRow} wrap={false}>
            <Text style={styles.articleNum}>
              {c.article} {index + 1}
            </Text>
            <Text style={styles.articleText}>{line}</Text>
          </View>
        ))}

        <View break>
          <ScheduleHeading eyebrow={number} title={c.signaturesTitle} />
        </View>
        <Text style={styles.body}>{c.witness}</Text>

        <SignatureBlock
          c={c}
          party={c.theClient}
          entity={clientName}
          image={audit.signatureImage}
          pendingLabel={null}
          name={audit.signerName}
          title={audit.signerTitle || "—"}
          date={longDate(audit.signedAt, language)}
          method={c.clientMethod}
        />
        <SignatureBlock
          c={c}
          party={c.theProvider}
          entity={c.forParty(providerName)}
          image={executed ? audit.countersignImage : null}
          pendingLabel={executed ? null : c.pending}
          name={audit.countersignerName || "—"}
          title={audit.countersignerTitle || "—"}
          date={executed ? longDate(audit.countersignedAt, language) : "—"}
          method={executed ? c.providerMethod : null}
        />

        <View style={styles.hashBox} wrap={false}>
          <Text style={styles.sigFieldLabel}>{c.fingerprint}</Text>
          <Text style={styles.hash}>{audit.documentHash}</Text>
          <Text style={[styles.note, { marginTop: 6 }]}>{c.initialsNote}</Text>
        </View>
        {footer}
      </Page>
    </>
  );
}
