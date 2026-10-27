"use client";

import { useEffect, useRef } from "react";

const GAP_PX = 16;

/**
 * Two-way sticky side rail. Short rails pin to the top. Rails taller than the
 * viewport move with the page until an edge is visible, then pin there: scrolling
 * down reveals and holds the bottom, scrolling up reveals and holds the top.
 * Apply `sticky` positioning via className; this hook drives `top`.
 */
export function useStickyRail<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const scroller = findScrollParent(element);
    const target: HTMLElement | Window = scroller ?? window;
    const viewportHeight = () => (scroller ? scroller.clientHeight : window.innerHeight);
    const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);

    let top = GAP_PX;
    let lastScroll = scrollTop();
    let frame = 0;

    const minTop = () => Math.min(GAP_PX, viewportHeight() - element.offsetHeight - GAP_PX);
    const apply = (next: number) => {
      top = Math.max(minTop(), Math.min(GAP_PX, next));
      element.style.top = `${top}px`;
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = scrollTop();
        apply(top - (current - lastScroll));
        lastScroll = current;
      });
    };
    const onResize = () => apply(top);

    apply(top);
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(element);
    if (scroller) observer.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return ref;
}

function findScrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}
