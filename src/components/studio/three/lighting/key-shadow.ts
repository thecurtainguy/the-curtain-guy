import * as THREE from "three";

const ORIGIN = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const view = new THREE.Matrix4();
const corner = new THREE.Vector3();
const axisX = new THREE.Vector3();
const axisY = new THREE.Vector3();
const axisZ = new THREE.Vector3();

type RoomBox = { halfWidth: number; halfDepth: number; height: number };

function roomCorners(room: RoomBox, margin: number): THREE.Vector3[] {
  const corners: THREE.Vector3[] = [];
  for (const x of [-room.halfWidth - margin, room.halfWidth + margin]) {
    for (const y of [-0.5, room.height + 0.5]) {
      for (const z of [-room.halfDepth - margin, room.halfDepth + margin]) {
        corners.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  return corners;
}

/**
 * Roll (about the light direction) whose square-ish shadow frustum covers
 * the projected room with the smallest side; the map is square, so the
 * larger side sets the texel size.
 */
function bestShadowUp(
  lightPosition: THREE.Vector3,
  corners: THREE.Vector3[],
  target: THREE.Vector3
) {
  view.lookAt(lightPosition, ORIGIN, WORLD_UP);
  view.extractBasis(axisX, axisY, axisZ);
  const projected = corners.map((point) => {
    corner.subVectors(point, lightPosition);
    return [corner.dot(axisX), corner.dot(axisY)] as const;
  });
  let bestAngle = 0;
  let bestSide = Infinity;
  for (let degrees = 0; degrees < 90; degrees += 1) {
    const angle = THREE.MathUtils.degToRad(degrees);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of projected) {
      const rx = x * cos + y * sin;
      const ry = y * cos - x * sin;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }
    const side = Math.max(maxX - minX, maxY - minY);
    if (side < bestSide - 1e-6) {
      bestSide = side;
      bestAngle = angle;
    }
  }
  return target
    .copy(axisY)
    .multiplyScalar(Math.cos(bestAngle))
    .addScaledVector(axisX, -Math.sin(bestAngle));
}

/**
 * Fits a directional light's orthographic shadow camera to the room box
 * (centred on the origin, floor at y = 0) as seen from `lightPosition`
 * looking at the origin, rolled so the room fills the square map. A tight
 * frustum spends every texel on the room (~1.2–1.3× sharper than a square
 * around the room's diagonal) and a short depth range keeps precision.
 * Sets `camera.up`, which three's shadow update uses for its lookAt. Feet.
 */
export function fitKeyShadowCamera(
  camera: THREE.OrthographicCamera,
  lightPosition: THREE.Vector3,
  room: RoomBox,
  margin: number
) {
  const corners = roomCorners(room, margin);
  bestShadowUp(lightPosition, corners, camera.up);
  view.lookAt(lightPosition, ORIGIN, camera.up).setPosition(lightPosition).invert();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of corners) {
    corner.copy(point).applyMatrix4(view);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }
  camera.left = minX;
  camera.right = maxX;
  camera.bottom = minY;
  camera.top = maxY;
  /* View space looks down -Z. */
  camera.near = Math.max(0.5, -maxZ - margin);
  camera.far = -minZ + margin;
  camera.updateProjectionMatrix();
}
