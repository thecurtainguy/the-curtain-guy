import type { CustomerLanguage } from "@/data/customer-language";
import {
  getInvoiceCopy,
  paymentMethodLabel,
  todayIsoDate,
  type BusinessSettings,
  type InvoiceRow,
  type InvoiceWithRelations,
} from "@/data/invoices";
import {
  daysBetweenIso,
  isReminderStep,
  lastInvoiceEmailRecipients,
  matchReminderPreset,
  REMINDER_PRESETS,
  REMINDER_STEP_INFO,
  REMINDER_STEPS,
  reminderAlreadyCovered,
  reminderDueFor,
  reminderEventKey,
  reminderScheduleOf,
  reminderStageDay,
  reminderStageFor,
  reminderStageLabel,
  resolveReminderRecipients,
  sentReminderStages,
  type ReminderDue,
  type ReminderRecipients,
  type ReminderStage,
  type ReminderStep,
} from "@/data/invoice-reminders";
import { formatMoneyFromCents } from "@/data/quotes";
import { formatQuoteDate } from "@/data/quote-copy";
import { getBusinessSettings } from "@/lib/business-settings";
import { recordEmailMessage } from "@/lib/email-tracking";
import { withOwnerCopySource } from "@/lib/document-views";
import { getEstimateNotifyTo, getOutboundEmailCopyTo, getResendApiKey, getSiteUrl } from "@/lib/env";
import {
  frenchVersionFor,
  invoiceEmailFooter,
  invoiceEmailFrom,
  invoiceReplyTo,
} from "@/lib/invoice-email";
import { ensureInvoicePublicUrl, fetchInvoiceById, logInvoiceEvent } from "@/lib/invoices";
import { brandQuoteEmailShell, escapeEmailHtml, parseEmailList, quoteUrlInLanguage } from "@/lib/quote-email-compose";
import { sendResendEmail } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type NoticeSection = {
  headline: string;
  greeting: string;
  paragraphs: string[];
  rows: Array<[string, string]>;
  highlight?: string | null;
  button: string;
};

/** French first for English invoices, like the invoice email itself. */
function noticeLanguages(invoice: Pick<InvoiceRow, "language">): CustomerLanguage[] {
  return frenchVersionFor(invoice) ? ["fr", "en"] : [invoice.language];
}

