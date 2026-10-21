import {
  languageFromUrl,
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Saves the language a signed-in customer last used on a form. */
export async function rememberPreferredLanguage(
  userId: string | null | undefined,
  language: CustomerLanguage
): Promise<void> {
  if (!userId) return;
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from("user_profiles")
      .update({ preferred_language: language })
      .eq("id", userId)
      .eq("role", "customer");
    if (error) console.error("[language] remember preference", error);
  } catch (error) {
    console.error("[language] remember preference failed", error);
  }
}

/** Site language the customer was browsing when they submitted a form. */
export function detectRequestLanguage(request: Request): CustomerLanguage {
  const referer = request.headers.get("referer");
  if (referer) {
    return languageFromUrl(referer) ?? "en";
  }
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  return normalizeCustomerLanguage(match?.[1]);
}
