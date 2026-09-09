import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RentalsCatalog } from "@/components/rentals/rentals-catalog";
import { RentalsHero } from "@/components/rentals/rentals-hero";
import { Reveal } from "@/components/animation/reveal";
import { RentalsCatalogSkeleton } from "@/components/layout/route-loading-fallback";
import { listPublicRentalProducts } from "@/lib/rentals";
import { createPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rentals.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/rentals",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function RentalsCatalogSection({ locale }: { locale: string }) {
  setRequestLocale(locale);
  const t = await getTranslations("rentals.page");
  const products = await listPublicRentalProducts();

  return (
    <RentalsCatalog
      products={products}
      packagesHeading={{
        eyebrow: t("packagesEyebrow"),
        title: t("packagesTitle"),
        description: t("packagesDescription"),
      }}
      itemsHeading={{
        eyebrow: t("itemsEyebrow"),
        title: t("itemsTitle"),
        description: t("itemsDescription"),
      }}
    />
  );
}

export default async function RentalsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("rentals.page");

  return (
    <>
      <RentalsHero />

      <section id="catalog" className="relative scroll-mt-24 py-14 sm:py-20">
        <div
          className="fabric-section-overlay pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up" className="mb-8 max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
              {t("catalogEyebrow")}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              {t("catalogTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("catalogDescription")}
            </p>
          </Reveal>

          <Suspense fallback={<RentalsCatalogSkeleton />}>
            <RentalsCatalogSection locale={locale} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