function sectionHtml(section: NoticeSection, url: string, lead: boolean, label: string | null): string {
  const rows = section.rows
    .map(
      ([name, value]) => `<tr>
        <td style="padding:8px 14px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8b909a;white-space:nowrap;">${escapeEmailHtml(name)}</td>
        <td style="padding:8px 14px;font-size:14px;color:#f8f5ec;text-align:right;">${escapeEmailHtml(value)}</td>
      </tr>`
    )
    .join("");
  const body = `
    ${label ? `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#b8860b;">${escapeEmailHtml(label)}</p>` : ""}
    <p style="margin:0 0 8px;color:#f8f5ec;">${escapeEmailHtml(section.greeting)}</p>
    ${section.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#cfc8b8;">${escapeEmailHtml(p)}</p>`).join("")}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:4px 0 14px;border-collapse:separate;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.18);">${rows}</table>
    ${section.highlight ? `<p style="margin:0 0 14px;font-size:16px;color:#d4af37;">${escapeEmailHtml(section.highlight)}</p>` : ""}
    <a href="${escapeEmailHtml(url)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:600;">${escapeEmailHtml(section.button)}</a>
  `;
  return lead
    ? `<div style="margin:0 0 22px;padding:16px;border-radius:14px;border:1px solid rgba(212,175,55,0.35);background:rgba(212,175,55,0.06);">${body}</div>`
    : `<div style="margin:0 0 8px;">${body}</div>`;
}

function sectionText(section: NoticeSection, url: string): string {
  return [
    section.greeting,
    "",
    ...section.paragraphs.flatMap((p) => [p, ""]),
    ...section.rows.map(([name, value]) => `${name}: ${value}`),
    section.highlight ? `\n${section.highlight}` : "",
    "",
    url,
  ].join("\n");
}

type NoticeParts = { html: string; text: string };

/** Builds the branded bilingual email; call the result with the link to put in the buttons. */
async function composeNotice(input: {
  invoice: InvoiceWithRelations;
  build: (language: CustomerLanguage) => NoticeSection;
  note?: string | null;
}): Promise<(publicUrl: string) => NoticeParts> {
  const { invoice } = input;
  const languages = noticeLanguages(invoice);
  const sections = languages.map((language) => ({ language, section: input.build(language) }));
  const bilingual = sections.length > 1;
  const footer = await invoiceEmailFooter(invoice);
  const note = input.note?.trim() || null;
  const noteHtml = note
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#f8f5ec;white-space:pre-line;">${escapeEmailHtml(note)}</p>`
    : "";
  return (publicUrl) => ({
    html: brandQuoteEmailShell(
      sections.map(({ section }) => section.headline).join(" · "),
      noteHtml +
        sections
          .map(({ language, section }, index) =>
            sectionHtml(
              section,
              quoteUrlInLanguage(publicUrl, language),
              bilingual && index === 0,
              bilingual ? (language === "fr" ? "Version française" : "English version") : null
            )
          )
          .join(""),
      footer,
      languages[0]
    ),
    text: [
      ...(note ? [note] : []),
      ...sections.map(({ language, section }) => sectionText(section, quoteUrlInLanguage(publicUrl, language))),
    ].join("\n\n———\n\n"),
  });
}

async function sendCustomerNotice(input: {
  apiKey: string;
  invoice: InvoiceWithRelations;
  settings: BusinessSettings;
  publicUrl: string;
  subject: string;
  build: (language: CustomerLanguage) => NoticeSection;
  /** Defaults to the client email on the invoice. */
  to?: string[];
  cc?: string[];
  note?: string | null;
}): Promise<string | null> {
  const { invoice } = input;
  const parts = await composeNotice(input);
  const to = input.to?.length ? input.to : [invoice.customer_email as string];
  const cc = input.cc ?? [];
  const sent = await sendResendEmail({
    apiKey: input.apiKey,
    from: invoiceEmailFrom(),
    to,
    cc: cc.length ? cc : undefined,
    replyTo: invoiceReplyTo(input.settings),
    subject: input.subject,
    ...parts(input.publicUrl),
    copyOutbound: false,
    logLabel: "invoices",
  });
  await recordEmailMessage({
    resendId: sent.id,
    target: { invoiceId: invoice.id },
    audience: "customer",
    to,
    cc,
    subject: input.subject,
  });

  const recipients = [...to, ...cc].map((email) => email.toLowerCase());
  const ownerCopyTo = parseEmailList(getOutboundEmailCopyTo()).filter(
    (email) => !recipients.includes(email.toLowerCase())
  );
  if (ownerCopyTo.length > 0) {
    try {
      const copy = await sendResendEmail({
        apiKey: input.apiKey,
        from: invoiceEmailFrom(),
        to: ownerCopyTo,
        replyTo: invoiceReplyTo(input.settings),
        subject: input.subject,
        ...parts(withOwnerCopySource(input.publicUrl)),
        copyOutbound: false,
        logLabel: "invoices",
      });
      await recordEmailMessage({
        resendId: copy.id,
        target: { invoiceId: invoice.id },
        audience: "owner_copy",
        to: ownerCopyTo,
        subject: input.subject,
      });
    } catch (error) {
      console.error("[invoices] owner archive copy failed", error);
    }
  }
  return sent.id;
}

// ── Payment receipt ─────────────────────────────────────────────────────

/** Emails the client a receipt for one recorded payment or refund; never throws. */
export async function sendPaymentReceipt(input: {
  invoiceId: string;
  paymentId: string;
  actorUserId: string | null;
}): Promise<void> {
  const apiKey = getResendApiKey();
  if (!apiKey) return;
  try {
    const invoice = await fetchInvoiceById(input.invoiceId);
    const payment = invoice?.payments.find((p) => p.id === input.paymentId);
    if (!invoice || !payment || !invoice.customer_email) return;
    const settings = await getBusinessSettings();
    const publicUrl = await ensureInvoicePublicUrl(invoice.id, getSiteUrl(), input.actorUserId);
    const refund = payment.kind === "refund";

    const build = (language: CustomerLanguage): NoticeSection => {
      const t = getInvoiceCopy(language);
      const money = (cents: number) => formatMoneyFromCents(cents, language, invoice.currency);
      const rows: Array<[string, string]> = [
        [t.invoice, invoice.invoice_number],
        [t.receiptAmount, `${refund ? "−" : ""}${money(payment.amount_cents)}`],
        [t.receiptMethod, paymentMethodLabel(settings.payment_methods, payment.method, language)],
        [t.receiptDate, formatQuoteDate(payment.paid_on, language, "—")],
      ];
      if (payment.reference) rows.push([t.receiptReference, payment.reference]);
      if (invoice.balance_due_cents > 0) rows.push([t.receiptRemaining, money(invoice.balance_due_cents)]);
      return {
        headline: refund ? t.refundHeadline : t.receiptHeadline,
        greeting: t.emailGreeting(invoice.customer_name?.trim() || null),
        paragraphs: [refund ? t.refundBody : t.receiptBody],
        rows,
        highlight: !refund && invoice.balance_due_cents <= 0 ? t.receiptPaidInFull : null,
        button: t.emailButton,
      };
    };
    const fr = getInvoiceCopy("fr");
    const en = getInvoiceCopy("en");
    const subject = frenchVersionFor(invoice)
      ? `${refund ? "Remboursement / Refund" : "Paiement reçu / Payment received"} — ${invoice.invoice_number} · ${settings.trade_name}`
      : (refund ? (invoice.language === "fr" ? fr : en).refundSubject : (invoice.language === "fr" ? fr : en).receiptSubject)(
          invoice.invoice_number,
          settings.trade_name
        );

    await sendCustomerNotice({ apiKey, invoice, settings, publicUrl, subject, build });
    await logInvoiceEvent({
      invoiceId: invoice.id,
      actorUserId: input.actorUserId,
      eventType: refund ? "refund_receipt_sent" : "receipt_sent",
      summary: `${refund ? "Refund notice" : "Receipt"} emailed to ${invoice.customer_email} (${formatMoneyFromCents(payment.amount_cents, "en", invoice.currency)})`,
      metadata: { payment_id: payment.id, to: invoice.customer_email, subject },
    });
  } catch (error) {
    console.error("[invoices] payment receipt failed", error);
  }
}

// ── Payment reminders ───────────────────────────────────────────────────

const REMINDER_EVENT = "reminder_sent";

/** Who reminders go to: saved list, else everyone on the latest invoice email, else the client. */
export async function reminderRecipientsFor(
  invoice: Pick<InvoiceRow, "id" | "reminder_to" | "reminder_cc" | "customer_email">
): Promise<ReminderRecipients> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("invoice_events")
    .select("event_type, metadata")
    .eq("invoice_id", invoice.id)
    .eq("event_type", "invoice_sent")
    .order("created_at", { ascending: false })
    .limit(1);
  return resolveReminderRecipients(
    invoice,
    lastInvoiceEmailRecipients((data ?? []) as Array<{ event_type: string; metadata: Record<string, unknown> }>)
  );
}

