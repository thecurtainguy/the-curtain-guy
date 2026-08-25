export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

export function getEstimateNotifyTo(): string {
  return (
    process.env.TCG_ESTIMATE_NOTIFY_TO?.trim() || "admin@thecurtainguy.com"
  );
}

export function getEstimateFrom(): string {
  return (
    process.env.TCG_ESTIMATE_FROM?.trim() ||
    "The Curtain Guy <onboarding@resend.dev>"
  );
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thecurtainguy.com";
}
