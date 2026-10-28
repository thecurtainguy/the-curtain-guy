import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { fetchEstimateById } from "@/lib/estimate-access";
import { renderSignedAgreementPdf } from "@/lib/quote-agreement-pdf";
import { fetchExecutedSignature } from "@/lib/quote-signing";
import { customerCanAccessQuote, fetchQuoteById } from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in required." }, { status: 401 });
  }
  const { id } = await context.params;
  const quote = await fetchQuoteById(id);
  if (!quote) {
    return NextResponse.json({ ok: false, message: "Quote not found." }, { status: 404 });
  }
  const estimate = await fetchEstimateById(quote.estimate_request_id);
  if (!customerCanAccessQuote(quote, user, estimate)) {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }
  const signature = await fetchExecutedSignature(quote.id);
  if (!signature) {
    return NextResponse.json({ ok: false, message: "Agreement not found." }, { status: 404 });
  }
  const { buffer, filename } = await renderSignedAgreementPdf(signature, {
    publicUrl: `${getSiteUrl().replace(/\/$/, "")}/account/quotes/${id}`,
  });
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
