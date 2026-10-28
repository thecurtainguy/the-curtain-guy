"use client";

import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Feather,
  Mail,
  PhoneCall,
  Repeat,
  ShieldAlert,
  UserRoundPen,
  Users,
} from "lucide-react";
import { addDaysIso } from "@/data/invoices";
import {
  REMINDER_STEP_INFO,
  REMINDER_STEPS,
  type ReminderDue,
  type ReminderPresetId,
  type ReminderStep,
  type ReminderTimelineEntry,
} from "@/data/invoice-reminders";
import type { CustomerContactOption } from "@/data/customers";
import { RecipientInput, splitRecipientEmails } from "@/components/admin/recipient-input";
import { COMPACT_OPTION_GRID, OptionCard } from "@/components/estimate/option-card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const PRESET_ICONS: Record<ReminderPresetId, typeof BellRing> = {
  standard: CalendarClock,
  gentle: Feather,
  firm: ShieldAlert,
};

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  );
}

export function toggleReminderStep(steps: ReminderStep[], step: ReminderStep): ReminderStep[] {
  return steps.includes(step) ? steps.filter((s) => s !== step) : REMINDER_STEPS.filter((s) => s === step || steps.includes(s));
}

const STATUS_STYLE = {
  sent: { label: "Sent", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  next: { label: "Next daily run", className: "border-primary/50 bg-primary/15 text-primary" },
  planned: { label: "Planned", className: "border-border/60 bg-background/40 text-muted-foreground" },
  passed: { label: "Skipped", className: "border-border/40 bg-background/20 text-muted-foreground/70" },
} as const;

export function ReminderStepToggles({
  steps,
  repeatWeekly,
  due,
  timeline = [],
  onToggleStep,
  onToggleWeekly,
}: {
  steps: readonly ReminderStep[];
  repeatWeekly: boolean;
  due: ReminderDue | null;
  /** Actual dates (late sends and catch-ups shift them); falls back to the rule date. */
  timeline?: ReminderTimelineEntry[];
  onToggleStep: (step: ReminderStep) => void;
  onToggleWeekly: () => void;
}) {
  const whenFor = (step: ReminderStep): string | null => {
    const entry = timeline.find((e) => e.stage === step);
    if (entry?.status === "passed") return "skipped";
    if (entry) return shortDate(entry.date);
    return due ? shortDate(addDaysIso(due.scheduleDue, REMINDER_STEP_INFO[step].day)) : null;
  };
  return (
    <div className="@container space-y-2 rounded-2xl border border-border/40 bg-card/25 p-3">
      <p className="text-xs text-muted-foreground">Fine-tune each email</p>
      <div className={COMPACT_OPTION_GRID}>
        {REMINDER_STEPS.map((step) => {
          const unavailable = step === "upcoming_3" && due !== null && !due.allowUpcoming;
          const date = whenFor(step);
          return (
            <OptionCard
              key={step}
              mode="multi"
              option={{
                id: step,
                label: REMINDER_STEP_INFO[step].label,
                description: unavailable
                  ? "Not used: this invoice is due on receipt"
                  : `${REMINDER_STEP_INFO[step].description}${date ? ` · ${date}` : ""}`,
                icon: step === "upcoming_3" ? CalendarDays : Mail,
              }}
              selected={steps.includes(step)}
              onSelect={() => onToggleStep(step)}
              className="p-3"
            />
          );
        })}
      </div>
      <OptionCard
        mode="multi"
        option={{
          id: "weekly",
          label: "Keep nudging weekly until paid",
          description: "From 21 days late, one email every 7 days. You’re still flagged in the daily summary to call.",
          icon: Repeat,
        }}
        selected={repeatWeekly}
        onSelect={onToggleWeekly}
        className="p-3"
      />
    </div>
  );
}

export function ReminderRecipientsChoice({
  idPrefix,
  sameLabel,
  sameEmails,
  custom,
  onCustomChange,
  to,
  cc,
  onToChange,
  onCcChange,
  contacts,
}: {
  idPrefix: string;
  sameLabel: string;
  sameEmails: string[];
  custom: boolean;
  onCustomChange: (custom: boolean) => void;
  to: string;
  cc: string;
  onToChange: (value: string) => void;
  onCcChange: (value: string) => void;
  contacts: CustomerContactOption[];
}) {
  const count = splitRecipientEmails(to).length + splitRecipientEmails(cc).length;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <OptionCard
          option={{
            id: "invoice",
            label: sameLabel,
            description: sameEmails.join(", ") || "No email on file yet",
            icon: Users,
          }}
          selected={!custom}
          onSelect={() => onCustomChange(false)}
          className="p-3 [&_span.text-xs]:break-all"
        />
        <OptionCard
          option={{
            id: "custom",
            label: "A custom list",
            description: "Pick contacts or type any email, e.g. accounts payable",
            icon: UserRoundPen,
          }}
          selected={custom}
          onSelect={() => onCustomChange(true)}
          className="p-3"
        />
      </div>
      {custom ? (
        <div className="space-y-3 rounded-2xl border border-border/40 bg-card/25 p-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-to`}>To</Label>
            <RecipientInput
              id={`${idPrefix}-to`}
              value={to}
              onChange={onToChange}
              contacts={contacts}
              usedElsewhere={{ Cc: cc }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-cc`}>Cc</Label>
            <RecipientInput
              id={`${idPrefix}-cc`}
              value={cc}
              onChange={onCcChange}
              contacts={contacts}
              usedElsewhere={{ To: to }}
              placeholder={contacts.length > 1 ? "Click to pick other contacts" : "accounting@company.com"}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {count} recipient{count === 1 ? "" : "s"} · you get your own copy of every reminder.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ReminderTimelineList({
  timeline,
  due,
  enabled,
}: {
  timeline: ReminderTimelineEntry[];
  due: ReminderDue;
  enabled: boolean;
}) {
  return (
    <>
      <ol className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
        {timeline.map((entry) => {
          const paused = !enabled && entry.status !== "sent";
          const style = paused ? STATUS_STYLE.passed : STATUS_STYLE[entry.status];
          const Icon = entry.adminOnly ? PhoneCall : entry.status === "sent" ? CalendarCheck : Mail;
          return (
            <li key={entry.stage} className="flex items-center gap-3 border-b border-border/30 px-3 py-2.5 last:border-b-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{entry.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {shortDate(entry.date)}
                  {entry.adminOnly ? " · to you, not the client" : ""}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  style.className
                )}
              >
                {paused ? "Paused" : style.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground">
        Due {shortDate(due.dueDate)}
        {due.allowUpcoming ? "" : " (on receipt: the schedule counts from 3 days after sending)"}. Reminders go out each
        morning, never sooner than 3 days after the invoice email; if a day is missed, only the latest step goes out,
        never a pile-up.
      </p>
    </>
  );
}
