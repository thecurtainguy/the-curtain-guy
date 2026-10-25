import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import { getResendApiKey } from "@/lib/env";
import { sendJobConfirmedEmail } from "@/lib/job-email";
import { createJobFromQuote, getAdminJob } from "@/lib/jobs";
import { fetchQuoteById, logQuoteEvent } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const CHANNELS = ["email", "phone", "in_person", "other"] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  email: "by email",
  phone: "by phone",
  in_person: "in person",
  other: "outside the portal",
};

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
    acceptedByName?: string;
    acceptedOn?: string;
    channel?: string;
    note?: string;
    createJob?: boolean;
    sendConfirmation?: boolean;
  };

  const quote = await fetchQuoteById(quoteId);
  if (!quote) {
    return NextResponse.json({ ok: false, message: "Quote not found." }, { status: 404 });
  }

  const acceptedByName = (body.acceptedByName || quote.customer_name || "").trim().slice(0, 200);
  if (!acceptedByName) {
    return NextResponse.json(
      { ok: false, message: "Enter the name of the person who accepted." },
      { status: 400 }
    );
  }
  const channel: Channel = (CHANNELS as readonly string[]).includes(body.channel ?? "")
    ? (body.channel as Channel)
    : "email";
  const acceptedAt =
    body.acceptedOn && /^\d{4}-\d{2}-\d{2}$/.test(body.acceptedOn)
      ? new Date(`${body.acceptedOn}T12:00:00-05:00`).toISOString()
      : new Date().toISOString();
  const note = (body.note || "").trim().slice(0, 1000);

  if (quote.status !== "accepted") {
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from("quotes")
      .update({
        status: "accepted",
        accepted_at: acceptedAt,
        accepted_by_name: acceptedByName,
      })
      .eq("id", quoteId);
    if (error) {
      console.error("[quotes] mark-accepted", error);
      return NextResponse.json(
        { ok: false, message: "Could not mark the quote accepted." },
        { status: 500 }
      );
    }
    await logQuoteEvent({
      quoteId,
      actorType: "owner",
      actorUserId: owner.user.id,
      actorEmail: owner.profile.email,
      eventType: "customer_accepted",
      summary: `Accepted ${CHANNEL_LABELS[channel]} by ${acceptedByName} (recorded by owner)${note ? ` — ${note}` : ""}`,
      metadata: { channel, recorded_by_owner: true, note: note || null },
    });
  }

  let jobId: string | null = null;
  let emailSent = false;
  if (body.createJob !== false) {
    try {
      const result = await createJobFromQuote(quoteId, owner.user.id);
      jobId = result.jobId;
      if (result.created && body.sendConfirmation) {
        const apiKey = getResendApiKey();
        const job = await getAdminJob(result.jobId);
        if (apiKey && job?.customer_email) {
          try {
            await sendJobConfirmedEmail({
              apiKey,
              job,
              language: normalizeCustomerLanguage(quote.language),
            });
            emailSent = true;
          } catch (err) {
            console.error("[jobs] confirmation email failed", err);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create job.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    jobId,
    emailSent,
    message: jobId
      ? "Quote marked accepted and job created."
      : "Quote marked accepted.",
  });
}
