export const CUSTOMER_LANGUAGES = ["en", "fr"] as const;

export type CustomerLanguage = (typeof CUSTOMER_LANGUAGES)[number];

export const CUSTOMER_LANGUAGE_LABELS: Record<CustomerLanguage, string> = {
  en: "English",
  fr: "Français",
};

export function isCustomerLanguage(value: unknown): value is CustomerLanguage {
  return value === "en" || value === "fr";
}

export function normalizeCustomerLanguage(
  value: unknown,
  fallback: CustomerLanguage = "en"
): CustomerLanguage {
  if (typeof value !== "string") return fallback;
  const lower = value.trim().toLowerCase();
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("en")) return "en";
  return fallback;
}

/** Intl locale for dates and currency. */
export function customerLocaleTag(language: CustomerLanguage): string {
  return language === "fr" ? "fr-CA" : "en-CA";
}

/** "fr" when the URL path starts with /fr (next-intl as-needed prefix). */
export function languageFromUrl(
  value: string | null | undefined
): CustomerLanguage | null {
  if (!value) return null;
  let pathname = value;
  try {
    pathname = new URL(value, "https://x.invalid").pathname;
  } catch {
    return null;
  }
  const first = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (first === "fr") return "fr";
  return null;
}
