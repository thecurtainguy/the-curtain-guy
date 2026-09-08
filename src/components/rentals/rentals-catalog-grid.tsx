import Image from "next/image";
import { ArrowUpRight, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCadFromCents, type PublicRentalProduct } from "@/data/rentals";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";

type RentalsCatalogGridProps = {
  products: PublicRentalProduct[];
};

export async function RentalsCatalogGrid({ products }: RentalsCatalogGridProps) {
  const t = await getTranslations("rentals.catalog");

  if (products.length === 0) {
    return (
      <Reveal
        variant="fade-up"
        className="rounded-2xl border border-dashed border-border/50 bg-card/25 px-6 py-16 text-center"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Package className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
          {t("emptyTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </Reveal>
    );
  }

  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
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
          <AnimatedCard key={product.id}>
            <Link
              href={`/rentals/${product.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/25 text-left transition-colors hover:border-primary/35 hover:bg-card/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.image_alt || product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted/40 text-muted-foreground">
                    <Package className="size-8" aria-hidden />
                  </div>
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
                  aria-hidden
                />
                <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/85 text-primary opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="font-heading text-base font-semibold leading-snug text-foreground">
                  {product.name}
                </p>
                {product.short_description ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {product.short_description}
                  </p>
                ) : null}
                <p className="mt-auto pt-2 text-sm font-medium text-primary">
                  {priceLabel}
                </p>
              </div>
            </Link>
          </AnimatedCard>
        );
      })}
    </Stagger>
  );
}
