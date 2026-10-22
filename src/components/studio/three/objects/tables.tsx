"use client";

import type { DrapeColor, GenericStudioObjectFinish } from "@/data/studio";
import type { StudioQuality } from "../../editor/studio-editor-context";
import {
  buildSkirt,
  lathe,
  linenRows,
  q,
  roundedBox,
  segmentsFor,
  UNIT,
} from "./geometry";
import { BOX_LINEN, clusterLinen, clusterTables, ROUND_LINEN } from "./layout";
import {
  finishMaterial,
  linenMaterial,
  MAT,
  spandexMaterial,
  trimMaterial,
} from "./materials";
import { CandleGroup, FloralCluster, Group, Part, seedOf } from "./part";
import { genericFinish, isDetailed, resolveLinen, type ModelProps } from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/* Linens                                                              */
/* ------------------------------------------------------------------ */

function RoundLinen({
  hx,
  hz,
  height,
  color,
  quality,
}: {
  hx: number;
  hz: number;
  height: number;
  color: DrapeColor;
  quality: StudioQuality;
}) {
  const radius = Math.min(hx, hz);
  const perimeter = Math.PI * (hx + hz);
  const segments = segmentsFor(quality, clamp(Math.round(perimeter / 0.09), 72, 200));
  const rows = quality === "draft" ? 7 : quality === "ultra" ? 20 : 13;
  const geometry = buildSkirt({
    key: `round:${q(hx)}:${q(hz)}:${q(height)}:${segments}:${rows}`,
    hx,
    hz,
    rows: linenRows({
      height,
      radius,
      bottomRadius: radius,
      ...ROUND_LINEN,
      rows,
    }),
    segments,
    folds: Math.max(8, Math.round(perimeter / 0.42)),
  });
  return <Part geometry={geometry} material={linenMaterial(color)} />;
}

function BoxLinen({
  w,
  d,
  height,
  color,
  quality,
}: {
  w: number;
  d: number;
  height: number;
  color: DrapeColor;
  quality: StudioQuality;
}) {
  const perimeter = 2 * (w + d);
  const segments = segmentsFor(quality, clamp(Math.round(perimeter / 0.11), 80, 320));
  const rows = quality === "draft" ? 7 : quality === "ultra" ? 18 : 12;
  const geometry = buildSkirt({
    key: `rect:${q(w)}:${q(d)}:${q(height)}:${segments}:${rows}`,
    hx: w / 2,
    hz: d / 2,
    rows: linenRows({
      height,
      radius: 0.05,
      bottomRadius: Math.min(0.34, Math.min(w, d) / 2),
      ...BOX_LINEN,
      rows,
    }),
    segments,
    folds: Math.max(8, Math.round(perimeter / 0.55)),
    cornerBoost: 2.8,
  });
  return <Part geometry={geometry} material={linenMaterial(color)} />;
}

/* ------------------------------------------------------------------ */
/* Bare tables                                                         */
/* ------------------------------------------------------------------ */

function BareRound({
  hx,
  hz,
  height,
  finish,
  color,
  quality,
}: {
  hx: number;
  hz: number;
  height: number;
  finish: GenericStudioObjectFinish | undefined;
  color?: string;
  quality: StudioQuality;
}) {
  const seg = segmentsFor(quality, 48);
  const top = finishMaterial(finish ?? "natural_wood", color);
  const trim = trimMaterial(finish);
  const baseR = Math.min(0.85, Math.min(hx, hz) * 0.42);
  return (
    <>
      <Part
        geometry={UNIT.cylinder(seg)}
        material={top}
        position={[0, height - 0.05, 0]}
        scale={[hx, 0.1, hz]}
      />
      <Part
        geometry={UNIT.cylinder(seg)}
        material={trim}
        position={[0, height - 0.13, 0]}
        scale={[hx * 0.86, 0.06, hz * 0.86]}
      />
      <Part
        geometry={UNIT.taper(0.7, 20)}
        material={trim}
        position={[0, (height - 0.16) / 2 + 0.06, 0]}
        scale={[0.11, height - 0.22, 0.11]}
      />
      <Part
        geometry={UNIT.taper(0.85, 32)}
        material={trim}
        position={[0, 0.04, 0]}
        scale={[baseR, 0.08, baseR]}
      />
    </>
  );
}

