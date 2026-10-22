"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  createSparklePoints,
  setSparkleColor,
  setSparkleTwinkle,
} from "./sparkle-points";
import { subscribeTwinkle } from "./twinkle-clock";

/** Fraction of brightness a twinkling point dips by. */
const TWINKLE_DEPTH = 0.55;

/**
 * One cloud of emissive points (a single `THREE.Points` draw). `emission`
 * scales `color` into HDR. With `twinkle`, the cloud joins the shared
 * low-fps twinkle clock, which wakes the demand-driven canvas only while
 * idle, visible and with the cloud inside the camera frustum.
 */
export function SparkleCloud({
  positions,
  seeds,
  size,
  color,
  emission,
  twinkle,
}: {
  positions: Float32Array;
  seeds: Float32Array;
  /** Glowing diameter, feet. */
  size: number;
  color: string;
  emission: number;
  twinkle: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const get = useThree((state) => state.get);
  const points = useMemo(
    () => createSparklePoints(positions, seeds, size),
    [positions, seeds, size]
  );

  useEffect(
    () => () => {
      points.geometry.dispose();
      points.material.dispose();
    },
    [points]
  );

  useEffect(() => {
    setSparkleColor(points, color, emission);
    invalidate();
  }, [color, emission, invalidate, points]);

  useEffect(() => {
    setSparkleTwinkle(points, twinkle ? TWINKLE_DEPTH : 0);
    invalidate();
    if (!twinkle) return;
    const sphere = points.geometry.boundingSphere;
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4();
    return subscribeTwinkle({
      invalidate,
      isVisible: () => {
        if (!sphere) return true;
        const camera = get().camera;
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        return frustum.intersectsSphere(sphere);
      },
    });
  }, [get, invalidate, points, twinkle]);

  return <primitive object={points} />;
}
