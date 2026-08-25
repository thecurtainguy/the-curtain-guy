import { NextResponse } from "next/server";
import type { QuoteRequestType } from "@/data/quotes";
import { getQuoteUpsellByKey } from "@/data/quote-upsells";
import { getResendApiKey } from "@/lib/env";
import { sendQuoteOwnerActionNotification } from "@/lib/quote-email";
import {
  createCustomerRequest,
  fetchQuoteById,
  fetchQuoteByPublicToken,
  logQuoteEvent,
} from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type ActionBody = {
  action?: string;
  message?: string;
  reason?: string;
  sourceKey?: string;
  title?: string;
  requestType?: QuoteRequestType;
};

async function notifyOwner(
  quoteId: string,
  actionLabel: string,
  details?: string | null
) {
  const apiKey = getResendApiKey();
  if (!apiKey) return;
  const quote = await fetchQuoteById(quoteId);
  if (!quote) return;
  try {
    await sendQuoteOwnerActionNotification({
      apiKey,
      quote,
      actionLabel,
      details,
    });
  } catch (err) {
    console.error("[quotes] owner notify failed", err);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const quoteBundle = await fetchQuoteByPublicToken(token);
  if (!quoteBundle) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  const quote = quoteBundle;
  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const action = body.action?.trim();
  const admin = createAdminSupabaseClient();
  const email = quote.customer_email;

  if (action === "accept") {
    await admin
      .from("quotes")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", quote.id);
    await logQuoteEvent({
      quoteId: quote.id,
      actorType: "public_link",
      actorEmail: email,
      eventType: "customer_accepted",
      summary: "Customer accepted quote via public link",
    });
    await notifyOwner(quote.id, "Customer accepted quote");
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  if (action === "decline") {
    await admin
      .from("quotes")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
      })
      .eq("id", quote.id);
    await logQuoteEvent({
      quoteId: quote.id,
      actorType: "public_link",
      actorEmail: email,
      eventType: "customer_declined",
      summary: "Customer declined quote via public link",
      metadata: { reason: body.reason || null },
    });
    if (body.reason?.trim()) {
      await createCustomerRequest({
        quote,
        requestType: "custom",
        title: "Decline reason",
        message: body.reason.trim(),
        createdByEmail: email,
        actorType: "public_link",
      });
    }
    await notifyOwner(quote.id, "Customer declined quote", body.reason || null);
    return NextResponse.json({ ok: true, status: "declined" });
  }

  if (action === "request_changes") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { ok: false, message: "Please describe the changes you need." },
        { status: 400 }
      );
    }
    const created = await createCustomerRequest({
      quote,
      requestType: "revision",
      title: "Revision requested",
      message,
      createdByEmail: email,
      actorType: "public_link",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save request." },
        { status: 500 }
      );
    }
    await notifyOwner(quote.id, "Customer requested changes", message);
    return NextResponse.json({ ok: true, requestId: created.id });
  }

  if (action === "ask_question") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { ok: false, message: "Please enter your question." },
        { status: 400 }
      );
    }
    const created = await createCustomerRequest({
      quote,
      requestType: "question",
      title: "Question",
      message,
      createdByEmail: email,
      actorType: "public_link",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save question." },
        { status: 500 }
      );
    }
    await notifyOwner(quote.id, "Customer asked a question", message);
    return NextResponse.json({ ok: true, requestId: created.id });
  }

  if (action === "request_add_on") {
    const sourceKey = body.sourceKey?.trim();
    const upsell = sourceKey ? getQuoteUpsellByKey(sourceKey) : null;
    if (!upsell) {
      return NextResponse.json(
        { ok: false, message: "Unknown option." },
        { status: 400 }
      );
    }
    const created = await createCustomerRequest({
      quote,
      requestType: "add_on",
      title: upsell.title,
      message: body.message?.trim() || null,
      sourceKey: upsell.key,
      createdByEmail: email,
      actorType: "public_link",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save add-on request." },
        { status: 500 }
      );
    }
    await notifyOwner(
      quote.id,
      "Customer requested add-on",
      `${upsell.title}${body.message ? `: ${body.message}` : ""}`
    );
    return NextResponse.json({ ok: true, requestId: created.id });
  }

  if (action === "custom_request") {
    const title = body.title?.trim() || "Custom request";
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { ok: false, message: "Please describe your request." },
        { status: 400 }
      );
    }
    const created = await createCustomerRequest({
      quote,
      requestType: "custom",
      title,
      message,
      createdByEmail: email,
      actorType: "public_link",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save request." },
        { status: 500 }
      );
    }
    await notifyOwner(
      quote.id,
      "Customer custom request",
      `${title}: ${message}`
    );
    return NextResponse.json({ ok: true, requestId: created.id });
  }

  return NextResponse.json(
    { ok: false, message: "Unknown action." },
    { status: 400 }
  );
}
