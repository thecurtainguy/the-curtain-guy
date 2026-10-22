"use client";

import type { StudioCeilingDrape, StudioPoint } from "@/data/studio";
import {
  getCeilingLayout,
  insetCeilingPolygon,
  type CeilingLayout,
} from "@/lib/studio-ceiling";
import type { StudioBounds } from "@/lib/studio-geometry";
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { GOLD, GOLD_BRIGHT } from "../drag-math";
import {
  ceilingProxyClaimsEvent,
  type ProxyEvents,
  type ProxyTarget,
} from "../proxies";
import {
  buildCeilingProxyGeometry,
  ceilingWorld,
  isCeilingMovable,
} from "./ceiling-geometry";
import { CeilingLine } from "./ceiling-line";

/** Proxies are invisible but must raycast from both faces. */
const pickMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

const layoutCache = new WeakMap<
  StudioCeilingDrape,
  { floor: StudioPoint[]; layout: CeilingLayout }
>();

/**
 * Layout keyed by the (immutable) drape object, so unchanged designs keep a
 * stable layout — and pick geometry — across renders.
 */
export function getCachedCeilingLayout(
  drape: StudioCeilingDrape,
  floor: StudioPoint[]
): CeilingLayout {
  const cached = layoutCache.get(drape);
  if (cached && cached.floor === floor) return cached.layout;
  const layout = getCeilingLayout(drape, floor);
  layoutCache.set(drape, { floor, layout });
  return layout;
}

/** Invisible pick surface hugging one ceiling design's fabric. */
export const CeilingProxy = memo(function CeilingProxy({
  drape,
  layout,
  bounds,
  wallHeight,
  events,
}: {
  drape: StudioCeilingDrape;
  layout: CeilingLayout;
  bounds: StudioBounds;
  wallHeight: number;
  events: ProxyEvents;
}) {
  const geometry = useMemo(
    () => buildCeilingProxyGeometry(drape, layout, bounds, wallHeight),
    [bounds, drape, layout, wallHeight]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const target: ProxyTarget = {
    kind: "ceiling",
    id: drape.id,
    locked: Boolean(drape.locked),
    movable: isCeilingMovable(drape),
  };
  return (
    <mesh
      geometry={geometry}
      material={pickMaterial}
      visible={false}
      userData={{ studioProxy: true, lowPriority: true, ceilingProxy: true, target }}
      onPointerOver={(event) => {
        if (!ceilingProxyClaimsEvent(event)) return;
        event.stopPropagation();
        events.onHover(target);
      }}
      onPointerOut={() => events.onHover(null)}
      onPointerDown={(event) => {
        if (!ceilingProxyClaimsEvent(event)) return;
        event.stopPropagation();
        events.onPointerDown(event, target);
      }}
      onClick={(event) => {
        if (!ceilingProxyClaimsEvent(event)) return;
        event.stopPropagation();
        events.onClick(event, target);
      }}
      onDoubleClick={(event) => {
        if (!ceilingProxyClaimsEvent(event)) return;
        event.stopPropagation();
        events.onDoubleClick(event, target);
      }}
      onContextMenu={(event) => {
        if (!ceilingProxyClaimsEvent(event)) return;
        event.stopPropagation();
        events.onContextMenu(event, target);
      }}
    />
  );
});

/** Gold outline of a design's coverage just under the ceiling (selected / hovered). */
export const CeilingOutline = memo(function CeilingOutline({
  outline,
  bounds,
  wallHeight,
  variant,
}: {
  outline: StudioPoint[];
  bounds: StudioBounds;
  wallHeight: number;
  variant: "selected" | "hover" | "ghost";
}) {
  const points = useMemo(() => {
    if (outline.length < 3) return null;
    const ring = insetCeilingPolygon(outline, 2).map((point) =>
      ceilingWorld(bounds, wallHeight, point, 1.5)
    );
    ring.push(ring[0]);
    return ring;
  }, [bounds, outline, wallHeight]);
  if (!points) return null;
  const selected = variant === "selected";
  return (
    <CeilingLine
      points={points}
      color={selected ? GOLD_BRIGHT : GOLD}
      lineWidth={selected ? 2.4 : 1.6}
      dashed={variant === "ghost"}
      dashSize={0.5}
      gapSize={0.3}
      opacity={selected ? 0.95 : variant === "ghost" ? 0.7 : 0.55}
      renderOrder={29}
    />
  );
});
