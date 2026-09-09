"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { RentalCartLine } from "@/data/rentals";
import {
  DEFAULT_RENTAL_DELIVERY_ZONES,
  buildCartLogisticsLine,
  isRentalDeliveryZoneId,
  isRentalLogisticsMode,
  stripServiceLines,
  type RentalDeliveryZone,
  type RentalDeliveryZoneId,
  type RentalLogisticsMode,
} from "@/data/rentals-logistics";
import { cartSubtotalCents } from "@/lib/rentals";

const STORAGE_KEY = "tcg-rentals-cart-v2";

type StoredCart = {
  version: 2;
  lines: RentalCartLine[];
  logisticsMode: RentalLogisticsMode;
  deliveryZoneId: RentalDeliveryZoneId | null;
  updatedAt: string;
};

type CartSnapshot = {
  lines: RentalCartLine[];
  logisticsMode: RentalLogisticsMode;
  deliveryZoneId: RentalDeliveryZoneId | null;
};

type RentalsCartContextValue = {
  lines: RentalCartLine[];
  logisticsMode: RentalLogisticsMode;
  deliveryZoneId: RentalDeliveryZoneId | null;
  deliveryZones: RentalDeliveryZone[];
  setLogisticsMode: (mode: RentalLogisticsMode) => void;
  setDeliveryZoneId: (zoneId: RentalDeliveryZoneId | null) => void;
  hydrated: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  openSheet: () => void;
  closeSheet: () => void;
  addLines: (lines: RentalCartLine[]) => void;
  removeByParentKey: (parentKey: string) => void;
  setMainQuantity: (parentKey: string, quantity: number) => void;
  clear: () => void;
  /** Product lines only (no logistics). */
  merchandiseSubtotalCents: number;
  /** Merchandise + logistics estimate when zone is known. */
  subtotalCents: number;
  logisticsLine: RentalCartLine | null;
  checkoutLines: RentalCartLine[];
  itemCount: number;
};

const RentalsCartContext = createContext<RentalsCartContextValue | null>(null);

const EMPTY_LINES: RentalCartLine[] = [];
const DEFAULT_SNAPSHOT: CartSnapshot = {
  lines: EMPTY_LINES,
  logisticsMode: "full_service",
  deliveryZoneId: null,
};

