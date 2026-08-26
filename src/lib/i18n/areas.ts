import { getTranslations } from "next-intl/server";
import { areas, getAreaBySlug, type AreaPage } from "@/data/areas";
import type { AppLocale } from "@/i18n/routing";

export type LocalizedArea = Omit<AreaPage, "icon" | "relatedServiceSlugs"> & {
  slug: string;
  icon: AreaPage["icon"];
  relatedServiceSlugs: string[];
};

export async function getLocalizedArea(
  slug: string,
  locale: AppLocale
): Promise<LocalizedArea | undefined> {
  const base = getAreaBySlug(slug);
  if (!base) return undefined;

  const t = await getTranslations({ locale, namespace: `areas.${slug}` });

  return {
    slug: base.slug,
    icon: base.icon,
    relatedServiceSlugs: base.relatedServiceSlugs,
    name: t("name"),
    title: t("title"),
    intro: t("intro"),
    servicesAvailable: t.raw("servicesAvailable") as string[],
    eventTypes: t.raw("eventTypes") as string[],
    planningNotes: t.raw("planningNotes") as string[],
    metaTitle: t("metaTitle"),
    metaDescription: t("metaDescription"),
  };
}

export async function getLocalizedAreas(locale: AppLocale) {
  return Promise.all(
    areas.map(async (area) => {
      const localized = await getLocalizedArea(area.slug, locale);
      return localized!;
    })
  );
}
