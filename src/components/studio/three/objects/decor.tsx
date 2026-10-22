"use client";

import { getDrapeColorHex } from "@/data/studio";
import * as THREE from "three";
import { mix, rng } from "../texture-utils";
import {
  cachedGeometry,
  flatTorus,
  lathe,
  mergeLoose,
  placed,
  q,
  roundedBox,
  segmentsFor,
  UNIT,
} from "./geometry";
import { cachedMaterial, finishMaterial, MAT } from "./materials";
import { Group, Part, seedOf } from "./part";
import { genericFinish, isDetailed, type ModelProps } from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/* Plant                                                               */
/* ------------------------------------------------------------------ */

const POT_PROFILE: Array<[number, number]> = [
  [0, 0],
  [0.78, 0],
  [0.84, 0.04],
  [0.98, 0.86],
  [1.04, 0.92],
  [1.04, 1],
  [0.95, 1],
  [0.93, 0.93],
  [0, 0.93],
];

const GREENS = ["#2f5a30", "#3f7139", "#557f3e"];

function jitteredBlob(detail: number, seed: number) {
  return cachedGeometry(`blob:${detail}:${seed}`, () => {
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const p = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n =
        Math.sin(x * 5.1 + seed) * Math.cos(z * 4.3 - seed * 0.7) * 0.5 +
        Math.sin(y * 6.7 + seed * 1.3) * 0.5;
      const k = 1 + n * 0.22;
      p.setXYZ(i, x * k, y * k * 0.85, z * k);
    }
    geometry.computeVertexNormals();
    return geometry;
  });
}

function foliageGeometry(
  seed: number,
  w: number,
  h: number,
  potTop: number,
  greenIndex: number,
  detail: number
) {
  return cachedGeometry(
    `foliage:${seed}:${q(w)}:${q(h)}:${q(potTop)}:${greenIndex}:${detail}`,
    () => {
      const random = rng(seed * 13 + greenIndex * 101);
      const crownR = Math.max(0.4, w * 0.62);
      const crownBottom = h > 3.5 ? potTop + (h - potTop) * 0.25 : potTop;
      const span = Math.max(0.3, h - crownBottom);
      const clusters = Math.round(clamp(span * crownR * 3.2, 5, 22) / 3);
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < clusters; i++) {
        const t = random();
        const y = crownBottom + span * (0.15 + 0.7 * t);
        const shape = Math.sin(Math.PI * (0.25 + 0.75 * t));
        const angle = random() * Math.PI * 2;
        const rr = crownR * shape * (0.25 + random() * 0.55);
        const size = (0.25 + random() * 0.25) * Math.max(0.6, crownR);
        parts.push(
          placed(
            jitteredBlob(detail, (seed + i + greenIndex * 7) % 6),
            [Math.cos(angle) * rr, y, Math.sin(angle) * rr],
            [size, size * 0.9, size],
            [random(), random() * Math.PI, random()]
          )
        );
      }
      const leaves = Math.round(clusters * 4);
      for (let i = 0; i < leaves; i++) {
        const t = random();
        const y = crownBottom + span * (0.05 + 0.95 * t);
        const shape = Math.sin(Math.PI * (0.2 + 0.8 * t));
        const angle = random() * Math.PI * 2;
        const rr = crownR * shape * (0.6 + random() * 0.45);
        const size = 0.16 + random() * 0.14;
        parts.push(
          placed(
            UNIT.sphere(6),
            [Math.cos(angle) * rr, y, Math.sin(angle) * rr],
            [size * 1.6, size * 0.18, size * 0.7],
            [random() * 0.8 - 0.4, -angle, random() * 0.9 - 0.2]
          )
        );
      }
      return mergeLoose(parts);
    }
  );
}

function potMaterial(object: ModelProps["object"]) {
  const finish = genericFinish(object);
  if (object.color || finish) return finishMaterial(finish ?? "custom", object.color);
  return cachedMaterial("pot-stone", () =>
    new THREE.MeshPhysicalMaterial({
      color: "#d8d0c3",
      roughness: 0.62,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
    })
  );
}

