"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { resolveAppLocale } from "@/lib/i18n/locale-preference";

/** Keeps `<html lang>` in sync with the visible URL locale. */
export function LocaleHtmlLang() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = resolveAppLocale(pathname);
  }, [pathname]);

  return null;
}
