import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

/** Montreal / Quebec — keep server + client formatting in sync. */
export const APP_TIME_ZONE = "America/Toronto";
