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
  if (pathname === "/account/login" || pathname === "/account/signup") {
    return false;
  }
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
  if (pathname === "/fr/account/login" || pathname === "/fr/account/signup") {
    return null;
  }

  const studioSubpath = pathname.match(/^\/fr\/studio\/(.+)$/);
  if (studioSubpath) {
    return `/studio/${studioSubpath[1]}`;
  }

  const match = pathname.match(/^\/fr\/(admin|account|auth|quote|ai)(\/.*)?$/);
  if (!match) return null;
  return `/${match[1]}${match[2] ?? ""}`;
}

export function isAccountAuthPath(pathname: string): boolean {
  const normalized = getPathnameWithoutLocale(pathname);
  return normalized === "/account/login" || normalized === "/account/signup";
}

/** Auth entry pages live at `/account/*` (EN) and `/fr/account/*` (FR). */
export function localizeAuthHref(href: string, locale: AppLocale): string {
  const [pathname, ...rest] = href.split("?");
  const query = rest.length > 0 ? `?${rest.join("?")}` : "";
  const normalized = pathname ?? href;

  if (normalized !== "/account/login" && normalized !== "/account/signup") {
    return href;
  }

  return locale === "fr"
    ? `/fr${normalized}${query}`
    : `${normalized}${query}`;
}
