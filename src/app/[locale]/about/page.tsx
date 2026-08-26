import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { QuoteCTA } from "@/components/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { MediaVisual } from "@/components/media-visual";
import { getSiteMedia } from "@/lib/site-media";
import { createPageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

const aboutMedia = getSiteMedia("about.primary");

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/about",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tCta = await getTranslations("common.quoteCta");
  const values = t.raw("values") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <>
      <PageHero
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal variant="slide-left" className="mx-auto max-w-3xl lg:mx-0">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                {t("page.whatWeDo")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("page.paragraph1")}
              </p>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("page.paragraph2")}
              </p>
            </Reveal>
            <Reveal variant="slide-right">
              <MediaVisual
                image={aboutMedia.path}
                alt={aboutMedia.alt}
                className="mx-auto w-full max-w-md shadow-2xl shadow-black/40"
              />
            </Reveal>
          </div>

          <Reveal variant="fade-up" className="mt-16">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {t("page.valuesTitle")}
            </h2>
          </Reveal>

          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <AnimatedCard key={value.title} hover={false}>
                <Card className="h-full border-border/40 bg-card/40">
                  <CardContent className="pt-6">
                    <h3 className="font-heading text-base font-medium text-foreground">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ))}
          </Stagger>
        </div>
      </section>

      <QuoteCTA
        headline={tCta("headline")}
        description={tCta("description")}
      />
    </>
  );
}
