"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useState, type ReactNode } from "react";
import * as THREE from "three";
import { GOLD, GOLD_BRIGHT } from "./drag-math";

/**
 * `high` grips (small handles) win over pick proxies anywhere along the ray;
 * `low` grips (the wide rotation band) only get events no proxy claimed.
 */
type GizmoPriority = "high" | "low";
const GIZMO_RENDER_ORDER = 40;

type GizmoPointerDown = (event: ThreeEvent<PointerEvent>) => void;

type GripProps = {
  cursor: string;
  setCursor: (cursor: string) => void;
  onPointerDown: GizmoPointerDown;
  /** Invisible, generous hit volume. */
  pick: ReactNode;
  children: (hovered: boolean) => ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  priority?: GizmoPriority;
};

function GoldMaterial({
  hovered,
  opacity = 1,
}: {
  hovered?: boolean;
  opacity?: number;
}) {
  return (
    <meshBasicMaterial
      color={hovered ? GOLD_BRIGHT : GOLD}
      transparent
      opacity={opacity}
      depthTest={false}
      depthWrite={false}
      toneMapped={false}
      side={THREE.DoubleSide}
    />
  );
}

/** Shared hover/press plumbing for every draggable gizmo part. */
function Grip({
  cursor,
  setCursor,
  onPointerDown,
  pick,
  children,
  position,
  rotation,
  priority = "high",
}: GripProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position} rotation={rotation}>
      {children(hovered)}
      <mesh
        visible={false}
        userData={{ studioGizmo: true, gizmoPriority: priority }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          setCursor(cursor);
        }}
        onPointerOut={() => {
          setHovered(false);
          setCursor("");
        }}
        onPointerDown={(event) => {
          if (event.nativeEvent.button !== 0) return;
          event.stopPropagation();
          onPointerDown(event);
        }}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {pick}
      </mesh>
    </group>
  );
}

