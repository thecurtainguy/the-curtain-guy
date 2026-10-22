"use client";

/**
 * Cross-object instancing for repeated Studio furniture. Every `Part` inside a
 * batched object registers one instance in an InstancedMesh shared by all
 * parts with the same geometry + material + shadow flags, so twenty identical
 * dressed tables cost one draw call per distinct part instead of twenty.
 *
 * Batching is purely a rendering detail: object groups still exist (for any
 * unbatched meshes and the selection ring), picking goes through the
 * manipulation proxies, and moving one object rewrites only its own slots.
 */
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as THREE from "three";

type Vec3 = [number, number, number];

const INITIAL_CAPACITY = 8;
const MATRIX_SIZE = 16;
const NO_MESHES: THREE.InstancedMesh[] = [];

export type BatchSlot = { batch: PartBatch; index: number };

class PartBatch {
  mesh: THREE.InstancedMesh;
  readonly slots: BatchSlot[] = [];

  constructor(
    readonly key: string,
    readonly geometry: THREE.BufferGeometry,
    readonly material: THREE.Material,
    readonly cast: boolean,
    readonly receive: boolean
  ) {
    this.mesh = this.createMesh(INITIAL_CAPACITY);
  }

  createMesh(capacity: number) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.castShadow = this.cast;
    mesh.receiveShadow = this.receive;
    mesh.matrixAutoUpdate = false;
    mesh.name = `batch:${this.key}`;
    return mesh;
  }

  write(index: number, matrix: THREE.Matrix4) {
    const attribute = this.mesh.instanceMatrix;
    matrix.toArray(attribute.array, index * MATRIX_SIZE);
    attribute.addUpdateRange(index * MATRIX_SIZE, MATRIX_SIZE);
    attribute.needsUpdate = true;
    this.mesh.boundingSphere = null;
  }
}

export class InstanceBatcher {
  private readonly batches = new Map<string, PartBatch>();
  private readonly listeners = new Set<() => void>();
  private meshes: THREE.InstancedMesh[] = NO_MESHES;

  constructor(private readonly onUpdate: () => void) {}

  add(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    cast: boolean,
    receive: boolean,
    matrix: THREE.Matrix4
  ): BatchSlot {
    const key = `${geometry.uuid}|${material.uuid}|${cast ? 1 : 0}${receive ? 1 : 0}`;
    let batch = this.batches.get(key);
    let structural = false;
    if (!batch) {
      batch = new PartBatch(key, geometry, material, cast, receive);
      this.batches.set(key, batch);
      structural = true;
    }
    const capacity = batch.mesh.instanceMatrix.count;
    if (batch.slots.length >= capacity) {
      const previous = batch.mesh;
      batch.mesh = batch.createMesh(capacity * 2);
      (batch.mesh.instanceMatrix.array as Float32Array).set(
        (previous.instanceMatrix.array as Float32Array).subarray(0, batch.slots.length * MATRIX_SIZE)
      );
      previous.dispose();
      structural = true;
    }
    const slot: BatchSlot = { batch, index: batch.slots.length };
    batch.slots.push(slot);
    batch.mesh.count = batch.slots.length;
    batch.write(slot.index, matrix);
    if (structural) this.publish();
    this.onUpdate();
    return slot;
  }

  move(slot: BatchSlot, matrix: THREE.Matrix4) {
    if (slot.index < 0) return;
    slot.batch.write(slot.index, matrix);
    this.onUpdate();
  }

