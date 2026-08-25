"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  TIME_HOURS,
  TIME_MINUTES,
  formatDisplayTime,
  getNowTimeParts,
  parseDisplayTime,
  type TimeParts,
} from "@/lib/time";

type TimeInputProps = Omit<
  React.ComponentProps<"button">,
  "type" | "value" | "onChange"
> & {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

function minuteOptions(selected: number): number[] {
  const base: number[] = [...TIME_MINUTES];
  if (base.includes(selected)) return base;
  return [...base, selected].sort((a, b) => a - b);
}

const chipClass = (selected: boolean) =>
  cn(
    "flex h-9 items-center justify-center rounded-xl text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    !selected && "text-foreground hover:bg-primary/10 hover:text-primary",
    selected &&
      "bg-gold-metallic font-medium text-primary-foreground shadow-sm"
  );

const TimeInput = React.forwardRef<HTMLButtonElement, TimeInputProps>(
  function TimeInput(
    {
      className,
      value = "",
      onChange,
      id,
      disabled,
      placeholder = "Select time",
      ...props
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const parsed = parseDisplayTime(value);
    const displayValue = parsed ? formatDisplayTime(parsed) : value.trim();

    const [draft, setDraft] = React.useState<TimeParts>(
      () => parsed ?? { hour: 6, minute: 0, period: "PM" }
    );

    React.useEffect(() => {
      if (!open) return;
      setDraft(parseDisplayTime(value) ?? getNowTimeParts());
    }, [open, value]);

    function commit(next: TimeParts) {
      setDraft(next);
      onChange?.(formatDisplayTime(next));
    }

    function clearTime() {
      onChange?.("");
      setOpen(false);
    }

    function setNow() {
      commit(getNowTimeParts());
      setOpen(false);
    }

    const minutes = minuteOptions(draft.minute);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            ref={ref}
            type="button"
            id={id}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "relative h-8 w-full min-w-0 cursor-pointer rounded-2xl border border-transparent bg-input/50 px-2.5 py-1 pr-10 text-left text-base transition-[color,box-shadow] duration-200 outline-none md:text-sm",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            {...props}
          >
            <span className={cn(!displayValue && "text-muted-foreground")}>
              {displayValue || placeholder}
            </span>
            <Clock
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden p-3"
          align="start"
        >
          <div className="w-full select-none">
            <p className="px-1 pb-3 text-center text-sm font-medium tracking-wide text-foreground">
              {formatDisplayTime(draft)}
            </p>

            <div className="grid grid-cols-[minmax(0,1fr)_6.75rem_2.75rem] items-start gap-3">
              <div className="min-w-0">
                <p className="mb-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
                  Hour
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {TIME_HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => commit({ ...draft, hour })}
                      className={cn(chipClass(draft.hour === hour), "min-w-0")}
                      aria-pressed={draft.hour === hour}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-[6.75rem] shrink-0">
                <p className="mb-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
                  Min
                </p>
                <div className="max-h-[9.75rem] overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                  <div className="grid grid-cols-2 gap-1">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => commit({ ...draft, minute })}
                        className={cn(
                          chipClass(draft.minute === minute),
                          "min-w-0 w-full"
                        )}
                        aria-pressed={draft.minute === minute}
                      >
                        {String(minute).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-11 shrink-0">
                <p className="mb-1.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
                  &nbsp;
                </p>
                <div className="flex flex-col gap-1">
                  {(["AM", "PM"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => commit({ ...draft, period })}
                      className={cn(
                        chipClass(draft.period === period),
                        "w-full"
                      )}
                      aria-pressed={draft.period === period}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
              <button
                type="button"
                onClick={clearTime}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={setNow}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Now
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

export { TimeInput };
