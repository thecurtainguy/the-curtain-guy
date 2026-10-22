"use client";

import { useMemo, useState } from "react";
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
import { ActionChoiceCard, ChoiceCard } from "@/components/event-builder/choice-card";
import { WizardSection, WizardStepHeader } from "@/components/event-builder/wizard-ui";
import { useWizardCatalog } from "@/components/event-builder/use-wizard-catalog";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";

const CATEGORY_ICONS: Record<EventCatalogCategory, LucideIcon> = {
  backdrops: PanelsTopLeft,
  ceremony: DoorOpen,
  perimeter: Layers,
  addons: Star,
};

type EventStepCatalogProps = {
  brief: EventBuilderBrief;
  onChange: (brief: EventBuilderBrief) => void;
  headingId: string;
};

function toggleSelection(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export function EventStepCatalog({ brief, onChange, headingId }: EventStepCatalogProps) {
  const copy = useWizardCopy();
  const catalog = useWizardCatalog();
  const [category, setCategory] = useState<EventCatalogCategory>("backdrops");
  const items = useMemo(() => catalog.itemsForCategory(category), [catalog, category]);

  function applyBundle(selections: string[]) {
    const merged = new Set([...brief.catalogSelections, ...selections]);
    onChange({ ...brief, catalogSelections: [...merged] });
  }

  return (
    <div className="space-y-6">
      <WizardStepHeader
        id={headingId}
        icon={PanelsTopLeft}
        eyebrow={copy.setups.eyebrow}
        title={copy.setups.title}
        description={copy.setups.description}
      />

      <WizardSection icon={Sparkles} label={copy.setups.bundles} hint={copy.setups.bundleHint}>
        <div className="grid gap-3 sm:grid-cols-3">
          {catalog.bundles.map((bundle) => (
            <ActionChoiceCard
              key={bundle.id}
              label={bundle.label}
              description={bundle.selections.map((id) => catalog.getItemLabel(id)).join(" · ")}
              icon={Sparkles}
              onClick={() => applyBundle(bundle.selections)}
            />
          ))}
        </div>
      </WizardSection>

      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        role="tablist"
        aria-label={copy.setups.category}
      >
        {EVENT_CATALOG_CATEGORIES.map((cat) => {
          const label = catalog.categories.find((entry) => entry.id === cat.id)?.label ?? cat.label;
          const count = countCatalogSelectionsForCategory(brief.catalogSelections, cat.id);
          return (
            <ChoiceCard
              key={cat.id}
              label={label}
              ariaLabel={count > 0 ? `${label} (${copy.setups.selected(count)})` : label}
              icon={CATEGORY_ICONS[cat.id]}
              layout="stacked"
              selected={category === cat.id}
              selectionCount={count}
              onSelect={() => setCategory(cat.id)}
            />
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <CatalogCard
            key={item.id}
            item={item}
            placement={catalog.placementLabel(item)}
            selected={brief.catalogSelections.includes(item.id)}
            onToggle={() =>
              onChange({
                ...brief,
                catalogSelections: toggleSelection(brief.catalogSelections, item.id),
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
