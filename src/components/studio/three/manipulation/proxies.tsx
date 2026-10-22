"use client";

import type { ThreeEvent } from "@react-three/fiber";
import {
  SEATED_OBJECT_TYPES,
  type StudioDrapeRun,
  type StudioObject,
  type StudioOpening,
  type StudioTreatment,
} from "@/data/studio";
import { getDrapeRunSegments } from "@/lib/studio-door-gaps";
import {
  getPointAlongWall,
  type StudioBounds,
} from "@/lib/studio-geometry";
import { memo, useMemo } from "react";
import type * as THREE from "three";
import {
  layoutSeating,
  resolveChairStyle,
  resolveSeatingCount,
} from "../objects/layout";
import {
  SCALE,
  getObjectVerticalExtent,
  getWallItemSpan,
  getWallItemVertical,
  toWorld,
  type WallFrame,
  type WallItem,
  type WallItemKind,
} from "./drag-math";

export type ProxyKind = "object" | WallItemKind | "ceiling";

export type ProxyTarget = {
  kind: ProxyKind;
  id: string;
  locked: boolean;
  /** False when dragging the body can't move it (room-wide ceiling rows). */
  movable?: boolean;
};

export type ProxyEvents = {
  /** Returns true when the item claimed the gesture (drag session started). */
  onPointerDown: (event: ThreeEvent<PointerEvent>, target: ProxyTarget) => boolean;
  onClick: (event: ThreeEvent<MouseEvent>, target: ProxyTarget) => void;
  onDoubleClick: (event: ThreeEvent<MouseEvent>, target: ProxyTarget) => void;
  onContextMenu: (event: ThreeEvent<MouseEvent>, target: ProxyTarget) => void;
  onHover: (target: ProxyTarget | null) => void;
};

export type ProxyUserData = {
  studioProxy: true;
  lowPriority: boolean;
  target: ProxyTarget;
};

/** Pick slab thickness for wall items, feet. */
const WALL_PROXY_DEPTH = 0.5;
/**
 * Inches from the wall to a wall item's pick slab, matching where it hangs:
 * openings sit in the wall, drapes hang just off it, treatments stand in
 * front of the drapes and the ceremony arch stands well clear.
 */
function wallProxyInset(kind: WallItemKind, item: WallItem): number {
  if (kind === "opening") return 2;
  if (kind === "drape") return 4;
  return (item as StudioTreatment).type === "ceremony_arch" ? 19 : 10;
}
/** Inches each later item in the arrange order stands nearer, so it wins where same-kind items overlap. */
const WALL_PROXY_STACK_STEP = 0.4;

type Hit = THREE.Intersection & { eventObject: THREE.Object3D };

function isSeeThrough(object: THREE.Object3D): boolean {
  if (!object.visible) return true;
  const material = (object as THREE.Mesh).material as
    | THREE.Material
    | THREE.Material[]
    | undefined;
  if (!material) return false;
  const list = Array.isArray(material) ? material : [material];
  return list.every(
    (entry) => !entry.visible || (entry.transparent && entry.opacity < 0.6)
  );
}

/**
 * Whether this proxy should own the event. Proxies yield to handle grips, a
 * low-priority proxy (ceiling canopy) yields to anything under it, and an
 * opaque non-proxy surface (a wall) in front blocks the proxy.
 */
export function proxyClaimsEvent(
  event: ThreeEvent<PointerEvent | MouseEvent>,
  lowPriority: boolean
): boolean {
  const hits = event.intersections as Hit[];
  for (const hit of hits) {
    const data = hit.eventObject.userData;
    if (data?.studioGizmo && data.gizmoPriority === "high") return false;
  }
  if (lowPriority) {
    const other = hits.some(
      (hit) =>
        hit.eventObject !== event.eventObject &&
        hit.eventObject.userData?.studioProxy &&
        !hit.eventObject.userData?.lowPriority
    );
    if (other) return false;
  }
  for (const hit of hits) {
    if (hit.eventObject === event.eventObject) break;
    if (hit.distance >= event.distance - 1e-3) break;
    if (hit.eventObject.userData?.studioProxy) continue;
    if (isSeeThrough(hit.object)) continue;
    return false;
  }
  return true;
}

/**
 * Every item whose pick proxy lies on the event's ray, nearest first,
 * stopping at the first solid non-proxy surface (a wall hides what's behind).
 */
export function proxyStackAt(event: ThreeEvent<PointerEvent | MouseEvent>): ProxyTarget[] {
  const stack: ProxyTarget[] = [];
  for (const hit of event.intersections as Hit[]) {
    const data = hit.eventObject.userData;
    if (data?.studioProxy && data.target) {
      const target = data.target as ProxyTarget;
      if (!stack.some((entry) => entry.id === target.id)) stack.push(target);
    } else if (!data?.studioGizmo && !isSeeThrough(hit.object)) {
      break;
    }
  }
  return stack;
}

/**
 * Ceiling designs: seen from below they pick like anything else; seen from
 * above (looking down through the fabric) they yield to every floor-level
 * proxy on the ray, so tables under a canopy stay clickable.
 */
export function ceilingProxyClaimsEvent(
  event: ThreeEvent<PointerEvent | MouseEvent>
): boolean {
  return proxyClaimsEvent(event, event.ray.direction.y < -0.05);
}

