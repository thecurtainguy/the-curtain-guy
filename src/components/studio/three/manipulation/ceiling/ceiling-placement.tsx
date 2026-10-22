"use client";

import { useThree } from "@react-three/fiber";
import { Crosshair } from "lucide-react";
import {
  STUDIO_MAX_CEILING_DRAPES,
  getCeilingDrapes,
  type StudioDesignJson,
  type StudioPoint,
} from "@/data/studio";
import {
  addCeilingDrape,
  ceilingRunDrop,
  ceilingRunPoint,
  createCeilingDrape,
  getCeilingLayout,
} from "@/lib/studio-ceiling";
import {
  getPolygonCentroid,
  type StudioBounds,
} from "@/lib/studio-geometry";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import {
  disarmCeilingPlacement,
  type CeilingPlacementRequest,
} from "../../../editor/ceiling-placement-store";
import type {
  StudioEditorActions,
  StudioEditorSettings,
} from "../../../editor/studio-editor-context";
import { GOLD, GOLD_BRIGHT, SCALE, snapTo, toWorld } from "../drag-math";
import { ceilingWorld, pickPlacementPoint } from "./ceiling-geometry";
import { CeilingLine } from "./ceiling-line";

/** Pixels a press may travel and still count as a placing click. */
const CLICK_SLOP = 5;
/** Inches within which the reticle locks onto the room centre. */
const CENTRE_SNAP = 18;
const RUN_SAMPLES = 12;

const reticleMaterial = new THREE.MeshBasicMaterial({
  color: GOLD_BRIGHT,
  transparent: true,
  opacity: 0.9,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
});
const reticleGlowMaterial = new THREE.MeshBasicMaterial({
  color: GOLD,
  transparent: true,
  opacity: 0.18,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
});

/**
 * DOM overlay mounted over the canvas (drei `Html` hides itself when its
 * anchor falls behind the in-room camera, which a fixed hint must not).
 */
function CanvasOverlay({ children }: { children: ReactNode }) {
  const get = useThree((state) => state.get);
  const root = useRef<Root | null>(null);

  useLayoutEffect(() => {
    const parent = get().gl.domElement.parentElement;
    if (!parent) return;
    const element = document.createElement("div");
    element.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:25;";
    parent.appendChild(element);
    const current = createRoot(element);
    root.current = current;
    return () => {
      root.current = null;
      // Unmounting a root synchronously during a parent commit warns.
      window.setTimeout(() => {
        current.unmount();
        element.remove();
      }, 0);
    };
  }, [get]);

  useLayoutEffect(() => {
    root.current?.render(children);
  });

  return null;
}

