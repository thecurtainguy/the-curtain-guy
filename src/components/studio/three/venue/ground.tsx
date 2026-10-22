"use client";

import type { StudioFloorFinish, StudioPoint } from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildBandGeometry } from "./band-geometry";
import { offsetPolygon } from "./polygon";
import { getRadialFadeTexture } from "./textures";
import { SCALE, WALL_THICKNESS_IN } from "./wall-geometry";

const noRaycast = () => null;

/** Plinth reveal beyond the wall exterior, and its height (inches). */
const PLINTH_MARGIN_IN = 18;
const PLINTH_HEIGHT_IN = 3.5;
const PLINTH_TOP_FT = -0.02;

/**
 * Dark presentation backdrop for dollhouse / top views: the room sits on a
 * satin charcoal plinth with a fine gold edge, over a ground that fades into
 * the background. Nothing here is raycastable (clicks fall through to the
 * canvas miss handler); inside the room it is hidden under the floor.
 */
export const VenueGround = memo(function VenueGround({
  floor,
  bounds,
  floorFinish,
}: {
  floor: StudioPoint[];
  bounds: StudioBounds;
  floorFinish: StudioFloorFinish;
}) {
  const fade = getRadialFadeTexture();
  const span = Math.max(bounds.width, bounds.depth) * SCALE;
  const radius = span * 1.8 + 40;
  const lawn = floorFinish === "lawn";
  const plinthDepth = PLINTH_HEIGHT_IN * SCALE;

  const geometry = useMemo(() => {
    const outline = offsetPolygon(floor, -(WALL_THICKNESS_IN + PLINTH_MARGIN_IN));
    if (outline.length < 3) return null;
    const shape = new THREE.Shape();
    outline.forEach((p, i) => {
      const x = (p.x - bounds.centerX) * SCALE;
      const y = -(p.z - bounds.centerZ) * SCALE;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    const plinth = new THREE.ExtrudeGeometry(shape, {
      depth: plinthDepth,
      bevelEnabled: true,
      bevelThickness: 0.4 * SCALE,
      bevelSize: 0.4 * SCALE,
      bevelSegments: 2,
    });
    plinth.rotateX(-Math.PI / 2);
    plinth.translate(0, PLINTH_TOP_FT - plinthDepth - 0.4 * SCALE, 0);
    const inlay = buildBandGeometry(
      offsetPolygon(outline, 1.2),
      0.9,
      PLINTH_TOP_FT + 0.002,
      bounds,
      "up"
    );
    return { plinth, inlay };
  }, [floor, bounds, plinthDepth]);

  useEffect(
    () => () => {
      geometry?.plinth.dispose();
      geometry?.inlay?.dispose();
    },
    [geometry]
  );

  const groundY = PLINTH_TOP_FT - plinthDepth - 0.06;
  const pad = (WALL_THICKNESS_IN + PLINTH_MARGIN_IN + 40) * SCALE;

  return (
    <>
      <mesh
        position={[0, groundY - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={noRaycast}
        receiveShadow
        renderOrder={-2}
      >
        <circleGeometry args={[radius, 72]} />
        <meshStandardMaterial
          color={lawn ? "#121a0d" : "#0c0a08"}
          roughness={0.9}
          alphaMap={fade}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0, groundY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={noRaycast}
        renderOrder={-1}
      >
        <planeGeometry args={[bounds.width * SCALE + pad * 2, bounds.depth * SCALE + pad * 2]} />
        <meshBasicMaterial color="#000000" alphaMap={fade} transparent opacity={0.7} depthWrite={false} />
      </mesh>
      {geometry ? (
        <>
          <mesh geometry={geometry.plinth} raycast={noRaycast} receiveShadow>
            <meshPhysicalMaterial
              color="#2a2622"
              roughness={0.5}
              metalness={0}
              clearcoat={0.35}
              clearcoatRoughness={0.3}
            />
          </mesh>
          {geometry.inlay ? (
            <mesh geometry={geometry.inlay} raycast={noRaycast}>
              <meshStandardMaterial color="#c9a25e" metalness={1} roughness={0.3} />
            </mesh>
          ) : null}
        </>
      ) : null}
    </>
  );
});
