import { NextResponse } from "next/server";
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

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const quote = await fetchQuoteByPublicToken(token);
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  const publicUrl = buildPublicQuoteUrl(getSiteUrl(), token);
  const safe = toCustomerSafeQuote(quote, { shareUrl: publicUrl });
  const buffer = await renderQuotePdfBuffer({
    quote: safe,
    publicUrl,
  });

  await logQuoteEvent({
    quoteId: quote.id,
    actorType: "public_link",
    actorEmail: quote.customer_email,
    eventType: "pdf_downloaded",
    summary: "PDF downloaded via public link",
  });

  const filename = `${quote.opportunity_ref}-R${quote.revision_number}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
