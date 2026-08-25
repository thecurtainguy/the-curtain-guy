import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { addJobMessage, getAdminJob } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: { message?: string; isInternal?: boolean };
  try {
    body = (await request.json()) as { message?: string; isInternal?: boolean };
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

  try {
    const row = await addJobMessage(id, {
      message: body.message,
      senderUserId: owner.user.id,
      senderName: owner.profile.full_name ?? owner.profile.email,
      senderEmail: owner.profile.email,
      senderRole: "owner",
      isInternal: body.isInternal ?? false,
    });

    if (!row) {
      return NextResponse.json(
        { ok: false, message: "Could not save message." },
        { status: 500 }
      );
    }

    const job = await getAdminJob(id);
    return NextResponse.json({ ok: true, message: row, job });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not save message.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
