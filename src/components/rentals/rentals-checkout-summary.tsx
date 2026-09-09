"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Package, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  formatCadFromCents,
  groupRentalCartLines,
  type RentalCartLine,
} from "@/data/rentals";
import {
  DEFAULT_GST_RATE,
  DEFAULT_QST_RATE,
  computeQuoteTaxTotals,
} from "@/data/quotes";
import { useRentalsCart } from "@/components/rentals/rentals-cart-provider";
import { QuantityStepper } from "@/components/rentals/quantity-stepper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function lineTotalCents(line: RentalCartLine): number {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function computeRentalsCartTax(lines: RentalCartLine[]) {
  return computeQuoteTaxTotals(
    lines.map((line) => ({
      status: "priced" as const,
      line_total_cents: lineTotalCents(line),
      is_taxable: line.isTaxable && line.unitPriceCents > 0,
    })),
    { tax_mode: "quebec_gst_qst" }
  );
}

type RentalsCheckoutSummaryProps = {
  lines: RentalCartLine[];
  logisticsLine: RentalCartLine | null;
  logisticsMode: string;
  itemCount: number;
  className?: string;
};

export function RentalsCheckoutSummary({
  lines,
  logisticsLine,
  logisticsMode,
  itemCount,
  className,
}: RentalsCheckoutSummaryProps) {
  const t = useTranslations("rentals.checkout");
  const { removeByParentKey, setMainQuantity } = useRentalsCart();
  const groups = useMemo(() => groupRentalCartLines(lines), [lines]);
  const allPricedLines = useMemo(() => {
    const base = [...lines];
    if (logisticsLine) base.push(logisticsLine);
    return base;
  }, [lines, logisticsLine]);

  const tax = useMemo(
    () => computeRentalsCartTax(allPricedLines),
    [allPricedLines]
  );

  const gstLabel = `GST ${(DEFAULT_GST_RATE * 100).toFixed(0)}%`;
  const qstLabel = `QST ${Number((DEFAULT_QST_RATE * 100).toFixed(3))}%`;

  return (
    <aside className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/30">
        <div className="border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/40 to-transparent px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            {t("summaryEyebrow")}
          </p>
          <h3 className="mt-1 font-heading text-lg font-semibold">
            {t("summaryTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("summaryItems", { count: itemCount })}
          </p>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/50 px-3 py-8 text-center text-sm text-muted-foreground">
              {t("emptyCart")}
            </p>
          ) : (
            <ul className="space-y-3">
              {groups.map(({ main, children }) => {
                const canAdjustQty = main.linearFeet == null;
                return (
                  <li
                    key={main.key}
                    className="overflow-hidden rounded-2xl border border-border/40 bg-background/35"
                  >
                    <div className="space-y-2.5 p-3">
                      <div className="flex gap-3">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30 sm:size-20">
                          {main.imageUrl ? (
                            <Image
                              src={main.imageUrl}
                              alt={main.imageAlt || main.name}
                              fill
                              className="object-cover"
                              sizes="80px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                              <Package className="size-5" aria-hidden />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 font-heading text-sm font-semibold leading-snug">
                              {main.name}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeByParentKey(main.key)}
                              aria-label={t("summaryRemove")}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          {main.colorName ? (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="size-3 rounded-full border border-border/50"
                                style={{
                                  backgroundColor: main.colorHex || "#8B909A",
                                }}
                                aria-hidden
                              />
                              {main.colorName}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {canAdjustQty
                              ? `${formatCadFromCents(main.unitPriceCents)} / ${main.unitLabel}`
                              : t("summaryQtyPrice", {
                                  qty: main.quantity,
                                  unit: main.unitLabel,
                                  price: formatCadFromCents(
                                    main.unitPriceCents
                                  ),
                                })}
                          </p>
                          <p className="mt-1 text-sm font-medium text-primary">
                            {formatCadFromCents(lineTotalCents(main))}
                          </p>
                        </div>
                      </div>
                      {canAdjustQty ? (
                        <QuantityStepper
                          size="xs"
                          value={main.quantity}
                          min={1}
                          onChange={(next) => setMainQuantity(main.key, next)}
                          aria-label={t("summaryQty")}
                          className="w-fit"
                        />
                      ) : null}
                    </div>

                    {children.length > 0 ? (
                      <ul className="space-y-2 border-t border-border/30 bg-background/25 px-3 py-2.5">
                        {children.map((child) => (
                          <li
                            key={child.key}
                            className="flex items-center gap-2 text-xs"
                          >
                            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border/30 bg-muted/20">
                              {child.imageUrl ? (
                                <Image
                                  src={child.imageUrl}
                                  alt={child.imageAlt || child.name}
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-muted-foreground">
                                  <Package className="size-3" aria-hidden />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-foreground/90">
                                {child.name}
                              </p>
                              <p className="text-muted-foreground">
                                {child.unitPriceCents > 0
                                  ? t("summaryQtyPrice", {
                                      qty: child.quantity,
                                      unit: child.unitLabel,
                                      price: formatCadFromCents(
                                        child.unitPriceCents
                                      ),
                                    })
                                  : t("summaryIncluded")}
                              </p>
                            </div>
                            {child.unitPriceCents > 0 ? (
                              <span className="shrink-0 font-medium text-foreground/85">
                                {formatCadFromCents(lineTotalCents(child))}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {logisticsLine ? (
            <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/35 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Truck className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {logisticsLine.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {logisticsLine.description}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-primary">
                {logisticsLine.unitPriceCents > 0
                  ? formatCadFromCents(logisticsLine.unitPriceCents)
                  : t("zoneQuoteOnly")}
              </p>
            </div>
          ) : logisticsMode !== "diy" ? (
            <p className="rounded-2xl border border-dashed border-border/40 px-3 py-2.5 text-xs text-muted-foreground">
              {t("summaryLogisticsPending")}
            </p>
          ) : (
            <p className="rounded-2xl border border-border/30 bg-background/25 px-3 py-2.5 text-xs text-muted-foreground">
              {t("summaryLogisticsDiy")}
            </p>
          )}

          <div className="space-y-2 border-t border-border/40 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("summarySubtotal")}</span>
              <span className="font-medium text-foreground">
                {formatCadFromCents(tax.subtotal_cents)}
              </span>
            </div>
            {tax.taxable_subtotal_cents > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{gstLabel}</span>
                  <span className="text-foreground">
                    {formatCadFromCents(tax.gst_cents)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{qstLabel}</span>
                  <span className="text-foreground">
                    {formatCadFromCents(tax.qst_cents)}
                  </span>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <span className="font-heading text-base font-semibold">
                {t("summaryEstimatedTotal")}
              </span>
              <span className="font-heading text-xl font-semibold text-primary">
                {formatCadFromCents(tax.total_cents)}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("summaryTaxNote")}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </aside>
  );
}
