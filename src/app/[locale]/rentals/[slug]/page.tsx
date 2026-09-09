import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { RentalProductView } from "@/components/rentals/rental-product-view";
import { loadPublicRentalProduct } from "@/lib/rentals";
import { createPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await loadPublicRentalProduct(slug);
  const t = await getTranslations({ locale, namespace: "rentals.product" });

  if (!product) {
    return createPageMetadata({
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
      path: `/rentals/${slug}`,
      locale: locale as AppLocale,
    });
  }

  return createPageMetadata({
    title: product.name,
    description:
      product.short_description ||
      product.description ||
      t("fallbackDescription", { name: product.name }),
    path: `/rentals/${product.slug}`,
    locale: locale as AppLocale,
  });
}

export default async function RentalProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await loadPublicRentalProduct(slug);
  if (!product) notFound();

  const t = await getTranslations("rentals.product");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={product.name}
        description={product.short_description || undefined}
      />
      <RentalProductView product={product} />
    </>
  );
}
