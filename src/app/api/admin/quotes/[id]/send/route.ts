import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getResendApiKey, getSiteUrl } from "@/lib/env";
import { sendQuoteReadyEmail } from "@/lib/quote-email";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import {
  fetchQuoteById,
  issuePublicQuoteToken,
  logQuoteEvent,
} from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
  const quote = await fetchQuoteById(id);
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  if (!quote.customer_email?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Customer email is required before sending." },
      { status: 400 }
    );
  }

  const issued = await issuePublicQuoteToken(id);
  if (!issued) {
    return NextResponse.json(
      { ok: false, message: "Could not create public quote link." },
      { status: 500 }
    );
  }

  const publicUrl = buildPublicQuoteUrl(getSiteUrl(), issued.token);
  const now = new Date().toISOString();
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("quotes")
    .update({
      status: "sent",
      sent_at: now,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  await logQuoteEvent({
    quoteId: id,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "quote_sent",
    summary: `Quote sent to ${quote.customer_email}`,
    metadata: {
      public_token: issued.token,
      public_url: publicUrl,
      public_token_expires_at: issued.expiresAt,
    },
  });

  const apiKey = getResendApiKey();
  let emailSent = false;
  if (apiKey) {
    try {
      const fresh = await fetchQuoteById(id);
      if (fresh) {
        await sendQuoteReadyEmail({
          apiKey,
          quote: fresh,
          publicQuoteUrl: publicUrl,
        });
        emailSent = true;
      }
    } catch (err) {
      console.error("[quotes] send email failed", err);
    }
  }

  return NextResponse.json({
    ok: true,
    publicUrl,
    emailSent,
    message: emailSent
      ? "Quote sent."
      : apiKey
        ? "Quote link created; email failed to send."
        : "Quote link created; Resend not configured.",
  });
}
