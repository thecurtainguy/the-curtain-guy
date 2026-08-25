import { NextResponse } from "next/server";
import type { QuoteRequestType } from "@/data/quotes";
import { getQuoteUpsellByKey } from "@/data/quote-upsells";
import { getCurrentUser } from "@/lib/auth";
import { getResendApiKey } from "@/lib/env";
import { fetchEstimateById } from "@/lib/estimate-access";
import { sendQuoteOwnerActionNotification } from "@/lib/quote-email";
import {
  createCustomerRequest,
  customerCanAccessQuote,
  fetchQuoteById,
  logQuoteEvent,
} from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in required." },
      { status: 401 }
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

  const estimate = await fetchEstimateById(quote.estimate_request_id);
  if (!customerCanAccessQuote(quote, user, estimate)) {
    return NextResponse.json(
      { ok: false, message: "Access denied." },
      { status: 403 }
    );
  }

  if (quote.status === "draft" || quote.status === "cancelled") {
    return NextResponse.json(
      { ok: false, message: "This quote is not available for customer action." },
      { status: 400 }
    );
  }

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
  const email = user.email || quote.customer_email;

  if (action === "accept") {
    await admin
      .from("quotes")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", id);
    await logQuoteEvent({
      quoteId: id,
      actorType: "customer",
      actorUserId: user.id,
      actorEmail: email,
      eventType: "customer_accepted",
      summary: "Customer accepted quote",
    });
    await notifyOwner(id, "Customer accepted quote");
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  if (action === "decline") {
    await admin
      .from("quotes")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
      })
      .eq("id", id);
    await logQuoteEvent({
      quoteId: id,
      actorType: "customer",
      actorUserId: user.id,
      actorEmail: email,
      eventType: "customer_declined",
      summary: "Customer declined quote",
      metadata: { reason: body.reason || null },
    });
    if (body.reason?.trim()) {
      await createCustomerRequest({
        quote,
        requestType: "custom",
        title: "Decline reason",
        message: body.reason.trim(),
        createdByEmail: email,
        createdByUserId: user.id,
        actorType: "customer",
      });
    }
    await notifyOwner(id, "Customer declined quote", body.reason || null);
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
      createdByUserId: user.id,
      actorType: "customer",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save request." },
        { status: 500 }
      );
    }
    await notifyOwner(id, "Customer requested changes", message);
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
      createdByUserId: user.id,
      actorType: "customer",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save question." },
        { status: 500 }
      );
    }
    await notifyOwner(id, "Customer asked a question", message);
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
      createdByUserId: user.id,
      actorType: "customer",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save add-on request." },
        { status: 500 }
      );
    }
    await notifyOwner(
      id,
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
      createdByUserId: user.id,
      actorType: "customer",
    });
    if (!created) {
      return NextResponse.json(
        { ok: false, message: "Could not save request." },
        { status: 500 }
      );
    }
    await notifyOwner(id, "Customer custom request", `${title}: ${message}`);
    return NextResponse.json({ ok: true, requestId: created.id });
  }

  return NextResponse.json(
    { ok: false, message: "Unknown action." },
    { status: 400 }
  );
}
