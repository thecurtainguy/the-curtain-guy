"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addMonths,
  formatDisplayDate,
  formatISODate,
  getCalendarDays,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "@/lib/date";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export type CalendarProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  className?: string;
};

export function Calendar({ value, onChange, className }: CalendarProps) {
  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonth(value ?? today)
  );

  const days = getCalendarDays(viewMonth);
  const monthLabel = viewMonth.toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });

  function selectDay(day: Date) {
    onChange?.(day);
  }

  function goToToday() {
    onChange?.(today);
    setViewMonth(startOfMonth(today));
  }

  function clearDate() {
    onChange?.(undefined);
  }

  return (
    <div className={cn("select-none", className)}>
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
          onClick={() => setViewMonth((current) => addMonths(current, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <p className="text-sm font-medium tracking-wide text-foreground">
          {monthLabel}
        </p>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
          onClick={() => setViewMonth((current) => addMonths(current, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-1 text-[11px] font-medium tracking-wide text-muted-foreground"
          >
            {weekday}
          </div>
        ))}

        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const selected = value ? isSameDay(day, value) : false;
          const isToday = isSameDay(day, today);

          return (
            <button
              key={formatISODate(day)}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                !inMonth && "text-muted-foreground/40",
                inMonth && !selected && "text-foreground hover:bg-primary/10 hover:text-primary",
                isToday &&
                  !selected &&
                  "ring-1 ring-primary/35 ring-inset",
                selected &&
                  "bg-gold-metallic font-medium text-primary-foreground shadow-sm"
              )}
              aria-label={formatDisplayDate(day)}
              aria-pressed={selected}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={clearDate}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Today
        </button>
      </div>
    </div>
  );
}
