import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { normalizePipeDrapePlan, PIPE_DRAPE_PLAN_KEY, type PipeDrapePlan } from "@/lib/pipe-drape";

export function isPipeDrapePlanKey(key: string) {
  return PIPE_DRAPE_PLAN_KEY.test(key);
}

export async function getPipeDrapePlan(key: string): Promise<PipeDrapePlan | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("pipe_drape_plans")
    .select("plan")
    .eq("document_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizePipeDrapePlan(data.plan) : null;
}

export async function savePipeDrapePlan(input: {
  key: string;
  plan: PipeDrapePlan;
  updatedBy: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("pipe_drape_plans").upsert(
    {
      document_key: input.key,
      plan: input.plan,
      updated_at: new Date().toISOString(),
      updated_by: input.updatedBy,
    },
    { onConflict: "document_key" }
  );
  return error ? { ok: false, message: error.message } : { ok: true };
}
