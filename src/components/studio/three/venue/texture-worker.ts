/**
 * Web Worker that renders procedural venue maps off the main thread and
 * transfers the pixel buffers back (see `texture-jobs.ts`).
 */
import {
  generateVenueMaps,
  runToEnd,
  venueMapNeedsCanvas,
  type Canvas2DFactory,
  type VenueMapSpec,
} from "./texture-gen";

export type VenueWorkerRequest = { id: number; spec: VenueMapSpec; size: number };

export type VenueWorkerResponse =
  | { ready: true }
  | {
      id: number;
      ok: true;
      width: number;
      height: number;
      color: Uint8Array;
      normal: Uint8Array;
      rough: Uint8Array;
      ms: number;
    }
  | { id: number; ok: false; error: string; needsMainThread: boolean };

type WorkerScope = {
  onmessage: ((event: MessageEvent<VenueWorkerRequest>) => void) | null;
  postMessage(message: VenueWorkerResponse, transfer?: Transferable[]): void;
};

const scope = self as unknown as WorkerScope;

function offscreenCanvas(): Canvas2DFactory | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  try {
    if (!new OffscreenCanvas(1, 1).getContext("2d")) return null;
  } catch {
    return null;
  }
  return (w, h) =>
    new OffscreenCanvas(w, h).getContext("2d", {
      willReadFrequently: true,
    }) as unknown as CanvasRenderingContext2D;
}

const canvas = offscreenCanvas();

scope.onmessage = (event) => {
  const { id, spec, size } = event.data;
  if (!canvas && venueMapNeedsCanvas(spec)) {
    scope.postMessage({ id, ok: false, error: "no OffscreenCanvas 2D", needsMainThread: true });
    return;
  }
  try {
    const start = performance.now();
    const maps = runToEnd(
      generateVenueMaps(spec, size, canvas ?? (() => {
        throw new Error("canvas unavailable");
      }))
    );
    scope.postMessage({ id, ok: true, ...maps, ms: performance.now() - start }, [
      maps.color.buffer as ArrayBuffer,
      maps.normal.buffer as ArrayBuffer,
      maps.rough.buffer as ArrayBuffer,
    ]);
  } catch (error) {
    scope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      needsMainThread: true,
    });
  }
};

// Jobs are only posted after this, so none can arrive before the handler exists.
scope.postMessage({ ready: true });