function formatRecipients(to: string[], cc: string[]): string {
  return `${to.join(", ")}${cc.length ? ` (cc ${cc.join(", ")})` : ""}`;
}

/** Wording follows how late the payment is: heads-up before, then firmer from 7 and 14 days. */
function reminderEmail(invoice: InvoiceRow, due: ReminderDue, daysLate: number) {
  const upcoming = daysLate < 1;
  const subject = (() => {
    if (frenchVersionFor(invoice)) {
      return upcoming
        ? `Rappel / Reminder — facture / invoice ${invoice.invoice_number}`
        : `Paiement en retard / Payment overdue — facture / invoice ${invoice.invoice_number}`;
    }
    const t = getInvoiceCopy(invoice.language);
    return upcoming
      ? t.reminderUpcomingSubject(t.reminderWhat[due.kind], formatQuoteDate(due.dueDate, invoice.language, ""), invoice.invoice_number)
      : t.reminderOverdueSubject(invoice.invoice_number);
  })();
  const build = (language: CustomerLanguage): NoticeSection => {
    const t = getInvoiceCopy(language);
    const amount = formatMoneyFromCents(due.amountCents, language, invoice.currency);
    const date = formatQuoteDate(due.dueDate, language, "");
    const what = t.reminderWhat[due.kind];
    const paragraphs = [upcoming ? t.reminderUpcomingBody(what, amount, date) : t.reminderOverdueBody(what, amount, date)];
    if (daysLate >= 7) paragraphs.push(t.reminderInterest);
    if (daysLate >= 14) paragraphs.push(t.reminderArrangement);
    return {
      headline: upcoming ? t.reminderUpcomingHeadline : t.reminderOverdueHeadline,
      greeting: t.emailGreeting(invoice.customer_name?.trim() || null),
      paragraphs,
      rows: [
        [t.invoice, invoice.invoice_number],
        [due.kind === "deposit" ? t.depositDue : t.balanceDue, amount],
        [t.dueDate, date],
      ],
      button: t.emailButton,
    };
  };
  return { subject, build };
}

