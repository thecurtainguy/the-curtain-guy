import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import {
  galleryCategories,
  type GalleryCategoryId,
} from "@/data/gallery";
import { galleryCategoryMediaKeys } from "@/data/site-media";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { createPageMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

const galleryCategoryTranslationKeys: Record<GalleryCategoryId, string> = {
  wedding: "weddings",
  "pipe-and-drape": "corporate",
  stage: "galas",
  corporate: "mitzvahs",
  blackout: "stage",
  mitzvah: "room-transformations",
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/gallery",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function GalleryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("gallery");
  const tCommon = await getTranslations("common");

  return (
    <>
      <PageHero
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">{tCommon("requestEstimate")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href="/services">{tCommon("viewServices")}</Link>
          </Button>
        </div>
      </PageHero>

      <section className="relative py-14 sm:py-20">
        <div
          className="fabric-section-overlay pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap gap-2">
            {galleryCategories.map((category) => {
              const Icon = category.icon;
              const translationKey = galleryCategoryTranslationKeys[category.id];
              return (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Icon className="size-3.5 text-primary/80" />
                  {t(`categories.${translationKey}.label`)}
                </a>
              );
            })}
          </div>

          <div className="space-y-14">
            {galleryCategories.map((category) => {
              const keys = galleryCategoryMediaKeys[category.id] ?? [];
              const Icon = category.icon;
              const translationKey = galleryCategoryTranslationKeys[category.id];

              return (
                <div
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-24"
                >
                  <Reveal variant="fade-up">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                          <Icon className="size-4" />
                        </div>
                        <h2 className="font-heading text-xl font-semibold text-foreground">
                          {t(`categories.${translationKey}.label`)}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t(`categories.${translationKey}.description`)}
                        </p>
                      </div>
                      {category.serviceHref && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-h-10 w-fit"
                        >
                          <Link href={category.serviceHref}>
                            {t("page.relatedService")}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </Reveal>

                  <Stagger
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
                    stagger={0.06}
                  >
                    {keys.map((mediaKey, index) => (
                      <AnimatedCard
                        key={mediaKey}
                        variant="scale-in"
                        hover={false}
                        className="aspect-[4/3] min-h-0"
                      >
                        <div className="media-frame group relative size-full overflow-hidden rounded-2xl bg-card/30">
                          <SiteMediaImage
                            mediaKey={mediaKey}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="absolute inset-0"
                            imageClassName="transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            showCaption={index === 0}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-3 left-3">
                            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary/90">
                              {t("page.inspiration")}
                            </p>
                          </div>
                        </div>
                      </AnimatedCard>
                    ))}
                  </Stagger>
                </div>
              );
            })}
          </div>

          <Reveal variant="fade-up">
            <Card className="mt-14 border-border/40 bg-card/40">
              <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div className="flex gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-medium text-foreground">
                      {t("page.uploadTitle")}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t("page.uploadDescription")}
                    </p>
                  </div>
                </div>
                <Button asChild className="min-h-11 w-full shrink-0 sm:w-auto">
                  <Link href="/contact">{t("page.uploadCta")}</Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <CtaBand
        mediaKey="home.cta.atmosphere"
        headline={t("cta.headline")}
        description={t("cta.description")}
        primaryLabel={tCommon("requestEstimate")}
        secondaryLabel={tCommon("contactBrand")}
      />
    </>
  );
}
