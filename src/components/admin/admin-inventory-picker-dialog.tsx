"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Package, Search } from "lucide-react";
import {
  ProductAvailabilityBadge,
  ProductKindBadge,
} from "@/components/products/product-status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNestedScrollPassthrough } from "@/hooks/use-nested-scroll-passthrough";
import {
  formatProductPriceCents,
  getProductCategoryLabel,
  type ProductKind,
  type ProductRow,
} from "@/data/products";
import { cn } from "@/lib/utils";

export type InventoryPickResult = {
  productId: string;
  category: string;
  description: string;
  unitPriceCents: number;
  isTaxable: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
};

export function AdminInventoryPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (item: InventoryPickResult) => void;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ProductKind>("all");
  const listRef = useRef<HTMLDivElement>(null);
  useNestedScrollPassthrough(listRef);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/products?activeOnly=1", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          products?: ProductRow[];
        };
        if (!response.ok || !payload.ok) {
          if (!cancelled) {
            setError(payload.message ?? "Could not load inventory.");
          }
          return;
        }
        if (!cancelled) setProducts(payload.products ?? []);
      } catch {
        if (!cancelled) setError("Could not load inventory.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (!q) return true;
      return [row.name, row.sku, row.short_description, row.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [products, query, kindFilter]);

  function pick(row: ProductRow) {
    onPick({
      productId: row.id,
      category: row.category,
      description:
        row.short_description?.trim() ||
        row.name + (row.unit_label ? ` (${row.unit_label})` : ""),
      unitPriceCents: row.default_unit_price_cents,
      isTaxable: row.is_taxable,
      imageUrl: row.image_url,
      imageAlt: row.image_alt || row.name,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add from inventory</DialogTitle>
          <DialogDescription>
            Pick a product or service. Photo and price snapshot onto the quote
            line.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "product", "service"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKindFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                kindFilter === value
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/25"
              )}
            >
              {value === "all"
                ? "All"
                : value === "product"
                  ? "Products"
                  : "Services"}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or SKU…"
            className="pl-9"
          />
        </div>

        <div
          ref={listRef}
          className="max-h-[50vh] space-y-2 overflow-y-auto overscroll-y-contain pr-1"
        >
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading inventory…
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active inventory items match.
            </p>
          ) : (
            filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => pick(row)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/40">
                  {row.image_url ? (
                    <Image
                      src={row.image_url}
                      alt={row.image_alt || row.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Package className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <ProductKindBadge kind={row.kind} />
                    {row.kind === "product" || row.kind === "package" ? (
                      <ProductAvailabilityBadge
                        status={row.availability_status}
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getProductCategoryLabel(row.category)}
                    {row.sku ? ` · SKU ${row.sku}` : ""}
                    {row.kind === "product" || row.kind === "package"
                      ? ` · Qty ${row.quantity_on_hand}`
                      : ""}
                  </p>
                  {row.short_description ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {row.short_description}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatProductPriceCents(row.default_unit_price_cents)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    / {row.unit_label}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
