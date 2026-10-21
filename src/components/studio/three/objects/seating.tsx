"use client";

import type { StudioObject } from "@/data/studio";
import * as THREE from "three";
import type { StudioQuality } from "../../editor/studio-editor-context";
import { mix } from "../texture-utils";
import { outlineRing, roundedBox, roundedRectPlate, UNIT } from "./geometry";
import { resolveSeatingCount } from "./layout";
import {
  cachedMaterial,
  finishBaseColor,
  linenMaterial,
  MAT,
  rugTexture,
} from "./materials";
import { FloralCluster, Part } from "./part";
import { TableClusterTables } from "./tables";
import { genericFinish, isDetailed, type ModelProps } from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function upholsteryColor(object: StudioObject) {
  if (object.color) return object.color;
  const finish = genericFinish(object);
  if (!finish || finish === "upholstered") return "#ddd2c1";
  return finishBaseColor(finish);
}

/** Sofa facing +Z (backrest on -Z), origin at footprint centre on the floor. */
export function SofaBody({
  w,
  d,
  h,
  color,
  quality,
}: {
  w: number;
  d: number;
  h: number;
  color: string;
  quality: StudioQuality;
}) {
  const fabric = MAT.velvet(color);
  const button = MAT.velvet(mix(color, "#000000", 0.35));
  const legH = 0.32;
  const seatTop = clamp(h * 0.55, 1.2, 1.7);
  const armW = clamp(w * 0.1, 0.42, 0.7);
  const armH = Math.min(h - 0.25, seatTop + 0.6);
  const backT = clamp(d * 0.24, 0.45, 0.75);
  const innerW = Math.max(0.6, w - armW * 2);
  const seats = Math.max(1, Math.round(innerW / 2.3));
  const cushionW = innerW / seats;
  const seatD = Math.max(0.5, d - backT - 0.04);
  const round = quality === "draft" ? 1 : 3;
  const backH = h - seatTop;
  const baseTop = seatTop - 0.24;
  return (
    <>
      <Part
        geometry={roundedBox(w - 0.06, baseTop - legH, d - 0.04, 0.08, round)}
        material={fabric}
        position={[0, legH + (baseTop - legH) / 2, 0]}
      />
      {Array.from({ length: seats }, (_, i) => {
        const x = -innerW / 2 + cushionW * (i + 0.5);
        return (
          <group key={i}>
            <Part
              geometry={roundedBox(cushionW - 0.03, 0.26, seatD, 0.1, round + 1)}
              material={fabric}
              position={[x, baseTop + 0.13, -d / 2 + backT + seatD / 2]}
            />
            <Part
              geometry={roundedBox(cushionW - 0.05, backH * 0.82, 0.42, 0.14, round + 1)}
              material={fabric}
              position={[x, seatTop + backH * 0.42, -d / 2 + backT + 0.12]}
              rotation={[-0.12, 0, 0]}
            />
            {isDetailed(quality)
              ? [-1, 0, 1].flatMap((col) =>
                  [0.32, 0.62].map((row) => (
                    <Part
                      key={`${col}:${row}`}
                      geometry={UNIT.sphere(8)}
                      material={button}
                      position={[
                        x + col * (cushionW * 0.28),
                        seatTop + backH * row,
                        -d / 2 + backT + 0.34 - row * 0.05,
                      ]}
                      scale={0.035}
                      cast={false}
                    />
                  ))
                )
              : null}
          </group>
        );
      })}
      <Part
        geometry={roundedBox(innerW + 0.1, backH + 0.3, backT, 0.1, round)}
        material={fabric}
        position={[0, seatTop - 0.3 + (backH + 0.3) / 2, -d / 2 + backT / 2]}
      />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - armW / 2), 0, 0]}>
          <Part
            geometry={roundedBox(armW, armH - legH, d, 0.1, round)}
            material={fabric}
            position={[0, legH + (armH - legH) / 2, 0]}
          />
          <Part
            geometry={UNIT.cylinder(quality === "draft" ? 10 : 20)}
            material={fabric}
            position={[0, armH - 0.02, 0.01]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[armW * 0.58, d - 0.02, armW * 0.5]}
          />
        </group>
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Part
            key={`${sx}${sz}`}
            geometry={UNIT.taper(1.6, 12)}
            material={MAT.brushedGold()}
            position={[sx * (w / 2 - 0.2), legH / 2, sz * (d / 2 - 0.2)]}
            scale={[0.045, legH, 0.045]}
          />
        ))
      )}
    </>
  );
}

export function SofaModel({ object, w, d, h, quality }: ModelProps) {
  return <SofaBody w={w} d={d} h={h} color={upholsteryColor(object)} quality={quality} />;
}

function rugMaterial(hex: string) {
  return cachedMaterial(`rug:${hex}`, () =>
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: typeof document !== "undefined" ? rugTexture(hex) : null,
      roughness: 0.95,
    })
  );
}

