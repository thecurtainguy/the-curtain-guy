"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  EVENT_CATALOG_BUNDLES,
  EVENT_CATALOG_CATEGORIES,
  getEventCatalogItem,
  getVisibleCatalogItems,
  type EventCatalogCategory,
  type EventCatalogItem,
} from "@/data/event-builder/catalog";
import type { LocalizedCatalogItem } from "@/lib/i18n/event-builder";
import { useWizardCopy } from "@/components/event-builder/wizard-copy";

/**
 * Catalog labels for the wizard and studio panels. Ids missing from the
 * shared message catalog fall back to wizard copy, then the English data.
 */
export function useWizardCatalog() {
  const copy = useWizardCopy();
  const tCategories = useTranslations("eventBuilder.catalog.categories");
  const tItems = useTranslations("eventBuilder.catalog.items");

  return useMemo(() => {
    function text(item: EventCatalogItem, field: "label" | "description"): string {
      const override = copy.setups.items[item.id];
      if (override) return field === "label" ? override[0] : override[1];
      const key = `${item.id}.${field}`;
      return tItems.has(key) ? tItems(key) : item[field];
    }

    function localizeItem(item: EventCatalogItem): LocalizedCatalogItem {
      const label = text(item, "label");
      const altKey = `${item.id}.imageAlt`;
      return {
        ...item,
        label,
        description: text(item, "description"),
        imageAlt: tItems.has(altKey) ? tItems(altKey) : label,
      };
    }

    const visible = getVisibleCatalogItems();

    return {
      categories: EVENT_CATALOG_CATEGORIES.map((category) => ({
        id: category.id,
        label: tCategories.has(category.id) ? tCategories(category.id) : category.label,
      })),
      bundles: EVENT_CATALOG_BUNDLES.map((bundle) => ({
        ...bundle,
        label: copy.setups.bundleLabels[bundle.id] ?? bundle.label,
      })),
      localizeItem,
      itemsForCategory(category: EventCatalogCategory): LocalizedCatalogItem[] {
        return visible.filter((item) => item.category === category).map(localizeItem);
      },
      getItemLabel(id: string): string {
        const item = getEventCatalogItem(id);
        return item ? text(item, "label") : id;
      },
      placementLabel(item: EventCatalogItem): string | undefined {
        if (!item.placement) return undefined;
        return copy.setups.placements[item.placement] ?? item.placement;
      },
    };
  }, [copy, tCategories, tItems]);
}
