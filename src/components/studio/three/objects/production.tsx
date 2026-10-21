"use client";

import {
  getDrapeColorHex,
  type DanceFloorFinish,
  type GenericStudioObjectFinish,
  type StudioObject,
} from "@/data/studio";
import * as THREE from "three";
import { mix } from "../texture-utils";
import {
  buildSkirt,
  cachedGeometry,
  lathe,
  mergeLoose,
  placed,
  q,
  roundedBox,
  segmentsFor,
  UNIT,
} from "./geometry";
import {
  cachedMaterial,
  carpetNormal,
  carpetTexture,
  DANCE_TEXTURE_FEET,
  danceSeamNormal,
  danceTexture,
  finishMaterial,
  MAT,
  monogramTexture,
  starlitEmissive,
} from "./materials";
import { FloralCluster, Part } from "./part";
import { genericFinish, isDetailed, type ModelProps } from "./types";

type Vec3 = [number, number, number];
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const browser = () => typeof document !== "undefined";
const UP = new THREE.Vector3(0, 1, 0);

function tube(a: Vec3, b: Vec3, radius: number, segments = 8) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const length = dir.length();
  return UNIT.cylinder(segments)
    .clone()
    .applyMatrix4(
      new THREE.Matrix4().compose(
        start.add(end).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
        new THREE.Vector3(radius, length, radius)
      )
    );
}

/** Gloss panel material for production facades (booths, podiums, pianos). */
function panelMaterial(finish: GenericStudioObjectFinish | undefined, color?: string) {
  if (color) {
    return cachedMaterial(`panel:${color}`, () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      })
    );
  }
  if (finish === "painted_white") return MAT.whiteGloss();
  if (finish === "painted_black") return MAT.blackGloss();
  return finishMaterial(finish);
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

