import {
  DOCUMENT_TEXT_DEFS,
  localizedDocumentTextSlug,
  type BaseDocumentTextSlug,
} from "@/data/document-texts";
import type { CustomerLanguage } from "@/data/customer-language";
import { joinBilingual } from "@/lib/quote-email-compose";

export function defaultQuoteDocumentText(
  slug: BaseDocumentTextSlug,
  language: CustomerLanguage
): string {
  const localized = localizedDocumentTextSlug(slug, language);
  return (
    DOCUMENT_TEXT_DEFS.find((def) => def.slug === localized)?.defaultBody ?? ""
  );
}

export type QuoteEmailTexts = {
  notes: Record<CustomerLanguage, string>;
  /** French then English footer. */
  footer: string;
};

function quoteEmailTexts(
  bodyFor: (slug: BaseDocumentTextSlug, language: CustomerLanguage) => string | undefined
): QuoteEmailTexts {
  const text = (slug: BaseDocumentTextSlug, language: CustomerLanguage) =>
    bodyFor(slug, language) || defaultQuoteDocumentText(slug, language);
  return {
    notes: { fr: text("quote.email_note", "fr"), en: text("quote.email_note", "en") },
    footer: joinBilingual({
      fr: text("quote.email_footer", "fr"),
      en: text("quote.email_footer", "en"),
    }),
  };
}

export function defaultQuoteEmailTexts(): QuoteEmailTexts {
  return quoteEmailTexts(() => undefined);
}

/**
 * Email notes + footer in both languages as edited under Admin → Documents,
 * falling back to the built-in copy.
 */
export async function fetchQuoteEmailTexts(): Promise<QuoteEmailTexts> {
  try {
    const response = await fetch("/api/admin/document-texts");
    const json = (await response.json()) as {
      ok?: boolean;
      texts?: Array<{ slug: string; body: string }>;
    };
    if (!response.ok || !json.ok) return defaultQuoteEmailTexts();
    return quoteEmailTexts(
      (slug, language) =>
        json.texts?.find(
          (item) => item.slug === localizedDocumentTextSlug(slug, language)
        )?.body
    );
  } catch {
    return defaultQuoteEmailTexts();
  }
}
