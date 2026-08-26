"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  EVENT_CATALOG_BUNDLES,
  EVENT_CATALOG_CATEGORIES,
  EVENT_CATALOG_ITEMS,
  type EventCatalogCategory,
  type EventCatalogItem,
} from "@/data/event-builder/catalog";
import { DRAPE_COLORS, type DrapeColor } from "@/data/studio";

export type LocalizedCatalogItem = EventCatalogItem & {
  label: string;
  description: string;
  imageAlt: string;
};

export function useLocalizedEventCatalog() {
  const tCategories = useTranslations("eventBuilder.catalog.categories");
  const tBundles = useTranslations("eventBuilder.catalog.bundles");
  const tItems = useTranslations("eventBuilder.catalog.items");

  return useMemo(() => {
    const categories = EVENT_CATALOG_CATEGORIES.map((category) => ({
      id: category.id,
      label: tCategories(category.id),
    }));

    const bundles = EVENT_CATALOG_BUNDLES.map((bundle) => ({
      ...bundle,
      label: tBundles(bundle.id),
    }));

    function localizeItem(item: EventCatalogItem): LocalizedCatalogItem {
      return {
        ...item,
        label: tItems(`${item.id}.label`),
        description: tItems(`${item.id}.description`),
        imageAlt: tItems(`${item.id}.imageAlt`),
      };
    }

    function getItemLabel(id: string): string {
      const labelKey = `${id}.label`;
      if (tItems.has(labelKey)) return tItems(labelKey);
      return EVENT_CATALOG_ITEMS.find((item) => item.id === id)?.label ?? id;
    }

    function itemsForCategory(category: EventCatalogCategory): LocalizedCatalogItem[] {
      return EVENT_CATALOG_ITEMS
        .filter((item) => item.category === category)
        .map(localizeItem);
    }

    return {
      categories,
      bundles,
      localizeItem,
      getItemLabel,
      itemsForCategory,
    };
  }, [tCategories, tBundles, tItems]);
}

export function useLocalizedDrapeColors() {
  const t = useTranslations("eventBuilder.colors");

  return useMemo(
    () =>
      DRAPE_COLORS.map((color) => ({
        ...color,
        label: t.has(color.value) ? t(color.value) : color.label,
      })),
    [t]
  );
}
