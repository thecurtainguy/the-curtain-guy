"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  buildProductColorOptions,
  resolveColorUnitPriceCents,
  resolveProductDisplayImage,
  resolveProductDisplayTitle,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import { formatCadFromCents, type PublicRentalProduct } from "@/data/rentals";
import { PageHero } from "@/components/page-hero";
import { RentalProductConfigurator } from "@/components/rentals/rental-product-configurator";
import { Reveal } from "@/components/animation/reveal";

type RentalProductViewProps = {
  product: PublicRentalProduct;
};

export function RentalProductView({ product }: RentalProductViewProps) {
  const t = useTranslations("rentals.product");
  const colors = useMemo(() => buildProductColorOptions(product), [product]);
  const [selectedColor, setSelectedColor] =
    useState<ProductColorVariantRow | null>(colors[0] ?? null);

  const displayTitle = resolveProductDisplayTitle({
    productName: product.name,
    color: selectedColor,
  });

  const display = useMemo(
    () =>
      resolveProductDisplayImage({
        productImageUrl: product.image_url,
        productImageAlt: product.image_alt,
        color: selectedColor,
      }),
    [product.image_url, product.image_alt, selectedColor]
  );

  const unitPrice = resolveColorUnitPriceCents({
    productPriceCents: product.default_unit_price_cents,
    color: selectedColor,
  });

  const priceLabel =
    product.configurator_mode === "linear_ft"
      ? t("fromPerFt", { price: formatCadFromCents(unitPrice) })
      : t("fromEach", {
          price: formatCadFromCents(unitPrice),
          unit: product.unit_label,
        });

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={displayTitle}
        description={product.short_description || undefined}
      />

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 lg:gap-14">
          <Reveal variant="slide-left">
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
              <div className="relative aspect-[4/3]">
                {display.imageUrl ? (
                  <Image
                    src={display.imageUrl}
                    alt={display.imageAlt || displayTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    unoptimized
                  />
                ) : (
                  <div
                    className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground"
                    style={
                      selectedColor
                        ? { backgroundColor: selectedColor.hex }
                        : undefined
                    }
                  >
                    <Package className="size-10" aria-hidden />
                  </div>
                )}
                {selectedColor ? (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-xs backdrop-blur-sm">
                    <span
                      className="size-3 rounded-full border border-border/50"
                      style={{ backgroundColor: selectedColor.hex }}
                      aria-hidden
                    />
                    {selectedColor.name}
                  </span>
                ) : null}
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
              <p className="border-t border-border/40 px-5 py-4 text-sm font-medium text-primary sm:px-6">
                {priceLabel}
              </p>
            </div>
          </Reveal>

          <Reveal variant="slide-right">
            <RentalProductConfigurator
              product={product}
              selectedColor={selectedColor}
              onSelectedColorChange={setSelectedColor}
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
