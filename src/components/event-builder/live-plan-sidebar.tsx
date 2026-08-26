"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import { useLocalizedEventCatalog } from "@/lib/i18n/event-builder";
import { getOptionLabel, useLocalizedEventTypes } from "@/lib/i18n/estimate";

type LivePlanSidebarProps = {
  brief: EventBuilderBrief;
  className?: string;
  onRemoveSelection?: (id: string) => void;
  onClearAll?: () => void;
  compact?: boolean;
};

export function LivePlanSidebar({
  brief,
  className,
  onRemoveSelection,
  onClearAll,
  compact = false,
}: LivePlanSidebarProps) {
  const t = useTranslations("eventBuilder.livePlan");
  const catalog = useLocalizedEventCatalog();
  const eventTypes = useLocalizedEventTypes();
  const count = brief.catalogSelections.length;
  const eventLabel = brief.eventType
    ? getOptionLabel(eventTypes, brief.eventType) ?? brief.eventType
    : null;

  return (
    <aside className={className} aria-label={t("summaryAria")}>
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t("title")}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-heading text-lg font-semibold">
                {t("setups", { count })}
              </p>
              {count > 0 && onClearAll ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 py-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={onClearAll}
                >
                  {t("clearAll")}
                </Button>
              ) : null}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {brief.room.widthFt}′ × {brief.room.lengthFt}′
          </Badge>
        </div>

        {count === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {brief.catalogSelections.map((id) => (
              <li key={id}>
                {onRemoveSelection ? (
                  <button
                    type="button"
                    onClick={() => onRemoveSelection(id)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/15"
                  >
                    {catalog.getItemLabel(id)}
                    <X className="size-3 text-muted-foreground" />
                  </button>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-primary/25 bg-primary/8 text-xs"
                  >
                    {catalog.getItemLabel(id)}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {!compact && eventLabel ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {t("eventPrefix")}: {eventLabel}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

export function LivePlanBottomBar({
  brief,
  onOpenReview,
}: {
  brief: EventBuilderBrief;
  onOpenReview?: () => void;
}) {
  const t = useTranslations("eventBuilder.livePlan");
  const count = brief.catalogSelections.length;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/95 p-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("yourPlan")}
          </p>
          <p className="text-sm font-medium">{t("selected", { count })}</p>
        </div>
        {onOpenReview ? (
          <Button type="button" size="sm" onClick={onOpenReview}>
            {t("review")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
