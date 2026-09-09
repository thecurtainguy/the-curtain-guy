"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, Package, Search } from "lucide-react";
import {
  PRODUCT_KIND_LABELS,
  type ProductKind,
  type ProductRow,
} from "@/data/products";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ProductPickOption = Pick<
  ProductRow,
  | "id"
  | "name"
  | "sku"
  | "kind"
  | "category"
  | "unit_label"
  | "image_url"
  | "image_alt"
  | "short_description"
>;

type KindFilter = "all" | ProductKind;

type AdminProductPickGridProps = {
  options: ProductPickOption[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
  /** Allowed kind chips. Defaults to product + service. */
  kindFilters?: ProductKind[];
  emptyMessage?: string;
  searchPlaceholder?: string;
  /** Extra UI under a selected card (e.g. qty input). */
  renderSelectedExtra?: (option: ProductPickOption) => ReactNode;
  className?: string;
};

export function AdminProductPickGrid({
  options,
  selectedIds,
  onToggle,
  kindFilters = ["product", "service"],
  emptyMessage = "No inventory items available yet.",
  searchPlaceholder = "Search name or SKU…",
  renderSelectedExtra,
  className,
}: AdminProductPickGridProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = options.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (!q) return true;
      return [row.name, row.sku, row.short_description, row.category, row.kind]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    // Selected first, then alphabetical — easier when catalog grows.
    return [...rows].sort((a, b) => {
      const aSelected = selectedSet.has(a.id) ? 0 : 1;
      const bSelected = selectedSet.has(b.id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.name.localeCompare(b.name);
    });
  }, [options, query, kindFilter, selectedSet]);

  if (options.length === 0) {
    return (
      <p className="rounded-2xl border border-border/40 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const chips: Array<{ value: KindFilter; label: string }> = [
    { value: "all", label: "All" },
    ...kindFilters.map((kind) => ({
      value: kind as KindFilter,
      label: PRODUCT_KIND_LABELS[kind],
    })),
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label="Search inventory"
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {chips.map((chip) => {
            const selected = kindFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setKindFilter(chip.value)}
                className={cn(
                  "inline-flex h-9 items-center rounded-lg border px-2.5 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/50 bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedIds.length > 0
          ? `${selectedIds.length} selected · ${filtered.length} shown`
          : `${filtered.length} shown`}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/50 bg-background/40 px-3 py-8 text-center text-sm text-muted-foreground">
          No items match this search.
        </p>
      ) : (
        <div className="max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((option) => {
              const selected = selectedSet.has(option.id);
              return (
                <div
                  key={option.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-200",
                    "border-border/40 bg-card/40",
                    selected &&
                      "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                  )}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => onToggle(option.id)}
                    className="group flex w-full items-start gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/40">
                      {option.image_url ? (
                        <Image
                          src={option.image_url}
                          alt={option.image_alt || option.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Package className="size-5" aria-hidden />
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 flex-1 pr-1">
                      <span className="block text-sm font-medium text-foreground">
                        {option.name}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {PRODUCT_KIND_LABELS[option.kind]} · {option.unit_label}
                        {option.sku ? ` · ${option.sku}` : ""}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 bg-background/50 text-transparent"
                      )}
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </button>
                  {selected && renderSelectedExtra ? (
                    <div className="border-t border-border/30 px-3 pb-3 pt-2">
                      {renderSelectedExtra(option)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
