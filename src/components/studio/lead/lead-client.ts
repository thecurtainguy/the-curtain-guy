import type { StudioDesignJson } from "@/data/studio";
import type {
  StudioEventDetails,
  StudioLeadContact,
} from "@/data/studio-leads";
import type { StudioRoomKind } from "./lead-storage";

/** Mirrors StudioVisitorDraft from the server (browser-safe fields only). */
export type StudioLeadDraft = {
  id: string;
  title: string;
  design_json: StudioDesignJson;
  updated_at: string;
  last_activity_at: string;
  status: string;
  source: "studio" | "event_builder" | "admin";
  details: StudioEventDetails;
  contact: StudioLeadContact | null;
};

export type StudioLeadApiError = {
  ok: false;
  status: number;
  code: string;
  message: string;
  fieldErrors?: Partial<Record<keyof StudioLeadContact, string>>;
};

export type StudioDraftPayload = {
  id: string | null;
  title: string;
  design_json: StudioDesignJson;
  event_details: StudioEventDetails;
  mode: StudioRoomKind;
};

/** Beacon/keepalive bodies are capped at 64 KB by browsers. */
const KEEPALIVE_MAX_BYTES = 60 * 1024;

async function readJson<T>(response: Response): Promise<T | StudioLeadApiError> {
  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { ok?: boolean })
    | null;
  if (!response.ok || !body?.ok) {
    return {
      ok: false,
      status: response.status,
      code: typeof body?.code === "string" ? body.code : "error",
      message:
        typeof body?.message === "string"
          ? body.message
          : "Something went wrong. Please try again.",
      fieldErrors: body?.fieldErrors as StudioLeadApiError["fieldErrors"],
    };
  }
  return body as T;
}

function networkError(): StudioLeadApiError {
  return {
    ok: false,
    status: 0,
    code: "network",
    message: "You appear to be offline. We’ll retry shortly.",
  };
}

export async function autosaveStudioDraft(
  payload: StudioDraftPayload,
  options: { keepalive?: boolean } = {}
): Promise<
  { ok: true; id: string; updatedAt: string } | StudioLeadApiError
> {
  const body = JSON.stringify(payload);
  const keepalive =
    options.keepalive && new Blob([body]).size <= KEEPALIVE_MAX_BYTES;
  try {
    const response = await fetch("/api/studio/autosave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive,
      credentials: "same-origin",
    });
    return readJson(response);
  } catch {
    return networkError();
  }
}

export async function fetchStudioDraft(
  id: string
): Promise<{ ok: true; draft: StudioLeadDraft } | StudioLeadApiError> {
  try {
    const response = await fetch(
      `/api/studio/autosave?id=${encodeURIComponent(id)}`,
      { cache: "no-store", credentials: "same-origin" }
    );
    return readJson(response);
  } catch {
    return networkError();
  }
}

export async function saveStudioLead(
  payload: StudioDraftPayload & { contact: StudioLeadContact; website: string }
): Promise<
  | { ok: true; id: string | null; updatedAt?: string; resumePath?: string; emailed: boolean }
  | StudioLeadApiError
> {
  try {
    const response = await fetch("/api/studio/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
    return readJson(response);
  } catch {
    return networkError();
  }
}

export async function bindStudioResume(
  token: string
): Promise<{ ok: true; draft: StudioLeadDraft } | StudioLeadApiError> {
  try {
    const response = await fetch("/api/studio/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "same-origin",
    });
    return readJson(response);
  } catch {
    return networkError();
  }
}
