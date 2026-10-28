import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { supersedeOtherRevisions } from "@/lib/quote-revisions";
import { fetchQuoteById, logQuoteEvent } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const CHANNELS = ["email", "text", "in_person", "other"] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  email: "by email",
  text: "by text / WhatsApp",
  in_person: "in person",
  other: "outside the portal",
};

/** Records a quote that was delivered outside the system (own inbox, text, in person). */
export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id: quoteId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    sentOn?: string;
    channel?: string;
    note?: string;
  };

  const quote = await fetchQuoteById(quoteId);
  if (!quote) {
    return NextResponse.json({ ok: false, message: "Quote not found." }, { status: 404 });
  }
  if (quote.status !== "draft") {
    return NextResponse.json(
      { ok: false, message: "Only draft quotes can be marked as sent." },
      { status: 400 }
    );
  }

  const channel: Channel = (CHANNELS as readonly string[]).includes(body.channel ?? "")
    ? (body.channel as Channel)
    : "email";
  const sentAt =
    body.sentOn && /^\d{4}-\d{2}-\d{2}$/.test(body.sentOn)
      ? new Date(`${body.sentOn}T12:00:00-05:00`).toISOString()
      : new Date().toISOString();
  const note = (body.note || "").trim().slice(0, 1000);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("quotes")
    .update({ status: "sent", sent_at: sentAt })
    .eq("id", quoteId)
    .eq("status", "draft");
  if (error) {
    console.error("[quotes] mark-sent", error);
    return NextResponse.json(
      { ok: false, message: "Could not mark the quote as sent." },
      { status: 500 }
    );
  }

  await logQuoteEvent({
    quoteId,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "quote_sent",
    summary: `Sent ${CHANNEL_LABELS[channel]} outside the system (recorded by owner)${note ? ` — ${note}` : ""}`,
    metadata: { channel, recorded_by_owner: true, note: note || null },
  });
  await supersedeOtherRevisions({
    quote,
    trigger: "sent",
    actor: { type: "owner", userId: owner.user.id, email: owner.profile.email },
  });

  return NextResponse.json({ ok: true, message: "Quote marked as sent." });
}
