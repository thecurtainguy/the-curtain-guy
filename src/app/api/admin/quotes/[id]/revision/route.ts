import { NextResponse } from "next/server";
import { resolveQuoteDisplayRef } from "@/data/quotes";
import { requireOwner } from "@/lib/auth";
import { createQuoteRevision } from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const result = await createQuoteRevision({
    sourceQuoteId: id,
    createdByUserId: owner.user.id,
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    quoteId: result.quote.id,
    quoteDisplayRef: resolveQuoteDisplayRef(result.quote),
  });
}
