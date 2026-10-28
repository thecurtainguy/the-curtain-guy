import { NextResponse } from "next/server";
import { renderSignedAgreementPdf } from "@/lib/quote-agreement-pdf";
import { fetchExecutedSignature } from "@/lib/quote-signing";
import { fetchQuoteByPublicToken } from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const quote = await fetchQuoteByPublicToken(token);
  const signature = quote ? await fetchExecutedSignature(quote.id) : null;
  if (!quote || !signature) {
    return NextResponse.json({ ok: false, message: "Agreement not found." }, { status: 404 });
  }
  const { buffer, filename } = await renderSignedAgreementPdf(signature);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
