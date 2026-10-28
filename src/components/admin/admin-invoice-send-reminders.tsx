"use client";

import { useMemo, useState } from "react";
import { BellOff, BellRing, CalendarClock, ChevronDown } from "lucide-react";
import { todayIsoDate, type InvoiceWithRelations } from "@/data/invoices";
import {
  matchReminderPreset,
  REMINDER_PRESETS,
  reminderDueFor,
  reminderScheduleOf,
  reminderTimeline,
  sentReminderStages,
  type ReminderDue,
  type ReminderPresetId,
  type ReminderStep,
  type ReminderTimelineEntry,
} from "@/data/invoice-reminders";
import type { CustomerContactOption } from "@/data/customers";
import {
  PRESET_ICONS,
  ReminderRecipientsChoice,
  ReminderStepToggles,
  ReminderTimelineList,
  shortDate,
  toggleReminderStep,
} from "@/components/admin/admin-invoice-reminder-parts";
import { splitRecipientEmails } from "@/components/admin/recipient-input";
import { OptionCard } from "@/components/estimate/option-card";
import { cn } from "@/lib/utils";

export type ReminderDraft = {
  enabled: boolean;
  steps: ReminderStep[];
  repeatWeekly: boolean;
  /** False = whoever is on this invoice email (To + Cc). */
  custom: boolean;
  to: string;
  cc: string;
};

export function initialReminderDraft(invoice: InvoiceWithRelations): ReminderDraft {
  const schedule = reminderScheduleOf(invoice);
  const custom = Boolean(invoice.reminder_to?.length);
  return {
    enabled: invoice.reminders_enabled !== false,
    steps: [...schedule.steps],
    repeatWeekly: schedule.repeatWeekly,
    custom,
    to: custom ? (invoice.reminder_to ?? []).join(", ") : "",
    cc: custom ? (invoice.reminder_cc ?? []).join(", ") : "",
  };
}

/** Body for the send route; `to: null` means "same people as this email". */
export function reminderDraftPayload(draft: ReminderDraft) {
  return {
    enabled: draft.enabled,
    steps: draft.steps,
    repeatWeekly: draft.repeatWeekly,
    to: draft.custom ? draft.to : null,
    cc: draft.custom ? draft.cc : null,
  };
}

const TILE_DESCRIPTIONS: Record<ReminderPresetId, string> = {
  gentle: "Only 1 and 14 days late",
  standard: "3 days before, then 1, 7 and 14 days late",
  firm: "Standard, then weekly until paid",
};

const TILE_ORDER: ReminderPresetId[] = ["gentle", "standard", "firm"];

/** Due amount and timeline as if this invoice goes out today (keeps the real send date on a resend). */
export function useSendReminderPlan(invoice: InvoiceWithRelations, draft: ReminderDraft) {
  const today = todayIsoDate();
  const due = useMemo<ReminderDue | null>(
    () => reminderDueFor({ ...invoice, sent_at: invoice.sent_at ?? `${today}T12:00:00Z` }),
    [invoice, today]
  );
  const timeline = useMemo<ReminderTimelineEntry[]>(
    () =>
      due
        ? reminderTimeline({
            due,
            schedule: { steps: draft.steps, repeatWeekly: draft.repeatWeekly },
            sentStages: sentReminderStages(invoice.events ?? [], due),
            today,
            enabled: draft.enabled,
          })
        : [],
    [due, draft.steps, draft.repeatWeekly, draft.enabled, invoice.events, today]
  );
  return { due, timeline };
}

