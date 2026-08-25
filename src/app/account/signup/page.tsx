import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireCustomerOrOwner } from "@/lib/auth";
import { postLoginPath } from "@/lib/auth-redirect";
import { AccountSignupForm } from "@/components/account/account-signup-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function AccountSignupPage() {
  const current = await requireCustomerOrOwner();
  if (current) {
    redirect(postLoginPath(current.profile.role));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.76_0.15_88/0.12),transparent_55%)]" />
      <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card/30 p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" size="footer" />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
          Customer account
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track estimates, upload files, and keep your event details in one
          place.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
          >
            <AccountSignupForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Return home
          </Link>
        </p>
      </div>
    </div>
  );
}
