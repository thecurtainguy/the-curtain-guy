"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import type {
  StudioPracticalLight,
  StudioUplightFixture,
} from "../engine-light-rig";
import type { StudioLightingRig } from "../lighting-moods";
import { mix } from "../texture-utils";
import {
  additiveOptions,
  getPoolTexture,
  getWashTexture,
} from "./fixture-textures";
import { requestStudioShadowUpdate } from "../shadow-refresh";

const NO_RAYCAST = () => null;
const NO_AO_USER_DATA = { noAO: true };

/** Flat per-instance data: 16 floats per matrix, 3 linear (HDR) floats per colour. */
export type FixtureBatch = {
  count: number;
  matrices: Float32Array;
  colors: Float32Array | null;
};

export type FixtureBatches = {
  yokes: FixtureBatch;
  bodies: FixtureBatch;
  lenses: FixtureBatch;
  washes: FixtureBatch;
  pools: FixtureBatch;
};

/* Can parts relative to the can's floor position + yaw. */
const YOKE_LOCAL = new THREE.Matrix4().makeTranslation(0, 0.025, 0);
const BODY_LOCAL = new THREE.Matrix4()
  .makeTranslation(0, 0.2, 0)
  .multiply(new THREE.Matrix4().makeRotationX(0.52));
const LENS_LOCAL = BODY_LOCAL.clone()
  .multiply(new THREE.Matrix4().makeTranslation(0, 0.212, 0))
  .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

const FIXTURE_POOL_RADIUS = 1.4;

export function getPracticalColor(
  light: StudioPracticalLight,
  rig: StudioLightingRig
): string {
  return mix(light.color, rig.practicalWarmth, 0.45);
}

function createBatch(count: number, colored: boolean): FixtureBatch {
  return {
    count,
    matrices: new Float32Array(count * 16),
    colors: colored ? new Float32Array(count * 3) : null,
  };
}

/**
 * Instance data for every uplight can, wall wash and floor pool (fixtures and
 * chandeliers). Colours carry the additive strength so one shared material
 * per batch renders exactly what per-fixture materials used to.
 */
export function buildFixtureBatches(
  fixtures: StudioUplightFixture[],
  practicals: StudioPracticalLight[],
  rig: StudioLightingRig
): FixtureBatches {
  const cans = fixtures.filter((fixture) => fixture.renderCan);
  const washed = fixtures.filter((fixture) => fixture.wash);
  const batches: FixtureBatches = {
    yokes: createBatch(cans.length, false),
    bodies: createBatch(cans.length, false),
    lenses: createBatch(cans.length, true),
    washes: createBatch(washed.length, true),
    pools: createBatch(fixtures.length + practicals.length, true),
  };
  const boost = rig.uplightBoost;
  const base = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  const color = new THREE.Color();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  cans.forEach((fixture, index) => {
    base.makeRotationY(fixture.yaw).setPosition(...fixture.position);
    world.multiplyMatrices(base, YOKE_LOCAL).toArray(batches.yokes.matrices, index * 16);
    world.multiplyMatrices(base, BODY_LOCAL).toArray(batches.bodies.matrices, index * 16);
    world.multiplyMatrices(base, LENS_LOCAL).toArray(batches.lenses.matrices, index * 16);
    color
      .set(fixture.color)
      .multiplyScalar(3.2 + boost * 2.4)
      .toArray(batches.lenses.colors!, index * 3);
  });

  washed.forEach((fixture, index) => {
    const wash = fixture.wash!;
    position.set(...wash.position);
    rotation.setFromEuler(euler.set(0, wash.rotationY, 0));
    scale.set(wash.width, wash.height, 1);
    world.compose(position, rotation, scale).toArray(batches.washes.matrices, index * 16);
    color
      .set(fixture.color)
      .multiplyScalar(0.58 * boost)
      .toArray(batches.washes.colors!, index * 3);
  });

  rotation.setFromEuler(euler.set(-Math.PI / 2, 0, 0));
  const writePool = (
    index: number,
    x: number,
    y: number,
    z: number,
    radius: number,
    hex: string,
    strength: number
  ) => {
    position.set(x, y + 0.02, z);
    scale.set(radius * 2, radius * 2, 1);
    world.compose(position, rotation, scale).toArray(batches.pools.matrices, index * 16);
    color.set(hex).multiplyScalar(strength).toArray(batches.pools.colors!, index * 3);
  };
  fixtures.forEach((fixture, index) => {
    const [x, y, z] = fixture.position;
    writePool(index, x, y, z, FIXTURE_POOL_RADIUS, fixture.color, 0.24 * boost);
  });
  practicals.forEach((light, index) => {
    writePool(
      fixtures.length + index,
      light.position[0],
      0,
      light.position[2],
      Math.max(3, light.size * 2.2),
      getPracticalColor(light, rig),
      0.16 * rig.practicalBoost
    );
  });

  return batches;
}

