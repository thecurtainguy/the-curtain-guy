"use client";

import {
  getDrapeColorHex,
  type DrapeColor,
  type StudioFrameFinish,
} from "@/data/studio";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getUplightWashTexture } from "./textures";
import { getHardwareMaterial } from "./materials";

/** 1.5″ upright pipe. */
export const UPRIGHT_RADIUS = 0.0625;
/** ~1″ telescoping crossbar. */
export const CROSSBAR_RADIUS = 0.045;
export const BASE_PLATE_SIZE = 1.25;
export const BASE_PLATE_THICKNESS = 0.03;

export function useDisposeGeometry(geometry: THREE.BufferGeometry | null) {
  useEffect(() => () => geometry?.dispose(), [geometry]);
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) return null;
  merged.computeBoundingSphere();
  return merged;
}

function sagCurve(
  x0: number,
  x1: number,
  y: number,
  z: number,
  sag: number
): THREE.Curve<THREE.Vector3> {
  return new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x0, y, z),
    new THREE.Vector3((x0 + x1) / 2, y - sag * 2, z),
    new THREE.Vector3(x1, y, z)
  );
}

/**
 * Pipe & drape: weighted base plates, 1.5″ uprights at every break, and a
 * crossbar per bay (one per `crossbarZs` entry) with a slight sag.
 */
export function PipeAndDrapeHardware({
  breaks,
  crossbarY,
  crossbarZs,
  uprightZ,
  sagPerBay = 0,
  castShadow = true,
}: {
  breaks: number[];
  crossbarY: number;
  crossbarZs: number[];
  uprightZ: number;
  sagPerBay?: number;
  castShadow?: boolean;
}) {
  const breakKey = breaks.map((value) => value.toFixed(3)).join(",");
  const zKey = crossbarZs.map((value) => value.toFixed(3)).join(",");
  const pipes = useMemo(() => {
    const xs = breakKey.split(",").map(Number);
    const zs = zKey.split(",").map(Number);
    const parts: THREE.BufferGeometry[] = [];
    const uprightHeight = crossbarY + 0.1 - BASE_PLATE_THICKNESS;
    for (const x of xs) {
      const upright = new THREE.CylinderGeometry(UPRIGHT_RADIUS, UPRIGHT_RADIUS, uprightHeight, 12);
      upright.translate(x, BASE_PLATE_THICKNESS + uprightHeight / 2, uprightZ);
      parts.push(upright);
      const cap = new THREE.CylinderGeometry(0.075, 0.075, 0.1, 12);
      cap.translate(x, crossbarY + 0.06, uprightZ);
      parts.push(cap);
      const collar = new THREE.CylinderGeometry(0.1, 0.11, 0.14, 12);
      collar.translate(x, BASE_PLATE_THICKNESS + 0.07, uprightZ);
      parts.push(collar);
    }
    for (let index = 0; index < xs.length - 1; index++) {
      for (const z of zs) {
        parts.push(
          new THREE.TubeGeometry(
            sagCurve(xs[index], xs[index + 1], crossbarY, z, sagPerBay),
            16,
            CROSSBAR_RADIUS,
            8,
            false
          )
        );
      }
    }
    return merge(parts);
  }, [breakKey, crossbarY, sagPerBay, uprightZ, zKey]);
  useDisposeGeometry(pipes);

  const plates = useMemo(() => {
    const xs = breakKey.split(",").map(Number);
    const parts = xs.map((x) => {
      const plate = new THREE.BoxGeometry(
        BASE_PLATE_SIZE,
        BASE_PLATE_THICKNESS,
        BASE_PLATE_SIZE
      );
      plate.translate(x, BASE_PLATE_THICKNESS / 2, uprightZ);
      return plate;
    });
    return merge(parts);
  }, [breakKey, uprightZ]);
  useDisposeGeometry(plates);

  return (
    <group>
      {pipes ? (
        <mesh
          geometry={pipes}
          material={getHardwareMaterial("pipe")}
          castShadow={castShadow}
          receiveShadow
        />
      ) : null}
      {plates ? (
        <mesh
          geometry={plates}
          material={getHardwareMaterial("base_plate")}
          castShadow={castShadow}
          receiveShadow
        />
      ) : null}
    </group>
  );
}

/** Slim ceiling / header track with end caps. */
export function CeilingTrack({
  length,
  y,
  z,
}: {
  length: number;
  y: number;
  z: number;
}) {
  return (
    <group position={[0, y, z]}>
      <mesh material={getHardwareMaterial("track")} castShadow>
        <boxGeometry args={[length + 0.08, 0.05, 0.09]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} material={getHardwareMaterial("track")}>
        <boxGeometry args={[length + 0.02, 0.04, 0.035]} />
      </mesh>
    </group>
  );
}

