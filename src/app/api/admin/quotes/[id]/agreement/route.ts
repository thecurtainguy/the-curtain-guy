import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { renderSignedAgreementPdf } from "@/lib/quote-agreement-pdf";
import { fetchExecutedSignature } from "@/lib/quote-signing";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const signature = await fetchExecutedSignature(id);
  if (!signature) {
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
