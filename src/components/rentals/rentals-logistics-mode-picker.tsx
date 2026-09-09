"use client";

import { AlertTriangle, Check, ShoppingBag, Truck, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RentalCartLine } from "@/data/rentals";
import {
  formatLogisticsEstimateLabel,
  isPackageIncludedLogisticsMode,
  RENTAL_LOGISTICS_MODES,
  type RentalDeliveryZone,
  type RentalLogisticsMode,
} from "@/data/rentals-logistics";
import { cn } from "@/lib/utils";

function LogisticsModeCard({
  selected,
  onSelect,
  title,
  description,
  priceLabel,
  icon: Icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  priceLabel: string;
  icon: typeof Wrench;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
        "border-border/40 bg-card/40 hover:border-primary/30",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl",
          selected
            ? "bg-primary/20 text-primary"
            : "bg-primary/10 text-primary/80"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
        <span className="mt-1 block text-xs font-medium text-primary">
          {priceLabel}
        </span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
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

type RentalsLogisticsModePickerProps = {
  logisticsMode: RentalLogisticsMode;
  onLogisticsModeChange: (mode: RentalLogisticsMode) => void;
  deliveryZoneId: string | null;
  deliveryZones: RentalDeliveryZone[];
  lines: RentalCartLine[];
  className?: string;
};

export function RentalsLogisticsModePicker({
  logisticsMode,
  onLogisticsModeChange,
  deliveryZoneId,
  deliveryZones,
  lines,
  className,
}: RentalsLogisticsModePickerProps) {
  const t = useTranslations("rentals.cart");
  const hasPackageLogisticsCredit = lines.some(
    (line) =>
      line.lineKind === "main" &&
      isPackageIncludedLogisticsMode(line.includedLogisticsMode)
  );

  function modePrice(mode: RentalLogisticsMode) {
    if (mode === "diy") return t("logisticsDiyPrice");
    if (!deliveryZoneId) return t("logisticsNeedZone");
    return formatLogisticsEstimateLabel({
      mode,
      zoneId: deliveryZoneId,
      zones: deliveryZones,
      lines,
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
          {t("logisticsEyebrow")}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          {t("logisticsTitle")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("logisticsHint")}
        </p>
        {hasPackageLogisticsCredit ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("logisticsSurchargeHint")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2" role="radiogroup">
        {RENTAL_LOGISTICS_MODES.map((mode) => (
          <LogisticsModeCard
            key={mode}
            selected={logisticsMode === mode}
            onSelect={() => onLogisticsModeChange(mode)}
            icon={
              mode === "full_service"
                ? Wrench
                : mode === "transport_only"
                  ? Truck
                  : ShoppingBag
            }
            title={t(`logisticsModes.${mode}.title`)}
            description={t(`logisticsModes.${mode}.description`)}
            priceLabel={modePrice(mode)}
          />
        ))}
      </div>

      {logisticsMode === "diy" ? (
        <div className="flex gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>{t("logisticsDiyWarning")}</p>
        </div>
      ) : null}
    </div>
  );
}
