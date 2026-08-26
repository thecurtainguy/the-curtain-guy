import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; slug?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy.page" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/privacy",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("privacy");
  const tCommon = await getTranslations("common");

  const sections = t.raw("sections") as Array<{
    title: string;
    body: string;
  }>;

  return (
    <>
      <PageHero
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      />

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.title} className="border-border/40 bg-card/25">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="font-heading text-lg font-medium text-foreground">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/get-estimate" className="text-primary hover:underline">
              {tCommon("requestEstimate")}
            </Link>
            {" · "}
            <Link href="/contact" className="text-primary hover:underline">
              {tCommon("contact")}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
