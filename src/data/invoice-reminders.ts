import {
  addDaysIso,
  computeAmountDue,
  type InvoiceEventRow,
  type InvoiceRow,
} from "@/data/invoices";

/** Automatic steps the owner can switch on or off per invoice. */
export const REMINDER_STEPS = ["upcoming_3", "overdue_1", "overdue_7", "overdue_14"] as const;
export type ReminderStep = (typeof REMINDER_STEPS)[number];

/**
 * A reminder moment. `followup_21` flags the owner to call (no client email);
 * `repeat_<day>` is a weekly nudge from day 21 when "keep nudging weekly" is on.
 */
export type ReminderStage = ReminderStep | "followup_21" | `repeat_${number}`;

export const REMINDER_FOLLOWUP_DAY = 21;

/** Overdue reminders wait this long after the invoice email, even when it went out late. */
export const REMINDER_SEND_GRACE_DAYS = 3;

export const REMINDER_STEP_INFO: Record<ReminderStep, { day: number; label: string; description: string }> = {
  upcoming_3: { day: -3, label: "3 days before due", description: "Friendly heads-up" },
  overdue_1: { day: 1, label: "1 day late", description: "Polite overdue notice" },
  overdue_7: { day: 7, label: "7 days late", description: "Adds the late-interest line" },
  overdue_14: { day: 14, label: "14 days late", description: "Invites them to call to arrange payment" },
};

export type ReminderPresetId = "standard" | "gentle" | "firm";

export const REMINDER_PRESETS: Array<{
  id: ReminderPresetId;
  label: string;
  description: string;
  steps: ReminderStep[];
  repeatWeekly: boolean;
}> = [
  {
    id: "standard",
    label: "Standard",
    description: "Heads-up 3 days before, then 1, 7 and 14 days late",
    steps: [...REMINDER_STEPS],
    repeatWeekly: false,
  },
  {
    id: "gentle",
    label: "Gentle",
    description: "Only 1 and 14 days late, for long-time or VIP clients",
    steps: ["overdue_1", "overdue_14"],
    repeatWeekly: false,
  },
  {
    id: "firm",
    label: "Firm",
    description: "Standard, then every week from 21 days late until paid",
    steps: [...REMINDER_STEPS],
    repeatWeekly: true,
  },
];

export function isReminderStep(value: unknown): value is ReminderStep {
  return typeof value === "string" && (REMINDER_STEPS as readonly string[]).includes(value);
}

/** Stored steps in schedule order; null/unknown falls back to the standard schedule. */
export function normalizeReminderSteps(value: readonly string[] | null | undefined): ReminderStep[] {
  if (!value) return [...REMINDER_STEPS];
  return REMINDER_STEPS.filter((step) => value.includes(step));
}

export function matchReminderPreset(steps: readonly ReminderStep[], repeatWeekly: boolean): ReminderPresetId | null {
  const key = (list: readonly ReminderStep[]) => REMINDER_STEPS.filter((s) => list.includes(s)).join(",");
  return (
    REMINDER_PRESETS.find((preset) => key(preset.steps) === key(steps) && preset.repeatWeekly === repeatWeekly)?.id ??
    null
  );
}

/** Days relative to the due date (negative = before). */
export function reminderStageDay(stage: string): number {
  if (isReminderStep(stage)) return REMINDER_STEP_INFO[stage].day;
  if (stage === "followup_21") return REMINDER_FOLLOWUP_DAY;
  const repeat = /^repeat_(\d+)$/.exec(stage);
  return repeat ? Number(repeat[1]) : Number.NaN;
}

export function reminderStageLabel(stage: string): string {
  if (isReminderStep(stage)) return REMINDER_STEP_INFO[stage].label;
  if (stage === "followup_21") return "21+ days late · call the client";
  const day = reminderStageDay(stage);
  return Number.isFinite(day) ? `${day} days late · weekly nudge` : stage;
}

