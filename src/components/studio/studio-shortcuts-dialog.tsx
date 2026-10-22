"use client";

import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { Fragment } from "react";
import {
  STUDIO_SHORTCUTS,
  useStudioEditorActions,
  useStudioView,
} from "./editor/studio-editor-context";

const DISPLAY_SHORTCUTS: typeof STUDIO_SHORTCUTS = [
  { keys: ["Ctrl", "Shift", "F"], label: "Full screen on / off" },
  { keys: ["P"], label: "Present to a client (Esc exits)" },
];

const SHORTCUTS = [...STUDIO_SHORTCUTS, ...DISPLAY_SHORTCUTS];

/** Keyboard reference, controlled by the editor's `shortcutsOpen`. */
export function StudioShortcutsDialog() {
  const { shortcutsOpen } = useStudioView();
  const { setShortcutsOpen } = useStudioEditorActions();
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <BrandDialogContent
        size="lg"
        icon={Keyboard}
        eyebrow="Studio"
        title="Keyboard shortcuts"
        description="Work at full speed — every move, rotation and view switch is a keystroke away. On a Mac, Ctrl also works as ⌘."
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/25 px-3 py-2.5"
            >
              <span className="text-sm text-foreground/90">{shortcut.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <Fragment key={`${key}-${index}`}>
                    {index > 0 ? (
                      <span className="text-[0.65rem] text-muted-foreground">+</span>
                    ) : null}
                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-primary/30 bg-gradient-to-b from-primary/15 to-primary/5 px-1.5 font-mono text-[0.68rem] font-semibold text-primary shadow-[inset_0_-1px_0_color-mix(in_oklch,var(--primary)_35%,transparent)]">
                      {key}
                    </kbd>
                  </Fragment>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </BrandDialogContent>
    </Dialog>
  );
}
