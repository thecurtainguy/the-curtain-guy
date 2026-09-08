"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  Package,
  ShoppingBag,
  Truck,
  Wrench,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RentalProductConfiguratorProps = {
  product: PublicRentalProduct;
};

function ServiceOptionCard({
  selected,
  onSelect,
  title,
  description,
  priceLabel,
  icon: Icon,
  mode = "single",
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  priceLabel: string;
  icon: typeof Wrench;
  mode?: "single" | "multi";
}) {
  return (
    <button
      type="button"
      role={mode === "multi" ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60 hover:-translate-y-px active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-primary/20 text-primary"
            : "bg-primary/10 text-primary/80 group-hover:text-primary"
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
        <span className="mt-2 block text-sm font-medium text-primary">
          {priceLabel}
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
}

export function RentalProductConfigurator({
  product,
}: RentalProductConfiguratorProps) {
  const t = useTranslations("rentals.configurator");
  const { addLines } = useRentalsCart();

  const isLinear = product.configurator_mode === "linear_ft";
  const hasServiceOptions = Boolean(product.fullService && product.transportOnly);

  const [linearFeet, setLinearFeet] = useState("40");
  const [quantity, setQuantity] = useState("1");
  const [fullServiceEnabled, setFullServiceEnabled] = useState(true);
  const [transportOnlyEnabled, setTransportOnlyEnabled] = useState(false);
  const [addonQty, setAddonQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.addons.map((a) => [a.addon_product_id, "0"]))
  );

  const addonSelections = useMemo(
    () =>
      Object.entries(addonQty)
        .map(([addonProductId, qty]) => ({
          addonProductId,
          quantity: Math.max(0, Math.round(Number(qty) || 0)),
        }))
        .filter((row) => row.quantity > 0),
    [addonQty]
  );

  const previewLines = useMemo(() => {
    if (isLinear) {
      const feet = Math.max(0, Number(linearFeet) || 0);
      if (!(feet > 0)) return [];
      return buildLinearFtCartLines({
        product,
        linearFeet: feet,
        fullServiceEnabled: hasServiceOptions ? fullServiceEnabled : false,
        transportOnlyEnabled: hasServiceOptions
          ? !fullServiceEnabled && transportOnlyEnabled
          : false,
        addonSelections,
      });
    }
    const qty = Math.max(1, Math.round(Number(quantity) || 1));
    return buildSimpleCartLines({
      product,
      quantity: qty,
      fullServiceEnabled: hasServiceOptions ? fullServiceEnabled : false,
      transportOnlyEnabled: hasServiceOptions
        ? !fullServiceEnabled && transportOnlyEnabled
        : false,
      addonSelections,
    });
  }, [
    isLinear,
    product,
    linearFeet,
    quantity,
    fullServiceEnabled,
    transportOnlyEnabled,
    hasServiceOptions,
    addonSelections,
  ]);

  const estimateCents = cartSubtotalCents(previewLines);
  const segmentFeet = Number(product.formula_segment_feet) || 0;
  const segments = isLinear
    ? segmentsForLinearFeet(Math.max(0, Number(linearFeet) || 0), segmentFeet)
    : 0;

  function enableFullService() {
    if (fullServiceEnabled) {
      setFullServiceEnabled(false);
      setTransportOnlyEnabled(false);
      return;
    }
    setFullServiceEnabled(true);
    setTransportOnlyEnabled(false);
  }

  function enableTransportOnly() {
    if (transportOnlyEnabled) {
      setTransportOnlyEnabled(false);
      return;
    }
    setFullServiceEnabled(false);
    setTransportOnlyEnabled(true);
  }

  function handleAddToCart() {
    if (!previewLines.length) return;
    if (isLinear && hasServiceOptions && !fullServiceEnabled && !transportOnlyEnabled) {
      return;
    }
    addLines(previewLines);
  }

  const canAdd =
    previewLines.length > 0 &&
    (!isLinear ||
      !hasServiceOptions ||
      fullServiceEnabled ||
      transportOnlyEnabled);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
          {t("estimateEyebrow")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("disclaimer")}
        </p>
      </div>

      {isLinear ? (
        <div className="space-y-3">
          <Label htmlFor="linear-feet">{t("linearFeet")}</Label>
          <Input
            id="linear-feet"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={linearFeet}
            onChange={(e) => setLinearFeet(e.target.value)}
            className="max-w-xs"
          />
          {segmentFeet > 0 && Number(linearFeet) > 0 ? (
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
          <Input
            id="qty"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="max-w-xs"
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
              const qty =
                segments * Number(include.qty_per_segment || 0);
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

      {hasServiceOptions ? (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {t("serviceEyebrow")}
            </p>
            <h3 className="mt-1 font-heading text-lg font-semibold">
              {t("serviceTitle")}
            </h3>
          </div>

          <ServiceOptionCard
            selected={fullServiceEnabled}
            onSelect={enableFullService}
            icon={Wrench}
            title={product.fullService!.name}
            description={t("fullServiceDescription")}
            priceLabel={formatCadFromCents(
              product.fullService!.default_unit_price_cents
            )}
          />

          {!fullServiceEnabled ? (
            <div className="flex gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{t("transportWarning")}</p>
            </div>
          ) : null}

          {!fullServiceEnabled ? (
            <ServiceOptionCard
              selected={transportOnlyEnabled}
              onSelect={enableTransportOnly}
              icon={Truck}
              title={product.transportOnly!.name}
              description={t("transportDescription")}
              priceLabel={formatCadFromCents(
                product.transportOnly!.default_unit_price_cents
              )}
            />
          ) : null}
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
                <div className="w-full sm:w-24">
                  <Label
                    htmlFor={`addon-${addon.addon_product_id}`}
                    className="sr-only"
                  >
                    {t("addonQty", { name: addon.addon.name })}
                  </Label>
                  <Input
                    id={`addon-${addon.addon_product_id}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={addonQty[addon.addon_product_id] ?? "0"}
                    onChange={(e) =>
                      setAddonQty((prev) => ({
                        ...prev,
                        [addon.addon_product_id]: e.target.value,
                      }))
                    }
                  />
                </div>
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
            disabled={!canAdd}
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
