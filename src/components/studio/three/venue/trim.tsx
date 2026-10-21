"use client";

import type { StudioBounds } from "@/lib/studio-geometry";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WallFinishAppearance } from "../scene-finishes";
import {
  SCALE,
  WALL_THICKNESS_IN,
  type WallFrame,
  type WallPiece,
} from "./wall-geometry";

const noRaycast = () => null;

export type TrimWall = {
  frame: WallFrame;
  pieces: WallPiece[];
  /** Current wall top, inches. */
  top: number;
  /** True when the wall is cut below its real height (low / cutaway). */
  lowered: boolean;
};

type Profile = { shape: THREE.Shape; depth: number };

/** Profile in inches: x = distance into the room from the wall face, y = up. */
function profile(depth: number, draw: (s: THREE.Shape) => void): Profile {
  const s = new THREE.Shape();
  draw(s);
  const scaled = new THREE.Shape(
    s.getPoints(6).map((p) => new THREE.Vector2(p.x * SCALE, p.y * SCALE))
  );
  return { shape: scaled, depth };
}

const BASEBOARD = profile(0.75, (s) => {
  s.moveTo(0, 0);
  s.lineTo(0.75, 0);
  s.lineTo(0.75, 4.6);
  s.quadraticCurveTo(0.75, 5.3, 0.45, 5.5);
  s.lineTo(0.45, 5.75);
  s.quadraticCurveTo(0.45, 6, 0.2, 6);
  s.lineTo(0, 6);
  s.lineTo(0, 0);
});

const CROWN = profile(4.6, (s) => {
  s.moveTo(0, -4.5);
  s.lineTo(0.5, -4.5);
  s.lineTo(0.5, -3.9);
  s.quadraticCurveTo(0.9, -0.9, 3.9, -0.5);
  s.lineTo(3.9, -0.3);
  s.lineTo(4.6, -0.3);
  s.lineTo(4.6, 0);
  s.lineTo(0, 0);
  s.lineTo(0, -4.5);
});

const CHAIR_RAIL = profile(1.1, (s) => {
  s.moveTo(0, -1.25);
  s.lineTo(0.5, -1.25);
  s.quadraticCurveTo(1.1, -1.1, 1.1, 0);
  s.quadraticCurveTo(1.1, 1.1, 0.5, 1.25);
  s.lineTo(0, 1.25);
  s.lineTo(0, -1.25);
});

const T = WALL_THICKNESS_IN;
const CAP_RAIL = profile(T + 0.75, (s) => {
  s.moveTo(-T - 0.75, 0);
  s.lineTo(0.75, 0);
  s.lineTo(0.75, 1.1);
  s.lineTo(0.45, 1.5);
  s.lineTo(-T - 0.45, 1.5);
  s.lineTo(-T - 0.75, 1.1);
  s.lineTo(-T - 0.75, 0);
});

type Run = { a: number; b: number };

function mergeRuns(runs: Run[]): Run[] {
  const sorted = [...runs].sort((p, q) => p.a - q.a);
  const out: Run[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.a <= last.b + 0.01) last.b = Math.max(last.b, r.b);
    else out.push({ ...r });
  }
  return out;
}

function extrudeRun(
  p: Profile,
  frame: WallFrame,
  run: Run,
  yIn: number,
  bounds: StudioBounds
): THREE.BufferGeometry {
  const extA = run.a <= 0.01 ? p.depth : 0;
  const extB = run.b >= frame.length - 0.01 ? p.depth : 0;
  const a = run.a - extA;
  const b = run.b + extB;
  const geo = new THREE.ExtrudeGeometry(p.shape, {
    depth: (b - a) * SCALE,
    bevelEnabled: false,
    curveSegments: 6,
  });
  const point = (d: number) =>
    new THREE.Vector3(
      (frame.start.x + frame.dir.x * d - bounds.centerX) * SCALE,
      yIn * SCALE,
      (frame.start.z + frame.dir.z * d - bounds.centerZ) * SCALE
    );
  const inward = new THREE.Vector3(frame.inward.x, 0, frame.inward.z);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(frame.dir.x, 0, frame.dir.z);
  const det = frame.inward.x * frame.dir.z - frame.inward.z * frame.dir.x;
  const m = new THREE.Matrix4();
  if (det > 0) m.makeBasis(inward, up, dir).setPosition(point(a));
  else m.makeBasis(inward, up, dir.negate()).setPosition(point(b));
  geo.applyMatrix4(m);
  return geo.index ? geo.toNonIndexed() : geo;
}

function mergeOrNull(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!parts.length) return null;
  for (const part of parts) part.clearGroups();
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged;
}

export function VenueTrim({
  walls,
  fullTop,
  appearance,
  bounds,
  glass,
}: {
  walls: TrimWall[];
  fullTop: number;
  appearance: WallFinishAppearance;
  bounds: StudioBounds;
  glass: boolean;
}) {
  const geometries = useMemo(() => {
    const base: THREE.BufferGeometry[] = [];
    const crown: THREE.BufferGeometry[] = [];
    const caps: THREE.BufferGeometry[] = [];
    for (const wall of walls) {
      const { frame, pieces, top, lowered } = wall;
      if (lowered) {
        for (const run of mergeRuns(pieces.filter((p) => p.y1 >= top - 0.01))) {
          caps.push(extrudeRun(CAP_RAIL, frame, run, top, bounds));
        }
      }
      if (glass) continue;
      if (appearance.baseboard) {
        for (const run of mergeRuns(pieces.filter((p) => p.y0 < 0.01 && p.y1 >= 6))) {
          base.push(extrudeRun(BASEBOARD, frame, run, 0, bounds));
        }
      }
      if (appearance.crown && !lowered && top >= fullTop - 0.01) {
        for (const run of mergeRuns(pieces.filter((p) => p.y1 >= fullTop - 0.01 && p.y1 - p.y0 >= 5))) {
          crown.push(extrudeRun(CROWN, frame, run, fullTop, bounds));
        }
      }
      const rail = appearance.chairRail;
      if (rail && top > rail + 2) {
        for (const run of mergeRuns(pieces.filter((p) => p.y0 <= rail - 1.5 && p.y1 >= rail + 1.5))) {
          base.push(extrudeRun(CHAIR_RAIL, frame, run, rail, bounds));
        }
      }
    }
    return {
      trim: mergeOrNull([...base, ...crown]),
      caps: mergeOrNull(caps),
    };
  }, [walls, fullTop, appearance, bounds, glass]);

  useEffect(
    () => () => {
      geometries.trim?.dispose();
      geometries.caps?.dispose();
    },
    [geometries]
  );

  const materials = useMemo(
    () => ({
      trim: new THREE.MeshPhysicalMaterial({
        color: appearance.baseboard ?? appearance.crown ?? appearance.cap,
        roughness: 0.4,
        clearcoat: 0.2,
        clearcoatRoughness: 0.45,
      }),
      cap: new THREE.MeshStandardMaterial({
        color: appearance.cap,
        roughness: 0.55,
        transparent: glass,
        opacity: glass ? 0.55 : 1,
      }),
    }),
    [appearance, glass]
  );
  useEffect(
    () => () => {
      materials.trim.dispose();
      materials.cap.dispose();
    },
    [materials]
  );

  return (
    <>
      {geometries.trim ? (
        <mesh geometry={geometries.trim} material={materials.trim} receiveShadow raycast={noRaycast} />
      ) : null}
      {geometries.caps ? (
        <mesh geometry={geometries.caps} material={materials.cap} receiveShadow raycast={noRaycast} />
      ) : null}
    </>
  );
}