export function daysBetweenIso(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export type ReminderSchedule = {
  steps: readonly ReminderStep[];
  repeatWeekly: boolean;
};

export function reminderScheduleOf(
  invoice: Pick<InvoiceRow, "reminder_stages" | "reminder_repeat_weekly">
): ReminderSchedule {
  return {
    steps: normalizeReminderSteps(invoice.reminder_stages),
    repeatWeekly: invoice.reminder_repeat_weekly === true,
  };
}

/**
 * The single stage due today. A missed day catches up to the latest stage reached;
 * callers skip it when that stage (or a later one) already went out.
 */
export function reminderStageFor(input: {
  dueDate: string;
  today: string;
  sentOn: string | null;
  /** False for "due on receipt": no heads-up before the grace date. */
  allowUpcoming?: boolean;
  schedule?: ReminderSchedule;
}): ReminderStage | null {
  const schedule = input.schedule ?? { steps: REMINDER_STEPS, repeatWeekly: false };
  const daysLate = daysBetweenIso(input.dueDate, input.today);
  const sinceSent = input.sentOn === null ? null : daysBetweenIso(input.sentOn, input.today);
  if (daysLate >= 0 && sinceSent !== null && sinceSent < REMINDER_SEND_GRACE_DAYS) return null;
  if (daysLate >= REMINDER_FOLLOWUP_DAY) {
    if (!schedule.repeatWeekly) return "followup_21";
    const week = Math.floor((daysLate - REMINDER_FOLLOWUP_DAY) / 7);
    return `repeat_${REMINDER_FOLLOWUP_DAY + week * 7}`;
  }
  const reached = REMINDER_STEPS.filter(
    (step) => schedule.steps.includes(step) && REMINDER_STEP_INFO[step].day <= daysLate
  );
  const stage = reached.at(-1) ?? null;
  if (stage !== "upcoming_3") return stage;
  // Heads-up only in the 3 days before, and not the day after the invoice went out.
  const sentLongEnough = input.sentOn !== null && daysBetweenIso(input.sentOn, input.today) >= 2;
  return input.allowUpcoming !== false && daysLate <= -1 && sentLongEnough ? stage : null;
}

/** True when `stage` or a later one is already among `sentStages`. */
export function reminderAlreadyCovered(stage: string, sentStages: Iterable<string>): boolean {
  const day = reminderStageDay(stage);
  for (const sent of sentStages) {
    if (reminderStageDay(sent) >= day) return true;
  }
  return false;
}

export type ReminderDue = {
  kind: "deposit" | "balance";
  amountCents: number;
  /** Date shown to the client (the due date, or the send date for "on receipt"). */
  dueDate: string;
  /** Date the schedule counts from ("on receipt" gets a 3-day grace period). */
  scheduleDue: string;
  allowUpcoming: boolean;
  sentOn: string;
};

/** What is owing right now and how the reminder schedule counts it; null when nothing is due. */
export function reminderDueFor(invoice: InvoiceRow): ReminderDue | null {
  const due = computeAmountDue(invoice);
  if (due.dueNowKind === "none" || due.dueNowCents <= 0) return null;
  const sentOn = invoice.sent_at ? invoice.sent_at.slice(0, 10) : null;
  if (!sentOn) return null;
  return {
    kind: due.dueNowKind,
    amountCents: due.dueNowCents,
    dueDate: due.dueNowDate ?? sentOn,
    scheduleDue: due.dueNowDate ?? addDaysIso(sentOn, 3),
    allowUpcoming: Boolean(due.dueNowDate),
    sentOn,
  };
}

/** Dedupe key stored on each `reminder_sent` event. */
export function reminderEventKey(due: Pick<ReminderDue, "kind" | "dueDate">, stage: string): string {
  return `${due.kind}:${due.dueDate}:${stage}`;
}

/** Stages already sent for this amount and due date, read from the audit trail. */
export function sentReminderStages(
  events: Array<Pick<InvoiceEventRow, "event_type" | "metadata">>,
  due: Pick<ReminderDue, "kind" | "dueDate">
): string[] {
  const prefix = `${due.kind}:${due.dueDate}:`;
  return events
    .filter((event) => event.event_type === "reminder_sent")
    .map((event) => (typeof event.metadata?.key === "string" ? event.metadata.key : ""))
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

export type ReminderRecipients = {
  to: string[];
  cc: string[];
  source: "custom" | "last_sent" | "client";
};

function emailList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "") : [];
}

