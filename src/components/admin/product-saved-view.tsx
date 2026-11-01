"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  ClipboardList,
  Images,
  Package,
  Palette,
  Receipt,
  Ruler,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useEventTypes } from "@/components/providers/event-types-provider";
import type { ColorDraft } from "@/components/admin/admin-product-colors-section";
import {
  SavedCard,
  SavedChip,
  SavedClampedText,
  SavedFact,
} from "@/components/admin/saved-view";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_KIND_LABELS,
  formatProductPriceCents,
  type ProductAvailabilityStatus,
  type ProductKind,
} from "@/data/products";
import type { ProductConfiguratorMode } from "@/data/rentals";
import { normalizeHexColor } from "@/data/product-colors";
import { resolveProductCopy } from "@/data/product-copy-templates";
import { dollarsToCents } from "@/lib/quote-tokens";
import { cn } from "@/lib/utils";

export type SavedProductRef = {
  key: string;
  name: string;
  kind: ProductKind | null;
  imageUrl: string | null;
  qtyLabel?: string;
};

export type SavedProductPhoto = {
  key: string;
  url: string;
  alt: string;
};

function isLowStock(kind: ProductKind, quantityOnHand: number, lowStockThreshold: number) {
  return kind !== "service" && quantityOnHand <= lowStockThreshold;
}

function availabilityTone(status: ProductAvailabilityStatus) {
  if (status === "available") return "gold" as const;
  if (status === "unavailable") return "muted" as const;
  return "amber" as const;
}

function Swatch({ hex, className }: { hex: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full border border-border/50 shadow-sm", className)}
      style={{ backgroundColor: normalizeHexColor(hex || "#8B909A") }}
      aria-hidden
    />
  );
}

function MiniHeading({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
      <Icon className="size-3" />
      {children}
    </p>
  );
}

