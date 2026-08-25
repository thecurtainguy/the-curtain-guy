"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { StudioBounds } from "@/lib/studio-geometry";

const SCALE = 1 / 12;

function getCameraRange(width: number, depth: number, wallHeight: number) {
  const footprintDiagonal = Math.hypot(width, depth) * SCALE;
  const height = wallHeight * SCALE;
  const fitDistance = Math.max(14, footprintDiagonal * 1.08 + height * 0.72);
  return {
    height,
    fitDistance,
    minDistance: Math.max(5, height * 0.58),
    maxDistance: Math.max(52, fitDistance * 2.6),
  };
}

export function StudioCameraControls({
  bounds,
  wallHeight,
  resetSignal,
  fitSignal,
}: {
  bounds: StudioBounds;
  wallHeight: number;
  resetSignal: number;
  fitSignal: number;
}) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const invalidate = useThree((state) => state.invalidate);
  const roomMetrics = useRef({
    width: bounds.width,
    depth: bounds.depth,
    wallHeight,
  });
  const hasMountedResetEffect = useRef(false);
  const currentRange = getCameraRange(
    bounds.width,
    bounds.depth,
    wallHeight
  );

  useEffect(() => {
    roomMetrics.current = {
      width: bounds.width,
      depth: bounds.depth,
      wallHeight,
    };
  }, [bounds.depth, bounds.width, wallHeight]);

  useEffect(() => {
    if (!hasMountedResetEffect.current) {
      hasMountedResetEffect.current = true;
      return;
    }
    const control = controls.current;
    const camera = control?.object;
    if (!control || !camera) return;
    const metrics = roomMetrics.current;
    const range = getCameraRange(
      metrics.width,
      metrics.depth,
      metrics.wallHeight
    );
    const { fitDistance: distance, height, maxDistance } = range;
    const targetY = Math.min(height * 0.4, 5.5);
    const direction = camera.position.set(0.76, 0.48, 0.88).normalize();
    camera.position.copy(direction.multiplyScalar(distance));
    camera.position.y += targetY;
    Object.assign(camera, {
      near: Math.max(0.1, distance / 10000),
      far: Math.max(500, maxDistance * 2),
    });
    camera.updateProjectionMatrix();
    control.target.set(0, targetY, 0);
    control.update();
    invalidate();
  }, [invalidate, resetSignal]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const control = controls.current;
      const camera = control?.object;
      if (!control || !camera) return;
      const metrics = roomMetrics.current;
      const range = getCameraRange(
        metrics.width,
        metrics.depth,
        metrics.wallHeight
      );
      const { fitDistance: distance, height, maxDistance } = range;
      const nextTargetY = Math.min(height * 0.4, 5.5);
      const direction = camera.position
        .clone()
        .sub(control.target)
        .normalize();
      if (direction.lengthSq() < 0.5) direction.set(0.7, 0.6, 0.7).normalize();
      control.target.set(0, nextTargetY, 0);
      camera.position
        .copy(control.target)
        .add(direction.multiplyScalar(distance));
      control.update();
      Object.assign(camera, {
        near: Math.max(0.1, distance / 10000),
        far: Math.max(500, maxDistance * 2),
      });
      camera.updateProjectionMatrix();
      invalidate();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitSignal, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={currentRange.minDistance}
      maxDistance={currentRange.maxDistance}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.12}
      rotateSpeed={0.72}
      zoomSpeed={0.78}
      onChange={() => invalidate()}
    />
  );
}