function CoffeeTable({ w, d }: { w: number; d: number }) {
  const legH = 1.25;
  return (
    <>
      <Part geometry={roundedBox(w, 0.09, d, 0.03, 2)} material={MAT.marble()} position={[0, legH + 0.045, 0]} />
      <Part
        geometry={roundedBox(w - 0.2, 0.05, d - 0.2, 0.02, 1)}
        material={MAT.gold()}
        position={[0, 0.3, 0]}
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Part
            key={`${sx}${sz}`}
            geometry={UNIT.box()}
            material={MAT.gold()}
            position={[sx * (w / 2 - 0.12), legH / 2, sz * (d / 2 - 0.12)]}
            scale={[0.06, legH, 0.06]}
          />
        ))
      )}
    </>
  );
}

export function LoungeAreaModel({ object, w, d, h, quality }: ModelProps) {
  const color = object.color ?? "#e4dccd";
  const count = resolveSeatingCount(object);
  const sofaW = clamp(w * 0.5, 4.5, 8);
  const sofaD = clamp(d * 0.28, 2.6, 3.2);
  const sofaH = clamp(h, 2.4, 3.2);
  const chairSize = clamp(Math.min(w, d) * 0.24, 2.3, 2.9);
  const second = count >= 7 && d >= 9;
  const sofaZ = -d / 2 + sofaD / 2 + 0.4;
  const chairX = w / 2 - chairSize / 2 - 0.4;
  const tableW = clamp(sofaW * 0.55, 2.4, 4);
  const tableD = clamp(d * 0.18, 1.6, 2.4);
  return (
    <>
      <Part
        geometry={roundedBox(w * 0.84, 0.03, d * 0.8, 0.012, 1)}
        material={rugMaterial("#cdbfa8")}
        position={[0, 0.016, 0]}
        cast={false}
      />
      <group position={[0, 0, sofaZ]}>
        <SofaBody w={sofaW} d={sofaD} h={sofaH} color={color} quality={quality} />
      </group>
      {second ? (
        <group position={[0, 0, -sofaZ]} rotation={[0, Math.PI, 0]}>
          <SofaBody w={sofaW} d={sofaD} h={sofaH} color={color} quality={quality} />
        </group>
      ) : null}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * chairX, 0, second ? 0 : 0.6]} rotation={[0, -s * (Math.PI / 2), 0]}>
          <SofaBody w={chairSize} d={chairSize} h={sofaH} color={color} quality={quality} />
        </group>
      ))}
      <group position={[0, 0, second ? 0 : 0.6]}>
        <CoffeeTable w={tableW} d={tableD} />
        {isDetailed(quality) ? (
          <FloralCluster radius={0.32} height={0.3} seed={9} palette="ivory" position={[0, 1.36, 0]} />
        ) : null}
      </group>
    </>
  );
}

export function ArmchairModel({ object, w, d, h, quality }: ModelProps) {
  return <SofaBody w={w} d={d} h={h} color={upholsteryColor(object)} quality={quality} />;
}

/** Soft translucent floor marker for zones. */
export function ZoneMarker({ w, d, color = "#d4af55" }: { w: number; d: number; color?: string }) {
  const r = Math.min(1, Math.min(w, d) * 0.12);
  return (
    <>
      <Part
        geometry={roundedRectPlate(w / 2, d / 2, r)}
        material={MAT.zone(color, 0.07)}
        position={[0, 0.012, 0]}
        cast={false}
        receive={false}
      />
      <Part
        geometry={outlineRing(w / 2 - 0.06, d / 2 - 0.06, r, 0.05)}
        material={MAT.zone(color, 0.38)}
        position={[0, 0.014, 0]}
        cast={false}
        receive={false}
      />
    </>
  );
}

export function TableAreaModel(props: ModelProps) {
  return (
    <>
      <ZoneMarker w={props.w} d={props.d} />
      <TableClusterTables {...props} />
    </>
  );
}

export function CeremonyModel({ object, w, d, quality }: ModelProps) {
  const aisle = Math.min(4, Math.max(0, w - 3.5));
  const runner = object.linenColor ?? "ivory";
  return (
    <>
      {aisle > 1.5 ? (
        <Part
          geometry={roundedBox(aisle * 0.72, 0.012, d + 1.5, 0.004, 1)}
          material={linenMaterial(runner)}
          position={[0, 0.008, -0.5]}
          cast={false}
        />
      ) : null}
      {aisle > 1.5 && isDetailed(quality)
        ? [-1, 1].map((s) => (
            <group key={s} position={[s * (aisle / 2 - 0.15), 0, -d / 2 - 0.2]}>
              <Part
                geometry={UNIT.taper(0.6, 20)}
                material={MAT.gold()}
                position={[0, 0.6, 0]}
                scale={[0.18, 1.2, 0.18]}
              />
              <FloralCluster radius={0.42} height={0.4} seed={12 + s} palette="romantic" position={[0, 1.2, 0]} />
            </group>
          ))
        : null}
    </>
  );
}
