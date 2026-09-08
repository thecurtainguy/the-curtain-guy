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

/**
 * Guest picks a delivery zone at checkout. Matching is explicit self-select —
 * we do not geocode street addresses in v1.
 * Edit flat prices here until an admin UI exists.
 */
export const RENTAL_DELIVERY_ZONES = [
  {
    id: "montreal-island",
    label: "Montreal Island",
    shortLabel: "Montreal Island",
    priced: true,
    fullServiceCents: 45000,
    transportOnlyCents: 17500,
  },
  {
    id: "laval",
    label: "Laval",
    shortLabel: "Laval",
    priced: true,
    fullServiceCents: 47500,
    transportOnlyCents: 19000,
  },
  {
    id: "greater-montreal",
    label: "Greater Montreal (South Shore / West Island / North Shore excl. Laval)",
    shortLabel: "Greater Montreal",
    priced: true,
    fullServiceCents: 52500,
    transportOnlyCents: 22500,
  },
  {
    id: "other",
    label: "Outside these areas — quote only",
    shortLabel: "Outside / other",
    priced: false,
    fullServiceCents: 0,
    transportOnlyCents: 0,
  },
] as const;

export type RentalDeliveryZoneId =
  (typeof RENTAL_DELIVERY_ZONES)[number]["id"];

export type RentalDeliveryZone = (typeof RENTAL_DELIVERY_ZONES)[number];

export function isRentalLogisticsMode(
  value: string
): value is RentalLogisticsMode {
  return (RENTAL_LOGISTICS_MODES as readonly string[]).includes(value);
}

export function isRentalDeliveryZoneId(
  value: string
): value is RentalDeliveryZoneId {
  return RENTAL_DELIVERY_ZONES.some((zone) => zone.id === value);
}

export function getRentalDeliveryZone(
  id: string | null | undefined
): RentalDeliveryZone | null {
  if (!id) return null;
  return RENTAL_DELIVERY_ZONES.find((zone) => zone.id === id) ?? null;
}

export function logisticsPriceCents(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
}): { cents: number; quoteOnly: boolean; zone: RentalDeliveryZone | null } {
  const zone = getRentalDeliveryZone(input.zoneId);
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
