"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Package, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  buildProductColorOptions,
  resolveColorUnitPriceCents,
  resolveProductDisplayImage,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import {
  formatCadFromCents,
  segmentsForLinearFeet,
  type PublicRentalProduct,
} from "@/data/rentals";
import {
  buildLinearFtCartLines,
  buildSimpleCartLines,
  cartSubtotalCents,
} from "@/lib/rentals";
import { useRentalsCart } from "@/components/rentals/rentals-cart-provider";
import { QuantityStepper } from "@/components/rentals/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RentalProductConfiguratorProps = {
  product: PublicRentalProduct;
  selectedColor: ProductColorVariantRow | null;
  onSelectedColorChange: (color: ProductColorVariantRow | null) => void;
};

export function RentalProductConfigurator({
  product,
  selectedColor,
  onSelectedColorChange,
}: RentalProductConfiguratorProps) {
  const t = useTranslations("rentals.configurator");
  const { addLines } = useRentalsCart();

  const isLinear = product.configurator_mode === "linear_ft";
  const colors = buildProductColorOptions(product);
  const requiresColor = colors.length > 0;

  const [linearFeet, setLinearFeet] = useState(40);
  const [quantity, setQuantity] = useState(1);
  const [addonQty, setAddonQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(product.addons.map((a) => [a.addon_product_id, 0]))
  );
  const [colorError, setColorError] = useState(false);

  const addonSelections = useMemo(
    () =>
      Object.entries(addonQty)
        .map(([addonProductId, qty]) => ({
          addonProductId,
          quantity: Math.max(0, Math.round(qty || 0)),
        }))
        .filter((row) => row.quantity > 0),
    [addonQty]
  );

  const previewLines = useMemo(() => {
    if (requiresColor && !selectedColor) return [];
    if (isLinear) {
      const feet = Math.max(0, linearFeet || 0);
      if (!(feet > 0)) return [];
      return buildLinearFtCartLines({
        product,
        linearFeet: feet,
        fullServiceEnabled: false,
        transportOnlyEnabled: false,
        addonSelections,
        color: selectedColor,
      });
    }
    const qty = Math.max(1, Math.round(quantity || 1));
    return buildSimpleCartLines({
      product,
      quantity: qty,
      fullServiceEnabled: false,
      transportOnlyEnabled: false,
      addonSelections,
      color: selectedColor,
    });
  }, [
    isLinear,
    product,
    linearFeet,
    quantity,
    addonSelections,
    selectedColor,
    requiresColor,
  ]);

  const estimateCents = cartSubtotalCents(previewLines);
  const segmentFeet = Number(product.formula_segment_feet) || 0;
  const segments = isLinear
    ? segmentsForLinearFeet(Math.max(0, linearFeet || 0), segmentFeet)
    : 0;

  function handleAddToCart() {
    if (requiresColor && !selectedColor) {
      setColorError(true);
      return;
    }
    if (!previewLines.length) return;
    addLines(previewLines);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
          {t("estimateEyebrow")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("disclaimer")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("logisticsNote")}
        </p>
      </div>

      {colors.length > 0 ? (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("colorEyebrow")}
            </p>
            <h3 className="mt-1 font-heading text-lg font-semibold">
              {t("colorTitle")}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colors.map((color) => {
              const selected = selectedColor?.id === color.id;
              const ownPrice = resolveColorUnitPriceCents({
                productPriceCents: product.default_unit_price_cents,
                color,
              });
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => {
                    onSelectedColorChange(color);
                    setColorError(false);
                  }}
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition-all",
                    "border-border/40 bg-card/40 hover:border-primary/35",
                    selected &&
                      "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
                  )}
                >
                  <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                    {color.image_url || product.image_url ? (
                      <Image
                        src={
                          resolveProductDisplayImage({
                            productImageUrl: product.image_url,
                            productImageAlt: product.image_alt,
                            color,
                          }).imageUrl!
                        }
                        alt={color.name}
                        fill
                        className="object-cover"
                        sizes="160px"
                        unoptimized
                      />
                    ) : (
                      <span
                        className="absolute inset-0"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden
                      />
                    )}
                    <span
                      className="absolute bottom-2 left-2 size-5 rounded-full border border-white/70 shadow"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden
                    />
                  </span>
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {color.name}
                      </span>
                      {color.display_title?.trim() ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {color.display_title.trim()}
                        </span>
                      ) : null}
                      {color.has_own_pricing ? (
                        <span className="mt-0.5 block text-[11px] text-primary">
                          {t("colorOwnPrice", {
                            price: formatCadFromCents(ownPrice),
                          })}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 text-transparent"
                      )}
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {colorError ? (
            <p className="text-xs text-destructive">{t("colorRequired")}</p>
          ) : null}
        </div>
      ) : null}

      {isLinear ? (
        <div className="space-y-3">
          <Label htmlFor="linear-feet">{t("linearFeet")}</Label>
          <QuantityStepper
            id="linear-feet"
            value={linearFeet}
            min={1}
            max={500}
            step={1}
            unit="ft"
            aria-label={t("linearFeet")}
            onChange={setLinearFeet}
          />
          {segmentFeet > 0 && linearFeet > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("segmentsHint", {
                segments,
                feet: segmentFeet,
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="qty">{t("quantity")}</Label>
          <QuantityStepper
            id="qty"
            value={quantity}
            min={1}
            max={99}
            step={1}
            aria-label={t("quantity")}
            onChange={setQuantity}
          />
        </div>
      )}

      {isLinear && product.includes.length > 0 ? (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("includesEyebrow")}
            </p>
            <h3 className="mt-1 font-heading text-lg font-semibold">
              {t("includesTitle")}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {product.includes.map((include) => {
              const qty = segments * Number(include.qty_per_segment || 0);
              return (
                <div
                  key={include.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/25 p-3"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                    {include.included.image_url ? (
                      <Image
                        src={include.included.image_url}
                        alt={
                          include.included.image_alt || include.included.name
                        }
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-4" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {include.included.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("includeQty", {
                        qty: qty > 0 ? qty : "—",
                        unit: include.included.unit_label,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {product.addons.length > 0 ? (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("addonsEyebrow")}
            </p>
            <h3 className="mt-1 font-heading text-lg font-semibold">
              {t("addonsTitle")}
            </h3>
          </div>
          <div className="space-y-3">
            {product.addons.map((addon) => (
              <div
                key={addon.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/25 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                    {addon.addon.image_url ? (
                      <Image
                        src={addon.addon.image_url}
                        alt={addon.addon.image_alt || addon.addon.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-4" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{addon.addon.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCadFromCents(addon.addon.default_unit_price_cents)}{" "}
                      / {addon.addon.unit_label}
                    </p>
                  </div>
                </div>
                <QuantityStepper
                  id={`addon-${addon.addon_product_id}`}
                  value={addonQty[addon.addon_product_id] || 0}
                  min={0}
                  max={99}
                  step={1}
                  aria-label={t("addonQty", { name: addon.addon.name })}
                  onChange={(next) =>
                    setAddonQty((prev) => ({
                      ...prev,
                      [addon.addon_product_id]: next,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/40 bg-card/30 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("estimateEyebrow")}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
              {formatCadFromCents(estimateCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("estimateTotal")}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="rounded-2xl"
            onClick={handleAddToCart}
            disabled={!previewLines.length && !(requiresColor && !selectedColor)}
          >
            <ShoppingBag className="size-4" aria-hidden />
            {t("addToCart")}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("disclaimerShort")}
        </p>
      </div>
    </div>
  );
}
