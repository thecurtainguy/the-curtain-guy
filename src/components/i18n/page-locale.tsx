"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { AppLocale } from "@/i18n/routing";
import { setLocaleOverride } from "@/lib/i18n/locale-override";

/** Renders site chrome in this locale while the current page is open. */
export function PageLocale({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();

  useEffect(() => {
    setLocaleOverride({ pathname, locale });
  }, [pathname, locale]);

  return null;
}
