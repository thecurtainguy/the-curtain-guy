import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { EstimateBuilder } from "@/components/estimate/estimate-builder";
import { EstimateIntroSection } from "@/components/estimate/estimate-intro-section";
import { GuardedLink } from "@/components/ui/guarded-link";
import { createPageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/animation/reveal";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "estimate.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/get-estimate",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function GetEstimatePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("estimate.page");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="[&>div]:py-12 sm:[&>div]:py-14 lg:[&>div]:py-16"
      />

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <EstimateIntroSection />

          <Reveal variant="fade-up" delay={0.05}>
            <div className="rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card/30 p-4 shadow-sm ring-1 ring-foreground/5 sm:p-8 lg:p-10">
              <EstimateBuilder />
            </div>
          </Reveal>

          <div className="mt-10 rounded-3xl border border-primary/25 bg-primary/[0.06] px-5 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t("studioPromo")}{" "}
              <GuardedLink
                href="/studio/new"
                className="font-medium text-primary hover:underline"
              >
                {t("studioLink")}
              </GuardedLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
