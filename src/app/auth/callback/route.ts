import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/env";
import { postLoginPath } from "@/lib/auth-redirect";
import { isEmailVerified, type UserRole } from "@/lib/auth";
import {
  STUDIO_LINKED_COOKIE,
  STUDIO_VISITOR_COOKIE,
  linkStudioLeadsToAccount,
  readStudioVisitorId,
  studioLinkedCookieOptions,
} from "@/lib/studio-leads-server";

export async function GET(request: NextRequest) {
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
      const response = NextResponse.redirect(`${base}${destination}`);

      // Email verification is the moment a Studio lead becomes an account:
      // attach their saved designs before they land.
      if (role === "customer" && isEmailVerified(data.user)) {
        const visitorId = readStudioVisitorId(request.cookies);
        try {
          await linkStudioLeadsToAccount({
            userId: data.user.id,
            email: data.user.email,
            visitorId,
          });
          response.cookies.set(
            STUDIO_LINKED_COOKIE,
            data.user.id,
            studioLinkedCookieOptions()
          );
          if (visitorId) response.cookies.delete(STUDIO_VISITOR_COOKIE);
        } catch {
          console.error("[auth] Studio lead linking failed");
        }
      }

      return response;
    }
  }

  return NextResponse.redirect(`${base}/account/login?error=verify`);
}
