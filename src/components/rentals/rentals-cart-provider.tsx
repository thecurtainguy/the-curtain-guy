"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { RentalCartLine } from "@/data/rentals";
import { cartSubtotalCents } from "@/lib/rentals";

const STORAGE_KEY = "tcg-rentals-cart-v1";

type StoredCart = {
  version: 1;
  lines: RentalCartLine[];
  updatedAt: string;
};

type RentalsCartContextValue = {
  lines: RentalCartLine[];
  hydrated: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  openSheet: () => void;
  closeSheet: () => void;
  addLines: (lines: RentalCartLine[]) => void;
  removeByParentKey: (parentKey: string) => void;
  clear: () => void;
  subtotalCents: number;
  itemCount: number;
};

const RentalsCartContext = createContext<RentalsCartContextValue | null>(null);

const EMPTY_LINES: RentalCartLine[] = [];
let cachedLines: RentalCartLine[] = EMPTY_LINES;
let didHydrateFromStorage = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function parseStoredCart(): RentalCartLine[] {
  if (typeof window === "undefined") return EMPTY_LINES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_LINES;
    const parsed = JSON.parse(raw) as StoredCart;
    if (parsed?.version !== 1 || !Array.isArray(parsed.lines)) {
      return EMPTY_LINES;
    }
    return parsed.lines.length ? parsed.lines : EMPTY_LINES;
  } catch {
    return EMPTY_LINES;
  }
}

function ensureHydratedFromStorage() {
  if (didHydrateFromStorage || typeof window === "undefined") return;
  didHydrateFromStorage = true;
  cachedLines = parseStoredCart();
}

function writeStoredCart(lines: RentalCartLine[]) {
  const next = lines.length ? lines : EMPTY_LINES;
  cachedLines = next;
  didHydrateFromStorage = true;
  if (typeof window !== "undefined") {
    const payload: StoredCart = {
      version: 1,
      lines: next === EMPTY_LINES ? [] : next,
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

function getClientSnapshot(): RentalCartLine[] {
  ensureHydratedFromStorage();
  return cachedLines;
}

function getServerSnapshot(): RentalCartLine[] {
  return EMPTY_LINES;
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
  const lines = useSyncExternalStore(
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

  const addLines = useCallback((incoming: RentalCartLine[]) => {
    if (!incoming.length) return;
    const parentKey = groupParentKey(incoming);
    const prev = getClientSnapshot();
    const filtered =
      parentKey != null
        ? prev.filter((line) => !isInGroup(line, parentKey))
        : prev;
    writeStoredCart([...filtered, ...incoming]);
    setSheetOpen(true);
  }, []);

  const removeByParentKey = useCallback((parentKey: string) => {
    writeStoredCart(
      getClientSnapshot().filter((line) => !isInGroup(line, parentKey))
    );
  }, []);

  const clear = useCallback(() => {
    writeStoredCart([]);
  }, []);

  const value = useMemo<RentalsCartContextValue>(() => {
    const mains = lines.filter((line) => line.lineKind === "main");
    return {
      lines,
      hydrated,
      sheetOpen,
      setSheetOpen,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
      addLines,
      removeByParentKey,
      clear,
      subtotalCents: cartSubtotalCents(lines),
      itemCount: mains.length,
    };
  }, [lines, hydrated, sheetOpen, addLines, removeByParentKey, clear]);

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
