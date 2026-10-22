"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { StudioDesignJson } from "@/data/studio";
import type { StudioEventDetails } from "@/data/studio-leads";
import { hasStudioEventDetails } from "./event-details-format";
import { autosaveStudioDraft } from "./lead-client";
import { rememberStudioRoom, type StudioRoomKind } from "./lead-storage";

/** Idle time after the last change before a draft is written. */
const AUTOSAVE_IDLE_MS = 25_000;
/** Continuous editing still writes at least this often. */
const AUTOSAVE_MAX_WAIT_MS = 90_000;
/** Server rejects writes closer together than 10s per row. */
const THROTTLE_RETRY_MS = 11_000;
const NETWORK_RETRY_MS = 30_000;

type AutosaveSnapshot = {
  design: StudioDesignJson;
  title: string;
  details: StudioEventDetails;
};

type UseStudioLeadAutosaveOptions = {
  enabled: boolean;
  kind: StudioRoomKind;
  initialDesignId: string | null;
  /** The template the room started from; unchanged rooms are never written. */
  baselineDesign: StudioDesignJson;
  snapshot: AutosaveSnapshot;
  getRevision: () => number;
  onAutosaved: (revisionAtStart: number) => void;
  onBlocked: (message: string) => void;
};

/**
 * Anonymous server autosave: one studio_designs row per visitor + room,
 * debounced on idle and flushed when the tab is hidden.
 */
export function useStudioLeadAutosave({
  enabled,
  kind,
  initialDesignId,
  baselineDesign,
  snapshot,
  getRevision,
  onAutosaved,
  onBlocked,
}: UseStudioLeadAutosaveOptions) {
  const [designId, setDesignIdState] = useState<string | null>(initialDesignId);
  const designIdRef = useRef<string | null>(initialDesignId);
  const snapshotRef = useRef(snapshot);
  const callbacksRef = useRef({ getRevision, onAutosaved, onBlocked });
  const [baselineJson] = useState(() => JSON.stringify(baselineDesign));
  const pending = useRef(false);
  const firstPendingAt = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const inFlight = useRef<Promise<string | null> | null>(null);
  const blocked = useRef(false);

  useLayoutEffect(() => {
    snapshotRef.current = snapshot;
    callbacksRef.current = { getRevision, onAutosaved, onBlocked };
  });

  const setDesignId = useCallback(
    (id: string | null) => {
      designIdRef.current = id;
      setDesignIdState(id);
      rememberStudioRoom(kind, id);
    },
    [kind]
  );

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const isMeaningful = useCallback(() => {
    const current = snapshotRef.current;
    return (
      designIdRef.current !== null ||
      hasStudioEventDetails(current.details) ||
      JSON.stringify(current.design) !== baselineJson
    );
  }, [baselineJson]);

  const flushRef = useRef<(options?: { keepalive?: boolean; force?: boolean }) => Promise<string | null>>(
    async () => null
  );

  const schedule = useCallback((delay: number) => {
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void flushRef.current();
    }, delay);
  }, [clearTimer]);

  const flush = useCallback(
    async (options: { keepalive?: boolean; force?: boolean } = {}): Promise<string | null> => {
      if (!enabled || blocked.current) return designIdRef.current;
      if (inFlight.current) {
        await inFlight.current;
        if (!pending.current && !options.force) return designIdRef.current;
      }
      if (!pending.current && !options.force) return designIdRef.current;
      if (!isMeaningful()) {
        pending.current = false;
        firstPendingAt.current = null;
        return designIdRef.current;
      }
      clearTimer();
      pending.current = false;
      firstPendingAt.current = null;
      const revisionAtStart = callbacksRef.current.getRevision();
      const current = snapshotRef.current;
      const run = (async () => {
        const result = await autosaveStudioDraft(
          {
            id: designIdRef.current,
            title: current.title,
            design_json: current.design,
            event_details: current.details,
            mode: kind,
          },
          { keepalive: options.keepalive }
        );
        if (result.ok) {
          if (result.id !== designIdRef.current) setDesignId(result.id);
          callbacksRef.current.onAutosaved(revisionAtStart);
          return result.id;
        }
        pending.current = true;
        if (result.status === 429) {
          // The row was written moments ago; the newer state follows shortly.
          schedule(THROTTLE_RETRY_MS);
        } else if (result.status === 403 || result.status === 404) {
          // Row moved to another browser or account: continue as a new room.
          setDesignId(null);
          schedule(1_000);
        } else if (result.status === 409) {
          blocked.current = true;
          pending.current = false;
          callbacksRef.current.onBlocked(result.message);
        } else if (result.status === 0 || result.status >= 500) {
          schedule(NETWORK_RETRY_MS);
        } else {
          // Validation errors wait for the next edit.
          pending.current = false;
        }
        return designIdRef.current;
      })();
      inFlight.current = run;
      try {
        return await run;
      } finally {
        if (inFlight.current === run) inFlight.current = null;
      }
    },
    [clearTimer, enabled, isMeaningful, kind, schedule, setDesignId]
  );

  useLayoutEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  /** Call after every user edit (design, title or event details). */
  const notifyChange = useCallback(() => {
    if (!enabled || blocked.current) return;
    pending.current = true;
    const now = Date.now();
    if (firstPendingAt.current === null) firstPendingAt.current = now;
    const waited = now - firstPendingAt.current;
    schedule(waited >= AUTOSAVE_MAX_WAIT_MS ? 0 : AUTOSAVE_IDLE_MS);
  }, [enabled, schedule]);

  useEffect(() => {
    if (!enabled) return;
    const flushHidden = () => {
      if (pending.current) void flushRef.current({ keepalive: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushHidden();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushHidden);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushHidden);
      clearTimer();
    };
  }, [clearTimer, enabled]);

  /** Writes now (if anything meaningful exists) and returns the row id. */
  const ensureDesignId = useCallback(
    () => flush({ force: designIdRef.current === null }),
    [flush]
  );

  /** Drops the remembered row so the next meaningful edit starts a new one. */
  const startFresh = useCallback(() => setDesignId(null), [setDesignId]);

  /** Ends anonymous autosave for this page (the visitor signed in). */
  const stop = useCallback(() => {
    blocked.current = true;
    pending.current = false;
    clearTimer();
  }, [clearTimer]);

  return { designId, setDesignId, notifyChange, ensureDesignId, startFresh, stop };
}
