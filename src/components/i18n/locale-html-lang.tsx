"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLocaleFromPathname } from "@/lib/i18n/path-locale";

/** Keeps `<html lang>` in sync with the visible URL locale. */
export function LocaleHtmlLang() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = getLocaleFromPathname(pathname);
  }, [pathname]);

  return null;
}
