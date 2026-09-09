import { formatCadFromCents, type RentalCartLine } from "@/data/rentals";

export const RENTAL_LOGISTICS_MODES = [
  "full_service",
  "transport_only",
  "diy",
] as const;

export type RentalLogisticsMode = (typeof RENTAL_LOGISTICS_MODES)[number];

export const RENTAL_LOGISTICS_MODE_LABELS: Record<RentalLogisticsMode, string> =
  {
    full_service: "Full service",
    transport_only: "Transport only",
    diy: "I'll handle logistics",
  };

export type RentalDeliveryZone = {
  id: string;
  label: string;
  shortLabel: string;
  priced: boolean;
  fullServiceCents: number;
  transportOnlyCents: number;
  sortOrder: number;
  isActive: boolean;
};

/**
 * Factory defaults. Live prices come from Supabase `rental_delivery_zones`
 * (admin Logistics page). These remain the fallback if the DB is unavailable.
 */
export const DEFAULT_RENTAL_DELIVERY_ZONES: RentalDeliveryZone[] = [
  {
    id: "montreal-island",
    label: "Montreal Island",
    shortLabel: "Montreal Island",
    priced: true,
    fullServiceCents: 45000,
    transportOnlyCents: 17500,
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "laval",
    label: "Laval",
    shortLabel: "Laval",
    priced: true,
    fullServiceCents: 47500,
    transportOnlyCents: 19000,
    sortOrder: 20,
    isActive: true,
  },
  {
    id: "greater-montreal",
    label:
      "Greater Montreal (South Shore / West Island / North Shore excl. Laval)",
    shortLabel: "Greater Montreal",
    priced: true,
    fullServiceCents: 52500,
    transportOnlyCents: 22500,
    sortOrder: 30,
    isActive: true,
  },
  {
    id: "other",
    label: "Outside these areas — quote only",
    shortLabel: "Outside / other",
    priced: false,
    fullServiceCents: 0,
    transportOnlyCents: 0,
    sortOrder: 40,
    isActive: true,
  },
];

/** @deprecated Prefer DEFAULT_RENTAL_DELIVERY_ZONES or live zones from context. */
export const RENTAL_DELIVERY_ZONES = DEFAULT_RENTAL_DELIVERY_ZONES;

export type RentalDeliveryZoneId = string;

export function isRentalLogisticsMode(
  value: string
): value is RentalLogisticsMode {
  return (RENTAL_LOGISTICS_MODES as readonly string[]).includes(value);
}

export function resolveDeliveryZones(
  zones?: RentalDeliveryZone[] | null
): RentalDeliveryZone[] {
  if (zones && zones.length > 0) {
    return zones.filter((zone) => zone.isActive !== false);
  }
  return DEFAULT_RENTAL_DELIVERY_ZONES.filter((zone) => zone.isActive);
}

export function isRentalDeliveryZoneId(
  value: string,
  zones?: RentalDeliveryZone[] | null
): boolean {
  return resolveDeliveryZones(zones).some((zone) => zone.id === value);
}

export function getRentalDeliveryZone(
  id: string | null | undefined,
  zones?: RentalDeliveryZone[] | null
): RentalDeliveryZone | null {
  if (!id) return null;
  return resolveDeliveryZones(zones).find((zone) => zone.id === id) ?? null;
}

export function logisticsPriceCents(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
  zones?: RentalDeliveryZone[] | null;
}): { cents: number; quoteOnly: boolean; zone: RentalDeliveryZone | null } {
  const zone = getRentalDeliveryZone(input.zoneId, input.zones);
  if (input.mode === "diy") {
    return { cents: 0, quoteOnly: false, zone };
  }
  if (!zone) {
    return { cents: 0, quoteOnly: false, zone: null };
  }
  if (!zone.priced) {
    return { cents: 0, quoteOnly: true, zone };
  }
  const cents =
    input.mode === "full_service"
      ? zone.fullServiceCents
      : zone.transportOnlyCents;
  return { cents, quoteOnly: false, zone };
}

export const LOGISTICS_LINE_KEY = "logistics:cart";

export function buildCartLogisticsLine(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
  zones?: RentalDeliveryZone[] | null;
}): RentalCartLine | null {
  if (input.mode === "diy") return null;

  const priced = logisticsPriceCents(input);
  const zoneLabel = priced.zone?.shortLabel || "Delivery area TBD";

  if (input.mode === "full_service") {
    return {
      key: LOGISTICS_LINE_KEY,
      productId: "logistics-full-service",
      slug: "full-service",
      name: "TCG full service",
      description: priced.quoteOnly
        ? `Full service (transport + install + teardown) · ${zoneLabel} · priced in final quote`
        : `Full service (transport + install + teardown) · ${zoneLabel}`,
      category: "labor",
      kind: "service",
      lineKind: "service",
      imageUrl: null,
      imageAlt: null,
      quantity: 1,
      unitPriceCents: priced.quoteOnly ? 0 : priced.cents,
      unitLabel: "event",
      isTaxable: !priced.quoteOnly && priced.cents > 0,
    };
  }

  return {
    key: LOGISTICS_LINE_KEY,
    productId: "logistics-transport-only",
    slug: "transport-only",
    name: "Transport only",
    description: priced.quoteOnly
      ? `Transport / delivery only · ${zoneLabel} · priced in final quote`
      : `Transport / delivery only · ${zoneLabel}`,
    category: "labor",
    kind: "service",
    lineKind: "service",
    imageUrl: null,
    imageAlt: null,
    quantity: 1,
    unitPriceCents: priced.quoteOnly ? 0 : priced.cents,
    unitLabel: "event",
    isTaxable: !priced.quoteOnly && priced.cents > 0,
  };
}

export function formatLogisticsEstimateLabel(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
  zones?: RentalDeliveryZone[] | null;
}): string {
  if (input.mode === "diy") return "No TCG logistics";
  const priced = logisticsPriceCents(input);
  if (!priced.zone) return "Choose delivery area for estimate";
  if (priced.quoteOnly) return "Subject to quote";
  return formatCadFromCents(priced.cents);
}

export function stripServiceLines(lines: RentalCartLine[]): RentalCartLine[] {
  return lines.filter((line) => line.lineKind !== "service");
}

export function dollarsToLogisticsCents(dollars: string | number): number {
  const n =
    typeof dollars === "string" ? Number.parseFloat(dollars) : Number(dollars);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function logisticsCentsToDollarInput(cents: number): string {
  return ((Number(cents) || 0) / 100).toFixed(2);
}
