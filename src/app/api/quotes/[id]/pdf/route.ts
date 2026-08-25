import { NextResponse } from "next/server";
import { formatQuoteFilenameStem } from "@/data/quotes";
import { getCurrentUser, requireOwner } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { fetchEstimateById } from "@/lib/estimate-access";
import { renderQuotePdfBuffer } from "@/lib/quote-pdf";
import {
  customerCanAccessQuote,
  fetchQuoteById,
  findActivePublicQuoteUrl,
  logQuoteEvent,
  toCustomerSafeQuote,
} from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const quote = await fetchQuoteById(id);
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  const owner = await requireOwner();
  if (!owner) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Sign in required." },
        { status: 401 }
      );
    }
    const estimate = await fetchEstimateById(quote.estimate_request_id);
    if (!customerCanAccessQuote(quote, user, estimate)) {
      return NextResponse.json(
        { ok: false, message: "Access denied." },
        { status: 403 }
      );
    }
    if (quote.status === "draft") {
      return NextResponse.json(
        { ok: false, message: "Quote not available." },
        { status: 404 }
      );
    }
  }

  const siteUrl = getSiteUrl();
  const publicUrl = await findActivePublicQuoteUrl(id, siteUrl);
  const safe = toCustomerSafeQuote(quote, { shareUrl: publicUrl });
  const buffer = await renderQuotePdfBuffer({
    quote: safe,
    publicUrl,
    siteUrl,
  });

  await logQuoteEvent({
    quoteId: id,
    actorType: owner ? "owner" : "customer",
    actorUserId: owner?.user.id ?? null,
    actorEmail: owner?.profile.email ?? null,
    eventType: "pdf_downloaded",
    summary: "PDF opened",
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
