import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/env";
import { postLoginPath } from "@/lib/auth-redirect";
import type { UserRole } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const siteUrl = getSiteUrl();
  const base = origin || siteUrl;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      let role: UserRole = "customer";
      try {
        const admin = createAdminSupabaseClient();
        const { data: profile } = await admin
          .from("user_profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.role === "owner" || profile?.role === "customer") {
          role = profile.role;
        }
      } catch {
        role = "customer";
      }

      const preferred = postLoginPath(role);
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : preferred;

      // Owners always land in admin; ignore customer next paths.
      const destination = role === "owner" ? "/admin" : safeNext;
      return NextResponse.redirect(`${base}${destination}`);
    }
  }

  return NextResponse.redirect(`${base}/account/login?error=verify`);
}
