"use client";

import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { AppLocale } from "@/i18n/routing";
import { resolveAppLocale } from "@/lib/i18n/locale-preference";

type LocaleProviderProps = {
  children: React.ReactNode;
  messagesByLocale: Record<AppLocale, Record<string, unknown>>;
};

export function LocaleProvider({
  children,
  messagesByLocale,
}: LocaleProviderProps) {
  const pathname = usePathname();
  const locale = useMemo(() => resolveAppLocale(pathname), [pathname]);

  return (
    <NextIntlClientProvider
      key={locale}
      locale={locale}
      messages={messagesByLocale[locale]}
    >
      {children}
    </NextIntlClientProvider>
  );
}
