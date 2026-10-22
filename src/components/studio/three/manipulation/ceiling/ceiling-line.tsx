"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

type Vec3 = [number, number, number];

/** A polyline (or, with `segments`, endpoint pairs) as flat segment pairs. */
function toSegmentPositions(points: readonly Vec3[], segments: boolean): Float32Array {
  if (segments) {
    const out = new Float32Array(points.length * 3);
    points.forEach((point, index) => out.set(point, index * 3));
    return out;
  }
  const count = Math.max(0, points.length - 1);
  const out = new Float32Array(count * 6);
  for (let index = 0; index < count; index += 1) {
    out.set(points[index], index * 6);
    out.set(points[index + 1], index * 6 + 3);
  }
  return out;
}

/**
 * Screen-space fat line for ceiling outlines and previews. Unlike drei
 * `<Line>`, the material lives as long as the component: only the geometry
 * is rebuilt when the points move, so drags and the placement reticle never
 * release (and recompile) the line shader.
 */
export function CeilingLine({
  points,
  segments = false,
  color,
  lineWidth,
  opacity = 1,
  dashed = false,
  dashSize = 0.5,
  gapSize = 0.3,
  depthTest = false,
  renderOrder,
}: {
  points: readonly Vec3[];
  /** Treat `points` as independent segment endpoint pairs. */
  segments?: boolean;
  color: string;
  /** Pixels. */
  lineWidth: number;
  opacity?: number;
  dashed?: boolean;
  /** Feet. */
  dashSize?: number;
  gapSize?: number;
  depthTest?: boolean;
  renderOrder?: number;
}) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const geometry = useMemo(() => {
    const next = new LineSegmentsGeometry();
    next.setPositions(toSegmentPositions(points, segments));
    return next;
  }, [points, segments]);
  const [material] = useState(
    () => new LineMaterial({ transparent: true, depthTest: false, depthWrite: false })
  );
  const [line] = useState(() => new LineSegments2(geometry, material));

  useLayoutEffect(() => {
    if (dashed) line.computeLineDistances();
  }, [dashed, geometry, line]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <primitive object={line} geometry={geometry} renderOrder={renderOrder}>
      <primitive
        object={material}
        attach="material"
        color={color}
        linewidth={lineWidth}
        opacity={opacity}
        dashed={dashed}
        dashSize={dashSize}
        gapSize={gapSize}
        depthTest={depthTest}
        resolution={[width, height]}
      />
    </primitive>
  );
}
