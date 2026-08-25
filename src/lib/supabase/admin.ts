import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/** Service-role client for server routes only. Never import from client components. */
export function createAdminSupabaseClient(): SupabaseClient {
  const config = getSupabaseServerConfig();

  if (!config) {
    throw new Error("Supabase service role is not configured");
  }

  if (!adminClient) {
    adminClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

export function tryCreateAdminSupabaseClient(): SupabaseClient | null {
  try {
    return createAdminSupabaseClient();
  } catch {
    return null;
  }
}
