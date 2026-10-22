"use client";

import { cn } from "@/lib/utils";
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { useStudioEditorActions } from "../editor/studio-editor-context";
import { IconAction } from "./inspector-ui";

/** Selected-item hero: gold type badge, editable label, status chips, actions. */
export function ItemHeader({
  icon: Icon,
  eyebrow,
  label,
  onLabelChange,
  meta,
  locked,
  hidden,
  canDuplicate = true,
}: {
  icon: LucideIcon;
  eyebrow: string;
  label: string;
  /** Omit when the embedded editor already owns the label field. */
  onLabelChange?: (label: string) => void;
  meta?: React.ReactNode;
  locked?: boolean;
  hidden?: boolean;
  canDuplicate?: boolean;
}) {
  const { commands } = useStudioEditorActions();
  const labelId = useId();
  // Saved designs reject empty labels, so blanks stay local until blur reverts them.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-card/40 to-card/20">
      <div
        className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-primary/15 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex items-start gap-3 p-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-[0_8px_24px_-12px_rgba(212,175,55,0.6)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
          {onLabelChange ? (
            <>
              <label className="sr-only" htmlFor={labelId}>
                Item label
              </label>
              <input
                id={labelId}
                value={draft ?? label}
                maxLength={160}
                onChange={(event) => {
                  const next = event.target.value;
                  setDraft(next);
                  if (next.trim()) onLabelChange(next);
                }}
                onBlur={() => setDraft(null)}
                className="-mx-1 w-full truncate rounded-lg bg-transparent px-1 font-heading text-lg leading-tight outline-none hover:bg-background/30 focus:bg-background/50 focus:ring-2 focus:ring-primary/20"
              />
            </>
          ) : (
            <p className="truncate font-heading text-lg leading-tight">{label}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {meta}
            {locked ? <StatusChip icon={Lock}>Locked</StatusChip> : null}
            {hidden ? <StatusChip icon={EyeOff}>Hidden</StatusChip> : null}
          </div>
        </div>
      </div>
      <div className="relative flex gap-1.5 border-t border-primary/15 bg-background/20 p-2">
        {canDuplicate ? (
          <IconAction
            icon={Copy}
            label="Duplicate"
            shortcut="Ctrl D"
            onClick={commands.duplicate}
          />
        ) : null}
        <IconAction
          icon={locked ? Lock : LockOpen}
          label={locked ? "Unlock" : "Lock in place"}
          shortcut="L"
          active={locked}
          onClick={() => commands.setLocked()}
        />
        <IconAction
          icon={hidden ? EyeOff : Eye}
          label={hidden ? "Show" : "Hide"}
          shortcut="H"
          active={hidden}
          onClick={() => commands.setHidden()}
        />
        <IconAction
          icon={Trash2}
          label={locked ? "Unlock to delete" : "Delete"}
          shortcut="Del"
          destructive
          disabled={locked}
          onClick={commands.remove}
        />
      </div>
    </div>
  );
}

export function StatusChip({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[0.6rem] font-medium text-muted-foreground",
        className
      )}
    >
      {Icon ? <Icon className="size-2.5 text-primary" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
