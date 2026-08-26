import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireCustomerOrOwner } from "@/lib/auth";
import { postLoginPath } from "@/lib/auth-redirect";
import { AccountLoginScreen } from "@/components/account/account-login-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account-auth.login");

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AccountLoginPage() {
  const current = await requireCustomerOrOwner();
  if (current) {
    redirect(postLoginPath(current.profile.role));
  }

  return <AccountLoginScreen />;
}
