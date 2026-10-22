"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BistroStrings } from "./plan";
import { SparkleCloud } from "./sparkle-cloud";

/** Feet: 0.3″ cord, 0.85″ × 1.2″ socket, 2.2″ (G50-ish) globe. */
const CORD_RADIUS = 0.0125;
const SOCKET_RADIUS = 0.035;
const SOCKET_LENGTH = 0.1;
const GLOBE_RADIUS = 0.092;
/** Visible filament glow, feet. */
const CORE_SIZE = 0.1;

const NO_RAYCAST = () => {};

/* Shared, page-lifetime geometry and materials (never disposed). */
let socketGeometry: THREE.CylinderGeometry | null = null;
let globeGeometry: THREE.SphereGeometry | null = null;
let socketMaterial: THREE.MeshStandardMaterial | null = null;
let cordMaterial: THREE.MeshStandardMaterial | null = null;

function getSocketGeometry() {
  socketGeometry ??= new THREE.CylinderGeometry(
    SOCKET_RADIUS * 0.8,
    SOCKET_RADIUS,
    SOCKET_LENGTH,
    10
  );
  return socketGeometry;
}

function getGlobeGeometry() {
  globeGeometry ??= new THREE.SphereGeometry(GLOBE_RADIUS, 16, 12);
  return globeGeometry;
}

function getSocketMaterial() {
  socketMaterial ??= new THREE.MeshStandardMaterial({
    color: "#26211d",
    metalness: 0.35,
    roughness: 0.5,
  });
  return socketMaterial;
}

function getCordMaterial() {
  cordMaterial ??= new THREE.MeshStandardMaterial({
    color: "#141210",
    roughness: 0.78,
  });
  return cordMaterial;
}

/** Clear glass: faint body, bright Fresnel rim, hot centre where the filament shows. */
const globeVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vTint;

  void main() {
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vView = normalize(-mvPosition.xyz);
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const globeFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vTint;

  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float rim = pow(1.0 - facing, 2.2);
    float body = pow(facing, 8.0);
    gl_FragColor = vec4(uColor * vTint * (0.07 + 0.6 * rim + 0.35 * body), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createGlobeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color("#ffffff") } },
    vertexShader: globeVertexShader,
    fragmentShader: globeFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
}

function createCordGeometry(cords: Float32Array[]) {
  const parts = cords
    .map((cord) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < cord.length; i += 3) {
        points.push(new THREE.Vector3(cord[i], cord[i + 1], cord[i + 2]));
      }
      if (points.length < 2) return null;
      return new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        points.length - 1,
        CORD_RADIUS,
        4,
        false
      );
    })
    .filter((part): part is THREE.TubeGeometry => part !== null);
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  merged?.computeBoundingSphere();
  return merged;
}

/**
 * Bistro strings: dark cords swagging under the fabric with sockets, clear
 * globes and bloom-bright filament cores, all instanced per design.
 */
export function BistroStringLights({
  strings,
  color,
  emission,
}: {
  strings: BistroStrings;
  color: string;
  /** HDR multiplier for the filament cores. */
  emission: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const cords = useMemo(() => createCordGeometry(strings.cords), [strings]);

  const bulbs = useMemo(() => {
    const count = strings.bulbs.length / 3;
    const sockets = new THREE.InstancedMesh(getSocketGeometry(), getSocketMaterial(), count);
    const globes = new THREE.InstancedMesh(getGlobeGeometry(), createGlobeMaterial(), count);
    const cores = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const matrix = new THREE.Matrix4();
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = strings.bulbs[i * 3];
      const y = strings.bulbs[i * 3 + 1];
      const z = strings.bulbs[i * 3 + 2];
      matrix.makeTranslation(x, y - SOCKET_LENGTH / 2, z);
      sockets.setMatrixAt(i, matrix);
      const globeY = y - SOCKET_LENGTH - GLOBE_RADIUS * 0.9;
      matrix.makeTranslation(x, globeY, z);
      globes.setMatrixAt(i, matrix);
      const seed = (i * 0.6180339887) % 1;
      seeds[i] = seed;
      globes.setColorAt(i, tint.setScalar(0.8 + 0.2 * seed));
      cores.set([x, globeY, z], i * 3);
    }
    for (const mesh of [sockets, globes]) {
      mesh.raycast = NO_RAYCAST;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    sockets.castShadow = false;
    globes.renderOrder = 3;
    globes.userData.noAO = true;
    return { sockets, globes, cores, seeds };
  }, [strings]);

  useEffect(() => () => cords?.dispose(), [cords]);
  useEffect(
    () => () => {
      bulbs.sockets.dispose();
      bulbs.globes.dispose();
      (bulbs.globes.material as THREE.ShaderMaterial).dispose();
    },
    [bulbs]
  );

  useEffect(() => {
    const material = bulbs.globes.material as THREE.ShaderMaterial;
    (material.uniforms.uColor.value as THREE.Color).set(color);
    invalidate();
  }, [bulbs, color, invalidate]);

  return (
    <group>
      {cords ? (
        <mesh geometry={cords} material={getCordMaterial()} raycast={NO_RAYCAST} />
      ) : null}
      <primitive object={bulbs.sockets} />
      <primitive object={bulbs.globes} />
      <SparkleCloud
        positions={bulbs.cores}
        seeds={bulbs.seeds}
        size={CORE_SIZE}
        color={color}
        emission={emission}
        twinkle={false}
      />
    </group>
  );
}
