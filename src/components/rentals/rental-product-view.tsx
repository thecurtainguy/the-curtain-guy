"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  buildProductColorOptions,
  isProductBaseColorId,
  resolveColorUnitPriceCents,
  resolveProductDisplayTitle,
  resolveProductGallery,
  type ProductColorVariantRow,
} from "@/data/product-colors";
import { resolveProductCopy } from "@/data/product-copy-templates";
import { formatCadFromCents, type PublicRentalProduct } from "@/data/rentals";
import { PageHero } from "@/components/page-hero";
import { RentalProductConfigurator } from "@/components/rentals/rental-product-configurator";
import { Reveal } from "@/components/animation/reveal";
import { cn } from "@/lib/utils";

type RentalProductViewProps = {
  product: PublicRentalProduct;
};

export function RentalProductView({ product }: RentalProductViewProps) {
  const t = useTranslations("rentals.product");
  const colors = useMemo(() => buildProductColorOptions(product), [product]);
  const [selectedColor, setSelectedColor] =
    useState<ProductColorVariantRow | null>(colors[0] ?? null);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayTitle = resolveProductDisplayTitle({
    productName: product.name,
    color: selectedColor,
  });

  const shortDescription = resolveProductCopy({
    text: product.short_description,
    productName: product.name,
    color: selectedColor,
    defaultColorName: product.default_color_name,
  });

  const longDescription = resolveProductCopy({
    text: product.description,
    productName: product.name,
    color: selectedColor,
    defaultColorName: product.default_color_name,
  });

  const gallery = useMemo(() => {
    const isBase =
      !selectedColor || isProductBaseColorId(selectedColor.id);
    return resolveProductGallery({
      parentImages: product.images || [],
      variantImages: isBase ? null : selectedColor?.images,
      preferFallbackOverParent: !isBase,
      fallback: {
        imageUrl: isBase
          ? product.image_url
          : selectedColor?.image_url || product.image_url,
        imageAlt: isBase
          ? product.image_alt
          : selectedColor?.image_alt ||
            selectedColor?.name ||
            product.image_alt,
      },
    });
  }, [product.images, product.image_url, product.image_alt, selectedColor]);

  const galleryKey = gallery.map((row) => `${row.id}:${row.image_url}`).join("|");

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryKey]);

  const hero = gallery[Math.min(activeIndex, Math.max(gallery.length - 1, 0))];

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
        description={shortDescription || undefined}
      />

      <section className="relative overflow-x-clip py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 lg:gap-14">
          <Reveal variant="fade-up" className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
              <div className="relative aspect-[4/3] w-full max-w-full">
                {hero?.image_url ? (
                  <Image
                    key={`${selectedColor?.id ?? "base"}:${hero.id}:${hero.image_url}`}
                    src={hero.image_url}
                    alt={hero.image_alt || displayTitle}
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
                  <span className="absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-xs backdrop-blur-sm">
                    <span
                      className="size-3 shrink-0 rounded-full border border-border/50"
                      style={{ backgroundColor: selectedColor.hex }}
                      aria-hidden
                    />
                    <span className="truncate">{selectedColor.name}</span>
                  </span>
                ) : null}
              </div>

              {gallery.length > 1 ? (
                <div className="border-t border-border/40 p-3 sm:p-4">
                  <ul className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
                    {gallery.map((image, index) => {
                      const selected = index === activeIndex;
                      return (
                        <li key={`${image.id}:${image.image_url}`} className="shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveIndex(index)}
                            aria-label={`View photo ${index + 1}`}
                            aria-pressed={selected}
                            className={cn(
                              "relative size-16 overflow-hidden rounded-xl border transition-all sm:size-20",
                              selected
                                ? "border-primary ring-2 ring-primary/40"
                                : "border-border/40 opacity-80 hover:opacity-100"
                            )}
                          >
                            <Image
                              src={image.image_url}
                              alt={image.image_alt || `Photo ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="80px"
                              unoptimized
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {longDescription ? (
                <div className="border-t border-border/40 p-5 sm:p-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                    {t("detailsEyebrow")}
                  </p>
                  <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
                    {longDescription}
                  </p>
                </div>
              ) : null}
              <p className="border-t border-border/40 px-5 py-4 text-sm font-medium text-primary sm:px-6">
                {priceLabel}
              </p>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={0.06} className="min-w-0">
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
