"use client";

import { Package, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AddLineActions = {
  onInventory: () => void;
  onLogistics: () => void;
  onCustom: () => void;
};

const ADD_LINE_OPTIONS = [
  { id: "inventory", icon: Package, label: "From inventory", hint: "Drapes, decor, rentals" },
  { id: "logistics", icon: Truck, label: "Installation / transport", hint: "Delivery, install, teardown" },
  { id: "custom", icon: Plus, label: "Custom line", hint: "Anything else, typed in" },
] as const;

export function AddLineButtons({ onInventory, onLogistics, onCustom }: AddLineActions) {
  const handlers = { inventory: onInventory, logistics: onLogistics, custom: onCustom };
  return (
    <div className="flex flex-wrap gap-2">
      {ADD_LINE_OPTIONS.map(({ id, icon: Icon, label }) => (
        <Button key={id} type="button" variant="outline" size="sm" onClick={handlers[id]}>
          <Icon className="size-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}

export function AddLineBar({
  title,
  className,
  ...actions
}: AddLineActions & { title: string; className?: string }) {
  const handlers = {
    inventory: actions.onInventory,
    logistics: actions.onLogistics,
    custom: actions.onCustom,
  };
  return (
    <div
      className={cn(
        "@container rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] p-3",
        className
      )}
    >
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
        {title}
      </p>
      <div className="grid gap-2 @[36rem]:grid-cols-3">
        {ADD_LINE_OPTIONS.map(({ id, icon: Icon, label, hint }) => (
          <button
            key={id}
            type="button"
            onClick={handlers[id]}
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