/** Gold floor ring with a draggable knob; drag anywhere on it to rotate. */
export function RotationGizmo({
  center,
  radius,
  knobAngle,
  size,
  setCursor,
  onPointerDown,
}: {
  center: [number, number];
  radius: number;
  /** Plan angle (radians, clockwise in plan) of the knob. */
  knobAngle: number;
  size: number;
  setCursor: (cursor: string) => void;
  onPointerDown: GizmoPointerDown;
}) {
  const y = 0.05;
  const knobX = Math.cos(knobAngle) * radius;
  const knobZ = Math.sin(knobAngle) * radius;
  const band = Math.max(0.035, size * 0.16);
  return (
    <group position={[center[0], y, center[1]]}>
      <Grip
        cursor="grab"
        setCursor={setCursor}
        onPointerDown={onPointerDown}
        rotation={[-Math.PI / 2, 0, 0]}
        priority="low"
        pick={<ringGeometry args={[radius - size * 1.4, radius + size * 1.4, 64]} />}
      >
        {(hovered) => (
          <>
            <mesh renderOrder={GIZMO_RENDER_ORDER}>
              <ringGeometry
                args={[radius - band, radius + band, 128]}
              />
              <GoldMaterial hovered={hovered} opacity={hovered ? 0.95 : 0.7} />
            </mesh>
            <mesh renderOrder={GIZMO_RENDER_ORDER - 1}>
              <ringGeometry
                args={[radius - size * 0.9, radius + size * 0.9, 128]}
              />
              <GoldMaterial opacity={hovered ? 0.16 : 0.08} />
            </mesh>
          </>
        )}
      </Grip>
      <Grip
        cursor="grab"
        setCursor={setCursor}
        onPointerDown={onPointerDown}
        position={[knobX, 0.06, knobZ]}
        pick={<sphereGeometry args={[size * 1.9, 16, 12]} />}
      >
        {(hovered) => (
          <>
            <mesh renderOrder={GIZMO_RENDER_ORDER + 2} scale={hovered ? 1.2 : 1}>
              <sphereGeometry args={[size * 0.85, 24, 16]} />
              <GoldMaterial hovered />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={GIZMO_RENDER_ORDER + 1}
            >
              <ringGeometry args={[size * 1.1, size * 1.35, 32]} />
              <GoldMaterial hovered={hovered} opacity={0.85} />
            </mesh>
          </>
        )}
      </Grip>
      {/* Spoke from centre to knob reads as a clock hand. */}
      <mesh
        position={[knobX / 2, 0.01, knobZ / 2]}
        rotation={[0, -knobAngle, 0]}
        renderOrder={GIZMO_RENDER_ORDER - 2}
      >
        <boxGeometry args={[radius, 0.01, Math.max(0.02, size * 0.1)]} />
        <GoldMaterial opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Square corner grips on an object footprint. */
export function ResizeHandles({
  corners,
  rotationY,
  size,
  setCursor,
  onPointerDown,
}: {
  corners: [number, number][];
  rotationY: number;
  size: number;
  setCursor: (cursor: string) => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>, index: number) => void;
}) {
  return (
    <group>
      {corners.map(([x, z], index) => (
        <Grip
          key={index}
          cursor={index % 2 === 0 ? "nwse-resize" : "nesw-resize"}
          setCursor={setCursor}
          onPointerDown={(event) => onPointerDown(event, index)}
          position={[x, size * 0.55, z]}
          rotation={[0, rotationY, 0]}
          pick={<boxGeometry args={[size * 3, size * 2.4, size * 3]} />}
        >
          {(hovered) => (
            <>
              <mesh renderOrder={GIZMO_RENDER_ORDER + 1} scale={hovered ? 1.25 : 1}>
                <boxGeometry args={[size * 1.2, size * 1.1, size * 1.2]} />
                <GoldMaterial hovered={hovered} />
              </mesh>
              <mesh renderOrder={GIZMO_RENDER_ORDER} scale={hovered ? 1.25 : 1}>
                <boxGeometry args={[size * 1.6, size * 0.2, size * 1.6]} />
                <meshBasicMaterial
                  color="#120f0a"
                  transparent
                  opacity={0.75}
                  depthTest={false}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </>
          )}
        </Grip>
      ))}
    </group>
  );
}

/** Vertical double arrow above an elevated object (chandelier, etc.). */
export function ElevationHandle({
  position,
  size,
  setCursor,
  onPointerDown,
}: {
  position: [number, number, number];
  size: number;
  setCursor: (cursor: string) => void;
  onPointerDown: GizmoPointerDown;
}) {
  const stem = size * 4;
  return (
    <Grip
      cursor="ns-resize"
      setCursor={setCursor}
      onPointerDown={onPointerDown}
      position={position}
      pick={<cylinderGeometry args={[size * 1.8, size * 1.8, stem + size * 4, 12]} />}
    >
      {(hovered) => (
        <group scale={hovered ? 1.18 : 1}>
          <mesh renderOrder={GIZMO_RENDER_ORDER}>
            <cylinderGeometry args={[size * 0.18, size * 0.18, stem, 10]} />
            <GoldMaterial hovered={hovered} />
          </mesh>
          <mesh position={[0, stem / 2 + size * 0.6, 0]} renderOrder={GIZMO_RENDER_ORDER + 1}>
            <coneGeometry args={[size * 0.7, size * 1.3, 18]} />
            <GoldMaterial hovered={hovered} />
          </mesh>
          <mesh
            position={[0, -stem / 2 - size * 0.6, 0]}
            rotation={[Math.PI, 0, 0]}
            renderOrder={GIZMO_RENDER_ORDER + 1}
          >
            <coneGeometry args={[size * 0.7, size * 1.3, 18]} />
            <GoldMaterial hovered={hovered} />
          </mesh>
        </group>
      )}
    </Grip>
  );
}

/** Two gold end grips for resizing a wall item's span. */
export function SpanHandles({
  ends,
  rotationY,
  height,
  size,
  setCursor,
  onPointerDown,
}: {
  ends: [[number, number, number], [number, number, number]];
  rotationY: number;
  /** Feet — height of the grip bar. */
  height: number;
  size: number;
  setCursor: (cursor: string) => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>, end: "start" | "end") => void;
}) {
  const bar = Math.max(size * 3, Math.min(height * 0.5, size * 9));
  return (
    <group>
      {ends.map((position, index) => (
        <Grip
          key={index}
          cursor="ew-resize"
          setCursor={setCursor}
          onPointerDown={(event) =>
            onPointerDown(event, index === 0 ? "start" : "end")
          }
          position={position}
          rotation={[0, rotationY, 0]}
          pick={<boxGeometry args={[size * 3.2, bar + size * 3, size * 3.2]} />}
        >
          {(hovered) => (
            <group scale={hovered ? 1.2 : 1}>
              <mesh renderOrder={GIZMO_RENDER_ORDER}>
                <boxGeometry args={[size * 0.5, bar, size * 0.5]} />
                <GoldMaterial hovered={hovered} />
              </mesh>
              <mesh renderOrder={GIZMO_RENDER_ORDER + 1}>
                <sphereGeometry args={[size * 0.9, 20, 14]} />
                <GoldMaterial hovered />
              </mesh>
            </group>
          )}
        </Grip>
      ))}
    </group>
  );
}
