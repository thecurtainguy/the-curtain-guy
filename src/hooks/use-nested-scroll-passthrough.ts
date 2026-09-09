"use client";

import { useEffect, type RefObject } from "react";

/**
 * Nested `overflow-y-auto` regions trap the mouse wheel in Chromium even when
 * they have nothing to scroll. Forward those gestures to the portal scroll root.
 */
export function useNestedScrollPassthrough(
  ref: RefObject<HTMLElement | null>,
  rootSelector = "[data-portal-scroll-root]"
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return;

      const deltaY = event.deltaY;
      if (!deltaY) return;

      const canScroll = el.scrollHeight > el.clientHeight + 1;
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      const blocked =
        !canScroll || (deltaY < 0 && atTop) || (deltaY > 0 && atBottom);

      if (!blocked) return;

      const root =
        (el.closest(rootSelector) as HTMLElement | null) ||
        (document.querySelector(rootSelector) as HTMLElement | null);
      if (!root || root === el) return;

      root.scrollTop += deltaY;
      event.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, rootSelector]);
}
