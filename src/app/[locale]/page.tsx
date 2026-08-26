import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuoteCTA } from "@/components/page-hero";
import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { ServicesSection } from "@/components/sections/services-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { EstimatePromoSection } from "@/components/sections/estimate-promo-section";
import { GalleryTeaserSection } from "@/components/sections/gallery-teaser-section";
import { AreasTeaserSection } from "@/components/sections/areas-teaser-section";
import { AiTeaserSection } from "@/components/sections/ai-teaser-section";
import { createPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });

  return createPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale: locale as AppLocale,
  });
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common.quoteCta");

  return (
    <>
      <HeroSection />
      <TrustStrip />
      <ServicesSection />
      <HowItWorksSection />
      <EstimatePromoSection />
      <GalleryTeaserSection />
      <AreasTeaserSection />
      <AiTeaserSection />
      <QuoteCTA headline={t("headline")} description={t("description")} />
    </>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
