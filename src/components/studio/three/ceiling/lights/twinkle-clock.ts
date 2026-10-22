/**
 * One low-fps clock for every twinkling sparkle cloud. All clouds share the
 * `twinkleTime` uniform; while idle the clock invalidates each canvas once
 * per tick (and only when a twinkling cloud is in view). It stops entirely
 * while the camera or a drag is already rendering, while the tab is hidden,
 * and under prefers-reduced-motion (time then stays frozen: a static
 * scatter of brighter and dimmer bulbs).
 */
import {
  isStudioInteracting,
  subscribeStudioInteraction,
} from "../../interaction-store";

/** ≤ 4 idle redraws per second for the whole page. */
const TICK_MS = 250;
/** Wrap seconds so float32 `sin(uTime * speed)` keeps its precision. */
const TIME_WRAP = 3600;

/** Shared shader uniform (seconds). */
export const twinkleTime = { value: 0 };

export type TwinkleSubscriber = {
  /** R3F `invalidate` of the cloud's canvas; deduped per tick. */
  invalidate: () => void;
  /** Cheap frustum test; clouds out of view don't wake the canvas. */
  isVisible: () => boolean;
};

const subscribers = new Set<TwinkleSubscriber>();
let timer = 0;
let reducedMotion: MediaQueryList | null = null;
let detach: (() => void) | null = null;

function motionAllowed() {
  return !reducedMotion?.matches;
}

/** Advance the shared time; called before a twinkling cloud draws (any frame, any reason). */
export function syncTwinkleTime() {
  if (motionAllowed()) twinkleTime.value = (performance.now() / 1000) % TIME_WRAP;
}

function tick() {
  const targets = new Set<() => void>();
  for (const subscriber of subscribers) {
    if (!targets.has(subscriber.invalidate) && subscriber.isVisible()) {
      targets.add(subscriber.invalidate);
    }
  }
  for (const invalidate of targets) invalidate();
}

function update() {
  const run =
    subscribers.size > 0 &&
    document.visibilityState === "visible" &&
    !isStudioInteracting() &&
    motionAllowed();
  if (run && !timer) timer = window.setInterval(tick, TICK_MS);
  else if (!run && timer) {
    window.clearInterval(timer);
    timer = 0;
  }
}

function attach() {
  reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  const unsubscribe = subscribeStudioInteraction(update);
  document.addEventListener("visibilitychange", update);
  reducedMotion?.addEventListener("change", update);
  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", update);
    reducedMotion?.removeEventListener("change", update);
  };
}

/** Registers a twinkling cloud; returns the unsubscribe. */
export function subscribeTwinkle(subscriber: TwinkleSubscriber) {
  subscribers.add(subscriber);
  detach ??= attach();
  update();
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      detach?.();
      detach = null;
    }
    update();
  };
}