function additiveMaterial(map: THREE.Texture) {
  return new THREE.MeshBasicMaterial({
    ...additiveOptions(map, "#ffffff", 1),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

function createFixtureResources() {
  return {
    bodyGeometry: new THREE.CylinderGeometry(0.15, 0.17, 0.42, 20),
    lensGeometry: new THREE.CircleGeometry(0.125, 24),
    yokeGeometry: new THREE.BoxGeometry(0.4, 0.05, 0.32),
    planeGeometry: new THREE.PlaneGeometry(1, 1),
    bodyMaterial: new THREE.MeshStandardMaterial({
      color: "#17171a",
      metalness: 0.65,
      roughness: 0.38,
    }),
    lensMaterial: new THREE.MeshBasicMaterial(),
    washMaterial: additiveMaterial(getWashTexture()),
    poolMaterial: additiveMaterial(getPoolTexture()),
  };
}

type FixtureResources = ReturnType<typeof createFixtureResources>;

function disposeFixtureResources(resources: FixtureResources) {
  for (const resource of Object.values(resources)) resource.dispose();
}

/** Power-of-two capacity so adding a fixture rarely reallocates the mesh. */
function instanceCapacity(count: number) {
  return Math.max(8, 2 ** Math.ceil(Math.log2(Math.max(1, count))));
}

function writeBatch(mesh: THREE.InstancedMesh, batch: FixtureBatch) {
  mesh.instanceMatrix.array.set(batch.matrices);
  mesh.instanceMatrix.needsUpdate = true;
  if (batch.colors) {
    mesh.instanceColor ??= new THREE.InstancedBufferAttribute(
      new Float32Array(mesh.instanceMatrix.count * 3),
      3
    );
    mesh.instanceColor.array.set(batch.colors);
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.count = batch.count;
  mesh.visible = batch.count > 0;
  mesh.computeBoundingSphere();
}

function FixtureInstancedMesh({
  batch,
  geometry,
  material,
  castShadow = false,
  receiveShadow = false,
  renderOrder = 0,
  additive = false,
}: {
  batch: FixtureBatch;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
  /** Additive light shapes: excluded from AO. */
  additive?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const capacity = instanceCapacity(batch.count);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    writeBatch(mesh, batch);
    if (castShadow) requestStudioShadowUpdate(gl);
    invalidate();
  }, [batch, capacity, castShadow, gl, invalidate]);

  return (
    <instancedMesh
      key={capacity}
      ref={meshRef}
      args={[geometry, material, capacity]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      renderOrder={renderOrder}
      raycast={NO_RAYCAST}
      {...(additive ? { userData: NO_AO_USER_DATA } : null)}
    />
  );
}

/**
 * Every uplight can (yoke, body, lens), wall wash and floor pool in five
 * draw calls, whatever the fixture count.
 */
export function StudioFixtureInstances({ batches }: { batches: FixtureBatches }) {
  const [resources] = useState(createFixtureResources);
  useEffect(() => () => disposeFixtureResources(resources), [resources]);

  return (
    <>
      <FixtureInstancedMesh
        batch={batches.yokes}
        geometry={resources.yokeGeometry}
        material={resources.bodyMaterial}
        receiveShadow
      />
      <FixtureInstancedMesh
        batch={batches.bodies}
        geometry={resources.bodyGeometry}
        material={resources.bodyMaterial}
        castShadow
      />
      <FixtureInstancedMesh
        batch={batches.lenses}
        geometry={resources.lensGeometry}
        material={resources.lensMaterial}
      />
      <FixtureInstancedMesh
        batch={batches.washes}
        geometry={resources.planeGeometry}
        material={resources.washMaterial}
        renderOrder={2}
        additive
      />
      <FixtureInstancedMesh
        batch={batches.pools}
        geometry={resources.planeGeometry}
        material={resources.poolMaterial}
        renderOrder={2}
        additive
      />
    </>
  );
}
