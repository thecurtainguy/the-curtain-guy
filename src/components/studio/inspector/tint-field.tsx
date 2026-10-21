"use client";

import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { FieldLabel } from "./inspector-ui";

const HEX = /^#[0-9a-f]{6}$/i;

const QUICK_TINTS = [
  "#f4f2ed",
  "#171513",
  "#b98b3d",
  "#c99b9e",
  "#1f5a45",
  "#1d2a44",
  "#5a1f2b",
] as const;

/** `#rrggbb` tint with native picker, hex entry, quick tints and reset. */
export function TintField({
  value,
  onChange,
  mixed,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  mixed?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && !HEX.test(normalize(draft));

  return (
    <div className="space-y-2">
      <FieldLabel
        htmlFor={`${id}-hex`}
        hint={mixed ? "Mixed" : value ? "Overrides finish" : "Using finish colour"}
      >
        Tint
      </FieldLabel>
      <div className="flex items-center gap-2">
        <label
          className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border/50 shadow-inner"
          style={{
            background:
              value ??
              "repeating-linear-gradient(135deg,transparent 0 5px,color-mix(in oklch,var(--muted-foreground) 35%,transparent) 5px 6px)",
          }}
        >
          <span className="sr-only">Pick tint colour</span>
          <input
            type="color"
            value={value ?? "#c9ab78"}
            onChange={(event) => onChange(event.target.value.toLowerCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <input
          id={`${id}-hex`}
          value={draft ?? value ?? ""}
          placeholder={mixed ? "Mixed" : "#rrggbb"}
          maxLength={7}
          aria-invalid={invalid || undefined}
          onFocus={() => setDraft(value ?? "")}
          onBlur={() => setDraft(null)}
          onChange={(event) => {
            setDraft(event.target.value);
            const next = normalize(event.target.value);
            if (HEX.test(next)) onChange(next.toLowerCase());
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={cn(
            "h-9 min-w-0 flex-1 rounded-xl border border-border/50 bg-background/50 px-2.5 font-mono text-xs uppercase outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15",
            invalid && "border-destructive/60"
          )}
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          disabled={!value && !mixed}
          className="flex h-9 items-center gap-1 rounded-xl border border-border/40 bg-card/35 px-2.5 text-[0.65rem] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          Reset
        </button>
      </div>
      <div className="flex gap-1.5" aria-label="Quick tints">
        {QUICK_TINTS.map((tint) => (
          <button
            key={tint}
            type="button"
            onClick={() => onChange(tint)}
            aria-label={`Tint ${tint}`}
            className={cn(
              "size-6 rounded-lg border border-border/50 shadow-inner transition-transform hover:-translate-y-px",
              value === tint && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            style={{ backgroundColor: tint }}
          />
        ))}
      </div>
    </div>
  );
}

function normalize(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}