function SavedProductList({ items }: { items: SavedProductRef[] }) {
  return (
    <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 px-3 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URLs, matches the gallery
              <img src={item.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <Package className="size-3.5" />
            )}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={item.name}>
            {item.name}
          </p>
          {item.kind && item.kind !== "product" ? <SavedChip>{PRODUCT_KIND_LABELS[item.kind]}</SavedChip> : null}
          {item.qtyLabel ? (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.qtyLabel}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type ProductStorefrontHeroProps = {
  name: string;
  kind: ProductKind;
  categoryLabel: string;
  unitLabel: string;
  priceCents: number;
  configuratorMode: ProductConfiguratorMode;
  shortDescription: string;
  description: string;
  photos: SavedProductPhoto[];
  defaultColorName: string;
  defaultColorHex: string;
  colors: ColorDraft[];
};

/** Admin mirror of the public Rentals product page, built from the saved form. */
export function ProductStorefrontHero(props: ProductStorefrontHeroProps) {
  const { photos, kind } = props;
  const [activeIndex, setActiveIndex] = useState(0);
  const photosKey = photos.map((photo) => photo.key).join("|");
  const [indexPhotosKey, setIndexPhotosKey] = useState(photosKey);
  if (indexPhotosKey !== photosKey) {
    setIndexPhotosKey(photosKey);
    setActiveIndex(0);
  }
  const hero = photos[Math.min(activeIndex, Math.max(photos.length - 1, 0))];

  const copy = (text: string) =>
    resolveProductCopy({
      text,
      productName: props.name,
      defaultColorName: props.defaultColorName,
    }).trim();
  const shortDescription = copy(props.shortDescription);
  const description = copy(props.description);

  const defaultColorName = props.defaultColorName.trim();
  const activeColors = props.colors.filter((color) => color.is_active && color.name.trim());
  const swatches = [
    ...(defaultColorName
      ? [{ key: "base", name: defaultColorName, hex: props.defaultColorHex, priceCents: null as number | null }]
      : []),
    ...activeColors.map((color) => ({
      key: color.clientKey,
      name: color.name.trim(),
      hex: color.hex,
      priceCents: color.has_own_pricing ? dollarsToCents(color.priceDollars) : null,
    })),
  ];

  const isLinear = kind !== "package" && props.configuratorMode === "linear_ft";
  const priceLabel =
    props.priceCents <= 0
      ? kind === "service"
        ? "Included with your booking"
        : "Price on quote"
      : isLinear
        ? `From ${formatProductPriceCents(props.priceCents)} / linear ft`
        : `From ${formatProductPriceCents(props.priceCents)} / ${props.unitLabel}`;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.1),transparent_70%)]"
        aria-hidden
      />
      <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border/40 bg-card/25">
          <div className="relative aspect-[4/3] w-full">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URLs, matches the gallery
              <img
                key={hero.key}
                src={hero.url}
                alt={hero.alt || props.name}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div
                className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground"
                style={defaultColorName ? { backgroundColor: normalizeHexColor(props.defaultColorHex) } : undefined}
              >
                <Package className="size-10" aria-hidden />
              </div>
            )}
            {defaultColorName ? (
              <span className="absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-xs backdrop-blur-sm">
                <Swatch hex={props.defaultColorHex} className="size-3" />
                <span className="truncate">{defaultColorName}</span>
              </span>
            ) : null}
          </div>

          {photos.length > 1 ? (
            <div className="border-t border-border/40 p-3 sm:p-4">
              <ul className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
                {photos.map((photo, index) => {
                  const selected = index === activeIndex;
                  return (
                    <li key={photo.key} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={`View photo ${index + 1}`}
                        aria-pressed={selected}
                        className={cn(
                          "relative size-16 overflow-hidden rounded-xl border transition-all sm:size-20",
                          selected
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border/40 opacity-80 hover:opacity-100"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs, matches the gallery */}
                        <img
                          src={photo.url}
                          alt={photo.alt || `Photo ${index + 1}`}
                          className="absolute inset-0 size-full object-cover"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="space-y-2 border-b border-border/40 pb-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="mr-1 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                Storefront preview
              </p>
              <SavedChip tone="gold">{props.categoryLabel}</SavedChip>
              <SavedChip>{PRODUCT_KIND_LABELS[kind]}</SavedChip>
            </div>
            <h2 className="font-heading text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
              {props.name || "Untitled item"}
            </h2>
            {shortDescription ? (
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{shortDescription}</p>
            ) : null}
            <p className="pt-1 text-sm font-medium text-primary">{priceLabel}</p>
          </div>

          {swatches.length > 0 ? (
            <div className="border-b border-border/40 py-5">
              <MiniHeading icon={Palette}>
                {swatches.length === 1 ? "Colour" : `Colours · ${swatches.length}`}
              </MiniHeading>
              <ul className="flex flex-wrap gap-2">
                {swatches.map((swatch) => (
                  <li
                    key={swatch.key}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-background/30 px-2.5 py-1.5"
                  >
                    <Swatch hex={swatch.hex} className="size-5" />
                    <span className="text-xs font-medium">{swatch.name}</span>
                    {swatch.priceCents !== null ? (
                      <span className="text-xs tabular-nums text-primary">
                        {formatProductPriceCents(swatch.priceCents)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {description ? (
            <div className="pt-5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Details</p>
              <SavedClampedText text={description} className="break-words text-muted-foreground" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type ProductSavedViewProps = {
  kind: ProductKind;
  sku: string;
  unitLabel: string;
  isTaxable: boolean;
  isActive: boolean;
  isPublic: boolean;
  readyForPublic: boolean;
  availabilityStatus: ProductAvailabilityStatus;
  quantityOnHand: number;
  lowStockThreshold: number;
  configuratorMode: ProductConfiguratorMode;
  formulaSegmentFeet: number | null;
  fullServiceName: string | null;
  transportOnlyName: string | null;
  /** Packages only; null means logistics are priced at cart. */
  includedLogistics: string | null;
  formulaIncludes: SavedProductRef[];
  packageComponents: SavedProductRef[];
  addons: SavedProductRef[];
  eventTypeIds: string[];
  groupName: string;
  suggestedGroupName: string;
  colors: ColorDraft[];
  /** Live gallery; it saves through its own API so it stays usable here. */
  gallery: ReactNode;
};

/** Dense owner-only facts shown under the storefront hero. */
export function ProductSavedView(props: ProductSavedViewProps) {
  const allEventTypes = useEventTypes();
  const { kind, configuratorMode, formulaIncludes, packageComponents, addons } = props;
  const isPackage = kind === "package";
  const isLinear = !isPackage && configuratorMode === "linear_ft";
  const tracksStock = kind !== "service";
  const lowStock = isLowStock(kind, props.quantityOnHand, props.lowStockThreshold);
  const eventTypes = props.eventTypeIds
    .map((id) => allEventTypes.find((type) => type.id === id))
    .filter((type) => type !== undefined);
  const namedColors = props.colors.filter((color) => color.name.trim());
  const inactiveColors = namedColors.filter((color) => !color.is_active);
  const stockedColors = namedColors.filter((color) => color.is_active && color.has_own_pricing);
  const groupName = props.groupName.trim();

  return (
    <>
      <SavedCard
        icon={ClipboardList}
        eyebrow="Admin only"
        title="Owner facts"
        aside={
          <div className="flex flex-wrap items-center gap-1.5">
            {!props.isActive ? (
              <SavedChip tone="amber">Inactive</SavedChip>
            ) : !props.isPublic ? (
              <SavedChip>Hidden from site</SavedChip>
            ) : props.readyForPublic ? (
              <SavedChip tone="gold">On the site</SavedChip>
            ) : (
              <SavedChip tone="amber">Hidden · setup incomplete</SavedChip>
            )}
            {props.isActive ? <SavedChip>In quote picker</SavedChip> : null}
          </div>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {props.sku.trim() ? (
            <SavedFact icon={Barcode} label="SKU">
              <p className="truncate font-mono text-xs" title={props.sku}>
                {props.sku}
              </p>
            </SavedFact>
          ) : null}
          <SavedFact icon={Ruler} label="Unit">
            {props.unitLabel}
          </SavedFact>
          <SavedFact icon={Receipt} label="Tax">
            {props.isTaxable ? "Taxable" : "Not taxable"}
          </SavedFact>
          {groupName || props.suggestedGroupName ? (
            <SavedFact icon={Tag} label="Group name">
              <div className="flex items-center gap-2">
                <span className="truncate" title={groupName || props.suggestedGroupName}>
                  {groupName || props.suggestedGroupName}
                </span>
                {groupName ? null : <SavedChip>Auto</SavedChip>}
              </div>
            </SavedFact>
          ) : null}
        </div>

        <div className="mt-4">
          <MiniHeading icon={Boxes}>Stock</MiniHeading>
          {tracksStock ? (
            <div className="grid gap-2.5 sm:grid-cols-3">
              <SavedFact label="On hand" className={cn(lowStock && "border-amber-500/40 bg-amber-500/[0.06]")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-xl font-semibold tabular-nums">{props.quantityOnHand}</span>
                  {lowStock ? (
                    <SavedChip tone="amber">
                      <AlertTriangle className="size-3" />
                      Low stock
                    </SavedChip>
                  ) : null}
                </div>
              </SavedFact>
              <SavedFact label="Low-stock alert at">
                <span className="font-heading text-xl font-semibold tabular-nums">{props.lowStockThreshold}</span>
              </SavedFact>
              <SavedFact label="Availability">
                <SavedChip tone={availabilityTone(props.availabilityStatus)}>
                  {PRODUCT_AVAILABILITY_LABELS[props.availabilityStatus]}
                </SavedChip>
              </SavedFact>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Services aren&apos;t stock-tracked. Availability follows active status.
            </p>
          )}
        </div>
      </SavedCard>

      <SavedCard icon={Images} eyebrow="Saves instantly" title="Photos">
        {props.gallery}
      </SavedCard>

      <SavedCard
        icon={Ruler}
        eyebrow="Rentals"
        title="Configurator"
        aside={
          <SavedChip tone="gold">
            {isPackage ? "Package · simple qty" : isLinear ? "Wall-to-wall linear ft" : "Simple qty"}
          </SavedChip>
        }
      >
        <div className="space-y-4">
          {isPackage || isLinear ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {isPackage ? (
                <SavedFact icon={Truck} label="Logistics included">
                  {props.includedLogistics ?? (
                    <span className="text-muted-foreground">None · priced at cart</span>
                  )}
                </SavedFact>
              ) : null}
              {isLinear && props.formulaSegmentFeet ? (
                <SavedFact icon={Ruler} label="Segment length">
                  {props.formulaSegmentFeet} ft
                </SavedFact>
              ) : null}
              {isLinear && props.fullServiceName ? (
                <SavedFact icon={Truck} label="Full service">
                  <p className="truncate" title={props.fullServiceName}>
                    {props.fullServiceName}
                  </p>
                </SavedFact>
              ) : null}
              {isLinear && props.transportOnlyName ? (
                <SavedFact icon={Truck} label="Transport only">
                  <p className="truncate" title={props.transportOnlyName}>
                    {props.transportOnlyName}
                  </p>
                </SavedFact>
              ) : null}
            </div>
          ) : null}

          {isPackage && packageComponents.length > 0 ? (
            <div>
              <MiniHeading icon={Package}>Package contents · {packageComponents.length}</MiniHeading>
              <SavedProductList items={packageComponents} />
            </div>
          ) : null}

          {isLinear && formulaIncludes.length > 0 ? (
            <div>
              <MiniHeading icon={Boxes}>Formula includes · {formulaIncludes.length}</MiniHeading>
              <SavedProductList items={formulaIncludes} />
            </div>
          ) : null}

          {addons.length > 0 ? (
            <div>
              <MiniHeading icon={Package}>Add-ons · {addons.length}</MiniHeading>
              <SavedProductList items={addons} />
            </div>
          ) : null}

          {!isPackage && !isLinear && addons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Quantity only, no add-ons.</p>
          ) : null}
        </div>
      </SavedCard>

      {eventTypes.length > 0 || inactiveColors.length > 0 || stockedColors.length > 0 ? (
        <SavedCard
          icon={Palette}
          eyebrow={`${namedColors.length} ${namedColors.length === 1 ? "variant" : "variants"}`}
          title="Tags & variants"
        >
          <div className="space-y-4">
            {eventTypes.length > 0 ? (
              <div>
                <MiniHeading icon={Tag}>Event types · {eventTypes.length}</MiniHeading>
                <div className="flex flex-wrap gap-1.5">
                  {eventTypes.map((type) => (
                    <SavedChip key={type.id} tone={type.active ? "gold" : "muted"}>
                      {type.label}
                      {type.active ? null : " · hidden"}
                    </SavedChip>
                  ))}
                </div>
              </div>
            ) : null}

            {stockedColors.length > 0 ? (
              <div>
                <MiniHeading icon={Boxes}>Variant stock</MiniHeading>
                <VariantRows colors={stockedColors} />
              </div>
            ) : null}

            {inactiveColors.length > 0 ? (
              <div>
                <MiniHeading icon={Palette}>Inactive colours · not shown to shoppers</MiniHeading>
                <VariantRows colors={inactiveColors} />
              </div>
            ) : null}
          </div>
        </SavedCard>
      ) : null}
    </>
  );
}

function VariantRows({ colors }: { colors: ColorDraft[] }) {
  return (
    <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
      {colors.map((color) => (
        <li
          key={color.clientKey}
          className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2", !color.is_active && "opacity-75")}
        >
          <Swatch hex={color.hex} className="size-6" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {color.name.trim()}
              <span className="ml-2 font-mono text-[11px] font-normal uppercase text-muted-foreground">
                {color.hex}
              </span>
            </p>
            {color.display_title.trim() ? (
              <p className="truncate text-xs text-muted-foreground" title={color.display_title}>
                {color.display_title}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {color.has_own_pricing ? (
              <>
                <SavedChip tone="gold">{formatProductPriceCents(dollarsToCents(color.priceDollars))}</SavedChip>
                <SavedChip>{Number.parseInt(color.quantity_on_hand, 10) || 0} on hand</SavedChip>
                <SavedChip tone={availabilityTone(color.availability_status)}>
                  {PRODUCT_AVAILABILITY_LABELS[color.availability_status]}
                </SavedChip>
              </>
            ) : (
              <SavedChip>Inherits price</SavedChip>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
