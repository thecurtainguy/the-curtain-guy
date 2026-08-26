import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero, QuoteCTA } from "@/components/page-hero";
import { ReviewsShowcase } from "@/components/reviews/reviews-showcase";
import { ShareExperienceDialog } from "@/components/reviews/share-experience-dialog";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/reviews",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ReviewsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("reviews.page");

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11">
            <Link href="/get-estimate">{t("getEstimate")}</Link>
          </Button>
          <ShareExperienceDialog>
            <Button variant="outline" size="lg" className="min-h-11">
              {t("shareCta")}
            </Button>
          </ShareExperienceDialog>
        </div>
      </PageHero>

      <ReviewsShowcase />

      <QuoteCTA />
    </>
  );
}
