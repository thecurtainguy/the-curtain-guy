import { NextResponse } from "next/server";
import { isEmailVerified, requireCustomerOrOwner } from "@/lib/auth";
import { getResendApiKey } from "@/lib/env";
import { sendJobMessageNotifyOwner } from "@/lib/job-email";
import { addJobMessage, getCustomerJob } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const current = await requireCustomerOrOwner();
  if (!current) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (current.profile.role === "owner") {
    return NextResponse.json(
      { ok: false, message: "Use admin routes for owner access." },
      { status: 403 }
    );
  }

  if (!isEmailVerified(current.user)) {
    return NextResponse.json(
      { ok: false, message: "Please verify your email before sending messages." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.message?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Message is required." },
      { status: 400 }
    );
  }

  const job = await getCustomerJob(id, current.user);
  if (!job) {
    return NextResponse.json(
      { ok: false, message: "Event not found." },
      { status: 404 }
    );
  }

  try {
    const row = await addJobMessage(id, {
      message: body.message,
      senderUserId: current.user.id,
      senderName:
        current.profile.full_name ??
        job.customer_name ??
        current.user.email ??
        "Customer",
      senderEmail: current.user.email ?? job.customer_email,
      senderRole: "customer",
      isInternal: false,
    });

    if (!row) {
      return NextResponse.json(
        { ok: false, message: "Could not send message." },
        { status: 500 }
      );
    }

    const apiKey = getResendApiKey();
    if (apiKey) {
      try {
        await sendJobMessageNotifyOwner({
          apiKey,
          job,
          senderName: row.sender_name,
          messagePreview: row.message,
        });
      } catch (err) {
        console.error("[jobs] owner notify email failed", err);
      }
    }

    return NextResponse.json({ ok: true, message: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send message.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