export function StageModel({ object, w, d, h, quality }: ModelProps) {
  const finish = genericFinish(object);
  const deckH = Math.max(0.15, h);
  const carpetBase =
    object.color ?? (finish === "painted_white" ? "#e6e0d5" : "#1b1a1c");
  const deckMaterial =
    finish === "natural_wood" && !object.color
      ? MAT.wood("#6f5038")
      : cachedMaterial(`stage-carpet:${carpetBase}`, () =>
          new THREE.MeshStandardMaterial({
            color: "#ffffff",
            map: browser() ? carpetTexture(carpetBase) : null,
            normalMap: browser() ? carpetNormal() : null,
            normalScale: new THREE.Vector2(0.6, 0.6),
            roughness: 0.96,
          })
        );
  const skirtColor = finish === "painted_white" ? "#ebe5da" : "#151416";
  const perimeter = 2 * (w + d);
  const segments = segmentsFor(quality, clamp(Math.round(perimeter / 0.12), 96, 480));
  const skirt = buildSkirt({
    key: `stage-skirt:${q(w)}:${q(d)}:${q(deckH)}:${segments}`,
    hx: w / 2,
    hz: d / 2,
    rows: [
      { y: deckH - 0.1, offset: 0.03, amp: 0.035, radius: 0.04 },
      { y: deckH * 0.5, offset: 0.035, amp: 0.035, radius: 0.04 },
      { y: 0.01, offset: 0.045, amp: 0.04, radius: 0.05 },
    ],
    segments,
    folds: Math.max(12, Math.round(perimeter / 0.28)),
    pleated: true,
    cap: false,
  });
  const steps = deckH >= 0.6 ? Math.max(2, Math.ceil(deckH / 0.6)) : 0;
  const stairW = Math.min(3.5, d * 0.45);
  const tread = 0.95;
  return (
    <>
      <Part
        geometry={UNIT.box()}
        material={MAT.blackMetal()}
        position={[0, (deckH - 0.1) / 2, 0]}
        scale={[w - 0.1, deckH - 0.1, d - 0.1]}
      />
      <Part
        geometry={roundedBox(w, 0.1, d, 0.02, 1)}
        material={deckMaterial}
        position={[0, deckH - 0.05, 0]}
      />
      <Part geometry={skirt} material={MAT.velvet(skirtColor)} />
      {[-1, 1].map((s) => (
        <Part
          key={`tx${s}`}
          geometry={UNIT.box()}
          material={MAT.aluminum()}
          position={[0, deckH - 0.02, s * (d / 2 + 0.01)]}
          scale={[w + 0.04, 0.05, 0.04]}
        />
      ))}
      {[-1, 1].map((s) => (
        <Part
          key={`tz${s}`}
          geometry={UNIT.box()}
          material={MAT.aluminum()}
          position={[s * (w / 2 + 0.01), deckH - 0.02, 0]}
          scale={[0.04, 0.05, d + 0.04]}
        />
      ))}
      {steps > 0 ? (
        <group position={[w / 2 + 0.05, 0, d / 2 - stairW / 2 - 0.4]}>
          {Array.from({ length: steps - 1 }, (_, i) => {
            const top = ((i + 1) * deckH) / steps;
            const x = (steps - 1 - i - 0.5) * tread;
            return (
              <group key={i}>
                <Part
                  geometry={UNIT.box()}
                  material={MAT.blackMetal()}
                  position={[x, top / 2, 0]}
                  scale={[tread, top, stairW]}
                />
                <Part
                  geometry={UNIT.box()}
                  material={deckMaterial}
                  position={[x, top - 0.02, 0]}
                  scale={[tread + 0.02, 0.04, stairW + 0.02]}
                />
                <Part
                  geometry={UNIT.box()}
                  material={MAT.brushedGold()}
                  position={[x + tread / 2, top - 0.01, 0]}
                  scale={[0.03, 0.03, stairW]}
                  cast={false}
                />
              </group>
            );
          })}
          {isDetailed(quality) ? (
            <Part
              geometry={cachedGeometry(`stage-rail:${steps}:${q(deckH)}:${q(stairW)}`, () => {
                const foot = (steps - 1) * tread;
                return mergeLoose([
                  tube([foot, 2.8, -stairW / 2], [0.05, deckH + 2.8, -stairW / 2], 0.04, 10),
                  tube([foot, 0, -stairW / 2], [foot, 2.8, -stairW / 2], 0.035, 8),
                  tube([0.05, deckH, -stairW / 2], [0.05, deckH + 2.8, -stairW / 2], 0.035, 8),
                ]);
              })}
              material={MAT.silver()}
            />
          ) : null}
        </group>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dance floor                                                         */
/* ------------------------------------------------------------------ */

function danceMaterial(finish: DanceFloorFinish, color?: string) {
  return cachedMaterial(`dance:${finish}:${color ?? "-"}`, () => {
    const map = browser() ? danceTexture(finish) : null;
    const normalMap = browser() ? danceSeamNormal() : null;
    const base = {
      color: color ? mix(color, "#ffffff", 0.35) : "#ffffff",
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
    };
    switch (finish) {
      case "white_gloss":
      case "black_gloss":
      case "checkerboard":
        return new THREE.MeshPhysicalMaterial({
          ...base,
          roughness: 0.2,
          clearcoat: 0.85,
          clearcoatRoughness: 0.16,
        });
      case "warm_parquet":
      case "oak":
      case "dark_wood":
        return new THREE.MeshPhysicalMaterial({
          ...base,
          roughness: 0.36,
          clearcoat: 0.7,
          clearcoatRoughness: 0.12,
        });
      case "neutral_event_carpet":
        return new THREE.MeshStandardMaterial({ ...base, roughness: 0.97 });
      case "led_starlit":
        return new THREE.MeshPhysicalMaterial({
          ...base,
          roughness: 0.22,
          clearcoat: 0.85,
          clearcoatRoughness: 0.16,
          emissive: color ?? "#ffffff",
          emissiveMap: browser() ? starlitEmissive() : null,
          emissiveIntensity: 2.4,
        });
      case "custom_wrap_monogram":
      default:
        return new THREE.MeshPhysicalMaterial({
          ...base,
          roughness: 0.32,
          clearcoat: 0.6,
          clearcoatRoughness: 0.1,
        });
    }
  });
}

function monogramInitials(object: StudioObject) {
  const parts = object.label.split("&").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}&${parts[1][0]}`.toUpperCase();
  return "&";
}

export function DanceFloorModel({ object, w, d, h }: ModelProps) {
  const finish = (object.finish ?? "white_gloss") as DanceFloorFinish;
  const thickness = clamp(h, 0.06, 0.4);
  const top = cachedGeometry(`dance-top:${q(w)}:${q(d)}`, () => {
    const plane = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
    const uv = plane.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (uv.getX(i) * w) / DANCE_TEXTURE_FEET, (uv.getY(i) * d) / DANCE_TEXTURE_FEET);
    }
    return plane;
  });
  const monogramSize = Math.min(w, d) * 0.62;
  return (
    <>
      <Part
        geometry={UNIT.box()}
        material={MAT.blackMetal()}
        position={[0, (thickness - 0.01) / 2, 0]}
        scale={[w, thickness - 0.01, d]}
      />
      <Part
        geometry={top}
        material={danceMaterial(finish, object.color)}
        position={[0, thickness, 0]}
        cast={false}
      />
      {finish === "custom_wrap_monogram" && browser() ? (
        <mesh
          geometry={UNIT.plane()}
          position={[0, thickness + 0.004, 0]}
          scale={[monogramSize, 1, monogramSize]}
          receiveShadow
        >
          <meshPhysicalMaterial
            map={monogramTexture(monogramInitials(object))}
            transparent
            roughness={0.3}
            metalness={0.6}
            clearcoat={0.6}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ) : null}
      {[-1, 1].map((s) => (
        <Part
          key={`ex${s}`}
          geometry={roundedBox(w + 0.2, thickness + 0.03, 0.1, 0.02, 1)}
          material={MAT.aluminum()}
          position={[0, (thickness + 0.03) / 2, s * (d / 2 + 0.05)]}
        />
      ))}
      {[-1, 1].map((s) => (
        <Part
          key={`ez${s}`}
          geometry={roundedBox(0.1, thickness + 0.03, d + 0.2, 0.02, 1)}
          material={MAT.aluminum()}
          position={[s * (w / 2 + 0.05), (thickness + 0.03) / 2, 0]}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* DJ booth — facade faces +Z, DJ stands on -Z                         */
/* ------------------------------------------------------------------ */

export function DjBoothModel({ object, w, d, h, quality }: ModelProps) {
  const facade = panelMaterial(genericFinish(object), object.color);
  const glow = object.lightColor ? getDrapeColorHex(object.lightColor) : "#f2c46d";
  const deckY = h + 0.1;
  const detailed = isDetailed(quality);
  return (
    <>
      <Part
        geometry={roundedBox(w, h, 0.2, 0.05, 3)}
        material={facade}
        position={[0, h / 2, d / 2 - 0.1]}
      />
      {[-1, 1].map((s) => (
        <Part
          key={s}
          geometry={roundedBox(0.14, h, d, 0.04, 2)}
          material={facade}
          position={[s * (w / 2 - 0.07), h / 2, 0]}
        />
      ))}
      <Part
        geometry={roundedBox(w + 0.1, 0.1, d + 0.1, 0.03, 2)}
        material={MAT.blackGloss()}
        position={[0, h + 0.05, 0]}
      />
      {[0.14, h - 0.16].map((y) => (
        <Part
          key={y}
          geometry={UNIT.box()}
          material={MAT.emissive(glow, 3.2)}
          position={[0, y, d / 2 + 0.006]}
          scale={[w - 0.3, 0.035, 0.012]}
          cast={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <group key={`deck${s}`} position={[s * w * 0.28, deckY, -0.1]}>
          <Part geometry={roundedBox(1.05, 0.14, 1.25, 0.03, 2)} material={MAT.blackMetal()} position={[0, 0.07, 0]} />
          <Part
            geometry={UNIT.cylinder(detailed ? 32 : 16)}
            material={MAT.silver()}
            position={[0, 0.16, 0.05]}
            scale={[0.36, 0.03, 0.36]}
          />
          <Part
            geometry={UNIT.cylinder(detailed ? 32 : 16)}
            material={MAT.screenGlass()}
            position={[0, 0.18, 0.05]}
            scale={[0.3, 0.012, 0.3]}
            cast={false}
          />
        </group>
      ))}
      <Part geometry={roundedBox(0.8, 0.14, 1.1, 0.03, 2)} material={MAT.blackMetal()} position={[0, deckY + 0.07, -0.1]} />
      {detailed
        ? [-0.22, 0, 0.22].map((x) => (
            <Part
              key={x}
              geometry={UNIT.box()}
              material={MAT.emissive("#7fb8ff", 2.2)}
              position={[x, deckY + 0.15, 0.2]}
              scale={[0.08, 0.012, 0.08]}
              cast={false}
            />
          ))
        : null}
      <group position={[0, deckY, -d / 2 + 0.55]}>
        <Part
          geometry={tube([0, 0, 0], [0, 0.42, 0], 0.03)}
          material={MAT.silver()}
        />
        <Part geometry={roundedBox(1.1, 0.03, 0.75, 0.01, 1)} material={MAT.aluminum()} position={[0, 0.45, 0]} />
        <group position={[0, 0.46, 0.36]} rotation={[0.28, 0, 0]}>
          <Part geometry={roundedBox(1.1, 0.74, 0.025, 0.01, 1)} material={MAT.aluminum()} position={[0, 0.37, 0]} />
          <Part
            geometry={UNIT.box()}
            material={MAT.emissive("#9ec4ff", 0.9)}
            position={[0, 0.38, -0.015]}
            scale={[1.0, 0.64, 0.005]}
            cast={false}
          />
        </group>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bar — guests on +Z, bartender + back bar on -Z                      */
/* ------------------------------------------------------------------ */

const bottleMaterials = () => [
  cachedMaterial("bottle-green", () =>
    new THREE.MeshPhysicalMaterial({ color: "#1f3d29", roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85 })
  ),
  cachedMaterial("bottle-amber", () =>
    new THREE.MeshPhysicalMaterial({ color: "#7a3f12", roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85 })
  ),
  cachedMaterial("bottle-clear", () =>
    new THREE.MeshPhysicalMaterial({ color: "#dfe7e2", roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 })
  ),
];

function bottleGeometry(span: number, shelfYs: number[], group: number) {
  return cachedGeometry(`bottles:${q(span)}:${shelfYs.join(",")}:${group}`, () => {
    const bottle = lathe(
      "bottle",
      [
        [0, 0],
        [0.11, 0],
        [0.12, 0.02],
        [0.12, 0.62],
        [0.1, 0.72],
        [0.04, 0.82],
        [0.035, 1.02],
        [0.04, 1.05],
        [0, 1.05],
      ],
      12
    );
    const parts: THREE.BufferGeometry[] = [];
    const per = Math.max(3, Math.floor(span / 0.32));
    shelfYs.forEach((y, row) => {
      for (let i = 0; i < per; i++) {
        if ((i + row) % 3 !== group) continue;
        const s = 0.85 + ((i * 7 + row * 3) % 5) * 0.06;
        parts.push(
          placed(bottle, [-span / 2 + ((i + 0.5) * span) / per, y, 0], [s, s, s])
        );
      }
    });
    return parts.length ? mergeLoose(parts) : new THREE.BufferGeometry();
  });
}

function fluteGeometry(w: number, h: number) {
  return cachedGeometry(`bar-flutes:${q(w)}:${q(h)}`, () => {
    const count = Math.max(4, Math.floor(w / 0.26));
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      parts.push(
        placed(UNIT.cylinder(10), [-w / 2 + ((i + 0.5) * w) / count, h / 2, 0], [0.085, h, 0.05])
      );
    }
    return mergeLoose(parts);
  });
}

export function BarModel({ object, w, d, h, quality }: ModelProps) {
  const finish = genericFinish(object) ?? "natural_wood";
  const front = finishMaterial(finish, object.color);
  const counter = finish === "marble" ? MAT.blackGloss() : MAT.marble();
  const panelH = h - 0.14;
  const detailed = isDetailed(quality);
  const backZ = -d / 2 - 2.7;
  const backW = Math.max(2, w * 0.9);
  const shelfYs = [3.1, 4.6, 5.8];
  return (
    <>
      <Part
        geometry={UNIT.box()}
        material={MAT.blackMetal()}
        position={[0, panelH / 2, -0.15]}
        scale={[w - 0.3, panelH, d - 0.45]}
      />
      <Part
        geometry={roundedBox(w, panelH, 0.2, 0.04, 2)}
        material={front}
        position={[0, panelH / 2, d / 2 - 0.12]}
      />
      {detailed ? (
        <Part geometry={fluteGeometry(w - 0.3, panelH - 0.5)} material={front} position={[0, 0.3, d / 2 - 0.02]} />
      ) : null}
      <Part
        geometry={UNIT.box()}
        material={MAT.brushedGold()}
        position={[0, 0.14, d / 2 + 0.005]}
        scale={[w - 0.02, 0.26, 0.03]}
      />
      <Part
        geometry={roundedBox(w + 0.2, 0.14, d + 0.15, 0.04, 2)}
        material={counter}
        position={[0, h - 0.07, 0.05]}
      />
      <Part
        geometry={UNIT.box()}
        material={MAT.emissive("#ffcf8a", 2.5)}
        position={[0, h - 0.17, d / 2 + 0.02]}
        scale={[w - 0.2, 0.025, 0.02]}
        cast={false}
      />
      <group position={[0, 0, backZ]}>
        <Part
          geometry={roundedBox(backW, 3, 1.3, 0.04, 2)}
          material={front}
          position={[0, 1.5, 0]}
        />
        <Part geometry={roundedBox(backW + 0.1, 0.1, 1.4, 0.02, 1)} material={counter} position={[0, 3.05, 0]} />
        {[-1, 1].map((s) => (
          <Part
            key={s}
            geometry={UNIT.box()}
            material={MAT.brushedGold()}
            position={[s * (backW / 2 - 0.04), 4.8, -0.35]}
            scale={[0.08, 3.5, 0.6]}
          />
        ))}
        {shelfYs.slice(1).map((y) => (
          <group key={y}>
            <Part
              geometry={UNIT.box()}
              material={MAT.glass()}
              position={[0, y - 0.04, -0.35]}
              scale={[backW - 0.1, 0.05, 0.6]}
              cast={false}
            />
            <Part
              geometry={UNIT.box()}
              material={MAT.emissive("#ffcf8a", 2.2)}
              position={[0, y - 0.08, -0.08]}
              scale={[backW - 0.2, 0.02, 0.02]}
              cast={false}
            />
          </group>
        ))}
        {detailed
          ? bottleMaterials().map((material, group) => (
              <Part
                key={group}
                geometry={bottleGeometry(backW - 0.4, shelfYs, group)}
                material={material}
                position={[0, 0, -0.35]}
              />
            ))
          : null}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Photo booth — backdrop on -Z, kiosk on +Z facing it                 */
/* ------------------------------------------------------------------ */

const ringGeometry = () =>
  cachedGeometry("ring-xy", () => new THREE.TorusGeometry(1, 0.06, 10, 64));

export function PhotoBoothModel({ object, w, d, h, quality }: ModelProps) {
  const backdropW = Math.max(2, w * 0.92);
  const backdropH = clamp(h - 0.2, 4, 10);
  const sequin = cachedMaterial(`sequin:${object.color ?? "-"}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: object.color ?? "#d9b56c",
      metalness: 0.85,
      roughness: 0.32,
      clearcoat: 0.4,
      normalMap: browser() ? carpetNormal() : null,
      normalScale: new THREE.Vector2(1.4, 1.4),
    })
  );
  const kioskZ = d / 2 - 1.1;
  return (
    <>
      <group position={[0, 0, -d / 2 + 0.35]}>
        <Part
          geometry={roundedBox(backdropW, backdropH, 0.12, 0.03, 2)}
          material={sequin}
          position={[0, backdropH / 2 + 0.1, 0]}
        />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Part
              geometry={UNIT.box()}
              material={MAT.blackMetal()}
              position={[s * (backdropW / 2 + 0.05), (backdropH + 0.2) / 2, 0]}
              scale={[0.1, backdropH + 0.2, 0.1]}
            />
            <Part
              geometry={UNIT.box()}
              material={MAT.blackMetal()}
              position={[s * (backdropW / 2 + 0.05), 0.02, 0]}
              scale={[0.25, 0.04, 1.6]}
            />
          </group>
        ))}
      </group>
      <group position={[0, 0, kioskZ]}>
        <Part geometry={roundedBox(1.3, 0.1, 1.3, 0.03, 2)} material={MAT.blackGloss()} position={[0, 0.05, 0]} />
        <Part geometry={roundedBox(0.55, 4.2, 0.55, 0.06, 3)} material={MAT.whiteGloss()} position={[0, 2.2, 0]} />
        <Part geometry={roundedBox(1.5, 1.9, 0.5, 0.1, 3)} material={MAT.blackGloss()} position={[0, 5.1, 0]} />
        <Part
          geometry={UNIT.box()}
          material={MAT.emissive("#cfe0ff", 0.7)}
          position={[0, 5.0, -0.255]}
          scale={[1.05, 1.35, 0.01]}
          cast={false}
        />
        <Part
          geometry={ringGeometry()}
          material={MAT.emissive("#fff4e6", 4)}
          position={[0, 5.0, -0.3]}
          scale={[0.95, 0.95, 0.95]}
          cast={false}
        />
        <Part
          geometry={UNIT.cylinder(20)}
          material={MAT.screenGlass()}
          position={[0, 5.92, -0.26]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.07, 0.04, 0.07]}
          cast={false}
        />
      </group>
      {isDetailed(quality) ? (
        <group position={[backdropW / 2 - 0.6, 0, kioskZ - 0.2]}>
          <Part geometry={roundedBox(1.0, 2.6, 1.0, 0.04, 2)} material={MAT.whiteGloss()} position={[0, 1.3, 0]} />
          <Part
            geometry={roundedBox(0.9, 0.12, 0.9, 0.03, 2)}
            material={MAT.brushedGold()}
            position={[0, 2.66, 0]}
          />
        </group>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Podium — audience on +Z                                             */
/* ------------------------------------------------------------------ */

export function PodiumModel({ object, w, d, h, quality }: ModelProps) {
  const finish = genericFinish(object);
  const body = panelMaterial(finish, object.color);
  const bodyH = Math.max(0.6, h - 0.35);
  return (
    <>
      <Part geometry={roundedBox(w, 0.16, d, 0.04, 2)} material={body} position={[0, 0.08, 0]} />
      <Part
        geometry={roundedBox(w * 0.82, bodyH, d * 0.78, 0.06, 3)}
        material={body}
        position={[0, 0.16 + bodyH / 2, 0]}
      />
      <Part
        geometry={roundedBox(w * 1.02, 0.08, d * 1.05, 0.03, 2)}
        material={body}
        position={[0, h - 0.1, -0.02]}
        rotation={[-0.22, 0, 0]}
      />
      <Part
        geometry={UNIT.cylinder(32)}
        material={MAT.gold()}
        position={[0, h * 0.62, d * 0.39 + 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[Math.min(w, h) * 0.18, 0.03, Math.min(w, h) * 0.18]}
      />
      {isDetailed(quality) ? (
        <>
          <Part
            geometry={tube([0, h - 0.05, d * 0.15], [0.05, h + 0.55, -d * 0.1], 0.015)}
            material={MAT.blackMetal()}
          />
          <Part
            geometry={UNIT.sphere(12)}
            material={MAT.blackMetal()}
            position={[0.05, h + 0.6, -d * 0.12]}
            scale={[0.05, 0.08, 0.05]}
          />
        </>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AV screen on box truss — faces +Z                                   */
/* ------------------------------------------------------------------ */

function trussGeometry(w: number, h: number, detailed: boolean) {
  return cachedGeometry(`truss:${q(w)}:${q(h)}:${detailed}`, () => {
    const s = 0.34;
    const r = 0.028;
    const parts: THREE.BufferGeometry[] = [];
    const vertical = (cx: number) => {
      const corners: Array<[number, number]> = [
        [cx - s, -s],
        [cx + s, -s],
        [cx + s, s],
        [cx - s, s],
      ];
      corners.forEach(([x, z]) => parts.push(tube([x, 0, z], [x, h, z], r)));
      if (detailed) {
        const steps = Math.max(2, Math.round(h / (s * 2)));
        for (let i = 0; i < steps; i++) {
          const y0 = (i * h) / steps;
          const y1 = ((i + 1) * h) / steps;
          for (let c = 0; c < 4; c++) {
            const a = corners[c];
            const b = corners[(c + 1) % 4];
            parts.push(
              i % 2
                ? tube([a[0], y0, a[1]], [b[0], y1, b[1]], r * 0.55, 6)
                : tube([b[0], y0, b[1]], [a[0], y1, a[1]], r * 0.55, 6)
            );
          }
        }
      }
      parts.push(placed(UNIT.box(), [cx, 0.02, 0], [0.9, 0.04, 0.9]));
    };
    vertical(-w / 2 + s);
    vertical(w / 2 - s);
    const y = h - s;
    const spanX = w - 4 * s;
    const top: Array<[number, number]> = [
      [y - s, -s],
      [y + s, -s],
      [y + s, s],
      [y - s, s],
    ];
    top.forEach(([yy, z]) =>
      parts.push(tube([-spanX / 2, yy, z], [spanX / 2, yy, z], r))
    );
    if (detailed) {
      const steps = Math.max(2, Math.round(spanX / (s * 2)));
      for (let i = 0; i < steps; i++) {
        const x0 = -spanX / 2 + (i * spanX) / steps;
        const x1 = -spanX / 2 + ((i + 1) * spanX) / steps;
        for (const z of [-s, s]) {
          parts.push(tube([i % 2 ? x0 : x1, y - s, z], [i % 2 ? x1 : x0, y + s, z], r * 0.55, 6));
        }
      }
    }
    return mergeLoose(parts);
  });
}

export function AvScreenModel({ w, h, quality }: ModelProps) {
  const span = Math.max(2, w);
  const height = Math.max(4, h);
  const screenW = Math.max(1, span - 1.6);
  const screenH = Math.min(height * 0.62, screenW * (9 / 16));
  const screenY = height - 0.8 - screenH / 2;
  const screenMat = cachedMaterial("av-screen", () =>
    new THREE.MeshStandardMaterial({
      color: "#f2f2ef",
      emissive: "#dfe7f4",
      emissiveIntensity: 0.38,
      roughness: 0.9,
    })
  );
  return (
    <>
      <Part geometry={trussGeometry(span, height, isDetailed(quality))} material={MAT.aluminum()} />
      <Part
        geometry={roundedBox(screenW + 0.3, screenH + 0.3, 0.08, 0.03, 1)}
        material={MAT.blackMetal()}
        position={[0, screenY, 0]}
      />
      <Part
        geometry={UNIT.box()}
        material={screenMat}
        position={[0, screenY, 0.045]}
        scale={[screenW, screenH, 0.01]}
        cast={false}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Grand piano — keyboard on +Z, tail toward -Z                        */
/* ------------------------------------------------------------------ */

function pianoShape(w: number, d: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, d * 0.3);
  shape.bezierCurveTo(w / 2, d * 0.56, w * 0.06, d * 0.48, 0, d * 0.78);
  shape.bezierCurveTo(-w * 0.05, d * 1.02, -w / 2, d * 1.03, -w / 2, d * 0.86);
  shape.lineTo(-w / 2, 0);
  return shape;
}

function pianoMaterial(finish: GenericStudioObjectFinish | undefined, color?: string) {
  if (color) return panelMaterial(undefined, color);
  switch (finish) {
    case "painted_white":
      return MAT.whiteGloss();
    case "natural_wood":
      return cachedMaterial("piano-wood", () => {
        const material = (MAT.wood("#5b3a24") as THREE.MeshPhysicalMaterial).clone();
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.05;
        material.roughness = 0.3;
        return material;
      });
    case "gold":
      return MAT.gold();
    default:
      return MAT.blackGloss();
  }
}

function blackKeysGeometry(span: number) {
  return cachedGeometry(`piano-black-keys:${q(span)}`, () => {
    const whiteW = span / 52;
    const pattern = [1, 0, 1, 1, 0, 1, 1];
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 51; i++) {
      if (!pattern[i % 7]) continue;
      parts.push(
        placed(UNIT.box(), [-span / 2 + (i + 1) * whiteW, 0, -0.08], [whiteW * 0.58, 0.06, 0.3])
      );
    }
    return mergeLoose(parts);
  });
}

export function PianoModel({ object, w, d, h, quality }: ModelProps) {
  const body = pianoMaterial(genericFinish(object), object.color);
  const caseH = clamp(h * 0.3, 0.8, 1.1);
  const caseTop = Math.max(caseH + 1.4, h - 0.05);
  const caseBottom = caseTop - caseH;
  const caseD = Math.max(1, d - 0.6);
  const zFront = caseD / 2 - 0.3;
  const curve = segmentsFor(quality, 24);
  const caseGeometry = cachedGeometry(`piano-case:${q(w)}:${q(caseD)}:${q(caseH)}:${curve}`, () =>
    new THREE.ExtrudeGeometry(pianoShape(w, caseD), {
      depth: caseH - 0.06,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: curve,
    }).rotateX(-Math.PI / 2)
  );
  const lidGeometry = cachedGeometry(`piano-lid:${q(w)}:${q(caseD)}:${curve}`, () =>
    new THREE.ExtrudeGeometry(pianoShape(w, caseD), {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: curve,
    })
      .rotateX(-Math.PI / 2)
      .translate(w / 2, 0, 0)
  );
  const plateGeometry = cachedGeometry(`piano-plate:${q(w)}:${q(caseD)}:${curve}`, () =>
    new THREE.ShapeGeometry(pianoShape(w * 0.9, caseD * 0.86), curve)
      .rotateX(-Math.PI / 2)
      .translate(0, 0, -caseD * 0.06)
  );
  const lidAngle = 0.5;
  const prop = 0.78 * w;
  const keySpan = w * 0.9;
  const legPositions: Vec3[] = [
    [-w * 0.42, 0, zFront - 0.35],
    [w * 0.42, 0, zFront - 0.35],
    [-w * 0.18, 0, zFront - caseD * 0.84],
  ];
  return (
    <>
      <Part geometry={caseGeometry} material={body} position={[0, caseBottom + 0.03, zFront]} />
      <Part
        geometry={plateGeometry}
        material={MAT.brushedGold()}
        position={[0, caseTop + 0.004, zFront]}
        cast={false}
      />
      <group position={[-w / 2, caseTop + 0.01, zFront]} rotation={[0, 0, lidAngle]}>
        <Part geometry={lidGeometry} material={body} />
      </group>
      <Part
        geometry={tube(
          [-w / 2 + prop * Math.cos(lidAngle), caseTop, zFront - caseD * 0.45],
          [-w / 2 + prop * Math.cos(lidAngle), caseTop + prop * Math.sin(lidAngle), zFront - caseD * 0.45],
          0.018
        )}
        material={body}
      />
      {legPositions.map((p, i) => (
        <group key={i} position={p}>
          <Part
            geometry={UNIT.taper(1.35, 16)}
            material={body}
            position={[0, (caseBottom + 0.05) / 2 + 0.06, 0]}
            scale={[0.12, caseBottom - 0.07, 0.12]}
          />
          <Part
            geometry={UNIT.sphere(10)}
            material={MAT.brushedGold()}
            position={[0, 0.05, 0]}
            scale={0.06}
          />
        </group>
      ))}
      <group position={[0, caseBottom + 0.16, zFront + 0.28]}>
        <Part geometry={roundedBox(w * 0.96, 0.16, 0.62, 0.03, 2)} material={body} position={[0, -0.1, 0]} />
        <Part
          geometry={UNIT.box()}
          material={MAT.porcelain()}
          position={[0, 0.0, 0.03]}
          scale={[keySpan, 0.05, 0.5]}
        />
        <Part geometry={blackKeysGeometry(keySpan)} material={MAT.blackGloss()} position={[0, 0.05, 0]} />
        {[-1, 1].map((s) => (
          <Part
            key={s}
            geometry={roundedBox(0.12, 0.2, 0.62, 0.03, 2)}
            material={body}
            position={[s * (w * 0.48 - 0.06), 0.02, 0]}
          />
        ))}
        <Part
          geometry={roundedBox(w * 0.5, 0.42, 0.04, 0.02, 1)}
          material={body}
          position={[0, caseTop - caseBottom + 0.05, -0.62]}
          rotation={[-0.25, 0, 0]}
        />
      </group>
      <group position={[0, 0, zFront - 0.1]}>
        <Part geometry={roundedBox(0.4, caseBottom - 0.2, 0.1, 0.03, 1)} material={body} position={[0, (caseBottom - 0.2) / 2 + 0.1, 0]} />
        {[-0.08, 0, 0.08].map((x) => (
          <Part
            key={x}
            geometry={UNIT.box()}
            material={MAT.brushedGold()}
            position={[x, 0.12, 0.1]}
            scale={[0.05, 0.02, 0.2]}
          />
        ))}
      </group>
      {isDetailed(quality) ? (
        <group position={[0, 0, zFront + 1.55]}>
          <Part geometry={roundedBox(2.4, 0.18, 1.05, 0.06, 3)} material={MAT.velvet("#1a1718")} position={[0, 1.6, 0]} />
          <Part geometry={roundedBox(2.4, 0.1, 1.05, 0.02, 1)} material={body} position={[0, 1.47, 0]} />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <Part
                key={`${sx}${sz}`}
                geometry={UNIT.taper(1.3, 12)}
                material={body}
                position={[sx * 1.05, 0.71, sz * 0.4]}
                scale={[0.05, 1.42, 0.05]}
              />
            ))
          )}
        </group>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Entrance arch                                                       */
/* ------------------------------------------------------------------ */

export function EntranceArchModel({ object, w, d, h, quality }: ModelProps) {
  const material = finishMaterial(genericFinish(object) ?? "gold", object.color);
  const post = clamp(w * 0.06, 0.22, 0.45);
  const depth = clamp(d * 0.5, 0.25, 0.6);
  const radius = Math.max(0.5, w / 2 - post / 2);
  const rise = Math.min(radius, Math.max(0.5, h * 0.38));
  const postH = Math.max(0.5, h - rise - post / 2);
  const arch = cachedGeometry(`arch:${q(radius)}:${q(post)}:${quality}`, () =>
    new THREE.TorusGeometry(
      radius,
      post / 2,
      quality === "draft" ? 6 : 14,
      quality === "draft" ? 24 : 64,
      Math.PI
    )
  );
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * radius, 0, 0]}>
          <Part
            geometry={roundedBox(post * 1.6, 0.2, depth * 1.4, 0.03, 2)}
            material={material}
            position={[0, 0.1, 0]}
          />
          <Part
            geometry={roundedBox(post, postH, depth, Math.min(post, depth) * 0.3, 2)}
            material={material}
            position={[0, postH / 2, 0]}
          />
        </group>
      ))}
      <Part
        geometry={arch}
        material={material}
        position={[0, postH, 0]}
        scale={[1, rise / radius, depth / post]}
      />
      {isDetailed(quality) ? (
        <>
          <FloralCluster
            radius={0.5}
            height={0.45}
            spreadX={1.6}
            seed={21}
            palette="romantic"
            position={[-radius * 0.72, postH + rise * 0.62, 0.05]}
            rotation={[Math.PI / 2, 0.5, 0.65]}
          />
          <FloralCluster
            radius={0.42}
            height={0.4}
            seed={22}
            palette="romantic"
            position={[radius, 0.2, 0.1]}
          />
        </>
      ) : null}
    </>
  );
}
