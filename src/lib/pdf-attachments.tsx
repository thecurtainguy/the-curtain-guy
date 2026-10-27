import { Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import type { CustomerLanguage } from "@/data/customer-language";
import {
  estimateFileKindLabel,
  getAttachmentCopy,
  type AttachmentViewItem,
  type EstimateFileKind,
} from "@/data/estimate-file-kinds";
import { siteConfig } from "@/data/site";
import { fetchEstimateFiles, type EstimateFileRow } from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type DocumentAttachmentTarget = "quote" | "invoice";

export type PdfImageAttachment = {
  id: string;
  kind: EstimateFileKind;
  caption: string | null;
  fileName: string;
  src: string;
  width: number;
  height: number;
};

export type PdfFileAttachment = {
  id: string;
  kind: EstimateFileKind;
  caption: string | null;
  fileName: string;
  bytes: Uint8Array;
};

export type DocumentAttachments = {
  images: PdfImageAttachment[];
  pdfs: PdfFileAttachment[];
};

const EMPTY: DocumentAttachments = { images: [], pdfs: [] };
const IMAGE_BOX = { width: 540, height: 540 };
const VIEW_URL_TTL_SEC = 60 * 60;

/** Shared files flagged for the target. Internal files are excluded by query and by DB constraint. */
async function listIncludedFiles(
  estimateRequestId: string | null | undefined,
  target: DocumentAttachmentTarget
): Promise<EstimateFileRow[]> {
  if (!estimateRequestId) return [];
  const files = await fetchEstimateFiles(estimateRequestId, ["uploaded"], {
    customerVisibleOnly: true,
  });
  return files.filter((file) =>
    target === "quote" ? file.include_in_quote : file.include_in_invoice
  );
}

async function downloadFile(file: EstimateFileRow): Promise<Buffer | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(file.bucket)
    .download(file.object_path);
  if (error || !data) {
    console.error("[pdf-attachments] download failed", file.id, error?.message);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function loadDocumentAttachments(
  estimateRequestId: string | null | undefined,
  target: DocumentAttachmentTarget
): Promise<DocumentAttachments> {
  const files = await listIncludedFiles(estimateRequestId, target);
  if (files.length === 0) return EMPTY;

  const loaded = await Promise.all(
    files.map(async (file) => {
      const bytes = await downloadFile(file);
      if (!bytes) return null;
      const base = {
        id: file.id,
        kind: file.file_kind,
        caption: file.caption,
        fileName: file.original_file_name,
      };
      if (file.content_type === "application/pdf") {
        if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return null;
        return { type: "pdf" as const, value: { ...base, bytes: new Uint8Array(bytes) } };
      }
      if (!file.content_type.startsWith("image/")) return null;
      try {
        const { data, info } = await sharp(bytes)
          .rotate()
          .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer({ resolveWithObject: true });
        const scale = Math.min(IMAGE_BOX.width / info.width, IMAGE_BOX.height / info.height);
        return {
          type: "image" as const,
          value: {
            ...base,
            src: `data:image/jpeg;base64,${data.toString("base64")}`,
            width: Math.round(info.width * scale),
            height: Math.round(info.height * scale),
          },
        };
      } catch (error) {
        console.error("[pdf-attachments] image conversion failed", file.id, error);
        return null;
      }
    })
  );

  const result: DocumentAttachments = { images: [], pdfs: [] };
  for (const item of loaded) {
    if (item?.type === "image") result.images.push(item.value);
    if (item?.type === "pdf") result.pdfs.push(item.value);
  }
  return result;
}

/** Short-lived signed URLs for web views (proposal page). */
export async function listAttachmentViewItems(
  estimateRequestId: string | null | undefined,
  target: DocumentAttachmentTarget
): Promise<AttachmentViewItem[]> {
  const files = await listIncludedFiles(estimateRequestId, target);
  if (files.length === 0) return [];
  const admin = createAdminSupabaseClient();
  const items = await Promise.all(
    files.map(async (file) => {
      const { data, error } = await admin.storage
        .from(file.bucket)
        .createSignedUrl(file.object_path, VIEW_URL_TTL_SEC);
      if (error || !data?.signedUrl) return null;
      return {
        id: file.id,
        kind: file.file_kind,
        caption: file.caption,
        fileName: file.original_file_name,
        contentType: file.content_type,
        url: data.signedUrl,
      };
    })
  );
  return items.filter((item): item is AttachmentViewItem => Boolean(item));
}

const COLORS = {
  ink: "#1a1612",
  muted: "#6b635a",
  soft: "#9a9186",
  line: "#e8e0d4",
  paper: "#fffdf9",
  gold: "#c4a035",
  goldDeep: "#8a6d1d",
  goldWash: "#f5efe0",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 46,
    paddingHorizontal: 36,
    backgroundColor: COLORS.paper,
    fontFamily: "Helvetica",
    color: COLORS.ink,
  },
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLORS.goldDeep,
    fontFamily: "Helvetica-Bold",
  },
  title: { marginTop: 4, fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitle: { marginTop: 3, fontSize: 8.5, color: COLORS.muted },
  rule: { marginTop: 12, marginBottom: 14, height: 1, backgroundColor: COLORS.line },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  kindChip: {
    paddingTop: 2.5,
    paddingBottom: 1.5,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: COLORS.goldWash,
    color: COLORS.goldDeep,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  caption: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  disclaimer: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldWash,
  },
  disclaimerTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.goldDeep,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  disclaimerBody: { marginTop: 3, fontSize: 8, lineHeight: 1.45, color: COLORS.ink },
  docRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  docName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  docMeta: { marginTop: 2, fontSize: 8, color: COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.soft,
  },
});