/** To/Cc of the most recent invoice email, newest first in `events`. */
export function lastInvoiceEmailRecipients(
  events: Array<Pick<InvoiceEventRow, "event_type" | "metadata">>
): { to: string[]; cc: string[] } | null {
  const sent = events.find((event) => event.event_type === "invoice_sent");
  if (!sent) return null;
  const to = emailList(sent.metadata?.to);
  return to.length ? { to, cc: emailList(sent.metadata?.cc) } : null;
}

/** Saved reminder recipients, else everyone on the latest invoice email, else the client. */
export function resolveReminderRecipients(
  invoice: Pick<InvoiceRow, "reminder_to" | "reminder_cc" | "customer_email">,
  lastSent: { to: string[]; cc: string[] } | null
): ReminderRecipients {
  const saved = emailList(invoice.reminder_to);
  if (saved.length) return { to: saved, cc: emailList(invoice.reminder_cc), source: "custom" };
  if (lastSent?.to.length) return { to: lastSent.to, cc: lastSent.cc, source: "last_sent" };
  const client = invoice.customer_email?.trim();
  return { to: client ? [client] : [], cc: [], source: "client" };
}

export type ReminderTimelineEntry = {
  stage: string;
  label: string;
  date: string;
  status: "sent" | "passed" | "next" | "planned";
  adminOnly?: boolean;
};

/** Planned reminder dates for the admin timeline (weekly nudges shown once). */
export function reminderTimeline(input: {
  due: ReminderDue;
  schedule: ReminderSchedule;
  sentStages: readonly string[];
  today: string;
  enabled: boolean;
}): ReminderTimelineEntry[] {
  const { due, schedule, sentStages, today } = input;
  const next = input.enabled
    ? reminderStageFor({
        dueDate: due.scheduleDue,
        today,
        sentOn: due.sentOn,
        allowUpcoming: due.allowUpcoming,
        schedule,
      })
    : null;
  const nextStage = next && !reminderAlreadyCovered(next, sentStages) ? next : null;
  type Planned = Omit<ReminderTimelineEntry, "status"> & { skipped?: boolean };
  const planned: Planned[] = schedule.steps
    .filter((step) => step !== "upcoming_3" || due.allowUpcoming)
    .map((step) => ({
      stage: step,
      label: REMINDER_STEP_INFO[step].label,
      date: addDaysIso(due.scheduleDue, REMINDER_STEP_INFO[step].day),
    }));
  if (schedule.repeatWeekly) {
    const sentDays = sentStages.filter((s) => s.startsWith("repeat_")).map(reminderStageDay);
    const day = nextStage?.startsWith("repeat_")
      ? reminderStageDay(nextStage)
      : sentDays.length
        ? Math.max(...sentDays) + 7
        : REMINDER_FOLLOWUP_DAY;
    planned.push({
      stage: `repeat_${day}`,
      label: `Every 7 days from 21 days late, until paid${sentDays.length ? ` · ${sentDays.length} sent` : ""} · you’re flagged to call`,
      date: addDaysIso(due.scheduleDue, day),
    });
  } else {
    planned.push({
      stage: "followup_21",
      label: "21 days late · emails stop, you’re flagged to call",
      date: addDaysIso(due.scheduleDue, REMINDER_FOLLOWUP_DAY),
      adminOnly: true,
    });
  }

  // Invoice emailed late: everything due inside the grace window collapses into one catch-up on its last day.
  const graceEnd = addDaysIso(due.sentOn, REMINDER_SEND_GRACE_DAYS);
  const overdue = planned.filter((entry) => entry.stage !== "upcoming_3" && !sentStages.includes(entry.stage));
  const catchUp = overdue.filter((entry) => entry.date <= graceEnd).at(-1);
  for (const entry of overdue) {
    if (entry === catchUp) entry.date = graceEnd;
    else if (catchUp && entry.date < graceEnd) entry.skipped = true;
  }

  return planned.map(({ skipped, ...entry }) => {
    let status: ReminderTimelineEntry["status"];
    if (sentStages.includes(entry.stage)) status = "sent";
    else if (skipped) status = "passed";
    else if (entry.stage === nextStage) status = "next";
    else status = entry.date < today ? "passed" : "planned";
    return { ...entry, status };
  });
}