function planSummary(
  draft: ReminderDraft,
  due: ReminderDue | null,
  timeline: ReminderTimelineEntry[],
  people: number
): string {
  if (!draft.enabled) return "Off: nothing goes out automatically. You can still send a reminder yourself from the invoice.";
  if (!due) return "Nothing is owing on this invoice, so no reminders are scheduled.";
  const upcoming = timeline.filter((e) => !e.adminOnly && (e.status === "planned" || e.status === "next"));
  const weekly = upcoming.some((e) => e.stage.startsWith("repeat_"));
  const emails = upcoming.filter((e) => !e.stage.startsWith("repeat_")).length;
  const who = draft.custom
    ? `to ${people} chosen ${people === 1 ? "person" : "people"}`
    : people === 1
      ? "to the same person as this email"
      : `to the same ${people} people as this email`;
  if (!upcoming.length) return "No reminder emails left on this schedule; you’re flagged in the daily summary to call.";
  const count = emails ? `${emails} email${emails === 1 ? "" : "s"}${weekly ? ", then weekly" : ""}` : "weekly";
  return `First reminder ${shortDate(upcoming[0].date)} · ${count} · ${who}`;
}

export function InvoiceSendReminders({
  invoice,
  contacts,
  emailTo,
  emailCc,
  draft,
  onChange,
}: {
  invoice: InvoiceWithRelations;
  contacts: CustomerContactOption[];
  emailTo: string[];
  emailCc: string[];
  draft: ReminderDraft;
  onChange: (patch: Partial<ReminderDraft>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { due, timeline } = useSendReminderPlan(invoice, draft);
  const preset = matchReminderPreset(draft.steps, draft.repeatWeekly);
  const people = draft.custom
    ? splitRecipientEmails(draft.to).length + splitRecipientEmails(draft.cc).length
    : emailTo.length + emailCc.length;

  function applyPreset(id: ReminderPresetId) {
    const next = REMINDER_PRESETS.find((p) => p.id === id);
    if (!next) return;
    onChange({ enabled: true, steps: [...next.steps], repeatWeekly: next.repeatWeekly });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div className="flex items-center gap-3 border-b border-border/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <BellRing className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Payment reminders
          </span>
          <span className="block font-heading text-sm font-semibold">If it isn’t paid on time</span>
        </span>
        {draft.enabled && preset === null ? (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Custom
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OptionCard
            option={{ id: "off", label: "Off", description: "No automatic emails", icon: BellOff }}
            selected={!draft.enabled}
            onSelect={() => onChange({ enabled: false })}
            className="p-3"
          />
          {TILE_ORDER.map((id) => {
            const item = REMINDER_PRESETS.find((p) => p.id === id);
            return (
              <OptionCard
                key={id}
                option={{ id, label: item?.label ?? id, description: TILE_DESCRIPTIONS[id], icon: PRESET_ICONS[id] }}
                selected={draft.enabled && preset === id}
                onSelect={() => applyPreset(id)}
                className="p-3"
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background/30 px-3 py-2">
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {planSummary(draft, due, timeline, people)}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            {expanded ? "Hide details" : "Customize"}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        {expanded ? (
          <div className="space-y-4 pt-1">
            <div className={cn("transition-opacity", !draft.enabled && "opacity-60")}>
              <ReminderStepToggles
                steps={draft.steps}
                repeatWeekly={draft.repeatWeekly}
                due={due}
                timeline={timeline}
                onToggleStep={(step) => onChange({ enabled: true, steps: toggleReminderStep(draft.steps, step) })}
                onToggleWeekly={() => onChange({ enabled: true, repeatWeekly: !draft.repeatWeekly })}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Who gets them</p>
              <ReminderRecipientsChoice
                idPrefix="inv-send-reminder"
                sameLabel="Same people as this email"
                sameEmails={[...emailTo, ...emailCc]}
                custom={draft.custom}
                onCustomChange={(custom) =>
                  onChange(
                    custom && !draft.to
                      ? { custom, to: emailTo.join(", "), cc: emailCc.join(", ") }
                      : { custom }
                  )
                }
                to={draft.to}
                cc={draft.cc}
                onToChange={(to) => onChange({ to })}
                onCcChange={(cc) => onChange({ cc })}
                contacts={contacts}
              />
            </div>
            {due ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  What happens after you send
                </p>
                <ReminderTimelineList timeline={timeline} due={due} enabled={draft.enabled} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
