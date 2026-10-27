"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Users, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { CONTACT_ROLE_LABELS, type CustomerContactOption } from "@/data/customers";
import { cn } from "@/lib/utils";

export function splitRecipientEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

const norm = (email: string) => email.trim().toLowerCase();

/**
 * Splits typed text into finished addresses and the part still being typed.
 * Commas / semicolons always finish an entry; a space only finishes a complete
 * email, so contact names like "Andrea C" can still be searched.
 */
function takeFinished(text: string): { done: string[]; rest: string } {
  const segments = text.split(/[,;\n]/);
  let rest = segments.pop() ?? "";
  const done = segments.map((part) => part.trim()).filter(Boolean);
  let match = rest.match(/^\s*(\S+)\s+([\s\S]*)$/);
  while (match && looksLikeEmail(match[1])) {
    done.push(match[1]);
    rest = match[2];
    match = rest.match(/^\s*(\S+)\s+([\s\S]*)$/);
  }
  return { done, rest: rest.trimStart() };
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

/**
 * Email chips field. Lists the customer's contacts on focus; free-typed
 * addresses become chips on Enter, comma, space, Tab, or leaving the field.
 */
export function RecipientInput({
  id,
  value,
  onChange,
  contacts,
  usedElsewhere,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  contacts: CustomerContactOption[];
  /** Emails already in another field, keyed by that field's label (e.g. "To"). */
  usedElsewhere?: Record<string, string>;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);

  const emails = splitRecipientEmails(value);
  const selected = new Set(emails.map(norm));
  const contactByEmail = new Map(contacts.map((contact) => [norm(contact.email), contact]));
  const elsewhere = useMemo(() => {
    const map = new Map<string, string>();
    for (const [label, raw] of Object.entries(usedElsewhere ?? {})) {
      for (const email of splitRecipientEmails(raw)) map.set(norm(email), label);
    }
    return map;
  }, [usedElsewhere]);

  const query = draft.trim().toLowerCase();
  const filtered = contacts.filter((contact) => {
    if (!query) return true;
    const role = contact.role ? CONTACT_ROLE_LABELS[contact.role] : "";
    return `${contact.name} ${contact.email} ${contact.title ?? ""} ${role}`.toLowerCase().includes(query);
  });
  const showList = focused && !dismissed && filtered.length > 0;
  const active = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  function addEmails(raw: string[]) {
    const next = [...emails];
    const seen = new Set(next.map(norm));
    for (const item of raw) {
      const email = item.trim().replace(/^<|>$/g, "");
      if (!email || seen.has(norm(email))) continue;
      seen.add(norm(email));
      next.push(email);
    }
    if (next.length !== emails.length) onChange(next.join(", "));
  }

  function removeEmail(email: string) {
    onChange(emails.filter((item) => norm(item) !== norm(email)).join(", "));
  }

  function commitDraft() {
    const { done, rest } = takeFinished(`${draft},`);
    addEmails([...done, rest].filter(Boolean));
    setDraft("");
  }

  function pick(contact: CustomerContactOption) {
    if (elsewhere.has(norm(contact.email))) return;
    if (selected.has(norm(contact.email))) removeEmail(contact.email);
    else addEmails([contact.email]);
    setDraft("");
    setNavigating(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && contacts.length) {
      event.preventDefault();
      setDismissed(false);
      setNavigating(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      if (showList) {
        setActiveIndex(filtered.length ? (active + step + filtered.length) % filtered.length : 0);
      }
    } else if (event.key === "Enter") {
      if (showList && filtered[active] && (navigating || query)) {
        event.preventDefault();
        pick(filtered[active]);
      } else if (draft.trim()) {
        event.preventDefault();
        commitDraft();
      }
    } else if (event.key === "Tab" && draft.trim()) {
      commitDraft();
    } else if (event.key === "Backspace" && !draft && emails.length) {
      event.preventDefault();
      removeEmail(emails[emails.length - 1]);
    } else if (event.key === "Escape" && showList) {
      event.preventDefault();
      setDismissed(true);
    }
  }

  return (
    <div className="space-y-1">
      <Popover
        open={showList}
        onOpenChange={(next) => {
          if (!next) setDismissed(true);
        }}
        modal={false}
      >
        <PopoverAnchor asChild>
          <div
            ref={boxRef}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                event.preventDefault();
                inputRef.current?.focus();
                setDismissed(false);
              }
            }}
            className={cn(
              "flex min-h-8 w-full min-w-0 cursor-text flex-wrap items-center gap-1.5 rounded-2xl border border-transparent bg-input/50 px-1.5 py-1 transition-[color,box-shadow] duration-200",
              focused && "border-ring ring-3 ring-ring/30"
            )}
          >
            {emails.map((email) => {
              const contact = contactByEmail.get(norm(email));
              const valid = looksLikeEmail(email);
              return (
                <span
                  key={norm(email)}
                  title={email}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-2.5 text-xs",
                    valid
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                  )}
                >
                  {contact ? (
                    <>
                      <span className="font-medium">{contact.name}</span>
                      <span className="truncate text-muted-foreground">{email}</span>
                    </>
                  ) : (
                    <span className="truncate">{email}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${email}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => removeEmail(email)}
                    className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
            <input
              ref={inputRef}
              id={id}
              value={draft}
              placeholder={emails.length ? "" : placeholder}
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls={`${id}-contacts`}
              className="h-6 min-w-[10rem] flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
              onFocus={() => {
                setFocused(true);
                setDismissed(false);
              }}
              onBlur={() => {
                setFocused(false);
                setNavigating(false);
                if (draft.trim()) commitDraft();
              }}
              onKeyDown={onKeyDown}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!/[,;\s]/.test(pasted.trim())) return;
                event.preventDefault();
                const { done, rest } = takeFinished(`${draft}${pasted},`);
                addEmails([...done, rest].filter(Boolean));
                setDraft("");
              }}
              onChange={(event) => {
                const { done, rest } = takeFinished(event.target.value);
                if (done.length) addEmails(done);
                setDraft(rest);
                setDismissed(false);
                setActiveIndex(0);
                setNavigating(false);
              }}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (boxRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
        >
          <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Users className="size-3.5" />
            </span>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
              Customer contacts · {contacts.length}
            </p>
          </div>
          <div id={`${id}-contacts`} role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto p-1.5">
            {filtered.map((contact, index) => {
              const isSelected = selected.has(norm(contact.email));
              const usedIn = isSelected ? null : elsewhere.get(norm(contact.email)) ?? null;
              const subtitle = [
                contact.primary ? "Primary" : null,
                contact.title,
                contact.role ? CONTACT_ROLE_LABELS[contact.role] : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={contact.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={Boolean(usedIn)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(contact)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    index === active ? "bg-primary/12" : "hover:bg-primary/10",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {initials(contact.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{contact.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                    {subtitle ? <span className="block truncate text-[11px] text-primary/80">{subtitle}</span> : null}
                  </span>
                  {usedIn ? (
                    <span className="shrink-0 rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                      In {usedIn}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-background/50 text-transparent"
                      )}
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {focused && draft.trim() && !showList ? (
        <p className="px-1 text-[11px] text-muted-foreground">
          Press <span className="font-medium text-foreground">Enter</span> or{" "}
          <span className="font-medium text-foreground">comma</span> to add{" "}
          {looksLikeEmail(draft.trim()) ? draft.trim() : "it"}.
        </p>
      ) : null}
    </div>
  );
}
