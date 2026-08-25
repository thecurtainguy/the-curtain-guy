"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { postLoginPath, safeNextPath } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function friendlyAuthError(message: string | undefined): string {
  const text = (message || "").toLowerCase();
  if (
    text.includes("rate limit") ||
    text.includes("email rate limit") ||
    text.includes("over_email_send_rate_limit")
  ) {
    return "Too many signup emails were requested. Please wait a few minutes and try again.";
  }
  return message || "Could not create account.";
}

export function AccountSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      setError("Could not create account. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Check your email
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Check your email to verify your account. After confirming, you can
          return to this original browser tab and continue your saved progress.
        </p>
        {safeRequestedNext.startsWith("/studio") ? (
          <Button asChild>
            <Link href={safeRequestedNext}>Return to Studio</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link
            href={
              requestedNext
                ? `/account/login?next=${encodeURIComponent(requestedNext)}`
                : "/account/login"
            }
          >
            Go to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-phone">Phone</Label>
        <Input
          id="signup-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
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
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={
            requestedNext
              ? `/account/login?next=${encodeURIComponent(requestedNext)}`
              : "/account/login"
          }
          className="text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
