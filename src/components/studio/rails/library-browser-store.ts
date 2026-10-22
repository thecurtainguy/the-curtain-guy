"use client";

import { useSyncExternalStore } from "react";

/** `event` only exists when the studio is opened from the event builder. */
export type LibraryTab = "event" | "room" | "drapery" | "ceiling" | "furniture" | "layouts";

type LibraryBrowserState = {
  /** Full-screen "Expand library" dialog. */
  open: boolean;
  tab: LibraryTab;
  query: string;
};

const INITIAL: LibraryBrowserState = { open: false, tab: "room", query: "" };

let state: LibraryBrowserState = INITIAL;
const listeners = new Set<() => void>();

function update(patch: Partial<LibraryBrowserState>) {
  const next = { ...state, ...patch };
  if (next.open === state.open && next.tab === state.tab && next.query === state.query) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Library tab, search and expanded dialog — shared by the rail and its dialog. */
export function useLibraryBrowser(): LibraryBrowserState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}

export function setLibraryBrowserOpen(open: boolean) {
  update({ open });
}

export function toggleLibraryBrowser() {
  update({ open: !state.open });
}

export function setLibraryTab(tab: LibraryTab) {
  update({ tab });
}

export function setLibraryQuery(query: string) {
  update({ query });
}
