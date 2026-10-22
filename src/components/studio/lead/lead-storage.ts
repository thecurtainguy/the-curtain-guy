import {
  EMPTY_STUDIO_EVENT_DETAILS,
  STUDIO_GUEST_COUNT_MAX,
  isStudioEventType,
  type StudioEventDetails,
  type StudioLeadContact,
} from "@/data/studio-leads";
import type { EventBuilderBrief } from "@/data/event-builder/brief";

export type StudioRoomKind = "designer" | "event";

type StoredRoom = { designId: string; savedAt: string };

export type StoredStudioLead = {
  details: StudioEventDetails;
  /** Only stored after the visitor saved with their contact details. */
  contact: StudioLeadContact | null;
  nudgeShown: boolean;
  rooms: Partial<Record<StudioRoomKind, StoredRoom>>;
};

const STORAGE_KEY = "tcg-studio-lead-v1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : null;
}

/** Defensive parse of details from storage, a server row or a brief. */
export function sanitizeStudioEventDetails(value: unknown): StudioEventDetails {
  if (!value || typeof value !== "object") return { ...EMPTY_STUDIO_EVENT_DETAILS };
  const raw = value as Record<string, unknown>;
  const guestCount =
    typeof raw.guestCount === "number" &&
    Number.isInteger(raw.guestCount) &&
    raw.guestCount >= 1 &&
    raw.guestCount <= STUDIO_GUEST_COUNT_MAX
      ? raw.guestCount
      : null;
  const eventDate =
    typeof raw.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.eventDate)
      ? raw.eventDate
      : null;
  return {
    eventName: text(raw.eventName),
    eventType: isStudioEventType(raw.eventType) ? raw.eventType : null,
    eventDate,
    guestCount,
    venueName: text(raw.venueName),
    cityArea: text(raw.cityArea),
  };
}

/** Event columns from a studio_designs row passed to the designer. */
export function studioEventDetailsFromRecord(record: unknown): StudioEventDetails {
  if (!record || typeof record !== "object") return { ...EMPTY_STUDIO_EVENT_DETAILS };
  const row = record as Record<string, unknown>;
  return sanitizeStudioEventDetails({
    eventName: row.event_name,
    eventType: row.event_type,
    eventDate: row.event_date,
    guestCount: row.guest_count,
    venueName: row.venue_name,
    cityArea: row.city_area,
  });
}

/** Event builder brief → studio details (brief values win where present). */
export function mergeBriefIntoDetails(
  details: StudioEventDetails,
  brief: EventBuilderBrief | undefined
): StudioEventDetails {
  if (!brief) return details;
  const fromBrief = sanitizeStudioEventDetails(brief);
  return {
    eventName: fromBrief.eventName ?? details.eventName,
    eventType: fromBrief.eventType ?? details.eventType,
    eventDate: fromBrief.eventDate ?? details.eventDate,
    guestCount: fromBrief.guestCount ?? details.guestCount,
    venueName: fromBrief.venueName ?? details.venueName,
    cityArea: fromBrief.cityArea ?? details.cityArea,
  };
}

function emptyLead(): StoredStudioLead {
  return {
    details: { ...EMPTY_STUDIO_EVENT_DETAILS },
    contact: null,
    nudgeShown: false,
    rooms: {},
  };
}

export function readStoredStudioLead(): StoredStudioLead {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLead();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rooms: StoredStudioLead["rooms"] = {};
    if (parsed.rooms && typeof parsed.rooms === "object") {
      for (const kind of ["designer", "event"] as const) {
        const room = (parsed.rooms as Record<string, unknown>)[kind] as
          | Record<string, unknown>
          | undefined;
        if (room && typeof room.designId === "string" && UUID_PATTERN.test(room.designId)) {
          rooms[kind] = {
            designId: room.designId,
            savedAt: typeof room.savedAt === "string" ? room.savedAt : "",
          };
        }
      }
    }
    const contactRaw = parsed.contact as Record<string, unknown> | null | undefined;
    const contact =
      contactRaw &&
      typeof contactRaw.name === "string" &&
      typeof contactRaw.email === "string" &&
      typeof contactRaw.phone === "string"
        ? {
            name: contactRaw.name.slice(0, 160),
            email: contactRaw.email.slice(0, 254),
            phone: contactRaw.phone.slice(0, 40),
          }
        : null;
    return {
      details: sanitizeStudioEventDetails(parsed.details),
      contact,
      nudgeShown: parsed.nudgeShown === true,
      rooms,
    };
  } catch {
    return emptyLead();
  }
}

export function updateStoredStudioLead(
  patch: (current: StoredStudioLead) => StoredStudioLead
): void {
  try {
    const next = patch(readStoredStudioLead());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local copies are a convenience; the server row is the source of truth.
  }
}

export function rememberStudioRoom(kind: StudioRoomKind, designId: string | null): void {
  updateStoredStudioLead((current) => {
    const rooms = { ...current.rooms };
    if (designId) rooms[kind] = { designId, savedAt: new Date().toISOString() };
    else delete rooms[kind];
    return { ...current, rooms };
  });
}
