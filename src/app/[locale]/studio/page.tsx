import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StudioLandingPage } from "@/components/studio/studio-landing-page";
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
  const t = await getTranslations({ locale, namespace: "studio.meta" });

  return createPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/studio",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function StudioPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StudioLandingPage />;
}
