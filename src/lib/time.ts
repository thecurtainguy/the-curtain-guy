export type TimeParts = {
  hour: number; // 1–12
  minute: number; // 0–59
  period: "AM" | "PM";
};

const DISPLAY_TIME =
  /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i;
const MILITARY_TIME = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

export function formatDisplayTime(parts: TimeParts): string {
  const hour = Math.min(12, Math.max(1, parts.hour));
  const minute = Math.min(59, Math.max(0, parts.minute));
  return `${hour}:${String(minute).padStart(2, "0")} ${parts.period}`;
}

export function parseDisplayTime(value: string | undefined): TimeParts | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();

  const display = trimmed.match(DISPLAY_TIME);
  if (display) {
    let hour = Number(display[1]);
    const minute = Number(display[2] ?? "0");
    const period = display[3].toUpperCase() as "AM" | "PM";
    if (hour < 1 || hour > 12 || minute > 59) return undefined;
    return { hour, minute, period };
  }

  const military = trimmed.match(MILITARY_TIME);
  if (military) {
    const hour24 = Number(military[1]);
    const minute = Number(military[2]);
    if (hour24 > 23 || minute > 59) return undefined;
    const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    let hour = hour24 % 12;
    if (hour === 0) hour = 12;
    return { hour, minute, period };
  }

  return undefined;
}

export function getNowTimeParts(): TimeParts {
  const now = new Date();
  const hour24 = now.getHours();
  const minute = now.getMinutes();
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour = hour24 % 12;
  if (hour === 0) hour = 12;
  return { hour, minute, period };
}

export const TIME_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
export const TIME_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
