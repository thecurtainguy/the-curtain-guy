import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { RentalsCheckoutForm } from "@/components/rentals/rentals-checkout-form";
import { getCurrentProfile } from "@/lib/auth";
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
  const t = await getTranslations({ locale, namespace: "rentals.checkout" });

  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/rentals/checkout",
    locale: locale as AppLocale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RentalsCheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("rentals.checkout");
  const current = await getCurrentProfile();

  const defaultContact = current
    ? {
        name: current.profile.full_name ?? "",
        email: current.profile.email ?? current.user.email ?? "",
        phone: current.profile.phone ?? "",
      }
    : undefined;

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RentalsCheckoutForm
            defaultContact={defaultContact}
            isAuthenticated={Boolean(current)}
          />
        </div>
      </section>
    </>
  );
}
