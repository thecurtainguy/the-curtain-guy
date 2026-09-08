import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Package } from "lucide-react";
import { formatCadFromCents } from "@/data/rentals";
import { PageHero } from "@/components/page-hero";
import { RentalProductConfigurator } from "@/components/rentals/rental-product-configurator";
import { Reveal } from "@/components/animation/reveal";
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
  const priceLabel =
    product.configurator_mode === "linear_ft"
      ? t("fromPerFt", {
          price: formatCadFromCents(product.default_unit_price_cents),
        })
      : t("fromEach", {
          price: formatCadFromCents(product.default_unit_price_cents),
          unit: product.unit_label,
        });

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={product.name}
        description={product.short_description || undefined}
      >
        <p className="mt-4 text-sm font-medium text-primary sm:text-base">
          {priceLabel}
        </p>
      </PageHero>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 lg:gap-14">
          <Reveal variant="slide-left">
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
              <div className="relative aspect-[4/3]">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.image_alt || product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground">
                    <Package className="size-10" aria-hidden />
                  </div>
                )}
              </div>
              {product.description ? (
                <div className="border-t border-border/40 p-5 sm:p-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                    {t("detailsEyebrow")}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              ) : null}
            </div>
          </Reveal>

          <Reveal variant="slide-right">
            <RentalProductConfigurator product={product} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
