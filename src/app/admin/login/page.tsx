import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Owner sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const owner = await requireOwner();
  if (owner) {
    redirect("/admin");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.76_0.15_88/0.12),transparent_55%)]" />
      <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card/30 p-6 shadow-[0_0_80px_-40px_oklch(0.76_0.15_88/0.5)] sm:p-8">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" size="footer" />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
          Owner access
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Internal dashboard for The Curtain Guy estimate requests.
        </p>
        <div className="mt-8">
          <AdminLoginForm />
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
