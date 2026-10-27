"use client";

import { CalendarDays, Hammer, PackageOpen, TriangleAlert, type LucideIcon } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import type { QuoteSchedule } from "@/data/quote-schedule";
import { cn } from "@/lib/utils";

export type QuoteScheduleDraft = {
  eventStart: string;
  eventEnd: string;
  installDate: string;
  installStart: string;
  installEnd: string;
  teardownDate: string;
  teardownStart: string;
  teardownEnd: string;
};

function dateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function scheduleDraftFromQuote(quote: QuoteSchedule): QuoteScheduleDraft {
  return {
    eventStart: quote.event_start_time ?? "",
    eventEnd: quote.event_end_time ?? "",
    installDate: dateInput(quote.install_date),
    installStart: quote.install_start_time ?? "",
    installEnd: quote.install_end_time ?? "",
    teardownDate: dateInput(quote.teardown_date),
    teardownStart: quote.teardown_start_time ?? "",
    teardownEnd: quote.teardown_end_time ?? "",
  };
}

export function scheduleDraftPayload(draft: QuoteScheduleDraft) {
  return {
    event_start_time: draft.eventStart || null,
    event_end_time: draft.eventEnd || null,
    install_date: draft.installDate || null,
    install_start_time: draft.installStart || null,
    install_end_time: draft.installEnd || null,
    teardown_date: draft.teardownDate || null,
    teardown_start_time: draft.teardownStart || null,
    teardown_end_time: draft.teardownEnd || null,
  };
}

type TileProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  date: string;
  onDateChange: (value: string) => void;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  disabled: boolean;
  /** Offered when the date is empty and the event date is known. */
  sameDayAs?: string;
  warning?: string | null;
  highlight?: boolean;
};

function ScheduleTile({
  id,
  icon: Icon,
  title,
  hint,
  date,
  onDateChange,
  start,
  end,
  onStartChange,
  onEndChange,
  disabled,
  sameDayAs,
  warning,
  highlight,
}: TileProps) {
  return (
    <div
      className={cn(
        "space-y-2.5 rounded-xl border p-3",
        highlight ? "border-primary/35 bg-primary/[0.05]" : "border-border/40 bg-card/40"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`${id}_date`} className="text-xs">
            Date
          </Label>
          {sameDayAs && !date && !disabled ? (
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline"
              onClick={() => onDateChange(sameDayAs)}
            >
              Same day as event
            </button>
          ) : null}
        </div>
        <DateInput id={`${id}_date`} value={date} onChange={onDateChange} disabled={disabled} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}_start`} className="text-xs">
            From
          </Label>
          <TimeInput
            id={`${id}_start`}
            value={start}
            onChange={onStartChange}
            disabled={disabled}
            placeholder="Start"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}_end`} className="text-xs">
            To
          </Label>
          <TimeInput
            id={`${id}_end`}
            value={end}
            onChange={onEndChange}
            disabled={disabled}
            placeholder="End"
          />
        </div>
      </div>
      {warning ? (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
          {warning}
        </p>
      ) : null}
    </div>
  );
}

export function QuoteScheduleFields({
  eventDate,
  onEventDateChange,
  draft,
  onChange,
  disabled,
  idPrefix = "",
}: {
  eventDate: string;
  onEventDateChange: (value: string) => void;
  draft: QuoteScheduleDraft;
  onChange: (patch: Partial<QuoteScheduleDraft>) => void;
  disabled: boolean;
  /** Keeps input ids unique when a second copy renders on the same page. */
  idPrefix?: string;
}) {
  const installWarning =
    eventDate && draft.installDate && draft.installDate > eventDate
      ? "Install is after the event date."
      : null;
  const teardownWarning =
    eventDate && draft.teardownDate && draft.teardownDate < eventDate
      ? "Teardown is before the event date."
      : null;

  return (
    <div className="mt-4 rounded-2xl border border-border/40 bg-background/30 p-4">
      <Label>Schedule</Label>
      <p className="mt-1 text-xs text-muted-foreground">
        Install, teardown, and time windows are optional. When set, they show on
        the proposal and PDF and carry over to the job.
      </p>
      <div className="@container mt-3">
        <div className="grid gap-3 @[46rem]:grid-cols-3">
          <ScheduleTile
            id={`${idPrefix}install`}
            icon={Hammer}
            title="Install"
            hint="Optional"
            date={draft.installDate}
            onDateChange={(value) => onChange({ installDate: value })}
            start={draft.installStart}
            end={draft.installEnd}
            onStartChange={(value) => onChange({ installStart: value })}
            onEndChange={(value) => onChange({ installEnd: value })}
            disabled={disabled}
            sameDayAs={eventDate || undefined}
            warning={installWarning}
          />
          <ScheduleTile
            id={`${idPrefix}event`}
            icon={CalendarDays}
            title="Event"
            hint="Time window optional"
            date={eventDate}
            onDateChange={onEventDateChange}
            start={draft.eventStart}
            end={draft.eventEnd}
            onStartChange={(value) => onChange({ eventStart: value })}
            onEndChange={(value) => onChange({ eventEnd: value })}
            disabled={disabled}
            highlight
          />
          <ScheduleTile
            id={`${idPrefix}teardown`}
            icon={PackageOpen}
            title="Teardown"
            hint="Optional"
            date={draft.teardownDate}
            onDateChange={(value) => onChange({ teardownDate: value })}
            start={draft.teardownStart}
            end={draft.teardownEnd}
            onStartChange={(value) => onChange({ teardownStart: value })}
            onEndChange={(value) => onChange({ teardownEnd: value })}
            disabled={disabled}
            sameDayAs={eventDate || undefined}
            warning={teardownWarning}
          />
        </div>
      </div>
    </div>
  );
}
