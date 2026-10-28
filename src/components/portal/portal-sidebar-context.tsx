"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

type PortalSidebarContextValue = {
  /** True when desktop rail is collapsed (ignored when forceExpanded). */
  collapsed: boolean;
  /** Effective icon-only mode for rendering. */
  isRail: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (next: boolean) => void;
};

const PortalSidebarContext = createContext<PortalSidebarContextValue | null>(
  null
);

/** Fallback when localStorage is unavailable (private mode), so toggling still works this session. */
const memoryCollapsed = new Map<string, boolean>();
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    collapsedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStoredCollapsed(storageKey: string): boolean {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) return stored === "true";
  } catch {
    /* fall through to memory */
  }
  return memoryCollapsed.get(storageKey) ?? false;
}

export function PortalSidebarProvider({
  storageKey,
  forceExpanded = false,
  children,
}: {
  storageKey: string;
  /** Mobile sheet / drawer — always show full labels. */
  forceExpanded?: boolean;
  children: React.ReactNode;
}) {
  // Server and hydration render expanded; the stored preference applies right after.
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    () => readStoredCollapsed(storageKey),
    () => false
  );

  const setCollapsed = useCallback(
    (next: boolean) => {
      memoryCollapsed.set(storageKey, next);
      try {
        window.localStorage.setItem(storageKey, next ? "true" : "false");
      } catch {
        /* ignore quota / private mode */
      }
      collapsedListeners.forEach((listener) => listener());
    },
    [storageKey]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = useMemo<PortalSidebarContextValue>(
    () => ({
      collapsed,
      isRail: forceExpanded ? false : collapsed,
      toggleCollapsed,
      setCollapsed,
    }),
    [collapsed, forceExpanded, setCollapsed, toggleCollapsed]
  );

  return (
    <PortalSidebarContext.Provider value={value}>
      {children}
    </PortalSidebarContext.Provider>
  );
}

export function usePortalSidebar() {
  const ctx = useContext(PortalSidebarContext);
  if (!ctx) {
    return {
      collapsed: false,
      isRail: false,
      toggleCollapsed: () => {},
      setCollapsed: () => {},
    } satisfies PortalSidebarContextValue;
  }
  return ctx;
}

export const PORTAL_SIDEBAR_WIDTH_EXPANDED = 260;
export const PORTAL_SIDEBAR_WIDTH_COLLAPSED = 72;
