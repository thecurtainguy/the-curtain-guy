import { NextResponse } from "next/server";
import {
  isCustomerLanguage,
  normalizeCustomerLanguage,
} from "@/data/customer-language";
import { formatQuoteFilenameStem } from "@/data/quotes";
import { resolveQuoteTermsForView } from "@/lib/document-texts";
import { getSiteUrl } from "@/lib/env";
import { renderQuotePdfBuffer } from "@/lib/quote-pdf";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import {
  fetchQuoteByPublicToken,
  logQuoteEvent,
  toCustomerSafeQuote,
} from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const quote = await fetchQuoteByPublicToken(token);
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  const publicUrl = buildPublicQuoteUrl(getSiteUrl(), token);
  const lang = new URL(request.url).searchParams.get("lang");
  const quoteLanguage = normalizeCustomerLanguage(quote.language);
  const language = isCustomerLanguage(lang) ? lang : quoteLanguage;
  const safe = toCustomerSafeQuote(
    language === quoteLanguage
      ? quote
      : {
          ...quote,
          language,
          terms: await resolveQuoteTermsForView(
            quote.terms,
            quoteLanguage,
            language
          ),
        },
    { shareUrl: publicUrl }
  );
  const buffer = await renderQuotePdfBuffer({
    quote: safe,
    publicUrl,
    siteUrl: getSiteUrl(),
  });

  await logQuoteEvent({
    quoteId: quote.id,
    actorType: "public_link",
    actorEmail: quote.customer_email,
    eventType: "pdf_downloaded",
    summary: "PDF opened via public link",
  });

  const filename = `${formatQuoteFilenameStem(quote.opportunity_ref, quote.revision_number)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
