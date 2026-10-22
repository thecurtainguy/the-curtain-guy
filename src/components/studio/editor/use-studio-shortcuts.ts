"use client";

import { useEffect, useRef } from "react";
import { toggleLibraryBrowser } from "../rails/library-browser-store";
import { isStudioWalkActive } from "../three/camera/camera-view-store";
import {
  ceilingPlacementJustDisarmed,
  disarmCeilingPlacement,
  getCeilingPlacement,
} from "./ceiling-placement-store";
import type { StudioEditorState } from "./studio-editor-context";
import {
  exitStudioFullscreen,
  getStudioFullscreenMode,
  toggleStudioFullscreen,
} from "./studio-display-store";

type StudioShortcutOptions = {
  onSave: () => void;
  presenting?: boolean;
  onTogglePresent?: () => void;
};

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
  editor: StudioEditorState,
  options: StudioShortcutOptions
) {
  const latest = useRef({ editor, options });
  useEffect(() => {
    latest.current = { editor, options };
  }, [editor, options]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const {
        editor: { actions: current, selection: selectionState, settings },
        options: { onSave: save, presenting = false, onTogglePresent },
      } = latest.current;
      const { selection, selectedIds } = selectionState;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "s") {
        event.preventDefault();
        save();
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (mod && event.shiftKey && !event.altKey && key === "f") {
        event.preventDefault();
        toggleStudioFullscreen();
        return;
      }
      if (presenting) {
        // Present is a read-only walkthrough: only view keys apply.
        if (mod || event.altKey) return;
        if (event.key === "Escape") {
          if (getCeilingPlacement()) {
            disarmCeilingPlacement();
            return;
          }
          if (!ceilingPlacementJustDisarmed() && !event.defaultPrevented) {
            onTogglePresent?.();
          }
          return;
        }
        if (key === "p") onTogglePresent?.();
        else if (key === "f") current.sendCanvasCommand({ type: "fit" });
        else if (event.key === "?") current.setShortcutsOpen(true);
        return;
      }

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
        if (getCeilingPlacement()) {
          disarmCeilingPlacement();
          return;
        }
        if (ceilingPlacementJustDisarmed()) return;
        if (
          !selection &&
          selectedIds.length === 0 &&
          !event.defaultPrevented &&
          getStudioFullscreenMode() === "focus"
        ) {
          exitStudioFullscreen();
          return;
        }
        current.select(null);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length > 0) {
          event.preventDefault();
          current.commands.remove();
        }
        return;
      }
      if (event.key.startsWith("Arrow")) {
        if (isStudioWalkActive()) return;
        if (selectedIds.length === 0) return;
        event.preventDefault();
        const step = event.shiftKey
          ? 1
          : settings.snapEnabled
            ? settings.snapIncrement
            : 6;
        const dx =
          event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dz =
          event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        current.commands.nudge(dx, dz);
        return;
      }
      if (key === "r") {
        if (selectedIds.length === 0) return;
        event.preventDefault();
        const step = settings.rotationSnap || 15;
        current.commands.rotate(event.shiftKey ? -step : step);
        return;
      }
      if (key === "l" && event.shiftKey) {
        event.preventDefault();
        toggleLibraryBrowser();
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
        current.updateSettings({ snapEnabled: !settings.snapEnabled });
        return;
      }
      if (key === "f") {
        current.sendCanvasCommand({ type: "fit" });
        return;
      }
      if (key === "p") {
        onTogglePresent?.();
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
