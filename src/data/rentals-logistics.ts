import { formatCadFromCents, type RentalCartLine } from "@/data/rentals";

export const RENTAL_LOGISTICS_MODES = [
  "full_service",
  "transport_only",
  "diy",
] as const;

export type RentalLogisticsMode = (typeof RENTAL_LOGISTICS_MODES)[number];

export const PACKAGE_INCLUDED_LOGISTICS_MODES = [
  "full_service",
  "transport_only",
] as const;

export type PackageIncludedLogisticsMode =
  (typeof PACKAGE_INCLUDED_LOGISTICS_MODES)[number];

/** Default home zone prepaid when a package includes logistics. */
export const DEFAULT_PACKAGE_LOGISTICS_ZONE_ID = "montreal-island";

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

export function isPackageIncludedLogisticsMode(
  value: string | null | undefined
): value is PackageIncludedLogisticsMode {
  return (
    !!value &&
    (PACKAGE_INCLUDED_LOGISTICS_MODES as readonly string[]).includes(value)
  );
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

export function packageLogisticsCoversMode(
  included: PackageIncludedLogisticsMode | null | undefined,
  selected: RentalLogisticsMode
): boolean {
  if (!included || selected === "diy") return false;
  if (included === "full_service") {
    return selected === "full_service" || selected === "transport_only";
  }
  return selected === "transport_only";
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

/** Max prepaid logistics credit from package main lines for the selected mode. */
export function cartLogisticsCreditCents(input: {
  lines: RentalCartLine[];
  mode: RentalLogisticsMode;
  zones?: RentalDeliveryZone[] | null;
}): number {
  if (input.mode === "diy") return 0;
  let credit = 0;
  for (const line of input.lines) {
    if (line.lineKind !== "main") continue;
    const includedMode = line.includedLogisticsMode;
    const includedZoneId = line.includedLogisticsZoneId;
    if (
      !isPackageIncludedLogisticsMode(includedMode) ||
      !includedZoneId ||
      !packageLogisticsCoversMode(includedMode, input.mode)
    ) {
      continue;
    }
    const base = logisticsPriceCents({
      mode: input.mode,
      zoneId: includedZoneId,
      zones: input.zones,
    });
    if (!base.quoteOnly && base.cents > 0) {
      credit = Math.max(credit, base.cents);
    }
  }
  return credit;
}

export type ResolvedCartLogistics = {
  zone: RentalDeliveryZone | null;
  zoneCents: number;
  creditCents: number;
  chargeCents: number;
  quoteOnly: boolean;
  /** Selected zone fee fully covered by package prepaid logistics. */
  fullyIncluded: boolean;
  /** Customer pays only the delta beyond the package home zone. */
  isSurcharge: boolean;
  creditZone: RentalDeliveryZone | null;
};

export function resolveCartLogistics(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
  zones?: RentalDeliveryZone[] | null;
  lines?: RentalCartLine[] | null;
}): ResolvedCartLogistics {
  const priced = logisticsPriceCents(input);
  const creditCents = cartLogisticsCreditCents({
    lines: input.lines || [],
    mode: input.mode,
    zones: input.zones,
  });
  const creditZoneId =
    (input.lines || []).find(
      (line) =>
        line.lineKind === "main" &&
        isPackageIncludedLogisticsMode(line.includedLogisticsMode) &&
        line.includedLogisticsZoneId &&
        packageLogisticsCoversMode(line.includedLogisticsMode, input.mode)
    )?.includedLogisticsZoneId ?? null;
  const creditZone = getRentalDeliveryZone(creditZoneId, input.zones);

  if (input.mode === "diy") {
    return {
      zone: priced.zone,
      zoneCents: 0,
      creditCents: 0,
      chargeCents: 0,
      quoteOnly: false,
      fullyIncluded: false,
      isSurcharge: false,
      creditZone: null,
    };
  }

  if (priced.quoteOnly) {
    return {
      zone: priced.zone,
      zoneCents: 0,
      creditCents,
      chargeCents: 0,
      quoteOnly: true,
      fullyIncluded: false,
      isSurcharge: false,
      creditZone,
    };
  }

  const chargeCents = Math.max(0, priced.cents - creditCents);
  return {
    zone: priced.zone,
    zoneCents: priced.cents,
    creditCents,
    chargeCents,
    quoteOnly: false,
    fullyIncluded: creditCents > 0 && chargeCents === 0,
    isSurcharge: creditCents > 0 && chargeCents > 0,
    creditZone,
  };
}

export const LOGISTICS_LINE_KEY = "logistics:cart";

export function buildCartLogisticsLine(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
  zones?: RentalDeliveryZone[] | null;
  lines?: RentalCartLine[] | null;
}): RentalCartLine | null {
  if (input.mode === "diy") return null;

  const resolved = resolveCartLogistics(input);
  const zoneLabel = resolved.zone?.shortLabel || "Delivery area TBD";
  const creditLabel =
    resolved.creditZone?.shortLabel || "Montreal Island";

  const description =
    input.mode === "full_service"
      ? resolved.fullyIncluded
        ? `Full service included in package · ${creditLabel}`
        : resolved.isSurcharge
          ? `Full service zone surcharge beyond ${creditLabel} · ${zoneLabel}`
          : resolved.quoteOnly
            ? `Full service (transport + install + teardown) · ${zoneLabel} · priced in final quote`
            : `Full service (transport + install + teardown) · ${zoneLabel}`
      : resolved.fullyIncluded
        ? `Transport included in package · ${creditLabel}`
        : resolved.isSurcharge
          ? `Transport zone surcharge beyond ${creditLabel} · ${zoneLabel}`
          : resolved.quoteOnly
            ? `Transport / delivery only · ${zoneLabel} · priced in final quote`
            : `Transport / delivery only · ${zoneLabel}`;

  if (input.mode === "full_service") {
    return {
      key: LOGISTICS_LINE_KEY,
      productId: "logistics-full-service",
      slug: "full-service",
      name: resolved.isSurcharge
        ? "TCG full service surcharge"
        : resolved.fullyIncluded
          ? "TCG full service (included)"
          : "TCG full service",
      description,
      category: "labor",
      kind: "service",
      lineKind: "service",
      imageUrl: null,
      imageAlt: null,
      quantity: 1,
      unitPriceCents: resolved.quoteOnly ? 0 : resolved.chargeCents,
      unitLabel: "event",
      isTaxable: !resolved.quoteOnly && resolved.chargeCents > 0,
    };
  }

  return {
    key: LOGISTICS_LINE_KEY,
    productId: "logistics-transport-only",
    slug: "transport-only",
    name: resolved.isSurcharge
      ? "Transport only surcharge"
      : resolved.fullyIncluded
        ? "Transport only (included)"
        : "Transport only",
    description,
    category: "labor",
    kind: "service",
    lineKind: "service",
    imageUrl: null,
    imageAlt: null,
    quantity: 1,
    unitPriceCents: resolved.quoteOnly ? 0 : resolved.chargeCents,
    unitLabel: "event",
    isTaxable: !resolved.quoteOnly && resolved.chargeCents > 0,
  };
}

export function formatLogisticsEstimateLabel(input: {
  mode: RentalLogisticsMode;
  zoneId: string | null | undefined;
  zones?: RentalDeliveryZone[] | null;
  lines?: RentalCartLine[] | null;
}): string {
  if (input.mode === "diy") return "No TCG logistics";
  if (!input.zoneId) return "Choose delivery area for estimate";
  const resolved = resolveCartLogistics(input);
  if (!resolved.zone) return "Choose delivery area for estimate";
  if (resolved.quoteOnly) return "Subject to quote";
  if (resolved.fullyIncluded) return "Included in package";
  if (resolved.isSurcharge) {
    const home = resolved.creditZone?.shortLabel || "Montreal Island";
    return `+${formatCadFromCents(resolved.chargeCents)} beyond ${home}`;
  }
  return formatCadFromCents(resolved.chargeCents);
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
