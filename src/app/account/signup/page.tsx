import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireCustomerOrOwner } from "@/lib/auth";
import { postLoginPath } from "@/lib/auth-redirect";
import { AccountSignupScreen } from "@/components/account/account-signup-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account-auth.signup");

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AccountSignupPage() {
  const current = await requireCustomerOrOwner();
  if (current) {
    redirect(postLoginPath(current.profile.role));
  }

  return <AccountSignupScreen />;
}
