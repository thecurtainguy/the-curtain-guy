import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireCustomerOrOwner } from "@/lib/auth";
import { postLoginPath } from "@/lib/auth-redirect";
import { AccountLoginScreen } from "@/components/account/account-login-screen";
import { routing } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account-auth.login" });

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return routing.locales
    .filter((locale) => locale !== "en")
    .map((locale) => ({ locale }));
}

export default async function LocalizedAccountLoginPage({ params }: PageProps) {
  const { locale } = await params;

  if (locale === "en") {
    redirect("/account/login");
  }

  setRequestLocale(locale);

  const current = await requireCustomerOrOwner();
  if (current) {
    redirect(postLoginPath(current.profile.role));
  }

  return <AccountLoginScreen />;
}
