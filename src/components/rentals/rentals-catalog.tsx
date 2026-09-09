"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  Filter,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCadFromCents, type PublicRentalProduct } from "@/data/rentals";
import {
  PRODUCT_EVENT_TYPE_LABELS,
  type ProductEventTypeId,
} from "@/data/product-colors";
import { resolveProductCopy } from "@/data/product-copy-templates";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_AVAILABILITY_STATUSES,
  type ProductAvailabilityStatus,
} from "@/data/products";
import { QUOTE_CATEGORY_LABELS } from "@/data/quotes";
import { Link } from "@/i18n/navigation";
import {
  DEFAULT_RENTALS_FILTERS,
  activeFilterCount,
  collectCatalogFacets,
  filterAndSortRentalsCatalog,
  type RentalsCatalogEntry,
  type RentalsCatalogFilters,
  type RentalsSortId,
} from "@/lib/rentals-catalog-filter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectInput } from "@/components/ui/select-input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type CatalogSectionHeading = {
  eyebrow: string;
  title: string;
  description: string;
};

type RentalsCatalogProps = {
  products: PublicRentalProduct[];
  packagesHeading: CatalogSectionHeading;
  itemsHeading: CatalogSectionHeading;
};

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function FilterOptionButton({
  selected,
  onSelect,
  children,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/30 text-muted-foreground hover:border-primary/30 hover:bg-card/50",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]",
        className
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
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
}

function FilterPanel({
  filters,
  setFilters,
  facets,
  resultCount,
}: {
  filters: RentalsCatalogFilters;
  setFilters: (next: RentalsCatalogFilters) => void;
  facets: ReturnType<typeof collectCatalogFacets>;
  resultCount: number;
}) {
  const t = useTranslations("rentals.filters");

  function patch(partial: Partial<RentalsCatalogFilters>) {
    setFilters({ ...filters, ...partial });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="rentals-search">{t("search")}</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="rentals-search"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rentals-sort">{t("sort")}</Label>
        <SelectInput
          id="rentals-sort"
          size="md"
          value={filters.sort}
          onChange={(next) => patch({ sort: next as RentalsSortId })}
          searchable={false}
          options={[
            { value: "featured", label: t("sortFeatured") },
            { value: "price-asc", label: t("sortPriceAsc") },
            { value: "price-desc", label: t("sortPriceDesc") },
            { value: "name-asc", label: t("sortName") },
            { value: "newest", label: t("sortNewest") },
          ]}
        />
      </div>

      {facets.categories.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("category")}</p>
          <div className="grid gap-2">
            {facets.categories.map((category) => {
              const selected = filters.categories.includes(category);
              return (
                <FilterOptionButton
                  key={category}
                  selected={selected}
                  onSelect={() =>
                    patch({
                      categories: toggleValue(filters.categories, category),
                    })
                  }
                >
                  {QUOTE_CATEGORY_LABELS[category]}
                </FilterOptionButton>
              );
            })}
          </div>
        </div>
      ) : null}

      {facets.colors.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("color")}</p>
          <div className="grid grid-cols-2 gap-2">
            {facets.colors.map((color) => {
              const key = color.name.toLowerCase();
              const selected = filters.colors.includes(key);
              return (
                <FilterOptionButton
                  key={key}
                  selected={selected}
                  onSelect={() =>
                    patch({ colors: toggleValue(filters.colors, key) })
                  }
                  className="px-2.5 py-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-4 shrink-0 rounded-full border border-border/50"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden
                    />
                    <span className="truncate">{color.name}</span>
                  </span>
                </FilterOptionButton>
              );
            })}
          </div>
        </div>
      ) : null}

      {facets.eventTypes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("eventType")}</p>
          <div className="grid gap-2">
            {facets.eventTypes.map((id) => {
              const selected = filters.eventTypes.includes(id);
              return (
                <FilterOptionButton
                  key={id}
                  selected={selected}
                  onSelect={() =>
                    patch({
                      eventTypes: toggleValue(filters.eventTypes, id),
                    })
                  }
                >
                  {PRODUCT_EVENT_TYPE_LABELS[id as ProductEventTypeId]}
                </FilterOptionButton>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("availability")}</p>
        <div className="grid gap-2">
          {PRODUCT_AVAILABILITY_STATUSES.map((status) => {
            const selected = filters.availability.includes(status);
            return (
              <FilterOptionButton
                key={status}
                selected={selected}
                onSelect={() =>
                  patch({
                    availability: toggleValue(
                      filters.availability,
                      status
                    ) as ProductAvailabilityStatus[],
                  })
                }
              >
                {PRODUCT_AVAILABILITY_LABELS[status]}
              </FilterOptionButton>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("price")}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="price-min" className="text-xs text-muted-foreground">
              {t("priceMin")}
            </Label>
            <Input
              id="price-min"
              inputMode="decimal"
              placeholder={formatCadFromCents(facets.priceMinCents).replace(
                /[^0-9.]/g,
                ""
              )}
              value={
                filters.priceMinCents == null
                  ? ""
                  : String(filters.priceMinCents / 100)
              }
              onChange={(e) => {
                const raw = e.target.value.trim();
                patch({
                  priceMinCents: raw
                    ? Math.max(0, Math.round(Number(raw) * 100) || 0)
                    : null,
                });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="price-max" className="text-xs text-muted-foreground">
              {t("priceMax")}
            </Label>
            <Input
              id="price-max"
              inputMode="decimal"
              placeholder={formatCadFromCents(facets.priceMaxCents).replace(
                /[^0-9.]/g,
                ""
              )}
              value={
                filters.priceMaxCents == null
                  ? ""
                  : String(filters.priceMaxCents / 100)
              }
              onChange={(e) => {
                const raw = e.target.value.trim();
                patch({
                  priceMaxCents: raw
                    ? Math.max(0, Math.round(Number(raw) * 100) || 0)
                    : null,
                });
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
        <p className="text-xs text-muted-foreground">
          {t("results", { count: resultCount })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setFilters(DEFAULT_RENTALS_FILTERS)}
        >
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}

export function RentalsCatalog({
  products,
  packagesHeading,
  itemsHeading,
}: RentalsCatalogProps) {
  const t = useTranslations("rentals.catalog");
  const tf = useTranslations("rentals.filters");
  const [filters, setFilters] = useState<RentalsCatalogFilters>(
    DEFAULT_RENTALS_FILTERS
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const facets = useMemo(() => collectCatalogFacets(products), [products]);
  const filtered = useMemo(
    () => filterAndSortRentalsCatalog(products, filters),
    [products, filters]
  );
  const packageProducts = useMemo(
    () => filtered.filter((row) => row.product.kind === "package"),
    [filtered]
  );
  const itemProducts = useMemo(
    () => filtered.filter((row) => row.product.kind !== "package"),
    [filtered]
  );
  const activeCount = activeFilterCount(filters);

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-card/25 px-6 py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Package className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
          {t("emptyTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </div>
    );
  }

  function renderCard(entry: RentalsCatalogEntry) {
    const { product } = entry;
    const priceLabel =
      product.configurator_mode === "linear_ft"
        ? t("fromPerFt", {
            price: formatCadFromCents(entry.unitPriceCents),
          })
        : t("fromEach", {
            price: formatCadFromCents(entry.unitPriceCents),
            unit: product.unit_label,
          });

    return (
      <Link
        key={entry.key}
        href={entry.href}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/25 text-left transition-colors hover:border-primary/35 hover:bg-card/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {entry.imageUrl ? (
            <Image
              src={entry.imageUrl}
              alt={entry.imageAlt || entry.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div
              className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground"
              style={
                entry.colorHex
                  ? { backgroundColor: entry.colorHex }
                  : undefined
              }
            >
              <Package className="size-8" aria-hidden />
            </div>
          )}
          {product.kind === "package" ? (
            <span className="absolute left-3 top-3 rounded-full border border-primary/30 bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary backdrop-blur-sm">
              {t("packageBadge")}
            </span>
          ) : null}
          <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/85 text-primary opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
          {entry.colorHex ? (
            <span
              className="absolute bottom-3 left-3 size-4 rounded-full border border-background/80 shadow-sm"
              style={{ backgroundColor: entry.colorHex }}
              title={entry.colorName || undefined}
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="font-heading text-base font-semibold leading-snug text-foreground">
            {entry.title}
          </p>
          {product.short_description ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {resolveProductCopy({
                text: product.short_description,
                productName: product.name,
                color: entry.color,
                defaultColorName: product.default_color_name,
              })}
            </p>
          ) : null}
          <p className="mt-auto pt-2 text-sm font-medium text-primary">
            {priceLabel}
          </p>
        </div>
      </Link>
    );
  }

  function renderSection(
    id: string,
    heading: CatalogSectionHeading,
    rows: RentalsCatalogEntry[],
    emptyMessage: string
  ) {
    return (
      <div id={id} className="scroll-mt-28 space-y-4">
        <div className="max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
            {heading.eyebrow}
          </p>
          <h3 className="mt-1 font-heading text-xl font-semibold text-foreground sm:text-2xl">
            {heading.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {heading.description}
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/50 bg-card/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((entry) => renderCard(entry))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-3xl border border-border/40 bg-card/25 p-5">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <SlidersHorizontal className="size-4" aria-hidden />
            </span>
            <h3 className="font-heading text-base font-semibold">
              {tf("title")}
            </h3>
          </div>
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            facets={facets}
            resultCount={filtered.length}
          />
        </div>
      </aside>

      <div className="space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
          <p className="text-sm text-muted-foreground">
            {tf("results", { count: filtered.length })}
          </p>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="rounded-2xl">
                <Filter className="size-4" aria-hidden />
                {tf("title")}
                {activeCount > 0 ? (
                  <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs text-primary">
                    {activeCount}
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,22rem)] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{tf("title")}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 px-1 pb-8">
                <FilterPanel
                  filters={filters}
                  setFilters={(next) => {
                    setFilters(next);
                  }}
                  facets={facets}
                  resultCount={filtered.length}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {activeCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{tf("active")}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-2 text-xs"
              onClick={() => setFilters(DEFAULT_RENTALS_FILTERS)}
            >
              <X className="size-3.5" aria-hidden />
              {tf("clear")}
            </Button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/25 px-6 py-14 text-center">
            <p className="font-heading text-lg font-semibold">
              {tf("noResultsTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {tf("noResultsDescription")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-2xl"
              onClick={() => setFilters(DEFAULT_RENTALS_FILTERS)}
            >
              {tf("clear")}
            </Button>
          </div>
        ) : (
          <>
            {renderSection(
              "packages",
              packagesHeading,
              packageProducts,
              t("sectionEmptyPackages")
            )}
            {renderSection(
              "items",
              itemsHeading,
              itemProducts,
              t("sectionEmptyItems")
            )}
          </>
        )}
      </div>
    </div>
  );
}
