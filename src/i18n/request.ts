import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { APP_TIME_ZONE, routing } from "./routing";
import { loadMessages } from "@/lib/i18n/load-messages";
import type { AppLocale } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    timeZone: APP_TIME_ZONE,
    messages: await loadMessages(locale as AppLocale),
  };
});
