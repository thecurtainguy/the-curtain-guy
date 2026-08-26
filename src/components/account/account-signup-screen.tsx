import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AccountAuthShell } from "@/components/account/account-auth-shell";
import { AccountSignupForm } from "@/components/account/account-signup-form";
import { BrandLogo } from "@/components/brand-logo";

export async function AccountSignupScreen() {
  const t = await getTranslations("account-auth.signup");

  return (
    <AccountAuthShell>
      <div className="mb-6 flex justify-center">
        <BrandLogo href="" size="footer" />
      </div>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      <div className="mt-8">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          }
        >
          <AccountSignupForm />
        </Suspense>
      </div>
    </AccountAuthShell>
  );
}
