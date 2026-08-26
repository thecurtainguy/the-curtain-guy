import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getLocaleFromPathname, isRootOnlyPath } from "@/lib/i18n/path-locale";

export const LOCALE_STORAGE_KEY = "tcg-locale";

/** next-intl middleware cookie — shared with marketing `/fr` routes. */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "en" || value === "fr";
}

export function readClientLocalePreference(): AppLocale | null {
  if (typeof document === "undefined") return null;

  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`)
  );
  const fromCookie = cookieMatch?.[1];
  if (isAppLocale(fromCookie)) return fromCookie;

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(stored)) return stored;
  } catch {
    /* ignore */
  }

  return null;
}

export function writeClientLocalePreference(locale: AppLocale): void {
  if (typeof document === "undefined") return;

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function resolveAppLocale(pathname: string): AppLocale {
  const fromPath = getLocaleFromPathname(pathname);
  if (fromPath === "fr") return "fr";
  if (!isRootOnlyPath(pathname)) return fromPath;

  const stored = readClientLocalePreference();
  if (stored) return stored;

  return routing.defaultLocale;
}

export function resolveAppLocaleFromCookie(
  cookieValue: string | undefined | null
): AppLocale {
  if (isAppLocale(cookieValue)) return cookieValue;
  return routing.defaultLocale;
}
