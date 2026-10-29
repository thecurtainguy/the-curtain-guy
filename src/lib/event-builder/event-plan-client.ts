import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioDesignJson } from "@/data/studio";

export type EventPlanContactPayload = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

export class EventPlanRequestError extends Error {}

type EventPlanApiResponse = {
  ok?: boolean;
  reference?: string;
  id?: string;
  message?: string;
};

export async function patchEventPlanSubmission(
  planId: string,
  brief: EventBuilderBrief,
  design: StudioDesignJson,
  contact: EventPlanContactPayload
): Promise<{ id: string; reference?: string }> {
  const response = await fetch(`/api/event-plan/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact: {
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        notes: contact.notes.trim(),
      },
      brief,
      design,
    }),
  });

  const body = (await response.json().catch(() => null)) as EventPlanApiResponse | null;

  if (!response.ok || !body?.ok) {
    throw new EventPlanRequestError(body?.message ?? "");
  }

  return { id: body.id ?? planId, reference: body.reference };
}

/** Studio context sent with a submission (the server verifies the design id). */
export type EventPlanStudioLink = {
  studioDesignId?: string | null;
  eventName?: string | null;
  guestCount?: number | null;
};

export async function postEventPlanSubmission(
  brief: EventBuilderBrief,
  design: StudioDesignJson,
  contact: EventPlanContactPayload,
  website = "",
  studio: EventPlanStudioLink = {}
): Promise<{ id: string; reference?: string }> {
  const response = await fetch("/api/event-plan/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact: {
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        notes: contact.notes.trim(),
      },
      brief,
      design,
      website,
      ...(studio.studioDesignId ? { studioDesignId: studio.studioDesignId } : {}),
      eventName: studio.eventName ?? brief.eventName ?? undefined,
      guestCount: studio.guestCount ?? brief.guestCount ?? undefined,
    }),
  });

  const body = (await response.json().catch(() => null)) as EventPlanApiResponse | null;

  if (!response.ok || !body?.ok) {
    throw new EventPlanRequestError(body?.message ?? "");
  }

  return { id: body.id ?? "", reference: body.reference };
}