type ReminderOutcome = {
  invoiceId: string;
  invoiceNumber: string;
  customer: string;
  stage: ReminderStage;
  kind: "deposit" | "balance";
  amountCents: number;
  currency: string;
  dueDate: string;
  result: "emailed" | "admin_followup" | "no_email" | "failed";
  /** Weekly nudge past 21 days: emailed, and the owner should still call. */
  followUp?: boolean;
};

/** Daily run: emails due reminders and sends one digest to the team when anything happened. */
export async function runInvoiceReminders(options?: {
  today?: string;
  /** Limit the run to these invoices. */
  invoiceIds?: string[];
  digest?: boolean;
}): Promise<{
  checked: number;
  outcomes: ReminderOutcome[];
  digestSent: boolean;
}> {
  const today = options?.today ?? todayIsoDate();
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("invoices")
    .select("id")
    .in("status", ["sent", "partially_paid"])
    .eq("reminders_enabled", true)
    .is("replaced_by_invoice_id", null)
    .gt("balance_due_cents", 0)
    .not("sent_at", "is", null);
  if (options?.invoiceIds) query = query.in("id", options.invoiceIds);
  const { data, error } = await query;
  if (error) {
    console.error("[reminders] list invoices", error);
    return { checked: 0, outcomes: [], digestSent: false };
  }
  const ids = (data ?? []).map((row) => row.id as string);
  if (ids.length === 0) return { checked: 0, outcomes: [], digestSent: false };

  const { data: eventRows } = await admin
    .from("invoice_events")
    .select("invoice_id, event_type, metadata")
    .in("invoice_id", ids)
    .eq("event_type", REMINDER_EVENT);
  const eventsByInvoice = new Map<string, Array<{ event_type: string; metadata: Record<string, unknown> }>>();
  for (const row of (eventRows ?? []) as Array<{ invoice_id: string; event_type: string; metadata: Record<string, unknown> }>) {
    const list = eventsByInvoice.get(row.invoice_id) ?? [];
    list.push(row);
    eventsByInvoice.set(row.invoice_id, list);
  }

  const apiKey = getResendApiKey();
  const settings = await getBusinessSettings();
  const outcomes: ReminderOutcome[] = [];

  for (const id of ids) {
    const invoice = await fetchInvoiceById(id);
    if (!invoice) continue;
    const due = reminderDueFor(invoice);
    if (!due) continue;
    const stage = reminderStageFor({
      dueDate: due.scheduleDue,
      today,
      sentOn: due.sentOn,
      allowUpcoming: due.allowUpcoming,
      schedule: reminderScheduleOf(invoice),
    });
    if (!stage) continue;
    if (reminderAlreadyCovered(stage, sentReminderStages(eventsByInvoice.get(id) ?? [], due))) continue;

    const outcome: ReminderOutcome = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customer: invoice.company_name || invoice.customer_name || invoice.customer_email || "Client",
      stage,
      kind: due.kind,
      amountCents: due.amountCents,
      currency: invoice.currency,
      dueDate: due.dueDate,
      result: "emailed",
      followUp: stage.startsWith("repeat_"),
    };

    let recipients: ReminderRecipients | null = null;
    if (stage === "followup_21") {
      outcome.result = "admin_followup";
    } else {
      recipients = await reminderRecipientsFor(invoice);
      if (recipients.to.length === 0) {
        outcome.result = "no_email";
      } else if (!apiKey) {
        outcome.result = "failed";
      } else {
        try {
          const publicUrl = await ensureInvoicePublicUrl(invoice.id, getSiteUrl(), null);
          const email = reminderEmail(invoice, due, reminderStageDay(stage));
          await sendCustomerNotice({
            apiKey,
            invoice,
            settings,
            publicUrl,
            subject: email.subject,
            build: email.build,
            to: recipients.to,
            cc: recipients.cc,
          });
        } catch (sendError) {
          console.error("[reminders] send failed", invoice.invoice_number, sendError);
          outcome.result = "failed";
        }
      }
    }

    if (outcome.result !== "failed") {
      await logInvoiceEvent({
        invoiceId: invoice.id,
        actorType: "system",
        eventType: REMINDER_EVENT,
        summary: reminderSummary(outcome, recipients),
        metadata: {
          key: reminderEventKey(due, stage),
          stage,
          kind: due.kind,
          due_date: due.dueDate,
          amount_cents: due.amountCents,
          result: outcome.result,
          to: recipients?.to ?? [],
          cc: recipients?.cc ?? [],
        },
      });
    }
    outcomes.push(outcome);
  }

  const digestSent =
    outcomes.length > 0 && apiKey && options?.digest !== false
      ? await sendReminderDigest(apiKey, outcomes, today)
      : false;
  return { checked: ids.length, outcomes, digestSent };
}

