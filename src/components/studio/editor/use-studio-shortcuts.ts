"use client";

import { useEffect, useRef } from "react";
import type { StudioEditorContextValue } from "./studio-editor-context";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select") ||
      target.isContentEditable ||
      Boolean(target.closest('[contenteditable="true"], [role="dialog"]')))
  );
}

/** Global Studio keyboard map. Ignored while typing in form fields or dialogs. */
export function useStudioKeyboardShortcuts(
  editor: StudioEditorContextValue,
  { onSave }: { onSave: () => void }
) {
  const latest = useRef({ editor, onSave });
  useEffect(() => {
    latest.current = { editor, onSave };
  }, [editor, onSave]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const { editor: current, onSave: save } = latest.current;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "s") {
        event.preventDefault();
        save();
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) current.redo();
        else current.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        current.redo();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        current.commands.duplicate();
        return;
      }
      if (mod && key === "c") {
        current.commands.copy();
        return;
      }
      if (mod && key === "v") {
        event.preventDefault();
        current.commands.paste();
        return;
      }
      if (mod && key === "a") {
        event.preventDefault();
        current.commands.selectAll();
        return;
      }
      if (mod || event.altKey) return;

      if (event.key === "Escape") {
        current.select(null);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (current.selectedIds.length > 0) {
          event.preventDefault();
          current.commands.remove();
        }
        return;
      }
      if (event.key.startsWith("Arrow")) {
        if (current.selectedIds.length === 0) return;
        event.preventDefault();
        const step = event.shiftKey
          ? 1
          : current.settings.snapEnabled
            ? current.settings.snapIncrement
            : 6;
        const dx =
          event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dz =
          event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        current.commands.nudge(dx, dz);
        return;
      }
      if (key === "r") {
        if (current.selectedIds.length === 0) return;
        event.preventDefault();
        const step = current.settings.rotationSnap || 15;
        current.commands.rotate(event.shiftKey ? -step : step);
        return;
      }
      if (key === "l") {
        current.commands.setLocked();
        return;
      }
      if (key === "h") {
        current.commands.setHidden();
        return;
      }
      if (key === "g") {
        current.updateSettings({ snapEnabled: !current.settings.snapEnabled });
        return;
      }
      if (key === "f") {
        current.sendCanvasCommand({ type: "fit" });
        return;
      }
      if (key === "1") current.setViewMode("2d");
      else if (key === "2") current.setViewMode("3d");
      else if (key === "3") current.setViewMode("split");
      else if (event.key === "?") current.setShortcutsOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
