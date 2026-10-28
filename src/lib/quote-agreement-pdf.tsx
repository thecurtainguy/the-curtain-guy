import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { customerLocaleTag, type CustomerLanguage } from "@/data/customer-language";
import { formatQuoteFilenameStem } from "@/data/quotes";
import { siteConfig } from "@/data/site";
import {
  appendPdfAttachments,
  appendedPageCount,
  loadDocumentAttachments,
  renderAttachmentPages,
} from "@/lib/pdf-attachments";
import { SignedContractPages, contractCopy, contractNumber } from "@/lib/quote-contract-pdf";
import {
  currentContractProvider,
  describeSignerDevice,
  toAgreementAudit,
  type QuoteSignatureRow,
} from "@/lib/quote-signing";
import type { QuoteAgreementAudit } from "@/data/quote-signing";

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
    title: "Signature & audit certificate",
    executed: "Fully executed",
    awaiting: "Awaiting countersignature",
    client: "Client",
    provider: "The Curtain Guy",
    pending: "Pending countersignature",
    name: "Name",
    titleLabel: "Title",
    email: "Email",
    signed: "Signed",
    method: "Method",
    typed: "Typed signature",
    drawn: "Hand-drawn signature",
    clauses: "Key clauses initialed",
    consent: "Electronic signature consent",
    audit: "Audit trail",
    codeVerified: "Email verified (one-time code)",
    signedAt: "Signed by client",
    countersignedAt: "Countersigned",
    ip: "IP address",
    device: "Device",
    location: "Approx. location",
    channel: "Signed from",
    channelPublic: "Secure proposal link",
    channelAccount: "Customer account",
    languageChoice: "Language chosen",
    frenchProvided: "French version provided",
    frenchVia: {
      email_attachment: "Attached to the quote email",
      pdf_opened: "French PDF opened by the client",
      owner_sent: "Sent by The Curtain Guy",
    },
    fingerprint: "Document fingerprint (SHA-256)",
    envelope: "Agreement ID",
    footnote:
      "This certificate forms part of the agreement. The fingerprint is computed over the exact proposal, key clauses, consent statement, language choice, and signer identity shown in this document at the moment of signing; any change to that content produces a different fingerprint.",
    page: "Certificate",
  },
  fr: {
    title: "Certificat de signature et d’audit",
    executed: "Pleinement exécutée",
    awaiting: "En attente de contresignature",
    client: "Client",
    provider: "The Curtain Guy",
    pending: "Contresignature en attente",
    name: "Nom",
    titleLabel: "Titre",
    email: "Courriel",
    signed: "Signée le",
    method: "Méthode",
    typed: "Signature tapée",
    drawn: "Signature manuscrite",
    clauses: "Clauses clés paraphées",
    consent: "Consentement à la signature électronique",
    audit: "Piste d’audit",
    codeVerified: "Courriel vérifié (code à usage unique)",
    signedAt: "Signée par le client",
    countersignedAt: "Contresignée",
    ip: "Adresse IP",
    device: "Appareil",
    location: "Emplacement approx.",
    channel: "Signée depuis",
    channelPublic: "Lien sécurisé de la soumission",
    channelAccount: "Compte client",
    languageChoice: "Langue choisie",
    frenchProvided: "Version française transmise",
    frenchVia: {
      email_attachment: "Jointe au courriel de la soumission",
      pdf_opened: "PDF français ouvert par le client",
      owner_sent: "Transmise par The Curtain Guy",
    },
    fingerprint: "Empreinte du document (SHA-256)",
    envelope: "No d’entente",
    footnote:
      "Ce certificat fait partie de l’entente. L’empreinte est calculée sur la soumission exacte, les clauses clés, la déclaration de consentement, le choix de langue et l’identité du signataire figurant dans ce document au moment de la signature; toute modification de ce contenu produit une empreinte différente.",
    page: "Certificat",
  },
} satisfies Record<CustomerLanguage, unknown>;

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontFamily: "Helvetica",
    fontSize: 8.5,
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
    marginBottom: 12,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { width: 34, height: 34, objectFit: "contain" },
  eyebrow: { color: COLORS.gold, fontSize: 7.5, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 3 },
  headerTitle: { color: COLORS.white, fontSize: 14, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: "#c8c2b8", fontSize: 8, marginTop: 2 },
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  badgeDone: { backgroundColor: "#e3f1e7", color: COLORS.green },
  badgePending: { backgroundColor: COLORS.goldWash, color: COLORS.goldDeep },
  sigRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  sigCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 10,
    backgroundColor: COLORS.white,
  },
  sigParty: { fontSize: 7.5, color: COLORS.goldDeep, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  sigBox: {
    height: 62,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  sigImage: { height: 56, maxWidth: 230, objectFit: "contain" },
  sigPending: { color: COLORS.soft, fontSize: 9, fontFamily: "Helvetica-Oblique", marginBottom: 6 },
  metaRow: { flexDirection: "row", marginTop: 2 },
  metaLabel: { width: 52, color: COLORS.muted },
  metaValue: { flex: 1, color: COLORS.ink },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.goldDeep,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
    marginTop: 4,
  },
  clauseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 7,
    marginBottom: 4,
    backgroundColor: COLORS.cream,
  },
  clauseTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 2 },
  clauseText: { color: COLORS.muted, fontSize: 7.8, lineHeight: 1.35 },
  clauseStamp: {
    width: 64,
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: COLORS.line,
    paddingLeft: 6,
  },
  initialsBox: {
    width: 52,
    height: 26,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 5,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsImage: { height: 20, maxWidth: 48, objectFit: "contain" },
  initialsText: { fontFamily: "Helvetica-BoldOblique", fontSize: 11, color: COLORS.ink },
  stampTime: { fontSize: 6.2, color: COLORS.soft, marginTop: 2, textAlign: "center" },
  consentBox: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.gold,
    paddingLeft: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  consentText: { color: COLORS.ink, fontSize: 8, lineHeight: 1.45 },
  auditTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: "hidden" },
  auditRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.line },
  auditRowFirst: { flexDirection: "row" },
  auditLabel: { width: 150, padding: 6, backgroundColor: COLORS.cream, color: COLORS.muted },
  auditValue: { flex: 1, padding: 6, color: COLORS.ink },
  hash: { fontFamily: "Courier", fontSize: 7.5 },
  footnote: { marginTop: 10, color: COLORS.soft, fontSize: 7, lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    color: COLORS.soft,
    fontSize: 7,
  },
});

