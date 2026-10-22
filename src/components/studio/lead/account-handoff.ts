import type { StudioDesignJson } from "@/data/studio";
import type { StudioEventDetails } from "@/data/studio-leads";

export type StudioAccountAccess = "admin" | "customer";

export type StudioAccountSaveBody = {
  title: string;
  design_json: StudioDesignJson;
  event_details: StudioEventDetails;
  estimate_request_id?: string;
  quote_id?: string;
  job_id?: string;
  opportunity_ref?: string;
};

type Failure = { ok: false; message: string };

type SavedDesign = { id: string; updated_at: string };

function friendlySignInError(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid_credentials")) {
    return "That email and password don’t match an account.";
  }
  if (text.includes("not confirmed")) {
    return "Confirm your email first — the link is in your inbox.";
  }
  if (text.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message || "We couldn’t sign you in. Please try again.";
}

/**
 * Signs in without leaving the page. The session check that follows also
 * attaches this browser's anonymous Studio rows to a verified customer.
 */
export async function signInForStudio(
  email: string,
  password: string
): Promise<{ ok: true; access: StudioAccountAccess } | Failure> {
  try {
    const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
    const { error } = await createBrowserSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, message: friendlySignInError(error.message) };
    const response = await fetch("/api/account/session", { cache: "no-store" });
    const session = (await response.json().catch(() => null)) as {
      role?: "owner" | "customer" | null;
    } | null;
    if (session?.role === "owner") return { ok: true, access: "admin" };
    if (session?.role === "customer") return { ok: true, access: "customer" };
    return { ok: false, message: "This account can’t save Studio designs." };
  } catch {
    return { ok: false, message: "We couldn’t sign you in. Check your connection and try again." };
  }
}

async function request(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; design: SavedDesign } | (Failure & { status: number })> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      design?: SavedDesign;
      message?: string;
    } | null;
    if (response.ok && body?.ok && body.design) return { ok: true, design: body.design };
    return {
      ok: false,
      status: response.status,
      message: body?.message ?? "We couldn’t save this design. Please try again.",
    };
  } catch {
    return { ok: false, status: 0, message: "We couldn’t reach the server. Please try again." };
  }
}

/**
 * Saves the room to the signed-in account. A customer's autosaved draft was
 * linked to them at sign-in, so it is updated in place instead of duplicated;
 * when it wasn't linked (another email), a new design is created.
 */
export async function saveDesignToAccount(input: {
  access: StudioAccountAccess;
  draftId: string | null;
  body: StudioAccountSaveBody;
  source: "studio" | "event_builder";
}): Promise<{ ok: true; id: string } | Failure> {
  const base = input.access === "admin" ? "/api/admin/studio" : "/api/account/studio";
  if (input.access === "customer" && input.draftId) {
    const existing = await request(`${base}/${input.draftId}`);
    if (existing.ok) {
      const updated = await request(`${base}/${input.draftId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...input.body,
          expected_updated_at: existing.design.updated_at,
        }),
      });
      if (updated.ok) return { ok: true, id: updated.design.id };
      if (updated.status !== 403 && updated.status !== 404) return updated;
    }
  }
  const created = await request(base, {
    method: "POST",
    body: JSON.stringify({ ...input.body, source: input.source }),
  });
  return created.ok ? { ok: true, id: created.design.id } : created;
}