/** Extra react-pdf pages: one per image, plus an index page when PDFs are merged after. */
export function renderAttachmentPages(input: {
  attachments: DocumentAttachments;
  language: CustomerLanguage;
  documentRef: string;
}) {
  const { attachments, language, documentRef } = input;
  const copy = getAttachmentCopy(language);
  const footer = (
    <View style={styles.footer} fixed>
      <Text>
        {siteConfig.name} · {documentRef}
      </Text>
      <Text>{siteConfig.domain}</Text>
    </View>
  );

  const imagePages = attachments.images.map((image, index) => (
    <Page key={image.id} size="LETTER" style={styles.page}>
      <Text style={styles.eyebrow}>{siteConfig.name}</Text>
      <Text style={styles.title}>
        {copy.title}
        {attachments.images.length > 1 ? ` · ${index + 1}/${attachments.images.length}` : ""}
      </Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
      <View style={styles.rule} />
      <View style={styles.metaRow}>
        <Text style={styles.kindChip}>{estimateFileKindLabel(image.kind, language)}</Text>
        {image.caption ? <Text style={styles.caption}>{image.caption}</Text> : null}
      </View>
      <View style={styles.imageWrap}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
        <Image src={image.src} style={{ width: image.width, height: image.height }} />
      </View>
      {image.kind === "concept" ? (
        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerTitle}>
            {estimateFileKindLabel("concept", language)}
          </Text>
          <Text style={styles.disclaimerBody}>{copy.conceptDisclaimer}</Text>
        </View>
      ) : null}
      {footer}
    </Page>
  ));

  if (attachments.pdfs.length === 0) return imagePages;

  const hasConceptPdf = attachments.pdfs.some((pdf) => pdf.kind === "concept");
  const indexPage = (
    <Page key="attachments-index" size="LETTER" style={styles.page}>
      <Text style={styles.eyebrow}>{siteConfig.name}</Text>
      <Text style={styles.title}>{copy.documentsTitle}</Text>
      <Text style={styles.subtitle}>{copy.documentsSubtitle}</Text>
      <View style={styles.rule} />
      {attachments.pdfs.map((pdf) => (
        <View key={pdf.id} style={styles.docRow} wrap={false}>
          <Text style={styles.docName}>{pdf.caption || pdf.fileName}</Text>
          <Text style={styles.docMeta}>
            {estimateFileKindLabel(pdf.kind, language)}
            {pdf.caption ? ` · ${pdf.fileName}` : ""}
          </Text>
        </View>
      ))}
      {hasConceptPdf ? (
        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerTitle}>
            {estimateFileKindLabel("concept", language)}
          </Text>
          <Text style={styles.disclaimerBody}>{copy.conceptDisclaimer}</Text>
        </View>
      ) : null}
      {footer}
    </Page>
  );
  return [...imagePages, indexPage];
}

/** Merges PDF attachments after the rendered document; concept pages get a disclaimer stamp. */
export async function appendPdfAttachments(
  documentPdf: Buffer,
  pdfs: PdfFileAttachment[],
  language: CustomerLanguage
): Promise<Buffer> {
  if (pdfs.length === 0) return documentPdf;
  try {
    const merged = await PDFDocument.load(documentPdf);
    const font = await merged.embedFont(StandardFonts.Helvetica);
    const stamp = getAttachmentCopy(language).conceptStamp;
    for (const pdf of pdfs) {
      try {
        const source = await PDFDocument.load(pdf.bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(source, source.getPageIndices());
        for (const page of pages) {
          merged.addPage(page);
          if (pdf.kind !== "concept") continue;
          const { width } = page.getSize();
          const size = 7;
          const textWidth = font.widthOfTextAtSize(stamp, size);
          page.drawRectangle({
            x: (width - textWidth) / 2 - 6,
            y: 8,
            width: textWidth + 12,
            height: size + 7,
            color: rgb(0.96, 0.94, 0.88),
            opacity: 0.92,
          });
          page.drawText(stamp, {
            x: (width - textWidth) / 2,
            y: 12,
            size,
            font,
            color: rgb(0.54, 0.43, 0.11),
          });
        }
      } catch (error) {
        console.error("[pdf-attachments] skip unreadable PDF", pdf.id, error);
      }
    }
    return Buffer.from(await merged.save());
  } catch (error) {
    console.error("[pdf-attachments] merge failed", error);
    return documentPdf;
  }
}