let cachedSnapshot: CartSnapshot = DEFAULT_SNAPSHOT;
let didHydrateFromStorage = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function parseStoredCart(zones: RentalDeliveryZone[]): CartSnapshot {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as StoredCart;
      if (parsed?.version === 2 && Array.isArray(parsed.lines)) {
        return {
          lines: stripServiceLines(
            parsed.lines.length ? parsed.lines : EMPTY_LINES
          ),
          logisticsMode: isRentalLogisticsMode(parsed.logisticsMode)
            ? parsed.logisticsMode
            : "full_service",
          deliveryZoneId:
            parsed.deliveryZoneId &&
            isRentalDeliveryZoneId(parsed.deliveryZoneId, zones)
              ? parsed.deliveryZoneId
              : null,
        };
      }
    }

    // Migrate v1 cart lines if present
    const rawV1 = window.localStorage.getItem("tcg-rentals-cart-v1");
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as {
        version?: number;
        lines?: RentalCartLine[];
      };
      if (Array.isArray(parsed.lines) && parsed.lines.length) {
        return {
          lines: stripServiceLines(parsed.lines),
          logisticsMode: "full_service",
          deliveryZoneId: null,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SNAPSHOT;
}

function ensureHydratedFromStorage() {
  if (didHydrateFromStorage || typeof window === "undefined") return;
  didHydrateFromStorage = true;
  cachedSnapshot = parseStoredCart(DEFAULT_RENTAL_DELIVERY_ZONES);
}

function writeStoredCart(next: CartSnapshot) {
  const lines = next.lines.length ? next.lines : EMPTY_LINES;
  cachedSnapshot = {
    lines,
    logisticsMode: next.logisticsMode,
    deliveryZoneId: next.deliveryZoneId,
  };
  didHydrateFromStorage = true;
  if (typeof window !== "undefined") {
    const payload: StoredCart = {
      version: 2,
      lines: lines === EMPTY_LINES ? [] : lines,
      logisticsMode: cachedSnapshot.logisticsMode,
      deliveryZoneId: cachedSnapshot.deliveryZoneId,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureHydratedFromStorage();
  return () => listeners.delete(listener);
}

function getClientSnapshot(): CartSnapshot {
  ensureHydratedFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): CartSnapshot {
  return DEFAULT_SNAPSHOT;
}

function getHydratedClientSnapshot(): boolean {
  return true;
}

function getHydratedServerSnapshot(): boolean {
  return false;
}

function groupParentKey(lines: RentalCartLine[]): string | null {
  const main = lines.find((line) => line.lineKind === "main");
  if (main) return main.key;
  const withParent = lines.find((line) => line.parentKey);
  return withParent?.parentKey ?? lines[0]?.key ?? null;
}

function isInGroup(line: RentalCartLine, parentKey: string): boolean {
  return line.key === parentKey || line.parentKey === parentKey;
}

export function RentalsCartProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<RentalDeliveryZone[]>(
    DEFAULT_RENTAL_DELIVERY_ZONES
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/rentals/delivery-zones");
        const json = (await response.json()) as {
          ok?: boolean;
          zones?: RentalDeliveryZone[];
        };
        if (cancelled || !response.ok || !json.ok || !json.zones?.length) {
          return;
        }
        setDeliveryZones(json.zones);
        const prev = getClientSnapshot();
        if (
          prev.deliveryZoneId &&
          !isRentalDeliveryZoneId(prev.deliveryZoneId, json.zones)
        ) {
          writeStoredCart({ ...prev, deliveryZoneId: null });
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addLines = useCallback((incoming: RentalCartLine[]) => {
    const cleaned = stripServiceLines(incoming);
    if (!cleaned.length) return;
    const parentKey = groupParentKey(cleaned);
    const prev = getClientSnapshot();
    const filtered =
      parentKey != null
        ? prev.lines.filter((line) => !isInGroup(line, parentKey))
        : prev.lines;
    writeStoredCart({
      ...prev,
      lines: [...filtered, ...cleaned],
    });
    setSheetOpen(true);
  }, []);

  const removeByParentKey = useCallback((parentKey: string) => {
    const prev = getClientSnapshot();
    writeStoredCart({
      ...prev,
      lines: prev.lines.filter((line) => !isInGroup(line, parentKey)),
    });
  }, []);

  const setMainQuantity = useCallback((parentKey: string, quantity: number) => {
    const nextQty = Math.max(0, Math.round(Number(quantity) || 0));
    if (nextQty <= 0) {
      const prev = getClientSnapshot();
      writeStoredCart({
        ...prev,
        lines: prev.lines.filter((line) => !isInGroup(line, parentKey)),
      });
      return;
    }
    const prev = getClientSnapshot();
    const main = prev.lines.find(
      (line) => line.key === parentKey && line.lineKind === "main"
    );
    if (!main || main.quantity === nextQty) return;
    const oldQty = main.quantity > 0 ? main.quantity : 1;
    const ratio = nextQty / oldQty;
    writeStoredCart({
      ...prev,
      lines: prev.lines.map((line) => {
        if (line.key === parentKey) {
          return { ...line, quantity: nextQty };
        }
        if (line.parentKey === parentKey && line.lineKind === "include") {
          return {
            ...line,
            quantity: Math.max(0, Math.round(line.quantity * ratio)),
          };
        }
        return line;
      }),
    });
  }, []);

  const clear = useCallback(() => {
    writeStoredCart({
      lines: EMPTY_LINES,
      logisticsMode: "full_service",
      deliveryZoneId: null,
    });
  }, []);

  const setLogisticsMode = useCallback((mode: RentalLogisticsMode) => {
    const prev = getClientSnapshot();
    writeStoredCart({ ...prev, logisticsMode: mode });
  }, []);

  const setDeliveryZoneId = useCallback(
    (zoneId: RentalDeliveryZoneId | null) => {
      const prev = getClientSnapshot();
      writeStoredCart({ ...prev, deliveryZoneId: zoneId });
    },
    []
  );

  const value = useMemo<RentalsCartContextValue>(() => {
    const lines = snapshot.lines;
    const logisticsLine = buildCartLogisticsLine({
      mode: snapshot.logisticsMode,
      zoneId: snapshot.deliveryZoneId,
      zones: deliveryZones,
    });
    // Only attach a priced or quote-only logistics line once a zone is chosen
    // (or DIY which returns null). Mode alone without zone = no line yet.
    const resolvedLogistics =
      snapshot.logisticsMode === "diy"
        ? null
        : snapshot.deliveryZoneId
          ? logisticsLine
          : null;
    const checkoutLines = resolvedLogistics
      ? [...lines, resolvedLogistics]
      : lines;
    const mains = lines.filter((line) => line.lineKind === "main");
    const merchandiseSubtotalCents = cartSubtotalCents(lines);
    return {
      lines,
      logisticsMode: snapshot.logisticsMode,
      deliveryZoneId: snapshot.deliveryZoneId,
      deliveryZones,
      setLogisticsMode,
      setDeliveryZoneId,
      hydrated,
      sheetOpen,
      setSheetOpen,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
      addLines,
      removeByParentKey,
      setMainQuantity,
      clear,
      merchandiseSubtotalCents,
      subtotalCents: cartSubtotalCents(checkoutLines),
      logisticsLine: resolvedLogistics,
      checkoutLines,
      itemCount: mains.length,
    };
  }, [
    snapshot,
    deliveryZones,
    hydrated,
    sheetOpen,
    addLines,
    removeByParentKey,
    setMainQuantity,
    clear,
    setLogisticsMode,
    setDeliveryZoneId,
  ]);

  return (
    <RentalsCartContext.Provider value={value}>
      {children}
    </RentalsCartContext.Provider>
  );
}

export function useRentalsCart() {
  const ctx = useContext(RentalsCartContext);
  if (!ctx) {
    throw new Error("useRentalsCart must be used within RentalsCartProvider");
  }
  return ctx;
}
