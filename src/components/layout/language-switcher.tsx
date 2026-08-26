"use client";

import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  getPathnameWithoutLocale,
  isAccountAuthPath,
  isRootOnlyPath,
  localizeAuthHref,
} from "@/lib/i18n/path-locale";
import {
  readClientLocalePreference,
  resolveAppLocale,
  writeClientLocalePreference,
} from "@/lib/i18n/locale-preference";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const nextPathname = useNextPathname();
  const nextRouter = useNextRouter();
  const pathname = getPathnameWithoutLocale(nextPathname);
  const locale = isRootOnlyPath(pathname)
    ? (readClientLocalePreference() ?? resolveAppLocale(pathname))
    : resolveAppLocale(nextPathname);
  const router = useRouter();
  const t = useTranslations("common");

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;

    if (isAccountAuthPath(pathname)) {
      nextRouter.push(localizeAuthHref(pathname, nextLocale));
      return;
    }

    if (isRootOnlyPath(pathname)) {
      writeClientLocalePreference(nextLocale);
      window.location.reload();
      return;
    }

    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-2xl border border-border/50 bg-muted/30 p-0.5",
        className
      )}
      role="group"
      aria-label={t("languageSwitcher")}
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchLocale(loc)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "min-w-9 rounded-[0.875rem] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {loc === "en" ? "EN" : "FR"}
          </button>
        );
      })}
    </div>
  );
}
