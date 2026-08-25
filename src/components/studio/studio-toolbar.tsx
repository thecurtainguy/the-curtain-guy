"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Box,
  Check,
  LoaderCircle,
  Menu,
  PanelRight,
  Save,
  TriangleAlert,
  View,
} from "lucide-react";
import type {
  StudioAccessMode,
  StudioSaveState,
  StudioViewMode,
} from "./studio-types";

type StudioToolbarProps = {
  title: string;
  onTitleChange: (title: string) => void;
  viewMode: StudioViewMode;
  onViewModeChange: (mode: StudioViewMode) => void;
  saveState: StudioSaveState;
  saveMessage?: string;
  accessMode: StudioAccessMode;
  onSave: () => void;
  onOpenTools: () => void;
  onOpenProperties: () => void;
};

export function StudioToolbar({
  title,
  onTitleChange,
  viewMode,
  onViewModeChange,
  saveState,
  saveMessage,
  accessMode,
  onSave,
  onOpenTools,
  onOpenProperties,
}: StudioToolbarProps) {
  const saving = saveState === "saving";

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-2 border-b border-border/60 bg-card/75 px-3 py-2 backdrop-blur-xl sm:px-4">
      <div className="mr-1 flex shrink-0 items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <View className="size-4" aria-hidden="true" />
        </div>
        <div className="hidden xl:block">
          <p className="text-[0.58rem] font-semibold tracking-[0.22em] text-primary uppercase">
            Curtain Guy
          </p>
          <p className="font-heading text-sm leading-none">Studio</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 sm:max-w-sm">
        <label htmlFor="studio-design-title" className="sr-only">
          Design title
        </label>
        <Input
          id="studio-design-title"
          value={title}
          maxLength={160}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Untitled room design"
          className="h-9 bg-background/55 font-heading text-base"
        />
      </div>

      <div className="order-3 flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto sm:justify-start">
        <div
          className="flex rounded-2xl border border-border/60 bg-background/45 p-1"
          role="group"
          aria-label="Editor view"
        >
          {(["2d", "3d"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "flex h-7 items-center gap-1 rounded-xl px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                viewMode === mode
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "2d" ? <Menu aria-hidden="true" /> : <Box aria-hidden="true" />}
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenTools}
            aria-label="Open design tools"
          >
            <Menu aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenProperties}
            aria-label="Open properties"
          >
            <PanelRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "flex max-w-28 items-center gap-1.5 truncate text-[0.68rem] sm:max-w-44",
            saveState === "error" ? "text-destructive" : "text-muted-foreground"
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          title={saveMessage}
        >
          {saving ? (
            <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" />
          ) : saveState === "saved" ? (
            <Check className="size-3 text-emerald-600" />
          ) : saveState === "error" ? (
            <TriangleAlert className="size-3" />
          ) : null}
          {saveMessage ??
            (saveState === "dirty"
              ? "Unsaved"
              : saveState === "saved"
                ? "Saved"
                : accessMode === "guest"
                  ? "Guest design"
                  : "Ready")}
        </span>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {saving ? "Saving" : "Save"}
        </Button>
      </div>
    </header>
  );
}
