"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Package,
  Palette,
  Search,
} from "lucide-react";
import {
  ProductAvailabilityBadge,
  ProductKindBadge,
} from "@/components/products/product-status-badges";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Input } from "@/components/ui/input";
import { useNestedScrollPassthrough } from "@/hooks/use-nested-scroll-passthrough";
import {
  formatProductPriceCents,
  getProductCategoryLabel,
  type ProductKind,
  type ProductRow,
} from "@/data/products";
import {
  buildProductColorOptions,
  isProductBaseColorId,
  resolveColorUnitPriceCents,
  resolveProductDisplayImage,
  resolveProductDisplayTitle,
  resolveProductGroupName,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import { resolveProductCopy } from "@/data/product-copy-templates";
import type { ProductCategoryRow } from "@/data/product-categories";
import { cn } from "@/lib/utils";

export type InventoryPickResult = {
  productId: string;
  category: string;
  categoryLabel: string;
  description: string;
  unitLabel: string;
  unitPriceCents: number;
  isTaxable: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
};

type PickerProduct = ProductRow & { colors?: ProductColorVariantRow[] };

function colorOptionsFor(row: PickerProduct): ProductColorVariantRow[] {
  return buildProductColorOptions({ ...row, colors: row.colors ?? [] });
}

function colorStock(row: PickerProduct, color: ProductColorVariantRow): number {
  return color.has_own_pricing && typeof color.quantity_on_hand === "number"
    ? color.quantity_on_hand
    : row.quantity_on_hand;
}

function lineDescription(
  row: PickerProduct,
  color: ProductColorVariantRow | null
): string {
  const title = resolveProductDisplayTitle({
    productName: row.name,
    color,
    defaultColorName: row.default_color_name,
  });
  const fallback = title;
  const copy = resolveProductCopy({
    text: row.short_description,
    productName: row.name,
    color,
    defaultColorName: row.default_color_name,
  }).trim();
  if (!copy) return fallback;
  if (
    color &&
    !isProductBaseColorId(color.id) &&
    !copy.toLowerCase().includes(color.name.trim().toLowerCase())
  ) {
    return fallback;
  }
  return copy;
}

export function AdminInventoryPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (item: InventoryPickResult) => void;
}) {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ProductKind>("all");
  const [colorProduct, setColorProduct] = useState<PickerProduct | null>(null);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  useNestedScrollPassthrough(listRef);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [response, categoriesResponse] = await Promise.all([
          fetch("/api/admin/products?activeOnly=1&includeColors=1", {
            cache: "no-store",
          }),
          fetch("/api/admin/product-categories", { cache: "no-store" }),
        ]);
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          products?: PickerProduct[];
        };
        if (!response.ok || !payload.ok) {
          if (!cancelled) {
            setError(payload.message ?? "Could not load inventory.");
          }
          return;
        }
        const categoriesPayload = (await categoriesResponse
          .json()
          .catch(() => null)) as {
          ok?: boolean;
          categories?: ProductCategoryRow[];
        } | null;
        if (!cancelled) {
          setProducts(payload.products ?? []);
          setCategories(categoriesPayload?.categories ?? []);
        }
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
      return [
        row.name,
        row.group_name,
        row.sku,
        row.short_description,
        getProductCategoryLabel(row.category, categories),
        ...(row.colors ?? []).map((color) => color.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [products, categories, query, kindFilter]);

  const colorOptions = useMemo(
    () => (colorProduct ? colorOptionsFor(colorProduct) : []),
    [colorProduct]
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      setColorProduct(null);
      setSelectedColorIds([]);
    }
    onOpenChange(next);
  }

  function buildPick(
    row: PickerProduct,
    color: ProductColorVariantRow | null
  ): InventoryPickResult {
    const image = resolveProductDisplayImage({
      productImageUrl: row.image_url,
      productImageAlt: row.image_alt,
      color,
    });
    return {
      productId: row.id,
      category: row.category,
      categoryLabel: getProductCategoryLabel(row.category, categories),
      description: lineDescription(row, color),
      unitLabel: row.unit_label || "each",
      unitPriceCents: resolveColorUnitPriceCents({
        productPriceCents: row.default_unit_price_cents,
        color,
      }),
      isTaxable: row.is_taxable,
      imageUrl: image.imageUrl,
      imageAlt: image.imageAlt || row.name,
    };
  }

  function chooseProduct(row: PickerProduct) {
    if (colorOptionsFor(row).length > 0) {
      setColorProduct(row);
      setSelectedColorIds([]);
      return;
    }
    onPick(buildPick(row, null));
    handleOpenChange(false);
  }

  function toggleColor(id: string) {
    setSelectedColorIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  function addSelectedColors() {
    if (!colorProduct) return;
    for (const color of colorOptions) {
      if (selectedColorIds.includes(color.id)) {
        onPick(buildPick(colorProduct, color));
      }
    }
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BrandDialogContent
        icon={colorProduct ? Palette : Package}
        eyebrow="Inventory"
        title={colorProduct ? "Choose colors" : "Add from inventory"}
        description={
          colorProduct
            ? "Pick one or more colors. Each one becomes its own quote line with its photo and price."
            : "Pick a product or service. Photo and price snapshot onto the quote line."
        }
        scrollBody={false}
        bodyClassName="gap-4"
        footer={
          colorProduct ? (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  setSelectedColorIds(
                    selectedColorIds.length === colorOptions.length
                      ? []
                      : colorOptions.map((color) => color.id)
                  )
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                {selectedColorIds.length === colorOptions.length
                  ? "Clear selection"
                  : "Select all colors"}
              </button>
              <div className="flex gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={selectedColorIds.length === 0}
                  onClick={addSelectedColors}
                >
                  {selectedColorIds.length > 1
                    ? `Add ${selectedColorIds.length} lines`
                    : "Add to quote"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          )
        }
      >
        {colorProduct ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-3">
              <button
                type="button"
                onClick={() => {
                  setColorProduct(null);
                  setSelectedColorIds([]);
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/60 text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                aria-label="Back to all inventory"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-base font-semibold text-foreground">
                  {resolveProductGroupName(colorProduct, true)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getProductCategoryLabel(colorProduct.category, categories)}
                  {` · ${colorOptions.length} colors · priced / ${colorProduct.unit_label}`}
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Palette className="size-4" />
              </span>
            </div>

            <div
              ref={listRef}
              role="group"
              aria-label="Colors"
              className="grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto overscroll-y-contain pr-1 sm:grid-cols-3"
            >
              {colorOptions.map((color) => {
                const selected = selectedColorIds.includes(color.id);
                const image = resolveProductDisplayImage({
                  productImageUrl: colorProduct.image_url,
                  productImageAlt: colorProduct.image_alt,
                  color,
                });
                const price = resolveColorUnitPriceCents({
                  productPriceCents: colorProduct.default_unit_price_cents,
                  color,
                });
                return (
                  <button
                    key={color.id}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => toggleColor(color.id)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 motion-reduce:transition-none",
                      "border-border/40 bg-card/40 hover:-translate-y-px hover:border-primary/30 motion-reduce:hover:translate-y-0",
                      "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                      selected &&
                        "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full bg-muted/40">
                      {image.imageUrl ? (
                        <Image
                          src={image.imageUrl}
                          alt={image.imageAlt || color.name}
                          fill
                          className="object-cover"
                          sizes="200px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <Package className="size-6" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border transition-all duration-200",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/70 bg-black/30 text-transparent backdrop-blur-sm"
                        )}
                        aria-hidden
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-border/60"
                          style={{ backgroundColor: color.hex }}
                          aria-hidden
                        />
                        <span className="truncate text-sm font-medium text-foreground">
                          {color.name}
                        </span>
                      </div>
                      <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatProductPriceCents(price)}
                        </span>
                        <span className="tabular-nums">
                          Qty {colorStock(colorProduct, color)}
                        </span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
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
                placeholder="Search name, SKU, or color…"
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
                <p className="py-8 text-center text-sm text-destructive">
                  {error}
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No active inventory items match.
                </p>
              ) : (
                filtered.map((row) => {
                  const swatches = colorOptionsFor(row);
                  const collage = swatches
                    .map((color) => color.image_url?.trim())
                    .filter((url): url is string => Boolean(url))
                    .slice(0, 4);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => chooseProduct(row)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/40">
                        {collage.length > 1 ? (
                          <div
                            className={cn(
                              "grid size-full gap-px",
                              collage.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
                            )}
                          >
                            {collage.map((url, index) => (
                              <div
                                key={`${index}-${url}`}
                                className={cn(
                                  "relative",
                                  collage.length === 3 && index === 0 && "row-span-2"
                                )}
                              >
                                <Image
                                  src={url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="28px"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        ) : row.image_url ? (
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
                          <p className="font-medium text-foreground">
                            {resolveProductGroupName(row, swatches.length > 0)}
                          </p>
                          <ProductKindBadge kind={row.kind} />
                          {row.kind === "product" || row.kind === "package" ? (
                            <ProductAvailabilityBadge
                              status={row.availability_status}
                            />
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getProductCategoryLabel(row.category, categories)}
                          {row.sku ? ` · SKU ${row.sku}` : ""}
                          {row.kind === "product" || row.kind === "package"
                            ? ` · Qty ${row.quantity_on_hand}`
                            : ""}
                        </p>
                        {swatches.length > 0 ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            {swatches.slice(0, 8).map((color) => (
                              <span
                                key={color.id}
                                title={color.name}
                                className="size-3.5 rounded-full border border-border/60"
                                style={{ backgroundColor: color.hex }}
                              />
                            ))}
                            <span className="text-[11px] font-medium text-primary">
                              {swatches.length} colors
                            </span>
                          </div>
                        ) : row.short_description ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {lineDescription(row, null)}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {formatProductPriceCents(row.default_unit_price_cents)}
                        </p>
                        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                          / {row.unit_label}
                        </p>
                      </div>
                      {swatches.length > 0 ? (
                        <ChevronRight className="size-4 shrink-0 text-primary/70" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </BrandDialogContent>
    </Dialog>
  );
}
