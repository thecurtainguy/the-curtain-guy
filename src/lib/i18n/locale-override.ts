"use client";

import { useSyncExternalStore } from "react";
import type { AppLocale } from "@/i18n/routing";

/** Page-scoped locale (e.g. a French quote link) — ignored once the path changes. */
type LocaleOverride = { pathname: string; locale: AppLocale };

let current: LocaleOverride | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocaleOverride(next: LocaleOverride | null) {
  if (
    current?.pathname === next?.pathname &&
    current?.locale === next?.locale
  ) {
    return;
  }
  current = next;
  for (const listener of listeners) listener();
}

export function useLocaleOverride(pathname: string): AppLocale | null {
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
  return value && value.pathname === pathname ? value.locale : null;
}
