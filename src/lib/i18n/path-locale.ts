import type { AppLocale } from "@/i18n/routing";

/** Read locale from the visible URL (not from stale intl context). */
export function getLocaleFromPathname(pathname: string): AppLocale {
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  return "en";
}

/** Strip `/fr` prefix so next-intl router receives a locale-free pathname. */
export function getPathnameWithoutLocale(pathname: string): string {
  if (pathname === "/fr") return "/";
  if (pathname.startsWith("/fr/")) {
    const stripped = pathname.slice(3);
    return stripped.length > 0 ? stripped : "/";
  }
  return pathname || "/";
}

/** Routes that stay at the site root — never prefixed with `/fr`. */
export function isRootOnlyPath(path: string): boolean {
  const pathname = path.split("?")[0]?.split("#")[0] ?? path;
  return (
    pathname.startsWith("/studio/") ||
    pathname === "/ai" ||
    pathname.startsWith("/ai/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/quote")
  );
}

/** `/fr/account/login` → `/account/login` for proxy redirects. */
export function getRootOnlyRedirectTarget(pathname: string): string | null {
  const studioSubpath = pathname.match(/^\/fr\/studio\/(.+)$/);
  if (studioSubpath) {
    return `/studio/${studioSubpath[1]}`;
  }

  const match = pathname.match(/^\/fr\/(admin|account|auth|quote|ai)(\/.*)?$/);
  if (!match) return null;
  return `/${match[1]}${match[2] ?? ""}`;
}