function reminderSummary(outcome: ReminderOutcome, recipients: ReminderRecipients | null): string {
  const what = `${outcome.kind} ${formatMoneyFromCents(outcome.amountCents, "en", outcome.currency)} due ${outcome.dueDate}`;
  if (outcome.result === "admin_followup") return `Automatic reminders finished — flagged for personal follow-up (${what})`;
  if (outcome.result === "no_email") return `Reminder skipped: no client email (${reminderStageLabel(outcome.stage)}, ${what})`;
  const to = recipients ? formatRecipients(recipients.to, recipients.cc) : "the client";
  return `Automatic reminder emailed to ${to} · ${reminderStageLabel(outcome.stage)} (${what})`;
}

type ManualReminder = {
  invoice: InvoiceWithRelations;
  due: ReminderDue;
  daysLate: number;
  /** Counts as today's automatic step so the client never gets the same nudge twice. */
  key: string;
  email: ReturnType<typeof reminderEmail>;
};

async function prepareManualReminder(invoiceId: string): Promise<ManualReminder | { error: string }> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "sent" && invoice.status !== "partially_paid") {
    return { error: "Reminders are only for issued invoices with a balance owing." };
  }
  const due = reminderDueFor(invoice);
  if (!due) return { error: "Nothing is owing on this invoice." };
  const today = todayIsoDate();
  const daysLate = daysBetweenIso(due.dueDate, today);
  const autoStage = reminderStageFor({
    dueDate: due.scheduleDue,
    today,
    sentOn: due.sentOn,
    allowUpcoming: due.allowUpcoming,
    schedule: reminderScheduleOf(invoice),
  });
  return {
    invoice,
    due,
    daysLate,
    key: reminderEventKey(due, autoStage ?? `manual_${today}`),
    email: reminderEmail(invoice, due, daysLate),
  };
}

export type InvoiceReminderPreview = {
  subject: string;
  html: string;
  from: string;
  replyTo: string;
  recipients: ReminderRecipients;
  daysLate: number;
  kind: "deposit" | "balance";
  amountCents: number;
  dueDate: string;
};

/** Exactly what "Send payment reminder now" would email, for the confirmation dialog. */
export async function previewInvoiceReminder(
  invoiceId: string,
  actorUserId: string,
  note?: string | null
): Promise<InvoiceReminderPreview | { error: string }> {
  const prepared = await prepareManualReminder(invoiceId);
  if ("error" in prepared) return prepared;
  const { invoice, due, email } = prepared;
  const settings = await getBusinessSettings();
  const publicUrl = await ensureInvoicePublicUrl(invoice.id, getSiteUrl(), actorUserId);
  const parts = (await composeNotice({ invoice, build: email.build, note }))(publicUrl);
  return {
    subject: email.subject,
    html: parts.html,
    from: invoiceEmailFrom(),
    replyTo: invoiceReplyTo(settings),
    recipients: await reminderRecipientsFor(invoice),
    daysLate: prepared.daysLate,
    kind: due.kind,
    amountCents: due.amountCents,
    dueDate: due.dueDate,
  };
}

