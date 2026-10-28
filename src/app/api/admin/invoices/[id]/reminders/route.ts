import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { updateInvoiceReminderSettings } from "@/lib/invoice-notices";
import { fetchInvoiceById } from "@/lib/invoices";
import { isValidEmailAddress, parseEmailList } from "@/lib/quote-email-compose";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Saves automatic reminder settings: on/paused, schedule, weekly nudges, recipients. */
export async function PATCH(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    enabled?: boolean;
    steps?: string[];
    repeatWeekly?: boolean;
    /** Empty or null = whoever received the latest invoice email. */
    to?: string | null;
    cc?: string | null;
  };
  const to = body.to === undefined ? undefined : parseEmailList(body.to ?? "");
  const cc = parseEmailList(body.cc ?? "");
  const invalid = [...(to ?? []), ...cc].find((email) => !isValidEmailAddress(email));
  if (invalid) {
    return NextResponse.json({ ok: false, message: `Invalid email: ${invalid}` }, { status: 400 });
  }

  const result = await updateInvoiceReminderSettings(id, owner.user.id, {
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    steps: Array.isArray(body.steps) ? body.steps.filter((s): s is string => typeof s === "string") : undefined,
    repeatWeekly: typeof body.repeatWeekly === "boolean" ? body.repeatWeekly : undefined,
    to: to === undefined ? undefined : to.length ? to : null,
    cc: to?.length ? cc : null,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    invoice: await fetchInvoiceById(id, { includeEvents: true }),
    message: "Reminder settings saved.",
  });
}