function BareRect({
  w,
  d,
  height,
  finish,
  color,
}: {
  w: number;
  d: number;
  height: number;
  finish: GenericStudioObjectFinish | undefined;
  color?: string;
}) {
  const resolved = finish ?? "natural_wood";
  const top = finishMaterial(resolved, color);
  const legs =
    resolved === "marble" || resolved === "gold"
      ? MAT.gold()
      : resolved === "acrylic"
        ? MAT.acrylic()
        : top;
  const lx = Math.max(0, w / 2 - 0.22);
  const lz = Math.max(0, d / 2 - 0.22);
  const legH = Math.max(0.2, height - 0.1);
  return (
    <>
      <Part
        geometry={roundedBox(w, 0.12, d, 0.03, 2)}
        material={top}
        position={[0, height - 0.06, 0]}
      />
      <Part
        geometry={roundedBox(Math.max(0.2, w - 0.3), 0.22, Math.max(0.2, d - 0.3), 0.02, 1)}
        material={legs}
        position={[0, height - 0.21, 0]}
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Part
            key={`${sx}${sz}`}
            geometry={UNIT.taper(0.75, 4)}
            material={legs}
            position={[sx * lx, legH / 2, sz * lz]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[0.1, legH, 0.1]}
          />
        ))
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Table dressing                                                      */
/* ------------------------------------------------------------------ */

function Centerpiece({
  seed,
  radius,
  height,
  quality,
}: {
  seed: number;
  radius: number;
  height: number;
  quality: StudioQuality;
}) {
  const size = clamp(radius * 0.32, 0.35, 0.95);
  // One arrangement per variant, turned per table: identical tables then share
  // instanced geometry while the room still reads as hand-placed.
  const variant = seed % 3;
  const yaw = ((seed >>> 2) % 24) * (Math.PI / 12);
  const y = height + 0.02;
  if (variant === 1 && radius >= 2) {
    const stemH = clamp(radius * 0.7, 1.2, 2.2);
    return (
      <Group position={[0, y, 0]} rotation={[0, yaw, 0]}>
        <Part
          geometry={lathe(
            "pedestal-vase",
            [
              [0, 0],
              [0.32, 0],
              [0.34, 0.03],
              [0.12, 0.08],
              [0.06, 0.2],
              [0.05, 0.85],
              [0.09, 0.93],
              [0.26, 1],
              [0.28, 1.02],
              [0, 1.02],
            ],
            quality === "ultra" ? 36 : 24
          )}
          material={MAT.gold()}
          scale={[1, stemH, 1]}
          cast
        />
        <FloralCluster
          radius={size * 0.75}
          height={size * 0.9}
          seed={2}
          palette="romantic"
          position={[0, stemH * 1.02 - 0.1, 0]}
        />
        <CandleGroup
          candles={[0, 1, 2, 3].map((i) => ({
            x: Math.cos((i * Math.PI) / 2 + 0.6) * (size + 0.25),
            z: Math.sin((i * Math.PI) / 2 + 0.6) * (size + 0.25),
            height: 0.12,
            radius: 0.06,
            votive: true,
          }))}
        />
      </Group>
    );
  }
  if (variant === 2) {
    return (
      <Group position={[0, y, 0]} rotation={[0, yaw, 0]}>
        <Part
          geometry={UNIT.cylinder(40)}
          material={MAT.silver()}
          position={[0, 0.01, 0]}
          scale={[size + 0.15, 0.02, size + 0.15]}
          cast={false}
        />
        <CandleGroup
          candles={[
            { x: 0, z: 0, height: 0.75, radius: 0.12 },
            { x: 0.24, z: 0.12, height: 0.5, radius: 0.11 },
            { x: -0.2, z: 0.18, height: 0.38, radius: 0.1 },
          ]}
          position={[0, 0.02, 0]}
        />
        <FloralCluster
          radius={size}
          height={0.18}
          seed={8}
          palette="ivory"
          density={0.7}
          position={[0, 0.02, 0]}
        />
      </Group>
    );
  }
  return (
    <Group position={[0, y, 0]} rotation={[0, yaw, 0]}>
      <Part
        geometry={UNIT.cylinder(40)}
        material={MAT.gold()}
        position={[0, 0.01, 0]}
        scale={[size + 0.1, 0.02, size + 0.1]}
        cast={false}
      />
      <FloralCluster
        radius={size}
        height={size * 0.65}
        seed={1}
        palette="romantic"
        position={[0, 0.02, 0]}
      />
      <CandleGroup
        candles={[0, 1, 2].map((i) => ({
          x: Math.cos((i * Math.PI * 2) / 3) * (size + 0.28),
          z: Math.sin((i * Math.PI * 2) / 3) * (size + 0.28),
          height: 0.12,
          radius: 0.06,
          votive: true,
        }))}
      />
    </Group>
  );
}

