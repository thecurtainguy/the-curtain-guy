import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { ownerArchiveAddresses, splitOwnerCopy } from "@/lib/email-tracking";
import { getOutboundEmailCopyTo, getResendApiKey, getSiteUrl } from "@/lib/env";
import { invoiceReplyTo, sendInvoiceEmail } from "@/lib/invoice-email";
import { updateInvoiceReminderSettings } from "@/lib/invoice-notices";
import {
  ensureInvoicePublicUrl,
  fetchInvoiceById,
  logInvoiceEvent,
  setInvoiceStatus,
} from "@/lib/invoices";
import { recordJobEvent } from "@/lib/job-events";
import { isValidEmailAddress, parseEmailList } from "@/lib/quote-email-compose";

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
  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    bodyText?: string;
    attachPdf?: boolean;
    /** Automatic reminder plan chosen in the send dialog; saved only once the email is out. */
    reminders?: {
      enabled?: boolean;
      steps?: string[];
      repeatWeekly?: boolean;
      /** Null = same people as this email. */
      to?: string | null;
      cc?: string | null;
    };
  };

  const invoice = await fetchInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status === "void") {
    return NextResponse.json(
      { ok: false, message: "Restore this invoice before sending it." },
      { status: 400 }
    );
  }

  const to = parseEmailList(body.to || invoice.customer_email || "");
  const cc = parseEmailList(body.cc || "");
  const bcc = parseEmailList(body.bcc || "");
  const invalid = [...to, ...cc, ...bcc].find((email) => !isValidEmailAddress(email));
  if (to.length === 0 || invalid) {
    return NextResponse.json(
      { ok: false, message: invalid ? `Invalid email: ${invalid}` : "Add a recipient." },
      { status: 400 }
    );
  }

  const reminders = body.reminders;
  const reminderTo = reminders?.to ? parseEmailList(reminders.to) : [];
  const reminderCc = reminderTo.length ? parseEmailList(reminders?.cc ?? "") : [];
  const invalidReminder = [...reminderTo, ...reminderCc].find((email) => !isValidEmailAddress(email));
  if (invalidReminder) {
    return NextResponse.json(
      { ok: false, message: `Invalid reminder email: ${invalidReminder}` },
      { status: 400 }
    );
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 500 }
    );
  }

  const siteUrl = getSiteUrl();
  const publicUrl = await ensureInvoicePublicUrl(id, siteUrl, owner.user.id);
  const settings = await getBusinessSettings();
  const split = splitOwnerCopy(bcc, ownerArchiveAddresses([owner.profile.email]));
  const ownerCopyTo =
    bcc.length === 0 ? parseEmailList(getOutboundEmailCopyTo()) : split.ownerCopyTo;

  try {
    await sendInvoiceEmail({
      apiKey,
      invoice,
      settings,
      publicUrl,
      to,
      cc,
      bcc: split.bcc,
      ownerCopyTo,
      subject: body.subject,
      bodyText: body.bodyText,
      attachPdf: body.attachPdf,
    });
  } catch (err) {
    console.error("[invoices] send failed", err);
    return NextResponse.json(
      { ok: false, message: "Email could not be sent. Try again." },
      { status: 502 }
    );
  }

  await logInvoiceEvent({
    invoiceId: id,
    actorUserId: owner.user.id,
    eventType: "invoice_sent",
    summary: `Emailed to ${to.join(", ")}${cc.length ? ` (cc ${cc.join(", ")})` : ""}`,
    metadata: {
      to,
      cc,
      bcc,
      subject: body.subject ?? null,
      reply_to: invoiceReplyTo(settings),
      attach_pdf: body.attachPdf !== false,
      total_cents: invoice.total_cents,
      balance_due_cents: invoice.balance_due_cents,
      resend: Boolean(invoice.sent_at),
    },
  });
  if (!invoice.sent_at || invoice.status === "draft") {
    await setInvoiceStatus(id, "mark_sent", owner.user.id);
  }
  let reminderNote = "";
  if (reminders) {
    const saved = await updateInvoiceReminderSettings(id, owner.user.id, {
      enabled: typeof reminders.enabled === "boolean" ? reminders.enabled : undefined,
      steps: Array.isArray(reminders.steps)
        ? reminders.steps.filter((s): s is string => typeof s === "string")
        : undefined,
      repeatWeekly: typeof reminders.repeatWeekly === "boolean" ? reminders.repeatWeekly : undefined,
      to: reminderTo.length ? reminderTo : null,
      cc: reminderTo.length ? reminderCc : null,
    });
    if ("error" in saved) {
      console.error("[invoices] reminder settings after send", saved.error);
      reminderNote = " Reminder settings were not saved; set them from the invoice.";
    } else if (reminders.enabled === false) {
      reminderNote = " Automatic reminders are off.";
    }
  }
  if (invoice.job_id) {
    await recordJobEvent({
      jobId: invoice.job_id,
      actorUserId: owner.user.id,
      actorRole: "owner",
      eventType: "invoice_sent",
      title: `Invoice ${invoice.invoice_number} sent`,
      customerVisible: true,
      metadata: { invoice_id: id },
    });
  }

  const replacedNow = invoice.status === "draft" && invoice.replaces_invoice_number;
  return NextResponse.json({
    ok: true,
    publicUrl,
    invoice: await fetchInvoiceById(id, { includeEvents: true }),
    message:
      (replacedNow
        ? `Updated invoice emailed to ${to.join(", ")}. ${invoice.replaces_invoice_number} is now replaced and its payments moved here.`
        : `Invoice emailed to ${to.join(", ")}.`) + reminderNote,
  });
}
