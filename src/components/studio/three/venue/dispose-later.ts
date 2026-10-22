/**
 * Disposes replaced materials a moment after the swap. The replacement renders
 * first and reuses the still-live shader program (same cache key), so a finish
 * or mood change never pays for a fresh shader compile on the main thread.
 */
const DISPOSE_DELAY_MS = 1500;

export function disposeLater(items: Iterable<{ dispose(): void } | null | undefined>) {
  const list = [...new Set(items)];
  setTimeout(() => {
    for (const item of list) item?.dispose();
  }, DISPOSE_DELAY_MS);
}
