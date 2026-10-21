"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Settings2, Tag } from "lucide-react";
import {
  AdminProductCategoriesManager,
  ProductCategoryCreateForm,
} from "@/components/admin/admin-product-categories-manager";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  sortProductCategories,
  type ProductCategoryWithCount,
} from "@/data/product-categories";
import { cn } from "@/lib/utils";

export function AdminProductCategoryPicker({
  value,
  onChange,
  categories,
  onCategoriesChange,
}: {
  value: string;
  onChange: (slug: string) => void;
  categories: ProductCategoryWithCount[];
  onCategoriesChange: (next: ProductCategoryWithCount[]) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  const options = useMemo(
    () =>
      sortProductCategories(categories).filter(
        (row) => row.is_active || row.slug === value
      ),
    [categories, value]
  );
  const hasSelection = options.some((row) => row.slug === value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Category</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
          onClick={() => setManagerOpen(true)}
        >
          <Settings2 className="size-3.5" aria-hidden />
          Manage
        </Button>
      </div>

      <div
        role="radiogroup"
        aria-label="Category"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {options.map((category) => {
          const selected = category.slug === value;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(category.slug)}
              className={cn(
                "group relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-200 motion-reduce:transition-none",
                "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                selected &&
                  "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selected
                    ? "bg-primary/20 text-primary"
                    : "bg-primary/10 text-primary/80 group-hover:text-primary"
                )}
                aria-hidden
              >
                <Tag className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {category.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {category.is_active
                    ? `${category.product_count} ${category.product_count === 1 ? "item" : "items"}`
                    : "Archived"}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-background/50 text-transparent"
                )}
                aria-hidden
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </button>
          );
        })}

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-3 text-left text-sm font-medium text-primary transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Plus className="size-4" aria-hidden />
            </span>
            New category
          </button>
        ) : null}
      </div>

      {creating ? (
        <ProductCategoryCreateForm
          autoFocus
          onCancel={() => setCreating(false)}
          onCreated={(category) => {
            onCategoriesChange([...categories, category]);
            onChange(category.slug);
            setCreating(false);
          }}
        />
      ) : null}

      {!hasSelection && value ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          This item’s category no longer exists — pick one above.
        </p>
      ) : null}

      <AdminProductCategoriesManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        categories={categories}
        onCategoriesChange={onCategoriesChange}
      />
    </div>
  );
}