function PlacementHint({ label, full }: { label: string; full: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-28 flex justify-center">
      <div className="flex max-w-full items-center gap-3 rounded-2xl border border-primary/45 bg-black/75 py-2 pr-4 pl-2 shadow-[0_10px_32px_rgba(0,0,0,0.5)] backdrop-blur-md select-none">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
          <Crosshair className="size-4" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-[0.58rem] leading-none font-semibold tracking-[0.18em] text-primary/80 uppercase">
            {full ? "Ceiling designs full" : "Place on ceiling"}
          </span>
          <span className="truncate font-heading text-[0.82rem] leading-tight text-foreground">
            {full
              ? `Remove a ceiling design to add ${label} · Esc to cancel`
              : `Click the ceiling to place ${label} · Esc to cancel`}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Gold reticle + wireframe preview of the armed design under the pointer. */
function PlacementPreview({
  design,
  bounds,
  request,
  point,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  request: CeilingPlacementRequest;
  point: StudioPoint;
}) {
  const floor = design.room.floor;
  const wallHeight = design.room.wallHeight;
  const segments = useMemo(() => {
    const drape = createCeilingDrape(request.style, floor, {
      ...request.overrides,
      hubX: point.x,
      hubZ: point.z,
      x: point.x,
      z: point.z,
    });
    const layout = getCeilingLayout(drape, floor);
    const world = (at: StudioPoint, drop: number) =>
      ceilingWorld(bounds, wallHeight, at, drop);
    const result: Array<[number, number, number]> = [];
    for (let index = 0; index < layout.outline.length; index += 1) {
      const a = layout.outline[index];
      const b = layout.outline[(index + 1) % layout.outline.length];
      result.push(world(a, 1), world(b, 1));
    }
    for (const run of layout.runs) {
      let previous = world(ceilingRunPoint(run, 0), ceilingRunDrop(drape, run, 0));
      for (let step = 1; step <= RUN_SAMPLES; step += 1) {
        const t = step / RUN_SAMPLES;
        const next = world(ceilingRunPoint(run, t), ceilingRunDrop(drape, run, t));
        result.push(previous, next);
        previous = next;
      }
    }
    for (const drop of layout.drops) {
      result.push(world(drop, 0), world(drop, drape.sag));
    }
    return result;
  }, [bounds, floor, point, request, wallHeight]);

  const [x, z] = toWorld(bounds, point);
  const y = wallHeight * SCALE - 0.06;
  return (
    <group>
      {segments.length > 1 ? (
        <CeilingLine
          points={segments}
          segments
          color={GOLD}
          lineWidth={1.3}
          opacity={0.75}
          renderOrder={30}
        />
      ) : null}
      <group position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={reticleGlowMaterial} renderOrder={31}>
          <circleGeometry args={[1.6, 48]} />
        </mesh>
        <mesh material={reticleMaterial} renderOrder={32}>
          <ringGeometry args={[1.05, 1.2, 64]} />
        </mesh>
        <mesh material={reticleMaterial} renderOrder={32}>
          <ringGeometry args={[0.16, 0.26, 32]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * "Place on ceiling" mode: the reticle follows the pointer across the
 * ceiling; a click (not a drag — drags still look around) creates the armed
 * design there, selects it and disarms. Escape disarms.
 */
export function CeilingPlacement({
  design,
  bounds,
  request,
  actions,
  settings,
}: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  request: CeilingPlacementRequest;
  actions: StudioEditorActions;
  settings: StudioEditorSettings;
}) {
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const [point, setPoint] = useState<StudioPoint | null>(null);
  const full = getCeilingDrapes(design).length >= STUDIO_MAX_CEILING_DRAPES;

  /* Latest values for the native listeners, without re-binding them. */
  const latest = useRef({ design, bounds, request, actions, settings, full });
  useLayoutEffect(() => {
    latest.current = { design, bounds, request, actions, settings, full };
  });

  useEffect(() => {
    const domElement = get().gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let frame = 0;
    let pending: PointerEvent | null = null;
    let press: { id: number; x: number; y: number } | null = null;
    let shown: StudioPoint | null = null;
    let cursor = "";

    const pick = (event: MouseEvent): StudioPoint | null => {
      const { design: current, bounds: currentBounds, settings: currentSettings } =
        latest.current;
      const rect = domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, get().camera);
      const floor = current.room.floor;
      const hit = pickPlacementPoint(
        raycaster,
        floor,
        currentBounds,
        current.room.wallHeight
      );
      if (!hit || event.shiftKey) return hit;
      const { snapEnabled, snapIncrement } = currentSettings;
      const centre = getPolygonCentroid(floor);
      const grid = Math.max(1, snapIncrement);
      return {
        x:
          Math.abs(hit.x - centre.x) <= CENTRE_SNAP
            ? centre.x
            : snapEnabled
              ? snapTo(hit.x, grid)
              : hit.x,
        z:
          Math.abs(hit.z - centre.z) <= CENTRE_SNAP
            ? centre.z
            : snapEnabled
              ? snapTo(hit.z, grid)
              : hit.z,
      };
    };

    const flush = () => {
      frame = 0;
      const event = pending;
      pending = null;
      if (!event) return;
      const hit = pick(event);
      const nextCursor = hit && !latest.current.full ? "crosshair" : "";
      if (nextCursor !== cursor) {
        cursor = nextCursor;
        domElement.style.cursor = nextCursor;
      }
      /* Snapped points repeat for many moves; only a new point redraws. */
      if (shown === hit || (shown && hit && shown.x === hit.x && shown.z === hit.z)) {
        return;
      }
      shown = hit;
      setPoint(hit);
      invalidate();
    };

    const onPointerMove = (event: PointerEvent) => {
      pending = event;
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    const onPointerLeave = () => {
      pending = null;
      if (!shown) return;
      shown = null;
      setPoint(null);
      invalidate();
    };
    const onPointerDown = (event: PointerEvent) => {
      press =
        event.button === 0
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
    };
    const onClick = (event: MouseEvent) => {
      const start = press;
      press = null;
      if (!start || event.button !== 0) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP) {
        return;
      }
      const hit = pick(event);
      if (!hit) return;
      // Keep R3F (proxy clicks / pointer-missed deselect) out of a placing click.
      event.stopPropagation();
      event.preventDefault();
      const { design: current, request: armed, actions: currentActions, full: atLimit } =
        latest.current;
      if (atLimit) return;
      const drape = createCeilingDrape(armed.style, current.room.floor, {
        ...armed.overrides,
        hubX: hit.x,
        hubZ: hit.z,
        x: hit.x,
        z: hit.z,
      });
      currentActions.commit(addCeilingDrape(current, drape));
      currentActions.select({ kind: "ceiling", id: drape.id });
      disarmCeilingPlacement();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      disarmCeilingPlacement();
    };

    domElement.addEventListener("pointermove", onPointerMove);
    domElement.addEventListener("pointerleave", onPointerLeave);
    domElement.addEventListener("pointerdown", onPointerDown);
    domElement.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerleave", onPointerLeave);
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      domElement.style.cursor = "";
      invalidate();
    };
  }, [get, invalidate]);

  return (
    <>
      {point && !full ? (
        <PlacementPreview
          design={design}
          bounds={bounds}
          request={request}
          point={point}
        />
      ) : null}
      <CanvasOverlay>
        <PlacementHint label={request.label} full={full} />
      </CanvasOverlay>
    </>
  );
}
