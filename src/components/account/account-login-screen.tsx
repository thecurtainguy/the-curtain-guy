import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AccountAuthBrandHeader } from "@/components/account/account-auth-brand-header";
import { AccountAuthShell } from "@/components/account/account-auth-shell";
import { AccountLoginForm } from "@/components/account/account-login-form";

export async function AccountLoginScreen() {
  const t = await getTranslations("account-auth.login");

  return (
    <AccountAuthShell>
      <AccountAuthBrandHeader label={t("eyebrow")} />
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
          <AccountLoginForm />
        </Suspense>
      </div>
    </AccountAuthShell>
  );
}
