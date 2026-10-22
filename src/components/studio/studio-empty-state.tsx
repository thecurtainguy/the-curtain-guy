"use client";

import {
  Keyboard,
  Layers,
  MousePointerClick,
  Move,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { useOptionalStudioEditorActions } from "./editor/studio-editor-context";

const TIPS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: MousePointerClick, title: "Click to inspect", body: "Shift-click to add more" },
  { icon: Move, title: "Drag to arrange", body: "Arrows nudge, R rotates" },
  { icon: Layers, title: "Layers tab", body: "Find, hide & lock anything" },
];

export function StudioEmptyState() {
  const editor = useOptionalStudioEditorActions();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-4">
      <div
        className="pointer-events-none absolute -top-12 left-1/2 size-40 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Ruler className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-primary uppercase">
            Precision editing
          </p>
          <h3 className="font-heading text-base leading-tight">Select an element</h3>
        </div>
      </div>
      <ul className="relative mt-3 grid grid-cols-3 gap-1.5">
        {TIPS.map((tip) => (
          <li
            key={tip.title}
            className="rounded-xl border border-border/40 bg-background/40 p-2 text-center"
          >
            <tip.icon className="mx-auto size-4 text-primary" aria-hidden="true" />
            <p className="mt-1 text-[0.65rem] font-medium leading-tight">{tip.title}</p>
            <p className="mt-0.5 text-[0.58rem] leading-tight text-muted-foreground">
              {tip.body}
            </p>
          </li>
        ))}
      </ul>
      {editor ? (
        <button
          type="button"
          onClick={() => editor.setShortcutsOpen(true)}
          className="relative mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-background/50 py-1.5 text-[0.65rem] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <Keyboard className="size-3.5 text-primary" aria-hidden="true" />
          View keyboard shortcuts
        </button>
      ) : null}
    </div>
  );
}