  remove(slot: BatchSlot) {
    const batch = slot.batch;
    if (slot.index < 0 || this.batches.get(batch.key) !== batch) return;
    const last = batch.slots.pop()!;
    if (last !== slot) {
      const array = batch.mesh.instanceMatrix.array as Float32Array;
      array.copyWithin(
        slot.index * MATRIX_SIZE,
        last.index * MATRIX_SIZE,
        last.index * MATRIX_SIZE + MATRIX_SIZE
      );
      last.index = slot.index;
      batch.slots[slot.index] = last;
      batch.mesh.instanceMatrix.addUpdateRange(slot.index * MATRIX_SIZE, MATRIX_SIZE);
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
    slot.index = -1;
    batch.mesh.count = batch.slots.length;
    batch.mesh.boundingSphere = null;
    if (batch.slots.length === 0) {
      this.batches.delete(batch.key);
      batch.mesh.dispose();
      this.publish();
    }
    this.onUpdate();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getMeshes = () => this.meshes;

  private publish() {
    this.meshes = [...this.batches.values()].map((batch) => batch.mesh);
    for (const listener of this.listeners) listener();
  }
}

/** Renders every live batch mesh (in the space the batched objects' frames are in). */
export function BatchMeshes({ batcher }: { batcher: InstanceBatcher }) {
  const meshes = useSyncExternalStore(batcher.subscribe, batcher.getMeshes, () => NO_MESHES);
  return (
    <>
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Frames: object-local → batch space, composed through nested groups  */
/* ------------------------------------------------------------------ */

export type BatchFrame = {
  batcher: InstanceBatcher;
  matrix: THREE.Matrix4;
  /** The frame mirrors geometry (negative determinant). */
  mirrored: boolean;
};

const BatchFrameContext = createContext<BatchFrame | null>(null);

export function BatchFrameProvider({
  frame,
  children,
}: {
  frame: BatchFrame | null;
  children: ReactNode;
}) {
  return <BatchFrameContext.Provider value={frame}>{children}</BatchFrameContext.Provider>;
}

export function useBatchFrame() {
  return useContext(BatchFrameContext);
}

const scratchEuler = new THREE.Euler();
const scratchQuaternion = new THREE.Quaternion();
const scratchPosition = new THREE.Vector3();
const scratchScale = new THREE.Vector3();

export type Transform = {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
};

function scaleOf(scale: Transform["scale"]): Vec3 {
  if (scale === undefined) return [1, 1, 1];
  return typeof scale === "number" ? [scale, scale, scale] : scale;
}

/** `parent × T·R·S` — the same matrix three builds for a child object. */
export function composeChild(parent: THREE.Matrix4, transform: Transform) {
  const [px, py, pz] = transform.position ?? [0, 0, 0];
  const [rx, ry, rz] = transform.rotation ?? [0, 0, 0];
  const [sx, sy, sz] = scaleOf(transform.scale);
  const local = new THREE.Matrix4().compose(
    scratchPosition.set(px, py, pz),
    scratchQuaternion.setFromEuler(scratchEuler.set(rx, ry, rz)),
    scratchScale.set(sx, sy, sz)
  );
  return local.premultiply(parent);
}

export function mirrors(transform: Transform) {
  const [sx, sy, sz] = scaleOf(transform.scale);
  return sx * sy * sz < 0;
}

/** Stable key for a transform so hooks can depend on its numbers, not array identity. */
export function transformKey(transform: Transform) {
  const [px, py, pz] = transform.position ?? [0, 0, 0];
  const [rx, ry, rz] = transform.rotation ?? [0, 0, 0];
  const [sx, sy, sz] = scaleOf(transform.scale);
  return `${px},${py},${pz},${rx},${ry},${rz},${sx},${sy},${sz}`;
}

/** Frame for a nested group (null outside batched objects). */
export function useChildFrame(transform: Transform): BatchFrame | null {
  const parent = useBatchFrame();
  const key = transformKey(transform);
  return useMemo(() => {
    if (!parent) return null;
    const local = parseTransformKey(key);
    return {
      batcher: parent.batcher,
      matrix: composeChild(parent.matrix, local),
      mirrored: parent.mirrored !== mirrors(local),
    };
  }, [parent, key]);
}

function parseTransformKey(key: string): Transform {
  const v = key.split(",").map(Number);
  return { position: [v[0], v[1], v[2]], rotation: [v[3], v[4], v[5]], scale: [v[6], v[7], v[8]] };
}

/**
 * Registers one instance for a part while `frame` is set; returns whether
 * the part is batched (the caller then renders nothing itself).
 */
export function useBatchedPart(
  frame: BatchFrame | null,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  cast: boolean,
  receive: boolean,
  transform: Transform
) {
  const enabled = frame !== null && !frame.mirrored && !mirrors(transform);
  const key = transformKey(transform);
  const slot = useRef<BatchSlot | null>(null);
  const latest = useRef<THREE.Matrix4 | null>(null);
  const batcher = frame?.batcher ?? null;

  useLayoutEffect(() => {
    if (!frame) return;
    const matrix = composeChild(frame.matrix, parseTransformKey(key));
    latest.current = matrix;
    if (slot.current) frame.batcher.move(slot.current, matrix);
  }, [frame, key]);

  useLayoutEffect(() => {
    if (!enabled || !batcher || !latest.current) return;
    const added = batcher.add(geometry, material, cast, receive, latest.current);
    slot.current = added;
    return () => {
      batcher.remove(added);
      slot.current = null;
    };
  }, [batcher, cast, enabled, geometry, material, receive]);

  return enabled;
}
