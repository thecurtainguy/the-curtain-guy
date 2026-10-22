"use client";

import { createContext, useContext } from "react";

/**
 * True for the rails mounted in the desktop shell columns. Rail-sizing
 * controls (expand library, wide inspector) only render there — not in the
 * mobile sheets or embedded copies such as the event brief panel.
 */
const DesktopRailContext = createContext(false);

export function DesktopRailProvider({ children }: { children: React.ReactNode }) {
  return <DesktopRailContext.Provider value>{children}</DesktopRailContext.Provider>;
}

export function useIsDesktopRail(): boolean {
  return useContext(DesktopRailContext);
}
