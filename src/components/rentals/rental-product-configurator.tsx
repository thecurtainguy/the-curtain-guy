"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Package, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
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

type RentalProductConfiguratorProps = {
  product: PublicRentalProduct;
};

export function RentalProductConfigurator({
  product,
}: RentalProductConfiguratorProps) {
  const t = useTranslations("rentals.configurator");
  const { addLines } = useRentalsCart();

  const isLinear = product.configurator_mode === "linear_ft";

  const [linearFeet, setLinearFeet] = useState(40);
  const [quantity, setQuantity] = useState(1);
  const [addonQty, setAddonQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(product.addons.map((a) => [a.addon_product_id, 0]))
  );

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
    if (isLinear) {
      const feet = Math.max(0, linearFeet || 0);
      if (!(feet > 0)) return [];
      return buildLinearFtCartLines({
        product,
        linearFeet: feet,
        fullServiceEnabled: false,
        transportOnlyEnabled: false,
        addonSelections,
      });
    }
    const qty = Math.max(1, Math.round(quantity || 1));
    return buildSimpleCartLines({
      product,
      quantity: qty,
      fullServiceEnabled: false,
      transportOnlyEnabled: false,
      addonSelections,
    });
  }, [isLinear, product, linearFeet, quantity, addonSelections]);

  const estimateCents = cartSubtotalCents(previewLines);
  const segmentFeet = Number(product.formula_segment_feet) || 0;
  const segments = isLinear
    ? segmentsForLinearFeet(Math.max(0, linearFeet || 0), segmentFeet)
    : 0;

  function handleAddToCart() {
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
                className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/25 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                    {addon.addon.image_url ? (
                      <Image
                        src={addon.addon.image_url}
                        alt={addon.addon.image_alt || addon.addon.name}
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
                    <p className="text-sm font-medium">{addon.addon.name}</p>
                    <p className="text-xs text-primary">
                      {formatCadFromCents(addon.addon.default_unit_price_cents)}{" "}
                      / {addon.addon.unit_label}
                    </p>
                  </div>
                </div>
                <QuantityStepper
                  id={`addon-${addon.addon_product_id}`}
                  size="sm"
                  value={addonQty[addon.addon_product_id] ?? 0}
                  min={0}
                  max={99}
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

      <div className="sticky bottom-4 z-10 space-y-3 rounded-2xl border border-border/40 bg-background/95 p-4 shadow-lg backdrop-blur-md sm:static sm:bg-card/40 sm:shadow-none sm:backdrop-blur-none">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("estimateTotal")}
            </p>
            <p className="font-heading text-2xl font-semibold text-foreground">
              {formatCadFromCents(estimateCents)}
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11"
            disabled={!previewLines.length}
            onClick={handleAddToCart}
          >
            <ShoppingBag className="size-4" />
            {t("addToCart")}
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("disclaimerShort")}
        </p>
      </div>
    </div>
  );
}
