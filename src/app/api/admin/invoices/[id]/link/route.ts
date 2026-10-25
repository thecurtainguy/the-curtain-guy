import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import {
  ensureInvoicePublicUrl,
  fetchInvoiceById,
  issueInvoiceToken,
} from "@/lib/invoices";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Returns the client link; `regenerate: true` invalidates the previous one. */
export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { regenerate?: boolean };
  try {
    const url = body.regenerate
      ? await issueInvoiceToken(id, getSiteUrl(), owner.user.id, { reset: true })
      : await ensureInvoicePublicUrl(id, getSiteUrl(), owner.user.id);
    return NextResponse.json({
      ok: true,
      url,
      invoice: await fetchInvoiceById(id, { includeEvents: true }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create link.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
