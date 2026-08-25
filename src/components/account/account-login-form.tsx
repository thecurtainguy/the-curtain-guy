"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { postLoginPath } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "verify"
      ? "Email verification link was invalid or expired. Please sign in or request a new confirmation."
      : null
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
        setError(signError.message || "Invalid email or password.");
        return;
      }

      const sessionRes = await fetch("/api/account/session", {
        cache: "no-store",
      });
      const sessionPayload = (await sessionRes.json()) as {
        role?: "owner" | "customer" | null;
      };

      router.push(postLoginPath(sessionPayload.role));
      router.refresh();
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="account-email">Email</Label>
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
        <Label htmlFor="account-password">Password</Label>
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
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/account/signup" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