/** Owner-triggered reminder, sent whether or not automatic reminders are paused. */
export async function sendInvoiceReminderNow(
  invoiceId: string,
  actorUserId: string,
  options: { to?: string[]; cc?: string[]; note?: string | null; saveForAutomatic?: boolean } = {}
): Promise<{ to: string[]; cc: string[] } | { error: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) return { error: "Email is not configured (RESEND_API_KEY missing)." };
  const prepared = await prepareManualReminder(invoiceId);
  if ("error" in prepared) return prepared;
  const { invoice, due, daysLate, email } = prepared;
  const recipients = options.to?.length
    ? { to: options.to, cc: options.cc ?? [] }
    : await reminderRecipientsFor(invoice);
  if (recipients.to.length === 0) return { error: "Add at least one recipient." };

  if (options.saveForAutomatic) {
    const saved = await updateInvoiceReminderSettings(invoice.id, actorUserId, {
      to: recipients.to,
      cc: recipients.cc,
    });
    if ("error" in saved) return saved;
  }

  const settings = await getBusinessSettings();
  const publicUrl = await ensureInvoicePublicUrl(invoice.id, getSiteUrl(), actorUserId);
  const note = options.note?.trim() || null;
  try {
    await sendCustomerNotice({
      apiKey,
      invoice,
      settings,
      publicUrl,
      subject: email.subject,
      build: email.build,
      to: recipients.to,
      cc: recipients.cc,
      note,
    });
  } catch (error) {
    console.error("[reminders] manual send failed", invoice.invoice_number, error);
    return { error: "The reminder could not be sent. Try again." };
  }
  await logInvoiceEvent({
    invoiceId: invoice.id,
    actorUserId,
    eventType: REMINDER_EVENT,
    summary: `Payment reminder emailed to ${formatRecipients(recipients.to, recipients.cc)} by you · ${daysLate >= 1 ? `${daysLate} day${daysLate === 1 ? "" : "s"} overdue` : "before due date"} (${due.kind} ${formatMoneyFromCents(due.amountCents, "en", invoice.currency)} due ${due.dueDate})`,
    metadata: {
      key: prepared.key,
      kind: due.kind,
      due_date: due.dueDate,
      amount_cents: due.amountCents,
      result: "emailed",
      manual: true,
      to: recipients.to,
      cc: recipients.cc,
      note,
      subject: email.subject,
    },
  });
  return { to: recipients.to, cc: recipients.cc };
}

// ── Per-invoice reminder settings ───────────────────────────────────────

export type InvoiceReminderSettingsInput = {
  enabled?: boolean;
  steps?: string[];
  repeatWeekly?: boolean;
  /** null resets to "whoever received the latest invoice email". */
  to?: string[] | null;
  cc?: string[] | null;
};

function describeSteps(steps: readonly ReminderStep[], repeatWeekly: boolean): string {
  const preset = matchReminderPreset(steps, repeatWeekly);
  const label = REMINDER_PRESETS.find((p) => p.id === preset)?.label ?? "Custom";
  const list = steps.map((s) => REMINDER_STEP_INFO[s].label).join(", ") || "no emails";
  return `${label} (${list}${repeatWeekly ? ", then weekly until paid" : ""})`;
}

/** Saves an invoice's reminder switch, schedule and recipients; every change is logged. */
export async function updateInvoiceReminderSettings(
  invoiceId: string,
  actorUserId: string,
  input: InvoiceReminderSettingsInput
): Promise<{ ok: true } | { error: string }> {
  const invoice = await fetchInvoiceById(invoiceId);
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "void") return { error: "This invoice is void." };

  const update: Record<string, unknown> = {};
  const changes: string[] = [];
  const current = reminderScheduleOf(invoice);

  if (typeof input.enabled === "boolean" && input.enabled !== (invoice.reminders_enabled !== false)) {
    update.reminders_enabled = input.enabled;
    changes.push(input.enabled ? "Automatic reminders turned on" : "Automatic reminders paused");
  }
  const steps = input.steps ? REMINDER_STEPS.filter((s) => input.steps?.includes(s)) : current.steps;
  if (input.steps && input.steps.some((s) => !isReminderStep(s))) return { error: "Unknown reminder step." };
  const repeatWeekly = typeof input.repeatWeekly === "boolean" ? input.repeatWeekly : current.repeatWeekly;
  const stepsChanged = steps.join(",") !== current.steps.join(",");
  if (stepsChanged || repeatWeekly !== current.repeatWeekly) {
    if (stepsChanged) update.reminder_stages = steps;
    if (repeatWeekly !== current.repeatWeekly) update.reminder_repeat_weekly = repeatWeekly;
    changes.push(`Schedule: ${describeSteps(steps, repeatWeekly)}`);
  }

  if (input.to !== undefined) {
    const clean = (list: string[] | null | undefined) => (list ?? []).map((e) => e.trim()).filter(Boolean);
    const to = clean(input.to);
    const cc = to.length ? clean(input.cc) : [];
    const key = (list: string[]) => list.map((e) => e.toLowerCase()).join(",");
    const savedTo = clean(invoice.reminder_to);
    const savedCc = savedTo.length ? clean(invoice.reminder_cc) : [];
    if (key(to) !== key(savedTo) || key(cc) !== key(savedCc)) {
      update.reminder_to = to.length ? to : null;
      update.reminder_cc = to.length ? cc : null;
      changes.push(
        to.length
          ? `Reminder recipients: ${formatRecipients(to, cc)}`
          : "Reminder recipients reset to whoever received the invoice email"
      );
    }
  }

  if (changes.length === 0) return { ok: true };
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("invoices").update(update).eq("id", invoiceId);
  if (error) {
    console.error("[reminders] settings update", error);
    return { error: "Could not save reminder settings." };
  }
  await logInvoiceEvent({
    invoiceId,
    actorUserId,
    eventType: "reminder_settings_changed",
    summary: changes.join(" · "),
    metadata: { changes, update },
  });
  return { ok: true };
}

