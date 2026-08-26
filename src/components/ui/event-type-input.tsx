"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { cn } from "@/lib/utils";

type EventTypeInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  value?: string;
  onChange?: (value: string) => void;
};

const EventTypeInput = React.forwardRef<HTMLInputElement, EventTypeInputProps>(
  function EventTypeInput(
    {
      className,
      value = "",
      onChange,
      id,
      disabled,
      placeholder = "Select or type…",
      ...props
    },
    ref
  ) {
    const localizedTypes = useLocalizedEventTypes();
    const suggestions = localizedTypes.filter((type) => type.id !== "other");

    const rootRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const [draft, setDraft] = React.useState(() => toDisplay(value, suggestions));
    const [activeIndex, setActiveIndex] = React.useState(-1);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (!focused) {
        setDraft(toDisplay(value, suggestions));
      }
    }, [value, focused, suggestions]);

    React.useEffect(() => {
      if (!open) return;
      function onPointerDown(event: MouseEvent) {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    function commitDraft(nextDraft: string) {
      const stored = toStored(nextDraft, suggestions);
      setDraft(toDisplay(stored, suggestions) || nextDraft.trim());
      onChange?.(stored);
    }

    function selectOption(optionId: string, label: string) {
      setDraft(label);
      onChange?.(optionId);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const next = event.target.value;
      setDraft(next);
      onChange?.(next);
      setOpen(true);
      setActiveIndex(-1);
    }

    function handleBlur() {
      setFocused(false);
      window.setTimeout(() => {
        if (rootRef.current?.contains(document.activeElement)) return;
        const current = inputRef.current?.value ?? draft;
        commitDraft(current);
        setOpen(false);
      }, 0);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (disabled) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(
          (index) => (index - 1 + suggestions.length) % suggestions.length
        );
        return;
      }

      if (
        event.key === "Enter" &&
        open &&
        activeIndex >= 0 &&
        suggestions[activeIndex]
      ) {
        event.preventDefault();
        const option = suggestions[activeIndex];
        selectOption(option.id, option.label);
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    const selectedId =
      suggestions.find((type) => type.id === toStored(value, suggestions))?.id ??
      suggestions.find(
        (type) => type.label.toLowerCase() === draft.trim().toLowerCase()
      )?.id;

    return (
      <div ref={rootRef} className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={id ? `${id}-listbox` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={draft}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-8 w-full min-w-0 rounded-2xl border border-transparent bg-input/50 py-1 pr-10 pl-2.5 text-base transition-[color,box-shadow] duration-200 outline-none md:text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Show event types"
          className={cn(
            "absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-xl text-primary transition-colors",
            "hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
          )}
          onMouseDown={(event) => {
            event.preventDefault();
            if (disabled) return;
            setOpen((wasOpen) => !wasOpen);
            inputRef.current?.focus();
          }}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        {open && !disabled ? (
          <div
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border/50 bg-card p-1.5 text-card-foreground shadow-xl ring-1 ring-primary/10"
          >
            <p className="px-2.5 py-1.5 text-[10px] font-medium tracking-[0.16em] text-primary uppercase">
              Event types
            </p>
            <ul className="max-h-56 overflow-y-auto">
              {suggestions.map((type, index) => {
                const isActive = index === activeIndex;
                const isSelected = type.id === selectedId;
                return (
                  <li key={type.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                        isActive || isSelected
                          ? "bg-primary/12 text-foreground"
                          : "text-foreground/90 hover:bg-primary/10 hover:text-foreground"
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectOption(type.id, type.label);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span>{type.label}</span>
                      {isSelected ? (
                        <Check
                          className="size-3.5 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border/40 px-2.5 py-2 text-xs text-muted-foreground">
              Or type a custom event type
            </p>
          </div>
        ) : null}
      </div>
    );
  }
);

function toDisplay(
  value: string,
  suggestions: Array<{ id: string; label: string }>
): string {
  if (!value) return "";
  const byId = suggestions.find((type) => type.id === value);
  if (byId) return byId.label;
  return value;
}

function toStored(
  display: string,
  suggestions: Array<{ id: string; label: string }>
): string {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const byId = suggestions.find((type) => type.id === trimmed);
  if (byId) return byId.id;
  const byLabel = suggestions.find(
    (type) => type.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (byLabel) return byLabel.id;
  return trimmed;
}

export { EventTypeInput };
