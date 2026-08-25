import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { ensurePublicQuoteUrl, fetchQuoteById } from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Owner: get or create the guest `/quote/[token]` proposal URL. */
export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const quote = await fetchQuoteById(id);
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  const publicUrl = await ensurePublicQuoteUrl({
    quoteId: id,
    siteUrl: getSiteUrl(),
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
  });

  if (!publicUrl) {
    return NextResponse.json(
      { ok: false, message: "Could not create guest proposal link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, publicUrl });
}
