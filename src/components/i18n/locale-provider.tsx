"use client";

import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { APP_TIME_ZONE, type AppLocale } from "@/i18n/routing";
import { useLocaleOverride } from "@/lib/i18n/locale-override";
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
  const override = useLocaleOverride(pathname);
  const resolved = useMemo(() => resolveAppLocale(pathname), [pathname]);
  const locale = override ?? resolved;

  return (
    <NextIntlClientProvider
      key={locale}
      locale={locale}
      timeZone={APP_TIME_ZONE}
      messages={messagesByLocale[locale]}
    >
      {children}
    </NextIntlClientProvider>
  );
}
