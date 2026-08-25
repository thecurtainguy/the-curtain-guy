import type { Metadata } from "next";
import { NotFoundStage } from "@/components/marketing/not-found-stage";
import type { NotFoundPortalCta } from "@/components/marketing/not-found-stage";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

async function resolvePortalCta(): Promise<NotFoundPortalCta> {
  try {
    const current = await getCurrentProfile();
    if (!current) {
      return { href: "/account/login", label: "Sign in", kind: "signin" };
    }
    if (current.profile.role === "owner") {
      return { href: "/admin", label: "Admin dashboard", kind: "admin" };
    }
    return {
      href: "/account",
      label: "Account dashboard",
      kind: "account",
    };
  } catch {
    return { href: "/account/login", label: "Sign in", kind: "signin" };
  }
}

export default async function NotFound() {
  const portal = await resolvePortalCta();

  return <NotFoundStage portal={portal} />;
}