function ThreeTierCake({ radius, height, quality }: { radius: number; height: number; quality: StudioQuality }) {
  const scale = clamp(radius / 1.5, 0.6, 1.4);
  const seg = segmentsFor(quality, 40);
  const tiers = [
    { r: 0.55, h: 0.42 },
    { r: 0.42, h: 0.38 },
    { r: 0.3, h: 0.34 },
  ];
  const standH = 0.3;
  let y = standH;
  return (
    <Group position={[0, height + 0.02, 0]} scale={scale}>
      <Part
        geometry={lathe(
          "cake-stand",
          [
            [0, 0],
            [0.32, 0],
            [0.3, 0.04],
            [0.08, 0.1],
            [0.06, standH - 0.04],
            [0.66, standH - 0.02],
            [0.68, standH],
            [0, standH],
          ],
          seg
        )}
        material={MAT.gold()}
      />
      {tiers.map((tier, index) => {
        const base = y;
        y += tier.h;
        return (
          <Group key={index}>
            <Part
              geometry={UNIT.cylinder(seg)}
              material={MAT.whiteResin()}
              position={[0, base + tier.h / 2, 0]}
              scale={[tier.r, tier.h, tier.r]}
            />
            <Part
              geometry={UNIT.cylinder(seg)}
              material={MAT.brushedGold()}
              position={[0, base + 0.03, 0]}
              scale={[tier.r + 0.006, 0.05, tier.r + 0.006]}
              cast={false}
            />
          </Group>
        );
      })}
      {isDetailed(quality) ? (
        <>
          <FloralCluster radius={0.2} height={0.16} seed={3} palette="blush" position={[0, y, 0]} />
          <FloralCluster
            radius={0.16}
            height={0.12}
            seed={4}
            palette="blush"
            position={[0.36, standH + 0.42, 0.2]}
            density={0.8}
          />
        </>
      ) : null}
    </Group>
  );
}

