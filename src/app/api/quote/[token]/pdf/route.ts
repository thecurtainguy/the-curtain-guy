import { NextResponse } from "next/server";
import { formatQuoteFilenameStem, quoteViewLanguage } from "@/data/quotes";
import { getSiteUrl } from "@/lib/env";
import { renderQuotePdfBuffer } from "@/lib/quote-pdf";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import { isOwnerCopySource, OWNER_COPY_PARAM, recordDocumentOpen } from "@/lib/document-views";
import {
  fetchQuoteByPublicToken,
  localizeQuote,
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
  const language = quoteViewLanguage(quote, lang);
  const safe = toCustomerSafeQuote(await localizeQuote(quote, language), {
    shareUrl: publicUrl,
  });
  const buffer = await renderQuotePdfBuffer({
    quote: safe,
    publicUrl,
    siteUrl: getSiteUrl(),
  });

  const { owner } = await recordDocumentOpen({
    target: { quoteId: quote.id },
    source: "public_link",
    ownerCopy: isOwnerCopySource(new URL(request.url).searchParams.get(OWNER_COPY_PARAM)),
    pdf: true,
  });
  if (!owner) {
    await logQuoteEvent({
      quoteId: quote.id,
      actorType: "public_link",
      actorEmail: quote.customer_email,
      eventType: "pdf_downloaded",
      summary: `PDF opened via public link (${language === "fr" ? "French" : "English"})`,
      metadata: { language },
    });
  }

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
