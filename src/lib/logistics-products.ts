import {
  LOGISTICS_SERVICE_PRODUCT_SLUGS,
  type LogisticsServiceKey,
} from "@/data/rentals-logistics";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type LogisticsServiceProduct = {
  id: string;
  name: string;
  image_url: string | null;
  image_alt: string | null;
};

export async function fetchLogisticsServiceProducts(): Promise<
  Partial<Record<LogisticsServiceKey, LogisticsServiceProduct>>
> {
  const slugs = Object.values(LOGISTICS_SERVICE_PRODUCT_SLUGS);
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .select("id, name, slug, image_url, image_alt")
    .in("slug", slugs);
  if (error) {
    console.error("[logistics-products] fetch", error.message);
    return {};
  }
  const result: Partial<Record<LogisticsServiceKey, LogisticsServiceProduct>> =
    {};
  for (const [service, slug] of Object.entries(LOGISTICS_SERVICE_PRODUCT_SLUGS)) {
    const row = (data ?? []).find((product) => product.slug === slug);
    if (row) {
      result[service as LogisticsServiceKey] = {
        id: row.id,
        name: row.name,
        image_url: row.image_url,
        image_alt: row.image_alt,
      };
    }
  }
  return result;
}
