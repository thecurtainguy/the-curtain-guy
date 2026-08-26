"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { postLoginPath, safeNextPath } from "@/lib/auth-redirect";
import {
  getLocaleFromPathname,
  localizeAuthHref,
} from "@/lib/i18n/path-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function useFriendlyAuthError() {
  const t = useTranslations("account-auth.signup.errors");

  return (message: string | undefined) => {
    const text = (message || "").toLowerCase();
    if (
      text.includes("rate limit") ||
      text.includes("email rate limit") ||
      text.includes("over_email_send_rate_limit")
    ) {
      return t("rateLimit");
    }
    return message || t("generic");
  };
}

export function AccountSignupForm() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const searchParams = useSearchParams();
  const t = useTranslations("account-auth.signup");
  const friendlyAuthError = useFriendlyAuthError();
  const requestedNext = searchParams.get("next");
  const safeRequestedNext = safeNextPath(requestedNext, "/account");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const siteUrl = window.location.origin;

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeRequestedNext)}`,
          data: {
            full_name: fullName.trim() || undefined,
            phone: phone.trim() || undefined,
          },
        },
      });

      if (signError) {
        setError(friendlyAuthError(signError.message));
        return;
      }

      if (data.session) {
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
        return;
      }

      setCheckEmail(true);
    } catch {
      setError(t("errors.retry"));
    } finally {
      setLoading(false);
    }
  }

  const loginHref = localizeAuthHref(
    requestedNext
      ? `/account/login?next=${encodeURIComponent(requestedNext)}`
      : "/account/login",
    locale
  );

  if (checkEmail) {
    return (
      <div className="space-y-4 text-center lg:text-left">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("checkEmailTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("checkEmailBody")}
        </p>
        {safeRequestedNext.startsWith("/studio") ? (
          <Button asChild>
            <Link href={safeRequestedNext}>{t("returnToStudio")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <NextLink href={loginHref}>{t("goToSignIn")}</NextLink>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signup-name">{t("fullName")}</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-phone">{t("phone")}</Label>
        <Input
          id="signup-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">{t("email")}</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">{t("password")}</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
        {t("alreadyHave")}{" "}
        <NextLink href={loginHref} className="text-primary hover:underline">
          {t("signIn")}
        </NextLink>
      </p>
    </form>
  );
}
