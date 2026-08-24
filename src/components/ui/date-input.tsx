"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatDisplayDate,
  formatISODate,
  parseISODate,
} from "@/lib/date";

type DateInputProps = Omit<
  React.ComponentProps<"button">,
  "type" | "value" | "onChange"
> & {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  function DateInput(
    {
      className,
      value = "",
      onChange,
      id,
      disabled,
      placeholder = "yyyy-mm-dd",
      ...props
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const selectedDate = parseISODate(value);
    const displayValue = selectedDate ? formatDisplayDate(selectedDate) : "";

    function handleSelect(date: Date | undefined) {
      onChange?.(date ? formatISODate(date) : "");
      if (date) {
        setOpen(false);
      }
    }

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
            <CalendarIcon
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-2rem,18.5rem)] p-3"
          align="start"
        >
          <Calendar
            key={value || "empty"}
            value={selectedDate}
            onChange={handleSelect}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

export { DateInput };
