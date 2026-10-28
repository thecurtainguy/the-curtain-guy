import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runInvoiceReminders } from "@/lib/invoice-notices";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is refused. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await runInvoiceReminders();
  return NextResponse.json({
    ok: true,
    checked: result.checked,
    digestSent: result.digestSent,
    reminders: result.outcomes.map((o) => ({
      invoice: o.invoiceNumber,
      stage: o.stage,
      result: o.result,
    })),
  });
}