function ChafingDishes({ w, height }: { w: number; height: number }) {
  const count = Math.max(1, Math.floor(w / 2.6));
  const span = w - 1;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = count === 1 ? 0 : -span / 2 + (i * span) / (count - 1);
        return (
          <Group key={i} position={[x, height + 0.02, 0]}>
            <Part geometry={roundedBox(1.7, 0.18, 1.1, 0.04, 2)} material={MAT.silver()} position={[0, 0.28, 0]} />
            <Part
              geometry={UNIT.cylinder(24)}
              material={MAT.silver()}
              position={[0, 0.37, 0]}
              rotation={[0, 0, Math.PI / 2]}
              scale={[0.42, 1.62, 0.5]}
            />
            {[-0.7, 0.7].map((sx) => (
              <Part
                key={sx}
                geometry={UNIT.box()}
                material={MAT.blackMetal()}
                position={[sx, 0.1, 0]}
                scale={[0.04, 0.2, 0.9]}
              />
            ))}
          </Group>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Table models                                                        */
/* ------------------------------------------------------------------ */

export function RoundTableBody({
  hx,
  hz,
  height,
  linen,
  finish,
  color,
  quality,
  centerpieceSeed,
}: {
  hx: number;
  hz: number;
  height: number;
  linen: DrapeColor | null;
  finish: GenericStudioObjectFinish | undefined;
  color?: string;
  quality: StudioQuality;
  centerpieceSeed?: number;
}) {
  return (
    <>
      {linen ? (
        <RoundLinen hx={hx} hz={hz} height={height} color={linen} quality={quality} />
      ) : (
        <BareRound hx={hx} hz={hz} height={height} finish={finish} color={color} quality={quality} />
      )}
      {centerpieceSeed !== undefined && isDetailed(quality) ? (
        <Centerpiece
          seed={centerpieceSeed}
          radius={Math.min(hx, hz)}
          height={height}
          quality={quality}
        />
      ) : null}
    </>
  );
}

export function RoundTableModel({ object, w, d, h, quality }: ModelProps) {
  const isCake = object.type === "cake_table";
  return (
    <>
      <RoundTableBody
        hx={w / 2}
        hz={d / 2}
        height={h}
        linen={resolveLinen(object)}
        finish={genericFinish(object)}
        color={object.color}
        quality={quality}
        centerpieceSeed={isCake ? undefined : seedOf(object.id)}
      />
      {isCake ? (
        <ThreeTierCake radius={Math.min(w, d) / 2} height={h} quality={quality} />
      ) : null}
    </>
  );
}

export function RectTableModel({ object, w, d, h, quality }: ModelProps) {
  const linen = resolveLinen(object);
  const detailed = isDetailed(quality);
  return (
    <>
      {linen ? (
        <BoxLinen w={w} d={d} height={h} color={linen} quality={quality} />
      ) : (
        <BareRect w={w} d={d} height={h} finish={genericFinish(object)} color={object.color} />
      )}
      {detailed && object.type === "head_table" ? (
        <>
          <FloralCluster
            radius={0.42}
            height={0.32}
            spreadX={clamp((w * 0.7) / 0.84, 1, 14)}
            seed={2}
            palette="romantic"
            density={0.55}
            position={[0, h + 0.02, d / 2 - 0.45]}
          />
          <CandleGroup
            position={[0, h + 0.02, d / 2 - 0.45]}
            candles={Array.from({ length: Math.max(2, Math.floor(w / 3)) }, (_, i) => ({
              x: -w * 0.38 + (i * w * 0.76) / Math.max(1, Math.max(2, Math.floor(w / 3)) - 1),
              z: 0.32,
              height: 0.12,
              radius: 0.06,
              votive: true,
            }))}
          />
        </>
      ) : null}
      {detailed && object.type === "sweetheart_table" ? (
        <>
          <FloralCluster
            radius={0.5}
            height={0.42}
            spreadX={clamp((w * 0.85) / 1, 1, 6)}
            seed={5}
            palette="blush"
            position={[0, h + 0.02, d / 2 - 0.35]}
          />
          <FloralCluster
            radius={0.42}
            height={0.3}
            spreadX={clamp((w * 0.6) / 0.84, 1, 6)}
            seed={6}
            palette="blush"
            density={0.8}
            position={[0, h - 0.65, d / 2 + 0.12]}
            rotation={[0.9, 0, 0]}
          />
          <CandleGroup
            position={[0, h + 0.02, d / 2 - 0.35]}
            candles={[
              { x: -w * 0.32, z: -0.1, height: 0.8, radius: 0.1 },
              { x: w * 0.32, z: -0.1, height: 0.65, radius: 0.1 },
            ]}
          />
        </>
      ) : null}
      {detailed && object.type === "buffet_table" ? <ChafingDishes w={w} height={h} /> : null}
    </>
  );
}

export function CocktailTableModel({ object, w, d, h, quality }: ModelProps) {
  const linen = resolveLinen(object);
  const hx = w / 2;
  const hz = d / 2;
  if (!linen) {
    return (
      <BareRound
        hx={hx}
        hz={hz}
        height={h}
        finish={genericFinish(object)}
        color={object.color}
        quality={quality}
      />
    );
  }
  const R = Math.min(hx, hz);
  const waistY = h * 0.52;
  const waist = clamp(R * 0.24, 0.22, 0.4);
  const baseR = clamp(R * 0.78, 0.6, 1.4);
  const samples = quality === "draft" ? 8 : 16;
  const profile: Array<[number, number]> = [
    [0, h + 0.02],
    [R - 0.02, h + 0.02],
    [R + 0.012, h - 0.01],
    [R, h - 0.07],
  ];
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
    profile.push([R - (R - waist) * ease, h - 0.07 - (h - 0.07 - waistY) * t]);
  }
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
    profile.push([waist + (baseR - waist) * ease, waistY - (waistY - 0.02) * t]);
  }
  profile.push([baseR + 0.01, 0.005]);
  const seg = segmentsFor(quality, 48);
  const sashColor = MAT.velvet("#b98b3d");
  return (
    <Group scale={[hx / R, 1, hz / R]}>
      <Part
        geometry={lathe(`spandex:${q(R)}:${q(h)}:${samples}`, profile, seg)}
        material={spandexMaterial(linen)}
      />
      <Part
        geometry={UNIT.cylinder(seg)}
        material={sashColor}
        position={[0, waistY, 0]}
        scale={[waist + 0.03, 0.16, waist + 0.03]}
      />
      {isDetailed(quality) ? (
        <Group position={[0, waistY, waist + 0.04]}>
          {[-1, 1].map((s) => (
            <Part
              key={s}
              geometry={UNIT.sphere(12)}
              material={sashColor}
              position={[s * 0.12, 0.02, 0.02]}
              rotation={[0, 0, s * 0.5]}
              scale={[0.13, 0.08, 0.05]}
            />
          ))}
          {[-1, 1].map((s) => (
            <Part
              key={`tail${s}`}
              geometry={UNIT.box()}
              material={sashColor}
              position={[s * 0.07, -0.32, 0.03]}
              rotation={[0.1, 0, s * 0.18]}
              scale={[0.08, 0.6, 0.015]}
            />
          ))}
        </Group>
      ) : null}
    </Group>
  );
}

/** table_area zone furniture: the round tables of the cluster (chairs instanced). */
export function TableClusterTables({ object, h, quality }: ModelProps) {
  const tables = clusterTables(object);
  const linen = clusterLinen(object);
  const height = clamp(h, 2.2, 3.2);
  const seed = seedOf(object.id);
  return (
    <>
      {tables.map((table, index) => (
        <Group key={index} position={[table.x, 0, table.z]}>
          <RoundTableBody
            hx={table.radius}
            hz={table.radius}
            height={height}
            linen={linen}
            finish={genericFinish(object)}
            color={object.color}
            quality={quality}
            centerpieceSeed={seed + index}
          />
        </Group>
      ))}
    </>
  );
}
