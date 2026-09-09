import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveProductDisplayTitle } from "@/data/product-colors";
import { RentalProductView } from "@/components/rentals/rental-product-view";
import { findCatalogColorOption } from "@/lib/rentals-catalog-filter";
import { loadPublicRentalProduct } from "@/lib/rentals";
import { createPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ color?: string | string[] }>;
};

function firstSearchParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const colorParam = firstSearchParam((await searchParams).color);
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

  const selected = findCatalogColorOption(product, colorParam);
  const title = resolveProductDisplayTitle({
    productName: product.name,
    color: selected,
    defaultColorName: product.default_color_name,
  });

  return createPageMetadata({
    title,
    description:
      product.short_description ||
      product.description ||
      t("fallbackDescription", { name: title }),
    path: `/rentals/${product.slug}`,
    locale: locale as AppLocale,
  });
}

export default async function RentalProductPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const colorParam = firstSearchParam((await searchParams).color);
  const product = await loadPublicRentalProduct(slug);
  if (!product) notFound();

  return (
    <RentalProductView product={product} initialColorSlug={colorParam} />
  );
}
