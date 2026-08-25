import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { fetchEstimateById } from "@/lib/estimate-access";
import {
  customerCanAccessQuote,
  ensurePublicQuoteUrl,
  fetchQuoteById,
} from "@/lib/quotes";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Customer: get or create the guest `/quote/[token]` proposal URL. */
export async function POST(_request: Request, context: RouteContext) {
  const current = await getCurrentProfile();
  if (!current || current.profile.role !== "customer") {
    return NextResponse.json(
      { ok: false, message: "Customer access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const quote = await fetchQuoteById(id);
  if (!quote || quote.status === "draft") {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  const estimate = await fetchEstimateById(quote.estimate_request_id);
  if (!customerCanAccessQuote(quote, current.user, estimate)) {
    return NextResponse.json(
      { ok: false, message: "Access denied." },
      { status: 403 }
    );
  }

  const publicUrl = await ensurePublicQuoteUrl({
    quoteId: id,
    siteUrl: getSiteUrl(),
    actorType: "customer",
    actorUserId: current.user.id,
    actorEmail: current.profile.email,
  });

  if (!publicUrl) {
    return NextResponse.json(
      { ok: false, message: "Could not create guest proposal link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, publicUrl });
}
