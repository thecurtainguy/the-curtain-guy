import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { getRootOnlyRedirectTarget } from "@/lib/i18n/path-locale";

const handleI18n = createIntlMiddleware(routing);

function isNonLocalizedPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/quote") ||
    pathname.startsWith("/studio/")
  );
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rootRedirect = getRootOnlyRedirectTarget(pathname);
  if (rootRedirect) {
    return NextResponse.redirect(new URL(rootRedirect, request.url));
  }

  if (isNonLocalizedPath(pathname)) {
    return updateSession(request);
  }

  const intlResponse = handleI18n(request);
  return updateSession(request, intlResponse);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
