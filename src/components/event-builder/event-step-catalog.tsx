"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DoorOpen,
  Layers,
  PanelsTopLeft,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  EVENT_CATALOG_CATEGORIES,
  countCatalogSelectionsForCategory,
  type EventCatalogCategory,
} from "@/data/event-builder/catalog";
import { CatalogCard } from "@/components/event-builder/catalog-card";
import { LivePlanSidebar } from "@/components/event-builder/live-plan-sidebar";
import {
  ActionChoiceCard,
  ChoiceCard,
} from "@/components/event-builder/choice-card";
import { Badge } from "@/components/ui/badge";
import { useLocalizedEventCatalog } from "@/lib/i18n/event-builder";

const CATEGORY_ICONS: Record<EventCatalogCategory, LucideIcon> = {
  backdrops: PanelsTopLeft,
  ceremony: DoorOpen,
  perimeter: Layers,
  addons: Star,
};

type EventStepCatalogProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
};

function toggleSelection(values: string[], id: string): string[] {
  return values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];
}

export function EventStepCatalog({ brief, onChange }: EventStepCatalogProps) {
  const t = useTranslations("eventBuilder");
  const catalog = useLocalizedEventCatalog();
  const [category, setCategory] = useState<EventCatalogCategory>("backdrops");

  const items = useMemo(
    () => catalog.itemsForCategory(category),
    [catalog, category]
  );

  function toggleCatalogId(id: string) {
    onChange({
      ...brief,
      catalogSelections: toggleSelection(brief.catalogSelections, id),
    });
  }

  function applyBundle(selections: string[]) {
    const merged = new Set([...brief.catalogSelections, ...selections]);
    onChange({ ...brief, catalogSelections: [...merged] });
  }

  function clearCatalogSelections() {
    onChange({ ...brief, catalogSelections: [] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("step2.eyebrow")}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">
            {t("step2.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("step2.description")}
          </p>
        </div>

        {catalog.bundles.length > 0 ? (
          <div className="space-y-2">
            {catalog.bundles.map((bundle) => (
              <ActionChoiceCard
                key={bundle.id}
                label={bundle.label}
                description={t("step1.bundleHint")}
                icon={Sparkles}
                onClick={() => applyBundle(bundle.selections)}
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t("step2.categoryLabel")}
          </p>
          <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            role="tablist"
            aria-label={t("step2.categoryLabel")}
          >
            {EVENT_CATALOG_CATEGORIES.map((cat) => {
              const label =
                catalog.categories.find((entry) => entry.id === cat.id)?.label ??
                cat.label;
              const Icon = CATEGORY_ICONS[cat.id];
              const isActive = category === cat.id;
              const selectionCount = countCatalogSelectionsForCategory(
                brief.catalogSelections,
                cat.id
              );
              const categoryAriaLabel =
                selectionCount > 0
                  ? `${label} (${t("step2.categorySelectedCount", { count: selectionCount })})`
                  : label;

              return (
                <ChoiceCard
                  key={cat.id}
                  label={label}
                  ariaLabel={categoryAriaLabel}
                  icon={Icon}
                  layout="stacked"
                  selected={isActive}
                  selectionCount={selectionCount}
                  onSelect={() => setCategory(cat.id)}
                />
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CatalogCard
              key={item.id}
              item={item}
              selected={brief.catalogSelections.includes(item.id)}
              onToggle={() => toggleCatalogId(item.id)}
            />
          ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <LivePlanSidebar
          brief={brief}
          onRemoveSelection={(id) => toggleCatalogId(id)}
          onClearAll={clearCatalogSelections}
        />
      </div>

      <div className="lg:hidden">
        <LivePlanSidebar
          brief={brief}
          compact
          onClearAll={clearCatalogSelections}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {brief.catalogSelections.map((id) => (
            <Badge key={id} variant="outline" className="text-xs">
              {catalog.getItemLabel(id)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
