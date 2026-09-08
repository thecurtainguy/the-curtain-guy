import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { RentalsCatalogGrid } from "@/components/rentals/rentals-catalog-grid";
import { Reveal } from "@/components/animation/reveal";
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

export default async function RentalsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("rentals.page");
  const products = await listPublicRentalProducts();

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <section className="relative py-14 sm:py-20">
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

          <RentalsCatalogGrid products={products} />
        </div>
      </section>
    </>
  );
}