export function PlantModel({ object, w, d, h, quality }: ModelProps) {
  const footprint = Math.min(w, d);
  const potR = clamp(footprint * 0.36, 0.3, 2);
  const potH = clamp(h * 0.24, 0.5, 2);
  const potTop = potH * 0.93;
  const seed = seedOf(object.id) % 7;
  const seg = segmentsFor(quality, 28);
  const detail = quality === "draft" ? 0 : 1;
  const tall = h > 3.5;
  return (
    <>
      <Part
        geometry={lathe("pot", POT_PROFILE, seg)}
        material={potMaterial(object)}
        scale={[potR, potH, potR]}
      />
      <Part
        geometry={UNIT.disc(seg)}
        material={MAT.soil()}
        position={[0, potTop - 0.02, 0]}
        scale={[potR * 0.92, 1, potR * 0.92]}
        cast={false}
      />
      {tall ? (
        <Part
          geometry={UNIT.taper(0.6, 8)}
          material={MAT.wood("#5d4330")}
          position={[0, potTop + (h - potTop) * 0.3, 0]}
          scale={[0.06, (h - potTop) * 0.6, 0.06]}
        />
      ) : null}
      <Group scale={[w / Math.max(footprint, 0.01), 1, d / Math.max(footprint, 0.01)]}>
        {GREENS.map((green, index) => (
          <Part
            key={green}
            geometry={foliageGeometry(seed, footprint, h, potTop, index, detail)}
            material={MAT.leaf(green)}
          />
        ))}
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Fluted column                                                       */
/* ------------------------------------------------------------------ */

function flutedShaft(flutes: number, segments: number) {
  return cachedGeometry(`fluted:${flutes}:${segments}`, () => {
    const geometry = new THREE.CylinderGeometry(0.9, 1, 1, segments, 1, true);
    const p = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const angle = Math.atan2(z, x);
      const k = 1 - 0.07 * Math.pow(0.5 + 0.5 * Math.cos(flutes * angle), 2);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    geometry.computeVertexNormals();
    return geometry;
  });
}

export function ColumnModel({ object, w, d, h, quality }: ModelProps) {
  const material = finishMaterial(genericFinish(object) ?? "painted_white", object.color);
  const R = Math.max(0.15, Math.min(w, d) * 0.36);
  const baseH = Math.min(0.45, h * 0.08);
  const capH = Math.min(0.5, h * 0.08);
  const shaftH = Math.max(0.2, h - baseH - capH - 0.2);
  const flutes = 20;
  const seg = quality === "draft" ? flutes * 3 : quality === "ultra" ? flutes * 8 : flutes * 5;
  const torusSeg = segmentsFor(quality, 40);
  const shaftBottom = baseH + 0.1;
  return (
    <>
      <Part geometry={roundedBox(w, baseH, d, 0.02, 2)} material={material} position={[0, baseH / 2, 0]} />
      <Part
        geometry={flatTorus(0.2, 10, torusSeg)}
        material={material}
        position={[0, baseH + 0.06, 0]}
        scale={[R * 1.08, R * 0.8, R * 1.08]}
      />
      <Part
        geometry={flutedShaft(flutes, seg)}
        material={material}
        position={[0, shaftBottom + shaftH / 2, 0]}
        scale={[R, shaftH, R]}
      />
      <Part
        geometry={flatTorus(0.16, 10, torusSeg)}
        material={material}
        position={[0, shaftBottom + shaftH + 0.03, 0]}
        scale={[R * 0.96, R * 0.8, R * 0.96]}
      />
      <Part
        geometry={UNIT.taper(1.35, torusSeg)}
        material={material}
        position={[0, h - capH - 0.05, 0]}
        scale={[R * 0.92, 0.2, R * 0.92]}
      />
      <Part
        geometry={roundedBox(w * 0.96, capH * 0.6, d * 0.96, 0.02, 2)}
        material={material}
        position={[0, h - (capH * 0.6) / 2, 0]}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Uplight fixture (light itself is added by the lighting layer)       */
/* ------------------------------------------------------------------ */

export function UplightModel({ object, w, d, h }: ModelProps) {
  const hex = getDrapeColorHex(object.lightColor ?? "gold");
  const finish = genericFinish(object);
  const housing =
    object.color || finish === "painted_white" || finish === "gold" || finish === "metal"
      ? finishMaterial(finish ?? "custom", object.color)
      : MAT.blackMetal();
  const r = Math.max(0.12, Math.min(w, d) * 0.34);
  const canH = Math.max(0.2, h * 0.8);
  const lens = cachedMaterial(`uplight-lens:${hex}`, () =>
    new THREE.MeshStandardMaterial({
      color: mix(hex, "#ffffff", 0.5),
      emissive: mix(hex, "#ffffff", 0.2),
      emissiveIntensity: 6,
      toneMapped: false,
    })
  );
  return (
    <>
      <Part
        geometry={roundedBox(Math.min(w, d) * 0.9, 0.05, Math.min(w, d) * 0.9, 0.015, 1)}
        material={housing}
        position={[0, 0.025, 0]}
      />
      {[-1, 1].map((s) => (
        <Part
          key={s}
          geometry={UNIT.box()}
          material={housing}
          position={[s * (r + 0.03), canH * 0.4, 0]}
          scale={[0.025, canH * 0.7, 0.08]}
        />
      ))}
      <Group position={[0, canH * 0.5, 0]} rotation={[-0.22, 0, 0]}>
        <Part geometry={UNIT.taper(1.08, 24)} material={housing} scale={[r, canH * 0.85, r]} />
        <Part
          geometry={UNIT.disc(24)}
          material={lens}
          position={[0, canH * 0.425 + 0.003, 0]}
          scale={[r * 0.88, 1, r * 0.88]}
          cast={false}
          receive={false}
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Crystal chandelier                                                  */
/* ------------------------------------------------------------------ */

function crystalMaterial(hex: string) {
  return cachedMaterial(`crystal:${hex}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: mix(hex, "#ffffff", 0.75),
      roughness: 0.04,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      emissive: mix(hex, "#ffffff", 0.3),
      emissiveIntensity: 0.9,
      iridescence: 0.6,
      iridescenceIOR: 1.6,
    })
  );
}

function chainGeometry(length: number) {
  return cachedGeometry(`chain:${q(length)}`, () => {
    const link = flatTorus(0.28, 6, 12);
    const pitch = 0.11;
    const count = Math.max(1, Math.floor(length / pitch));
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      parts.push(
        placed(
          link,
          [0, i * pitch + pitch / 2, 0],
          [0.04, 0.04, 0.065],
          [Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0]
        )
      );
    }
    return mergeLoose(parts);
  });
}

type Tier = { y: number; r: number; arms: number };

function chandelierTiers(R: number, h: number): Tier[] {
  if (h < 2.2) {
    return [
      { y: h * 0.42, r: R * 0.92, arms: 8 },
      { y: h * 0.72, r: R * 0.55, arms: 5 },
    ];
  }
  return [
    { y: h * 0.32, r: R * 0.95, arms: 10 },
    { y: h * 0.55, r: R * 0.7, arms: 8 },
    { y: h * 0.76, r: R * 0.42, arms: 5 },
  ];
}

function crystalGeometry(R: number, h: number, density: number) {
  return cachedGeometry(`crystals:${q(R)}:${q(h)}:${density}`, () => {
    const random = rng(97);
    const parts: THREE.BufferGeometry[] = [];
    const drop = UNIT.octahedron();
    const bead = UNIT.sphere(6);
    for (const tier of chandelierTiers(R, h)) {
      const strands = Math.max(8, Math.round((Math.PI * 2 * tier.r) / (0.22 / density)));
      for (let s = 0; s < strands; s++) {
        const a = (s / strands) * Math.PI * 2;
        const length = 2 + Math.floor(random() * 3 * density);
        for (let b = 0; b < length; b++) {
          parts.push(
            placed(
              bead,
              [Math.cos(a) * tier.r, tier.y - 0.06 - b * 0.085, Math.sin(a) * tier.r],
              [0.026, 0.032, 0.026]
            )
          );
        }
        parts.push(
          placed(
            drop,
            [Math.cos(a) * tier.r, tier.y - 0.1 - length * 0.085, Math.sin(a) * tier.r],
            [0.04, 0.1, 0.04],
            [0, a, 0]
          )
        );
      }
      // Swag strands between tiers sweeping toward the centre.
      for (let s = 0; s < tier.arms; s++) {
        const a = ((s + 0.5) / tier.arms) * Math.PI * 2;
        for (let b = 1; b < 8; b++) {
          const t = b / 8;
          const r = tier.r * (1 - t * 0.6);
          parts.push(
            placed(
              bead,
              [Math.cos(a) * r, tier.y - 0.04 - Math.sin(Math.PI * t) * 0.25, Math.sin(a) * r],
              [0.022, 0.022, 0.022]
            )
          );
        }
      }
    }
    // Bottom basket converging to a finial drop.
    const basket = Math.round(16 * density);
    for (let s = 0; s < basket; s++) {
      const a = (s / basket) * Math.PI * 2;
      for (let b = 0; b < 6; b++) {
        const t = b / 6;
        const r = R * 0.5 * (1 - t);
        parts.push(
          placed(bead, [Math.cos(a) * r, h * 0.26 - t * h * 0.2, Math.sin(a) * r], [0.024, 0.03, 0.024])
        );
      }
    }
    parts.push(placed(drop, [0, h * 0.03, 0], [0.08, 0.2, 0.08]));
    return mergeLoose(parts);
  });
}

function bulbGeometry(R: number, h: number) {
  return cachedGeometry(`chandelier-bulbs:${q(R)}:${q(h)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const tier of chandelierTiers(R, h)) {
      for (let i = 0; i < tier.arms; i++) {
        const a = (i / tier.arms) * Math.PI * 2;
        parts.push(
          placed(UNIT.sphere(10), [Math.cos(a) * tier.r, tier.y + 0.28, Math.sin(a) * tier.r], [0.045, 0.08, 0.045])
        );
      }
    }
    return mergeLoose(parts);
  });
}

function candleSleeveGeometry(R: number, h: number) {
  return cachedGeometry(`chandelier-sleeves:${q(R)}:${q(h)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const tier of chandelierTiers(R, h)) {
      for (let i = 0; i < tier.arms; i++) {
        const a = (i / tier.arms) * Math.PI * 2;
        const x = Math.cos(a) * tier.r;
        const z = Math.sin(a) * tier.r;
        parts.push(
          placed(UNIT.cylinder(10), [x, tier.y + 0.12, z], [0.032, 0.22, 0.032]),
          placed(UNIT.cylinder(12), [x, tier.y + 0.01, z], [0.08, 0.025, 0.08])
        );
      }
    }
    return mergeLoose(parts);
  });
}

export function ChandelierModel({
  object,
  w,
  d,
  h,
  quality,
  wallHeight,
}: ModelProps & { wallHeight: number }) {
  const hex = getDrapeColorHex(object.lightColor ?? "champagne");
  const frame = object.color ? finishMaterial("gold", object.color) : MAT.gold();
  const R = Math.max(0.3, Math.min(w, d) / 2);
  const height = Math.max(0.8, h);
  const bottom = Math.max(0, (object.elevation ?? 96) / 12);
  const top = bottom + height;
  const chain = Math.max(0, wallHeight - top);
  const tiers = chandelierTiers(R, height);
  const torusSeg = segmentsFor(quality, 48);
  const density = quality === "draft" ? 0.5 : quality === "ultra" ? 1.4 : 1;
  const bulb = cachedMaterial(`chandelier-bulb:${hex}`, () =>
    new THREE.MeshStandardMaterial({
      color: mix(hex, "#ffffff", 0.6),
      emissive: mix(hex, "#ffffff", 0.35),
      emissiveIntensity: 5,
      toneMapped: false,
    })
  );
  return (
    <Group position={[0, bottom, 0]}>
      {chain > 0.05 ? (
        <>
          <Part geometry={chainGeometry(chain)} material={frame} position={[0, height, 0]} cast={false} />
          <Part
            geometry={UNIT.hemisphere(24)}
            material={frame}
            position={[0, height + chain, 0]}
            rotation={[Math.PI, 0, 0]}
            scale={[0.35, 0.12, 0.35]}
            cast={false}
          />
        </>
      ) : null}
      <Part
        geometry={lathe(
          "chandelier-column",
          [
            [0, 0],
            [0.08, 0.02],
            [0.14, 0.08],
            [0.06, 0.16],
            [0.05, 0.4],
            [0.11, 0.48],
            [0.05, 0.56],
            [0.045, 0.85],
            [0.09, 0.92],
            [0.04, 1],
            [0, 1],
          ],
          segmentsFor(quality, 20)
        )}
        material={frame}
        position={[0, height * 0.18, 0]}
        scale={[Math.max(1, R * 0.6), height * 0.82, Math.max(1, R * 0.6)]}
      />
      {tiers.map((tier, index) => (
        <Group key={index}>
          <Part
            geometry={flatTorus(0.04, 8, torusSeg)}
            material={frame}
            position={[0, tier.y, 0]}
            scale={tier.r}
          />
          {Array.from({ length: tier.arms }, (_, i) => {
            const a = (i / tier.arms) * Math.PI * 2;
            return (
              <Part
                key={i}
                geometry={UNIT.cylinder(6)}
                material={frame}
                position={[(Math.cos(a) * tier.r) / 2, tier.y - 0.04, (Math.sin(a) * tier.r) / 2]}
                rotation={[0, -a, Math.PI / 2 - 0.12]}
                scale={[0.018, tier.r, 0.018]}
                cast={false}
              />
            );
          })}
        </Group>
      ))}
      <Part geometry={candleSleeveGeometry(R, height)} material={MAT.porcelain()} cast={false} />
      <Part geometry={bulbGeometry(R, height)} material={bulb} cast={false} receive={false} />
      <Part
        geometry={crystalGeometry(R, height, density)}
        material={crystalMaterial(hex)}
        cast={isDetailed(quality)}
        receive={false}
      />
    </Group>
  );
}
