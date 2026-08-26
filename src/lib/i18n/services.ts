import { getTranslations } from "next-intl/server";
import { getServiceBySlug, services, type ServicePage } from "@/data/services";
import type { AppLocale } from "@/i18n/routing";

export type LocalizedService = Omit<
  ServicePage,
  "keywords" | "icon" | "relatedSlugs" | "image" | "imageAlt"
> & {
  slug: string;
  icon: ServicePage["icon"];
  relatedSlugs: string[];
  image?: string;
  imageAlt?: string;
};

export async function getLocalizedService(
  slug: string,
  locale: AppLocale
): Promise<LocalizedService | undefined> {
  const base = getServiceBySlug(slug);
  if (!base) return undefined;

  const t = await getTranslations({ locale, namespace: `services.${slug}` });

  return {
    slug: base.slug,
    icon: base.icon,
    relatedSlugs: base.relatedSlugs,
    image: base.image,
    imageAlt: base.imageAlt,
    title: t("title"),
    shortTitle: t("shortTitle"),
    hubCardDescription: t("hubCardDescription"),
    intro: t("intro"),
    whatItIs: t("whatItIs"),
    bestUseCases: t.raw("bestUseCases") as string[],
    planningFactors: t.raw("planningFactors") as string[],
    whatWeHandle: t.raw("whatWeHandle") as string[],
    faq: t.raw("faq") as ServicePage["faq"],
    metaTitle: t("metaTitle"),
    metaDescription: t("metaDescription"),
  };
}

export async function getLocalizedServices(locale: AppLocale) {
  return Promise.all(
    services.map(async (service) => {
      const localized = await getLocalizedService(service.slug, locale);
      return localized!;
    })
  );
}

export async function getLocalizedRelatedServices(
  slug: string,
  locale: AppLocale
) {
  const base = getServiceBySlug(slug);
  if (!base) return [];
  const related = await Promise.all(
    base.relatedSlugs.map((relatedSlug) =>
      getLocalizedService(relatedSlug, locale)
    )
  );
  return related.filter((s): s is LocalizedService => Boolean(s));
}
