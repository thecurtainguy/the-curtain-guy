import type * as THREE from "three";

/** True when the object or any ancestor carries `userData[flag]`. */
export function hasFlag(object: THREE.Object3D | null, flag: string) {
  for (let node = object; node; node = node.parent) {
    if (node.userData?.[flag]) return true;
  }
  return false;
}

/** A visible, mostly opaque surface that blocks picks behind it. */
export function isSolidHit(object: THREE.Object3D) {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  const material = (object as THREE.Mesh).material as
    | THREE.Material
    | THREE.Material[]
    | undefined;
  if (!material) return false;
  const list = Array.isArray(material) ? material : [material];
  return list.some((entry) => entry.visible && !(entry.transparent && entry.opacity < 0.6));
}