function stamp(value: string | null | undefined, language: CustomerLanguage): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(customerLocaleTag(language), {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export function AgreementCertificatePage({
  audit,
  documentRef,
  initialsImage,
}: {
  audit: QuoteAgreementAudit;
  documentRef: string;
  initialsImage: string | null;
}) {
  const language = audit.language;
  const c = COPY[language];
  const executed = audit.status === "countersigned";
  const auditRows: Array<[string, string, boolean?]> = [
    [c.envelope, audit.id, true],
    [c.codeVerified, `${audit.signerEmail} · ${stamp(audit.verifiedAt, language)}`],
    [c.signedAt, stamp(audit.signedAt, language)],
    [c.ip, audit.signerIp || "—"],
    [c.device, describeSignerDevice(audit.signerUserAgent) || "—"],
    [c.location, audit.signerLocation || "—"],
    [c.channel, audit.channel === "account" ? c.channelAccount : c.channelPublic],
    ...(audit.languageChoiceText
      ? ([[c.languageChoice, audit.languageChoiceText]] as Array<[string, string]>)
      : []),
    ...(audit.frenchVersionProvidedVia
      ? ([
          [
            c.frenchProvided,
            `${c.frenchVia[audit.frenchVersionProvidedVia]} · ${stamp(audit.frenchVersionProvidedAt, language)}`,
          ],
        ] as Array<[string, string]>)
      : []),
    [c.countersignedAt, executed ? `${audit.countersignerName} · ${stamp(audit.countersignedAt, language)}` : c.pending],
    [c.fingerprint, audit.documentHash, true],
  ];

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
          <Image src={LOGO_PATH} style={styles.logo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{siteConfig.name}</Text>
          <Text style={styles.headerTitle}>{c.title}</Text>
          <Text style={styles.headerMeta}>{documentRef}</Text>
        </View>
        <Text style={[styles.badge, executed ? styles.badgeDone : styles.badgePending]}>
          {executed ? c.executed : c.awaiting}
        </Text>
      </View>

      <View style={styles.sigRow} wrap={false}>
        <View style={styles.sigCard}>
          <Text style={styles.sigParty}>{c.client}</Text>
          <View style={styles.sigBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            {audit.signatureImage ? <Image src={audit.signatureImage} style={styles.sigImage} /> : null}
          </View>
          <Meta label={c.name} value={audit.signerName} />
          {audit.signerTitle ? <Meta label={c.titleLabel} value={audit.signerTitle} /> : null}
          <Meta label={c.email} value={audit.signerEmail} />
          <Meta label={c.signed} value={stamp(audit.signedAt, language)} />
          <Meta label={c.method} value={audit.signatureMethod === "drawn" ? c.drawn : c.typed} />
        </View>
        <View style={styles.sigCard}>
          <Text style={styles.sigParty}>{c.provider}</Text>
          <View style={styles.sigBox}>
            {executed && audit.countersignImage ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
              <Image src={audit.countersignImage} style={styles.sigImage} />
            ) : (
              <Text style={styles.sigPending}>{c.pending}</Text>
            )}
          </View>
          <Meta label={c.name} value={audit.countersignerName || "—"} />
          {audit.countersignerTitle ? <Meta label={c.titleLabel} value={audit.countersignerTitle} /> : null}
          <Meta label={c.email} value={siteConfig.email} />
          <Meta label={c.signed} value={stamp(audit.countersignedAt, language)} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{c.clauses}</Text>
      {audit.acknowledgements.map((item) => (
        <View key={item.key} style={styles.clauseRow} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clauseTitle}>{item.title}</Text>
            <Text style={styles.clauseText}>{item.statement}</Text>
          </View>
          <View style={styles.clauseStamp}>
            <View style={styles.initialsBox}>
              {initialsImage ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
                <Image src={initialsImage} style={styles.initialsImage} />
              ) : (
                <Text style={styles.initialsText}>{audit.initials}</Text>
              )}
            </View>
            <Text style={styles.stampTime}>{stamp(item.initialed_at, language)}</Text>
          </View>
        </View>
      ))}

      {audit.consentText ? (
        <>
          <Text style={styles.sectionTitle}>{c.consent}</Text>
          <View style={styles.consentBox}>
            <Text style={styles.consentText}>{audit.consentText}</Text>
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle} minPresenceAhead={220}>
        {c.audit}
      </Text>
      <View style={styles.auditTable} wrap={false}>
        {auditRows.map(([label, value, mono], index) => (
          <View key={label} style={index === 0 ? styles.auditRowFirst : styles.auditRow}>
            <Text style={styles.auditLabel}>{label}</Text>
            <Text style={mono ? [styles.auditValue, styles.hash] : styles.auditValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.footnote}>{c.footnote}</Text>

      <View style={styles.footer} fixed>
        <Text>
          {siteConfig.name} · {siteConfig.email} · {siteConfig.domain}
        </Text>
        <Text>
          {c.page} · {documentRef}
        </Text>
      </View>
    </Page>
  );
}

export function signedAgreementFilename(
  snapshot: { opportunity_ref: string; revision_number: number },
  language: CustomerLanguage
): string {
  const stem = formatQuoteFilenameStem(snapshot.opportunity_ref, snapshot.revision_number);
  return `${stem}-${language === "fr" ? "entente-signee" : "signed-agreement"}.pdf`;
}

/** The frozen proposal laid out as a formal contract, followed by the signature & audit certificate. */
export async function renderSignedAgreementPdf(
  row: QuoteSignatureRow
): Promise<{ buffer: Buffer; filename: string }> {
  const snapshot = row.document_snapshot;
  if (!snapshot) throw new Error("Signature has no document snapshot.");
  const audit = toAgreementAudit(row);
  const language = audit.language;
  const c = contractCopy(language);
  const number = contractNumber(snapshot);
  const [provider, attachments] = await Promise.all([
    snapshot.contract_provider ?? currentContractProvider(),
    loadDocumentAttachments(snapshot.estimate_request_id, "quote"),
  ]);
  const appendedPages = appendedPageCount(attachments.pdfs);
  const documentRef = `${c.agreementNo} ${number}`;
  const rendered = await renderToBuffer(
    <Document
      title={`${c.title} · ${number}`}
      author={provider.legal_name || siteConfig.name}
      subject={snapshot.quote_display_ref}
      language={customerLocaleTag(language)}
    >
      <SignedContractPages
        snapshot={snapshot}
        audit={audit}
        provider={provider}
        initialsImage={row.initials_image}
        appendedPages={appendedPages}
      />
      <AgreementCertificatePage audit={audit} documentRef={documentRef} initialsImage={row.initials_image} />
      {renderAttachmentPages({ attachments, language, documentRef, appendedPages })}
    </Document>
  );
  const buffer = await appendPdfAttachments(Buffer.from(rendered), attachments.pdfs, language);
  return { buffer, filename: signedAgreementFilename(snapshot, language) };
}
