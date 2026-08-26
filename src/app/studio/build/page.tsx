import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { EventBuilderFlow } from "@/components/event-builder/event-builder-flow";
import { createPageMetadata } from "@/lib/seo";
import {
  LOCALE_COOKIE_NAME,
  resolveAppLocaleFromCookie,
} from "@/lib/i18n/locale-preference";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveAppLocaleFromCookie(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value
  ) as AppLocale;
  const t = await getTranslations({ locale, namespace: "eventBuilder.meta" });

  return createPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/studio/build",
    locale,
  });
}

export default async function StudioBuildPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; from?: string; new?: string }>;
}) {
  const { edit, from, new: newParam } = await searchParams;
  const portal = from === "admin" ? "admin" : "customer";
  const startFresh = newParam === "1" || newParam === "true";

  return (
    <EventBuilderFlow
      editPlanId={edit}
      portal={portal}
      startFresh={startFresh}
    />
  );
}
