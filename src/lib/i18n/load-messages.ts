import type { AppLocale } from "@/i18n/routing";

const namespaces = [
  "common",
  "nav",
  "home",
  "services",
  "areas",
  "faq",
  "estimate",
  "contact",
  "gallery",
  "reviews",
  "privacy",
  "about",
  "metadata",
  "studio",
  "account-auth",
] as const;

export async function loadMessages(locale: AppLocale) {
  const entries = await Promise.all(
    namespaces.map(async (namespace) => {
      const mod = await import(`../../../messages/${locale}/${namespace}.json`);
      return [namespace, mod.default] as const;
    })
  );
  return Object.fromEntries(entries);
}

export async function loadAllMessages() {
  const [en, fr] = await Promise.all([
    loadMessages("en"),
    loadMessages("fr"),
  ]);
  return { en, fr } as const;
}
