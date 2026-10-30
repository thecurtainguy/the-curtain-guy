"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { slugifyEventTypeLabel, type EventType } from "@/data/event-types";
import { useLocalizedEventTypes } from "@/lib/i18n/estimate";
import { useAddEventType, useEventTypes } from "@/components/providers/event-types-provider";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type EventTypeInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  value?: string;
  onChange?: (value: string) => void;
  /** Owner-only: offer to add typed text to the managed event type list. */
  allowCreate?: boolean;
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
      allowCreate = false,
      ...props
    },
    ref
  ) {
    const router = useRouter();
    const managedTypes = useEventTypes();
    const addEventType = useAddEventType();
    const localizedTypes = useLocalizedEventTypes();
    const knownTypes = useLocalizedEventTypes({ includeHidden: true });
    const [creating, setCreating] = React.useState(false);
    const suggestions = React.useMemo(
      () => localizedTypes.filter((type) => type.id !== "other"),
      [localizedTypes]
    );

    const rootRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const [draft, setDraft] = React.useState(() => toDisplay(value, knownTypes));
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const [openUpward, setOpenUpward] = React.useState(false);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (!focused) {
        setDraft(toDisplay(value, knownTypes));
      }
    }, [value, focused, knownTypes]);

    React.useLayoutEffect(() => {
      if (!open || !rootRef.current) return;

      function updatePlacement() {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const menuHeight = 280;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUpward(spaceBelow < menuHeight && spaceAbove > spaceBelow);
      }

      updatePlacement();
      window.addEventListener("resize", updatePlacement);
      window.addEventListener("scroll", updatePlacement, true);
      return () => {
        window.removeEventListener("resize", updatePlacement);
        window.removeEventListener("scroll", updatePlacement, true);
      };
    }, [open]);

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

    function findManagedType(text: string): EventType | undefined {
      const normalized = text.trim().replace(/\s+/g, " ");
      if (!normalized) return undefined;
      const lower = normalized.toLowerCase();
      const slug = slugifyEventTypeLabel(normalized);
      return managedTypes.find(
        (type) =>
          type.id === normalized ||
          type.id === slug ||
          type.label.toLowerCase() === lower ||
          type.label_fr.toLowerCase() === lower
      );
    }

    function commitDraft(nextDraft: string) {
      const stored = findManagedType(nextDraft)?.id ?? toStored(nextDraft, knownTypes);
      setDraft(toDisplay(stored, knownTypes) || nextDraft.trim());
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

    const typed = draft.trim().replace(/\s+/g, " ");
    const canCreate =
      allowCreate && Boolean(slugifyEventTypeLabel(typed)) && !findManagedType(typed);

    async function createType() {
      if (!canCreate || creating) return;
      setCreating(true);
      try {
        const response = await fetch("/api/admin/event-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: typed }),
        });
        const json = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          eventType?: EventType;
        };
        if (!response.ok || !json.ok || !json.eventType) {
          toast.error(json.message ?? "Could not add the event type.");
          return;
        }
        const created = json.eventType;
        addEventType(created);
        selectOption(created.id, created.label);
        toast.success(`“${created.label}” added to your event types. Add a French name in Settings → Event types.`);
        router.refresh();
      } catch {
        toast.error("Could not add the event type.");
      } finally {
        setCreating(false);
      }
    }

    const selectedId =
      suggestions.find((type) => type.id === toStored(value, knownTypes))?.id ??
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
            className={cn(
              "absolute z-[80] w-full overflow-hidden rounded-2xl border border-border/50 bg-card p-1.5 text-card-foreground shadow-xl ring-1 ring-primary/10",
              openUpward ? "bottom-full mb-2" : "top-full mt-2"
            )}
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
            {canCreate ? (
              <div className="border-t border-border/40 pt-1.5">
                <button
                  type="button"
                  disabled={creating}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void createType();
                  }}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    {creating ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="size-3.5" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 break-words">
                    Add “{typed}” as a new event type
                  </span>
                </button>
              </div>
            ) : (
              <p className="border-t border-border/40 px-2.5 py-2 text-xs text-muted-foreground">
                {allowCreate ? "Type a name to add a new event type" : "Or type a custom event type"}
              </p>
            )}
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
