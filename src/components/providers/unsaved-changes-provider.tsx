"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PendingNavigation =
  | { kind: "href"; href: string }
  | { kind: "back" }
  | { kind: "action"; run: () => void };

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  clearDirty: () => void;
  /** Intercept in-app navigation when dirty; otherwise navigate immediately. */
  requestNavigation: (href: string) => void;
  /** Run an arbitrary leave action after confirm (e.g. close mobile sheet then go). */
  requestLeaveAction: (run: () => void) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

function normalizePath(href: string): string {
  if (!href) return "";
  try {
    if (href.startsWith("http://") || href.startsWith("https://")) {
      return new URL(href).pathname;
    }
  } catch {
    /* ignore */
  }
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function isExternalHref(href: string): boolean {
  return (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("http://") ||
    href.startsWith("https://")
  );
}

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDirty, setIsDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const dirtyRef = useRef(false);
  const guardArmedRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
    setModalOpen(false);
    setPending(null);
  }, []);

  const openLeaveModal = useCallback((next: PendingNavigation) => {
    setPending(next);
    setModalOpen(true);
  }, []);

  const requestNavigation = useCallback(
    (href: string) => {
      if (!href) return;

      if (isExternalHref(href)) {
        if (dirtyRef.current) {
          openLeaveModal({
            kind: "action",
            run: () => {
              window.location.assign(href);
            },
          });
          return;
        }
        window.location.assign(href);
        return;
      }

      const target = normalizePath(href);
      const current = normalizePath(pathname);
      if (target === current) {
        return;
      }

      if (!dirtyRef.current) {
        router.push(href);
        return;
      }

      openLeaveModal({ kind: "href", href });
    },
    [openLeaveModal, pathname, router]
  );

  const requestLeaveAction = useCallback(
    (run: () => void) => {
      if (!dirtyRef.current) {
        run();
        return;
      }
      openLeaveModal({ kind: "action", run });
    },
    [openLeaveModal]
  );

  const cancelLeave = useCallback(() => {
    setModalOpen(false);
    setPending(null);
  }, []);

  const confirmLeave = useCallback(() => {
    const next = pending;
    setIsDirty(false);
    dirtyRef.current = false;
    setModalOpen(false);
    setPending(null);

    if (!next) return;

    if (next.kind === "href") {
      router.push(next.href);
      return;
    }

    if (next.kind === "action") {
      next.run();
      return;
    }

    // Browser back: skip our re-armed guard entries.
    window.setTimeout(() => {
      window.history.go(-2);
    }, 0);
  }, [pending, router]);

  // Native fallback for refresh / close tab / typed URL (cannot be themed).
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Catch ordinary Next/anchor navigation so portal and header links share the
  // same guard without every navigation component needing Studio-specific code.
  useEffect(() => {
    if (!isDirty) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      ) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href) return;
      event.preventDefault();
      requestNavigation(href);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isDirty, requestNavigation]);

  // Best-effort custom modal for browser Back while on a dirty estimate.
  useEffect(() => {
    if (!isDirty) {
      guardArmedRef.current = false;
      return;
    }

    if (!guardArmedRef.current) {
      window.history.pushState({ __tcgEstimateGuard: true }, "");
      guardArmedRef.current = true;
    }

    const onPopState = () => {
      if (!dirtyRef.current) return;
      window.history.pushState({ __tcgEstimateGuard: true }, "");
      openLeaveModal({ kind: "back" });
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [isDirty, openLeaveModal]);

  const value = useMemo(
    () => ({
      isDirty,
      setDirty,
      clearDirty,
      requestNavigation,
      requestLeaveAction,
    }),
    [isDirty, setDirty, clearDirty, requestNavigation, requestLeaveAction]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) cancelLeave();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="border-border/50 bg-card text-foreground sm:max-w-md"
        >
          <DialogHeader className="gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <AlertTriangle className="size-5" aria-hidden />
            </div>
            <DialogTitle className="font-heading text-xl font-semibold">
              Leave this page?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              You have unsaved changes. If you leave now, your latest edits
              will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              className="w-full sm:flex-1"
              onClick={cancelLeave}
            >
              Stay here
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:flex-1"
              onClick={confirmLeave}
            >
              Leave without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error(
      "useUnsavedChanges must be used within UnsavedChangesProvider"
    );
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-op dirty APIs). */
export function useOptionalUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  return (
    ctx ?? {
      isDirty: false,
      setDirty: () => {},
      clearDirty: () => {},
      requestNavigation: (href: string) => {
        if (typeof window !== "undefined") window.location.assign(href);
      },
      requestLeaveAction: (run: () => void) => run(),
    }
  );
}
