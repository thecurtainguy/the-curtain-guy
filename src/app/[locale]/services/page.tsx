import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/page-hero";
import { ServiceCard } from "@/components/marketing/service-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { services } from "@/data/services";
import { createPageMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { Stagger } from "@/components/animation/stagger";
import { AnimatedCard } from "@/components/animation/animated-card";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services.hub" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/services",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ServicesHubPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("services.hub");
  const tCommon = await getTranslations("common");
  const tCta = await getTranslations("common.ctaBand");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">{tCommon("getEstimate")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <Link href="/contact">{tCommon("contactBrand")}</Link>
          </Button>
        </div>
      </PageHero>

      <section className="border-b border-border/40">
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Reveal
            variant="scale-in"
            className="relative aspect-[21/9] min-h-[150px] overflow-hidden rounded-2xl border border-border/40 sm:min-h-[220px]"
          >
            <SiteMediaImage
              mediaKey="services.hub.hero"
              sizes="100vw"
              className="absolute inset-0"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
          </Reveal>
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div
          className="fabric-section-overlay pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <AnimatedCard key={service.slug}>
                <ServiceCard slug={service.slug} />
              </AnimatedCard>
            ))}
          </Stagger>

          <Reveal variant="fade-up" className="mt-12">
            <Card className="border-border/40 bg-card/40">
              <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div className="flex gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <HelpCircle className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-medium text-foreground">
                      {t("notSureTitle")}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t("notSureDescription")}
                    </p>
                  </div>
                </div>
                <Button asChild className="min-h-11 w-full shrink-0 sm:w-auto">
                  <Link href="/get-estimate">{tCommon("getEstimate")}</Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <CtaBand
        mediaKey="home.cta.atmosphere"
        headline={tCta("headline")}
        description={tCta("description")}
        primaryLabel={tCommon("requestEstimate")}
        secondaryLabel={tCommon("contactBrand")}
      />
    </>
  );
}
