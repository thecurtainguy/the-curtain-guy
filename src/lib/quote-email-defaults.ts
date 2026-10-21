import {
  DOCUMENT_TEXT_DEFS,
  localizedDocumentTextSlug,
  type BaseDocumentTextSlug,
} from "@/data/document-texts";
import type { CustomerLanguage } from "@/data/customer-language";

export function defaultQuoteDocumentText(
  slug: BaseDocumentTextSlug,
  language: CustomerLanguage
): string {
  const localized = localizedDocumentTextSlug(slug, language);
  return (
    DOCUMENT_TEXT_DEFS.find((def) => def.slug === localized)?.defaultBody ?? ""
  );
}

/**
 * Email note + footer as edited under Admin → Documents, falling back to the
 * built-in copy for the quote language.
 */
export async function fetchQuoteEmailTexts(
  language: CustomerLanguage
): Promise<{ note: string; footer: string }> {
  const fallback = {
    note: defaultQuoteDocumentText("quote.email_note", language),
    footer: defaultQuoteDocumentText("quote.email_footer", language),
  };
  try {
    const response = await fetch("/api/admin/document-texts");
    const json = (await response.json()) as {
      ok?: boolean;
      texts?: Array<{ slug: string; body: string }>;
    };
    if (!response.ok || !json.ok) return fallback;
    const bodyFor = (slug: BaseDocumentTextSlug) =>
      json.texts?.find(
        (item) => item.slug === localizedDocumentTextSlug(slug, language)
      )?.body;
    return {
      note: bodyFor("quote.email_note") || fallback.note,
      footer: bodyFor("quote.email_footer") || fallback.footer,
    };
  } catch {
    return fallback;
  }
}