// ── Daily digest ────────────────────────────────────────────────────────

async function sendReminderDigest(apiKey: string, outcomes: ReminderOutcome[], today: string): Promise<boolean> {
  const site = getSiteUrl().replace(/\/$/, "");
  const followUps = outcomes.filter((o) => o.result !== "emailed" || o.followUp);
  const emailed = outcomes.filter((o) => o.result === "emailed");
  const flag = (o: ReminderOutcome) =>
    o.result === "no_email" ? " · NO CLIENT EMAIL" : o.result === "failed" ? " · SEND FAILED" : o.followUp ? " · weekly nudge sent, please call" : "";
  const line = (o: ReminderOutcome) =>
    `${o.invoiceNumber} · ${o.customer} · ${o.kind} ${formatMoneyFromCents(o.amountCents, "en", o.currency)} due ${o.dueDate} · ${reminderStageLabel(o.stage)}${flag(o)}`;
  const subject = `${followUps.length ? "Action needed — " : ""}Payment reminders · ${today} · ${emailed.length} sent${followUps.length ? `, ${followUps.length} to follow up` : ""}`;
  const text = [
    followUps.length ? "Needs you:" : "",
    ...followUps.map((o) => `• ${line(o)} — ${site}/admin/invoices/${o.invoiceId}`),
    followUps.length ? "" : "",
    emailed.length ? "Reminders emailed to clients today:" : "",
    ...emailed.map((o) => `• ${line(o)}`),
    "",
    "Pause or change reminders for any invoice from its page (Invoice controls).",
  ].join("\n");
  const list = (items: ReminderOutcome[]) =>
    items
      .map(
        (o) => `<tr>
          <td style="padding:8px 12px;font-size:14px;color:#f8f5ec;"><a href="${escapeEmailHtml(`${site}/admin/invoices/${o.invoiceId}`)}" style="color:#d4af37;text-decoration:none;">${escapeEmailHtml(o.invoiceNumber)}</a><br/><span style="font-size:12px;color:#8b909a;">${escapeEmailHtml(o.customer)}</span></td>
          <td style="padding:8px 12px;font-size:13px;color:#cfc8b8;text-align:right;">${escapeEmailHtml(`${o.kind} ${formatMoneyFromCents(o.amountCents, "en", o.currency)}`)}<br/><span style="font-size:12px;color:#8b909a;">${escapeEmailHtml(`${reminderStageLabel(o.stage)}${flag(o).toLowerCase()}`)}</span></td>
        </tr>`
      )
      .join("");
  const table = (title: string, items: ReminderOutcome[]) =>
    items.length
      ? `<p style="margin:18px 0 8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#d4af37;">${escapeEmailHtml(title)}</p>
         <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.18);">${list(items)}</table>`
      : "";
  const html = brandQuoteEmailShell(
    "Payment reminders",
    `${table("Needs you", followUps)}${table("Emailed to clients today", emailed)}
     <p style="margin:18px 0 0;font-size:12px;color:#8b909a;">Pause or change reminders for any invoice from its page (Invoice controls).</p>`,
    "Internal notification · The Curtain Guy admin"
  );
  try {
    await sendResendEmail({
      apiKey,
      from: invoiceEmailFrom(),
      to: [getEstimateNotifyTo()],
      subject,
      text,
      html,
      copyOutbound: false,
      logLabel: "invoices",
    });
    return true;
  } catch (error) {
    console.error("[reminders] digest failed", error);
    return false;
  }
}
