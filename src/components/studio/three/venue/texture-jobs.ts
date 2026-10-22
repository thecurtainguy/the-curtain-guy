/**
 * Schedules procedural venue map generation: a small Web Worker pool with a
 * priority queue (previews before full-size maps), falling back to
 * time-sliced main-thread generation in idle callbacks when workers or
 * OffscreenCanvas are unavailable.
 */
import {
  generateVenueMaps,
  type Canvas2DFactory,
  type VenueMapData,
  type VenueMapSpec,
} from "./texture-gen";
import type { VenueWorkerRequest, VenueWorkerResponse } from "./texture-worker";

type JobState = "queued" | "running" | "done" | "cancelled";

type Job = {
  id: number;
  spec: VenueMapSpec;
  size: number;
  /** Lower runs first. */
  priority: number;
  state: JobState;
  /** Running time-sliced on the main thread (abortable). */
  onMain: boolean;
  onDone: (data: VenueMapData, ms: number) => void;
};

export type VenueMapJob = {
  readonly state: JobState;
  /** Drops queued and main-thread jobs; a job already running in a worker still delivers. */
  cancel(): void;
};

type Slot = { worker: Worker; job: Job | null; dead: boolean; ready: boolean };

/** A worker that hasn't booted by then is treated as failed (main-thread fallback). */
const WORKER_BOOT_MS = 15000;

let nextId = 1;
const queue: Job[] = [];
const mainQueue: Job[] = [];
let mainBusy = false;
let slots: Slot[] | null = null;

function poolSize() {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  return Math.max(1, Math.min(2, cores - 1));
}

function spawnWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    // Classic worker: Turbopack's worker runtime loads chunks with importScripts.
    return new Worker(new URL("./texture-worker.ts", import.meta.url), { name: "venue-textures" });
  } catch {
    return null;
  }
}

function ensureSlots(): Slot[] {
  if (slots) return slots;
  slots = [];
  for (let i = 0; i < poolSize(); i++) {
    const worker = spawnWorker();
    if (!worker) break;
    const slot: Slot = { worker, job: null, dead: false, ready: false };
    const boot = setTimeout(() => {
      if (!slot.ready) onWorkerFailed(slot);
    }, WORKER_BOOT_MS);
    worker.addEventListener("message", (event: MessageEvent<VenueWorkerResponse>) => {
      if ("ready" in event.data) {
        clearTimeout(boot);
        slot.ready = true;
        pump();
        return;
      }
      onWorkerMessage(slot, event.data);
    });
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      clearTimeout(boot);
      onWorkerFailed(slot);
    });
    slots.push(slot);
  }
  return slots;
}

function takeNext(list: Job[]): Job | undefined {
  let best = -1;
  for (let i = 0; i < list.length; i++) {
    if (best < 0 || list[i].priority < list[best].priority) best = i;
  }
  return best < 0 ? undefined : list.splice(best, 1)[0];
}

function pump() {
  const live = ensureSlots().filter((slot) => !slot.dead);
  if (!live.length) {
    while (queue.length) mainQueue.push(queue.shift()!);
    pumpMain();
    return;
  }
  for (const slot of live) {
    if (slot.job || !slot.ready) continue;
    const job = takeNext(queue);
    if (!job) break;
    job.state = "running";
    slot.job = job;
    const message: VenueWorkerRequest = { id: job.id, spec: job.spec, size: job.size };
    slot.worker.postMessage(message);
  }
}

function onWorkerMessage(slot: Slot, message: Exclude<VenueWorkerResponse, { ready: true }>) {
  const job = slot.job;
  slot.job = null;
  if (job && job.id === message.id) {
    if (message.ok) {
      if (job.state === "running") {
        job.state = "done";
        job.onDone(
          {
            width: message.width,
            height: message.height,
            color: message.color,
            normal: message.normal,
            rough: message.rough,
          },
          message.ms
        );
      }
    } else if (job.state === "running") {
      job.state = "queued";
      mainQueue.push(job);
      pumpMain();
    }
  }
  pump();
}

function onWorkerFailed(slot: Slot) {
  if (slot.dead) return;
  slot.dead = true;
  slot.worker.terminate();
  const job = slot.job;
  slot.job = null;
  if (job && job.state === "running") {
    job.state = "queued";
    queue.push(job);
  }
  pump();
}

/* ---------------------------------------------------- main-thread fallback */

const domCanvas: Canvas2DFactory = (w, h) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext("2d", { willReadFrequently: true })!;
};

const SLICE_MS = 8;

function idle(fn: () => void) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 150 });
  else setTimeout(fn, 16);
}

function pumpMain() {
  if (mainBusy) return;
  const job = takeNext(mainQueue);
  if (!job) return;
  mainBusy = true;
  job.state = "running";
  job.onMain = true;
  const gen = generateVenueMaps(job.spec, job.size, domCanvas);
  let spent = 0;
  const slice = () => {
    if (job.state !== "running") {
      mainBusy = false;
      pumpMain();
      return;
    }
    const start = performance.now();
    let step = gen.next();
    while (!step.done && performance.now() - start < SLICE_MS) step = gen.next();
    spent += performance.now() - start;
    if (!step.done) {
      idle(slice);
      return;
    }
    job.state = "done";
    mainBusy = false;
    job.onDone(step.value, spent);
    pumpMain();
  };
  idle(slice);
}

/* ------------------------------------------------------------------ API */

/** Queues one finish at `size`; `onDone` receives transferable-backed pixel data. */
export function requestVenueMaps(
  spec: VenueMapSpec,
  size: number,
  priority: number,
  onDone: (data: VenueMapData, ms: number) => void
): VenueMapJob {
  const job: Job = { id: nextId++, spec, size, priority, state: "queued", onMain: false, onDone };
  queue.push(job);
  pump();
  return {
    get state() {
      return job.state;
    },
    cancel() {
      if (job.state !== "queued" && !(job.state === "running" && job.onMain)) return;
      job.state = "cancelled";
      for (const list of [queue, mainQueue]) {
        const index = list.indexOf(job);
        if (index >= 0) list.splice(index, 1);
      }
    },
  };
}
