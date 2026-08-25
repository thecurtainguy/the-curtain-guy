export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

export type SupabaseBrowserConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseAuthConfigured(): boolean {
  return getSupabaseBrowserConfig() !== null;
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

export function getContactNotifyTo(): string {
  return (
    process.env.TCG_CONTACT_NOTIFY_TO?.trim() ||
    process.env.TCG_ESTIMATE_NOTIFY_TO?.trim() ||
    "info@thecurtainguy.com"
  );
}

export function getContactFrom(): string {
  return (
    process.env.TCG_CONTACT_FROM?.trim() ||
    process.env.TCG_ESTIMATE_FROM?.trim() ||
    "The Curtain Guy <onboarding@resend.dev>"
  );
}

export function getQuoteFrom(): string {
  return (
    process.env.TCG_QUOTE_FROM?.trim() ||
    process.env.TCG_ESTIMATE_FROM?.trim() ||
    "The Curtain Guy <onboarding@resend.dev>"
  );
}

export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.thecurtainguy.com";
  url = url.replace(/\/$/, "");

  // Production redirects to www — keep canonicals aligned even if env is apex-only.
  if (url === "https://thecurtainguy.com") {
    return "https://www.thecurtainguy.com";
  }

  return url;
}

export function getGaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || null;
}

export function shouldSendCustomerConfirmation(): boolean {
  const value = process.env.TCG_SEND_CUSTOMER_CONFIRMATION?.trim().toLowerCase();

  if (!value) {
    return true;
  }

  return value === "true" || value === "1" || value === "yes";
}
