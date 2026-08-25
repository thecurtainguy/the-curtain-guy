"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

function readStoredCollapsed(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
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
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsedState(readStoredCollapsed(storageKey));
    setHydrated(true);
  }, [storageKey]);

  const setCollapsed = useCallback(
    (next: boolean) => {
      setCollapsedState(next);
      try {
        window.localStorage.setItem(storageKey, next ? "true" : "false");
      } catch {
        /* ignore quota / private mode */
      }
    },
    [storageKey]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = useMemo<PortalSidebarContextValue>(
    () => ({
      collapsed: hydrated ? collapsed : false,
      isRail: forceExpanded ? false : hydrated ? collapsed : false,
      toggleCollapsed,
      setCollapsed,
    }),
    [collapsed, forceExpanded, hydrated, setCollapsed, toggleCollapsed]
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
