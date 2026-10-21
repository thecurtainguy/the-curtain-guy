"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useLocaleOverride } from "@/lib/i18n/locale-override";
import { resolveAppLocale } from "@/lib/i18n/locale-preference";

/** Keeps `<html lang>` in sync with the visible URL locale. */
export function LocaleHtmlLang() {
  const pathname = usePathname();
  const override = useLocaleOverride(pathname);

  useEffect(() => {
    document.documentElement.lang = override ?? resolveAppLocale(pathname);
  }, [pathname, override]);

  return null;
}