function ProxyMesh({
  target,
  position,
  rotationY,
  size,
  lowPriority,
  events,
}: {
  target: ProxyTarget;
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  lowPriority: boolean;
  events: ProxyEvents;
}) {
  const userData: ProxyUserData = { studioProxy: true, lowPriority, target };
  return (
    <mesh
      position={position}
      rotation={[0, rotationY, 0]}
      visible={false}
      userData={userData}
      onPointerOver={(event) => {
        if (!proxyClaimsEvent(event, lowPriority)) return;
        event.stopPropagation();
        events.onHover(target);
      }}
      onPointerOut={() => events.onHover(null)}
      onPointerDown={(event) => {
        if (!proxyClaimsEvent(event, lowPriority)) return;
        // R3F-only: keeps gizmos behind from firing. The in-room camera
        // listens natively, so unclaimed presses still look around.
        event.stopPropagation();
        events.onPointerDown(event, target);
      }}
      onClick={(event) => {
        if (!proxyClaimsEvent(event, lowPriority)) return;
        event.stopPropagation();
        events.onClick(event, target);
      }}
      onDoubleClick={(event) => {
        if (!proxyClaimsEvent(event, lowPriority)) return;
        event.stopPropagation();
        events.onDoubleClick(event, target);
      }}
      onContextMenu={(event) => {
        if (!proxyClaimsEvent(event, lowPriority)) return;
        event.stopPropagation();
        events.onContextMenu(event, target);
      }}
    >
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Half the footprint of an auto-arranged chair, feet. */
const CHAIR_HALF = 0.85;

/**
 * Object-local pick box (feet): the footprint, grown to cover the chair
 * ring the scene draws around seated objects.
 */
function getPickBox(object: StudioObject, showSeating: boolean) {
  const halfW = Math.max(6, object.width) * SCALE * 0.5;
  const halfD = Math.max(6, object.depth) * SCALE * 0.5;
  let minX = -halfW;
  let maxX = halfW;
  let minZ = -halfD;
  let maxZ = halfD;
  let seated = false;
  if (
    showSeating &&
    SEATED_OBJECT_TYPES.includes(object.type) &&
    object.type !== "lounge_area" &&
    resolveChairStyle(object) !== "none" &&
    resolveSeatingCount(object) > 0
  ) {
    for (const chair of layoutSeating(object).chairs) {
      minX = Math.min(minX, chair.x - CHAIR_HALF);
      maxX = Math.max(maxX, chair.x + CHAIR_HALF);
      minZ = Math.min(minZ, chair.z - CHAIR_HALF);
      maxZ = Math.max(maxZ, chair.z + CHAIR_HALF);
      seated = true;
    }
  }
  return {
    center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
    size: { x: maxX - minX, z: maxZ - minZ },
    seated,
  };
}

/** Memoized: with a stable `events`, only items whose data changed re-render during a drag. */
export const ObjectProxy = memo(function ObjectProxy({
  object,
  bounds,
  wallHeight,
  showSeating,
  events,
}: {
  object: StudioObject;
  bounds: StudioBounds;
  wallHeight: number;
  showSeating: boolean;
  events: ProxyEvents;
}) {
  const box = useMemo(() => getPickBox(object, showSeating), [object, showSeating]);
  const [x, z] = toWorld(bounds, object);
  const { bottom, top } = getObjectVerticalExtent(object, wallHeight);
  // Chairs stand ~3' tall even around low tables.
  const height = Math.max(4, top - bottom, box.seated ? 36 - bottom : 0);
  const radians = (object.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const offsetX = box.center.x * cos - box.center.z * sin;
  const offsetZ = box.center.x * sin + box.center.z * cos;
  return (
    <ProxyMesh
      target={{ kind: "object", id: object.id, locked: Boolean(object.locked) }}
      position={[x + offsetX, (bottom + height / 2) * SCALE, z + offsetZ]}
      rotationY={-radians}
      size={[box.size.x, height * SCALE, box.size.z]}
      lowPriority={object.type === "ceiling_drape"}
      events={events}
    />
  );
});

export const WallItemProxy = memo(function WallItemProxy({
  kind,
  item,
  wall,
  bounds,
  events,
  openings,
  stackRank,
}: {
  kind: WallItemKind;
  item: WallItem;
  wall: WallFrame;
  bounds: StudioBounds;
  events: ProxyEvents;
  /** Drapes only: hit areas follow the hung pieces so doorways stay clickable. */
  openings?: readonly StudioOpening[];
  /** Position in the arrange order among same-kind items on this wall. */
  stackRank: number;
}) {
  const spans = useMemo(() => {
    if (kind === "drape" && openings) {
      return getDrapeRunSegments(item as StudioDrapeRun, openings);
    }
    const span = getWallItemSpan(kind, item);
    return [{ start: span.start, end: span.end }];
  }, [item, kind, openings]);
  const { bottom, top } = getWallItemVertical(kind, item);
  const inset = wallProxyInset(kind, item) + stackRank * WALL_PROXY_STACK_STEP;
  const target = useMemo(
    () => ({ kind, id: item.id, locked: Boolean(item.locked) }),
    [item.id, item.locked, kind]
  );
  return (
    <>
      {spans.map((span, index) => {
        const start = Math.max(0, Math.min(span.start, wall.length));
        const end = Math.max(start + 1, Math.min(span.end, wall.length));
        const along = getPointAlongWall(wall, (start + end) / 2);
        const [x, z] = toWorld(bounds, {
          x: along.x + wall.normal.x * inset,
          z: along.z + wall.normal.z * inset,
        });
        return (
          <ProxyMesh
            key={index}
            target={target}
            position={[x, ((bottom + top) / 2) * SCALE, z]}
            rotationY={-wall.angle}
            size={[(end - start) * SCALE, Math.max(6, top - bottom) * SCALE, WALL_PROXY_DEPTH]}
            lowPriority={false}
            events={events}
          />
        );
      })}
    </>
  );
});
