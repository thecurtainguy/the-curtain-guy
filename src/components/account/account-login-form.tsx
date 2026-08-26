"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { postLoginPath, safeNextPath } from "@/lib/auth-redirect";
import {
  getLocaleFromPathname,
  localizeAuthHref,
} from "@/lib/i18n/path-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountLoginForm() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const searchParams = useSearchParams();
  const t = useTranslations("account-auth.login");
  const requestedNext = searchParams.get("next");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "verify" ? t("errors.verify") : null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signError) {
        setError(signError.message || t("errors.invalidCredentials"));
        return;
      }

      const sessionRes = await fetch("/api/account/session", {
        cache: "no-store",
      });
      const sessionPayload = (await sessionRes.json()) as {
        role?: "owner" | "customer" | null;
      };

      router.push(
        safeNextPath(requestedNext, postLoginPath(sessionPayload.role))
      );
      router.refresh();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  const signupHref = localizeAuthHref(
    requestedNext
      ? `/account/signup?next=${encodeURIComponent(requestedNext)}`
      : "/account/signup",
    locale
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="account-email">{t("email")}</Label>
        <Input
          id="account-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="account-password">{t("password")}</Label>
        <Input
          id="account-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("submit")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("newHere")}{" "}
        <NextLink href={signupHref} className="text-primary hover:underline">
          {t("createAccount")}
        </NextLink>
      </p>
    </form>
  );
}