/** Decorative curtain rod with ball finials. */
export function DecorativeRod({
  length,
  y,
  z,
  finish = "pipe",
}: {
  length: number;
  y: number;
  z: number;
  finish?: "pipe" | StudioFrameFinish;
}) {
  const material = getHardwareMaterial(finish);
  return (
    <group position={[0, y, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={material} castShadow>
        <cylinderGeometry args={[0.05, 0.05, length + 0.3, 14]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (length / 2 + 0.2), 0, 0]}>
          <mesh material={material} castShadow>
            <sphereGeometry args={[0.1, 16, 12]} />
          </mesh>
          <mesh
            position={[-side * 0.09, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={material}
          >
            <cylinderGeometry args={[0.07, 0.05, 0.05, 14]} />
          </mesh>
          <mesh
            position={[-side * 0.12, 0, -z / 2]}
            rotation={[Math.PI / 2, 0, 0]}
            material={material}
          >
            <cylinderGeometry args={[0.02, 0.02, Math.max(0.05, z), 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Ceremony arch frame. Metal finishes are a single bent tube with rounded
 * shoulders; wood is a post-and-beam pergola header.
 */
export function ArchFrame({
  width,
  height,
  finish,
}: {
  width: number;
  height: number;
  finish: StudioFrameFinish;
}) {
  const wood = finish === "wood";
  const tube = useMemo(() => {
    if (wood) return null;
    const radius = 0.075;
    const corner = Math.min(1.2, width * 0.18, height * 0.25);
    const half = width / 2;
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-half, BASE_PLATE_THICKNESS, 0),
        new THREE.Vector3(-half, height - corner, 0)
      )
    );
    path.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-half, height - corner, 0),
        new THREE.Vector3(-half, height, 0),
        new THREE.Vector3(-half + corner, height, 0)
      )
    );
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(-half + corner, height, 0),
        new THREE.Vector3(half - corner, height, 0)
      )
    );
    path.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(half - corner, height, 0),
        new THREE.Vector3(half, height, 0),
        new THREE.Vector3(half, height - corner, 0)
      )
    );
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(half, height - corner, 0),
        new THREE.Vector3(half, BASE_PLATE_THICKNESS, 0)
      )
    );
    const geometry = new THREE.TubeGeometry(path, 160, radius, 12, false);
    geometry.computeBoundingSphere();
    return geometry;
  }, [height, width, wood]);
  useDisposeGeometry(tube);

  const material = getHardwareMaterial(finish);
  if (wood) {
    const post = 0.34;
    return (
      <group>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (width / 2), height / 2, 0]}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[post, height, post]} />
          </mesh>
        ))}
        {[-0.2, 0.2].map((offset) => (
          <mesh
            key={offset}
            position={[0, height + 0.12, offset]}
            material={material}
            castShadow
          >
            <boxGeometry args={[width + 1.3, 0.38, 0.16]} />
          </mesh>
        ))}
        {[-0.3, -0.1, 0.1, 0.3].map((t) => (
          <mesh
            key={t}
            position={[t * width, height + 0.36, 0]}
            material={material}
            castShadow
          >
            <boxGeometry args={[0.16, 0.12, 0.85]} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      {tube ? (
        <mesh geometry={tube} material={material} castShadow receiveShadow />
      ) : null}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (width / 2), BASE_PLATE_THICKNESS / 2, 0]}
          material={getHardwareMaterial("base_plate")}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.1, BASE_PLATE_THICKNESS, 1.1]} />
        </mesh>
      ))}
    </group>
  );
}

const lensCache = new Map<string, THREE.MeshBasicMaterial>();
const washCache = new Map<string, THREE.MeshBasicMaterial>();

function lensMaterial(hex: string) {
  let material = lensCache.get(hex);
  if (!material) {
    material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex).multiplyScalar(2.2),
      toneMapped: false,
    });
    lensCache.set(hex, material);
  }
  return material;
}

function washMaterial(hex: string) {
  let material = washCache.get(hex);
  if (!material) {
    material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex).multiplyScalar(1.6),
      map: getUplightWashTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    washCache.set(hex, material);
  }
  return material;
}

/** Positions (feet) for floor uplight cans along a span, ~every 6′. */
export function uplightPositions(length: number) {
  const count = Math.max(1, Math.round(length / 6));
  return Array.from(
    { length: count },
    (_, index) => -length / 2 + (index + 0.5) * (length / count)
  );
}

/**
 * Floor uplight fixtures aimed back at the fabric, with a soft wash sprite on
 * the fabric face. The real light contribution is added by the lighting rig.
 */
export function UplightRow({
  positions,
  color,
  z,
  fabricZ,
  washHeight,
}: {
  positions: number[];
  color: DrapeColor;
  /** Fixture z (in front of the fabric). */
  z: number;
  /** Fabric front face z for the wash sprite. */
  fabricZ: number;
  washHeight: number;
}) {
  const hex = getDrapeColorHex(color);
  const key = positions.map((value) => value.toFixed(3)).join(",");
  const cans = useMemo(() => {
    const xs = key.split(",").map(Number);
    const parts = xs.flatMap((x) => {
      const body = new THREE.CylinderGeometry(0.15, 0.17, 0.32, 16);
      body.rotateX(-0.42);
      body.translate(x, 0.2, z);
      const yoke = new THREE.BoxGeometry(0.42, 0.05, 0.22);
      yoke.translate(x, 0.025, z);
      return [body, yoke];
    });
    return merge(parts);
  }, [key, z]);
  useDisposeGeometry(cans);

  const lenses = useMemo(() => {
    const xs = key.split(",").map(Number);
    const parts = xs.map((x) => {
      const lens = new THREE.CircleGeometry(0.13, 18);
      lens.rotateX(-Math.PI / 2);
      lens.translate(0, 0.165, 0);
      lens.rotateX(-0.42);
      lens.translate(x, 0.2, z);
      return lens;
    });
    return merge(parts);
  }, [key, z]);
  useDisposeGeometry(lenses);

  const xs = useMemo(() => key.split(",").map(Number), [key]);
  return (
    <group>
      {cans ? (
        <mesh geometry={cans} material={getHardwareMaterial("fixture")} castShadow />
      ) : null}
      {lenses ? <mesh geometry={lenses} material={lensMaterial(hex)} /> : null}
      {xs.map((x) => (
        <mesh
          key={x}
          position={[x, washHeight / 2, fabricZ]}
          material={washMaterial(hex)}
          renderOrder={3}
        >
          <planeGeometry args={[3.6, washHeight]} />
        </mesh>
      ))}
    </group>
  );
}
