"use client";

import Image from "next/image";
import { AlertTriangle, Check, ShoppingBag, Trash2, Truck, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCadFromCents, type RentalCartLine } from "@/data/rentals";
import {
  formatLogisticsEstimateLabel,
  RENTAL_LOGISTICS_MODES,
  type RentalLogisticsMode,
} from "@/data/rentals-logistics";
import { Link } from "@/i18n/navigation";
import { useRentalsCart } from "@/components/rentals/rentals-cart-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function groupLines(lines: RentalCartLine[]) {
  const mains = lines.filter((line) => line.lineKind === "main");
  return mains.map((main) => ({
    main,
    children: lines.filter((line) => line.parentKey === main.key),
  }));
}

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
          selected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
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

export function RentalsCartSheet() {
  const t = useTranslations("rentals.cart");
  const {
    lines,
    sheetOpen,
    setSheetOpen,
    removeByParentKey,
    merchandiseSubtotalCents,
    subtotalCents,
    logisticsMode,
    setLogisticsMode,
    deliveryZoneId,
    logisticsLine,
  } = useRentalsCart();
  const groups = groupLines(lines);

  function modePrice(mode: RentalLogisticsMode) {
    if (mode === "diy") return t("logisticsDiyPrice");
    if (!deliveryZoneId) return t("logisticsNeedZone");
    return formatLogisticsEstimateLabel({ mode, zoneId: deliveryZoneId });
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border/40 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 px-5 py-5 text-left">
          <SheetTitle className="font-heading text-xl">{t("title")}</SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            {t("disclaimer")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-card/25 px-4 py-10 text-center">
              <ShoppingBag
                className="mx-auto size-8 text-primary/70"
                aria-hidden
              />
              <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
              <Button
                asChild
                variant="outline"
                className="mt-4 min-h-10"
                onClick={() => setSheetOpen(false)}
              >
                <Link href="/rentals">{t("browse")}</Link>
              </Button>
            </div>
          ) : (
            <>
              {groups.map(({ main, children }) => (
                <article
                  key={main.key}
                  className="overflow-hidden rounded-2xl border border-border/40 bg-card/30"
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
                      {main.imageUrl ? (
                        <Image
                          src={main.imageUrl}
                          alt={main.imageAlt || main.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-semibold leading-snug">
                        {main.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {main.description}
                      </p>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {formatCadFromCents(
                          Math.round(main.quantity * main.unitPriceCents)
                        )}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          · {main.quantity} {main.unitLabel}
                        </span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeByParentKey(main.key)}
                      aria-label={t("remove")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {children.length > 0 ? (
                    <ul className="space-y-2 border-t border-border/30 bg-background/30 px-3 py-2.5">
                      {children.map((child) => (
                        <li
                          key={child.key}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-border/30 bg-muted/20">
                            {child.imageUrl ? (
                              <Image
                                src={child.imageUrl}
                                alt={child.imageAlt || child.name}
                                fill
                                className="object-cover"
                                sizes="32px"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <span className="min-w-0 flex-1 truncate">
                            {child.name}
                            <span className="text-muted-foreground/80">
                              {" "}
                              × {child.quantity}
                            </span>
                          </span>
                          {child.unitPriceCents > 0 ? (
                            <span className="shrink-0 text-foreground/80">
                              {formatCadFromCents(
                                Math.round(
                                  child.quantity * child.unitPriceCents
                                )
                              )}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/80">
                              {t("included")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}

              <div className="space-y-3 rounded-2xl border border-border/40 bg-card/25 p-3">
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
                </div>

                <div className="space-y-2" role="radiogroup">
                  {RENTAL_LOGISTICS_MODES.map((mode) => (
                    <LogisticsModeCard
                      key={mode}
                      selected={logisticsMode === mode}
                      onSelect={() => setLogisticsMode(mode)}
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

                {logisticsMode !== "diy" && !deliveryZoneId ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t("logisticsZoneCheckout")}
                  </p>
                ) : null}

                {logisticsMode === "diy" ? (
                  <div className="flex gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-950 dark:text-amber-100">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <p>{t("logisticsDiyWarning")}</p>
                  </div>
                ) : null}

                {logisticsLine ? (
                  <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-2 text-xs">
                    <span className="text-muted-foreground">
                      {logisticsLine.name}
                    </span>
                    <span className="font-medium text-foreground">
                      {logisticsLine.unitPriceCents > 0
                        ? formatCadFromCents(logisticsLine.unitPriceCents)
                        : t("logisticsQuoteOnly")}
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <SheetFooter className="border-t border-border/40 bg-card/40 px-5 py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("estimateSubtotal")}
              </p>
              <p className="font-heading text-lg font-semibold text-foreground">
                {formatCadFromCents(
                  deliveryZoneId || logisticsMode === "diy"
                    ? subtotalCents
                    : merchandiseSubtotalCents
                )}
              </p>
            </div>
            {groups.length === 0 ? (
              <Button className="min-h-11" disabled>
                {t("checkout")}
              </Button>
            ) : (
              <Button asChild className="min-h-11">
                <Link
                  href="/rentals/checkout"
                  onClick={() => setSheetOpen(false)}
                >
                  {t("checkout")}
                </Link>
              </Button>
            )}
          </div>
          <p className="w-full text-[11px] leading-relaxed text-muted-foreground">
            {t("footerNote")}
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function RentalsCartFab() {
  const t = useTranslations("rentals.cart");
  const { openSheet, itemCount, hydrated } = useRentalsCart();

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={openSheet}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40 flex min-h-12 items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_40px_oklch(0.62_0.14_80/0.35)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t("openAria")}
    >
      <ShoppingBag className="size-4" aria-hidden />
      <span>{t("fabLabel")}</span>
      {itemCount > 0 ? (
        <span className="flex size-6 items-center justify-center rounded-full bg-background/20 text-xs font-semibold">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
