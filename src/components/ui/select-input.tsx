"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectInputProps = Omit<
  React.ComponentProps<"button">,
  "type" | "value" | "onChange"
> & {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Default: on when there are more than 5 options. */
  searchable?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  size?: "sm" | "md";
};

const SelectInput = React.forwardRef<HTMLButtonElement, SelectInputProps>(
  function SelectInput(
    {
      className,
      value = "",
      onChange,
      options,
      id,
      disabled,
      placeholder = "Select…",
      searchPlaceholder = "Search…",
      emptyMessage = "No matches",
      searchable,
      allowClear = false,
      clearLabel = "Clear",
      size = "sm",
      ...props
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [activeIndex, setActiveIndex] = React.useState(0);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

    const showSearch = searchable ?? options.length > 5;
    const selected = options.find((option) => option.value === value) ?? null;

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((option) => {
        const hay = `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase();
        return hay.includes(q);
      });
    }, [options, query]);

    React.useEffect(() => {
      if (!open) {
        setQuery("");
        setActiveIndex(0);
        return;
      }
      const selectedIdx = filtered.findIndex((option) => option.value === value);
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
      const frame = window.requestAnimationFrame(() => {
        if (showSearch) searchRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }, [open, showSearch, value]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when opening

    React.useEffect(() => {
      if (!open) return;
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-select-index="${activeIndex}"]`
      );
      el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open]);

    function selectValue(next: string) {
      onChange?.(next);
      setOpen(false);
    }

    function handleKeyDown(event: React.KeyboardEvent) {
      if (disabled) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((index) =>
          filtered.length ? (index + 1) % filtered.length : 0
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((index) =>
          filtered.length
            ? (index - 1 + filtered.length) % filtered.length
            : 0
        );
        return;
      }

      if (event.key === "Enter" && open) {
        event.preventDefault();
        const option = filtered[activeIndex];
        if (option && !option.disabled) selectValue(option.value);
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
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
            aria-haspopup="listbox"
            aria-expanded={open}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative w-full min-w-0 cursor-pointer rounded-2xl border border-transparent bg-input/50 text-left transition-[color,box-shadow] duration-200 outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              size === "md" ? "h-10 px-3 pr-10 text-sm" : "h-8 px-2.5 pr-9 text-base md:text-sm",
              className
            )}
            {...props}
          >
            <span className={cn("block truncate", !selected && "text-muted-foreground")}>
              {selected?.label || placeholder}
            </span>
            <ChevronDown
              className={cn(
                "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary transition-transform duration-200",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0"
          align="start"
          onKeyDown={handleKeyDown}
        >
          {showSearch ? (
            <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
              <Search className="size-3.5 shrink-0 text-primary" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label={searchPlaceholder}
              />
            </div>
          ) : null}

          <div
            ref={listRef}
            role="listbox"
            aria-labelledby={id}
            className="max-h-60 overflow-y-auto p-1.5"
          >
            {allowClear && value ? (
              <button
                type="button"
                role="option"
                className="mb-1 flex w-full items-center rounded-xl px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                onClick={() => selectValue("")}
              >
                {clearLabel}
              </button>
            ) : null}

            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    data-select-index={index}
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                      "disabled:pointer-events-none disabled:opacity-50",
                      isActive || isSelected
                        ? "bg-primary/12 text-foreground"
                        : "text-foreground/90 hover:bg-primary/10 hover:text-foreground"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (!option.disabled) selectValue(option.value);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check
                        className="size-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

export { SelectInput };
