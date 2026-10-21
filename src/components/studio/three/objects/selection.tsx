"use client";

import * as THREE from "three";
import { outlineRing, roundedRectPlate } from "./geometry";
import { cachedMaterial } from "./materials";
import { Part } from "./part";

function overlay(hex: string, opacity: number) {
  return cachedMaterial(`overlay:${hex}:${opacity}`, () =>
    new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    })
  );
}

/**
 * Quiet floor marker: a fine gold ring around the footprint (plus a faint
 * wash) when selected, a thinner champagne ring on hover. Locked items use a
 * muted tint so they read as "parked".
 */
export function SelectionHighlight({
  w,
  d,
  round,
  pad,
  mode,
  locked,
}: {
  w: number;
  d: number;
  round: boolean;
  /** Extra clearance beyond the footprint (e.g. chairs). */
  pad: number;
  mode: "selected" | "hover";
  locked?: boolean;
}) {
  const hx = w / 2 + pad;
  const hz = d / 2 + pad;
  const radius = round ? Math.min(hx, hz) : Math.min(0.35 + pad * 0.5, Math.min(hx, hz));
  const selected = mode === "selected";
  const color = locked ? "#b8b0a2" : selected ? "#f0c66e" : "#e9d7a8";
  const thickness = selected ? 0.07 : 0.04;
  return (
    <group>
      {selected ? (
        <Part
          geometry={roundedRectPlate(hx, hz, radius)}
          material={overlay(color, 0.07)}
          position={[0, 0.018, 0]}
          cast={false}
          receive={false}
          renderOrder={8}
        />
      ) : null}
      <Part
        geometry={outlineRing(hx, hz, radius, thickness)}
        material={overlay(color, selected ? 0.92 : 0.5)}
        position={[0, 0.022, 0]}
        cast={false}
        receive={false}
        renderOrder={9}
      />
      {selected ? (
        <Part
          geometry={outlineRing(hx + 0.16, hz + 0.16, radius + 0.16, 0.02)}
          material={overlay(color, 0.3)}
          position={[0, 0.02, 0]}
          cast={false}
          receive={false}
          renderOrder={9}
        />
      ) : null}
    </group>
  );
}
