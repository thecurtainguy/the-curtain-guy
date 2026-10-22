"use client";

import {
  getCeilingDrapes,
  type DrapeColor,
  type StudioDesignJson,
  type StudioLightingMood,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { memo, useMemo } from "react";
import {
  DEFAULT_STUDIO_EDITOR_SETTINGS,
  useOptionalStudioSettings,
  type StudioQuality,
} from "../../editor/studio-editor-context";
import { getStudioLightHex } from "../engine-light-rig";
import { getStudioQualityPreset } from "../engine-quality";
import { LIGHTING_MOODS, type StudioLightingRig } from "../lighting-moods";
import { mix } from "../texture-utils";
import { BistroStringLights } from "./lights/bistro-strings";
import { getStringLightHex } from "./lights/colors";
import { FabricGlow } from "./lights/fabric-glow";
import {
  getCeilingLightPlan,
  type CeilingLightDensity,
  type CeilingLightPlan,
} from "./lights/plan";
import {
  allocateCeilingLights,
  CeilingRealLights,
  type CeilingPointRequest,
  type CeilingSpotRequest,
} from "./lights/real-lights";
import { SparkleCloud } from "./lights/sparkle-cloud";
import { SCALE } from "./frame";

/** Bistro bulb spacing along the cord, inches. */
const BISTRO_PITCH: Record<StudioQuality, number> = { draft: 22, high: 15, ultra: 15 };

/**
 * Lit designs share the preset's sparkle cap by √n, with n rounded up to a
 * power of two so adding a third design doesn't re-scatter the other two.
 */
function sparkleShare(lit: number) {
  return Math.sqrt(2 ** Math.ceil(Math.log2(Math.max(1, lit))));
}

/** HDR multipliers (× light colour × mood pop). */
const FAIRY_EMISSION = 5;
const STARLIGHT_EMISSION = 3.6;
const BISTRO_CORE_EMISSION = 9;
/** Without bloom, HDR just clips to white; keep the tint readable. */
const NO_BLOOM_EMISSION = 0.35;
/** Glowing diameter, feet. */
const FAIRY_SIZE = 0.045;
const STARLIGHT_SIZE = 0.04;

/** Candela: string-light clouds cap, one uplight spot, a hub chandelier. */
const MAX_CLOUD_CANDELA = 140;
const WASH_CANDELA = 380;
const CHANDELIER_CANDELA = 60;
/** Fabric pools under the uplights / chandelier (higher when no real light backs them). */
const WASH_GLOW = { lit: 0.18, unlit: 0.32 };
const CHANDELIER_GLOW = { lit: 0.12, unlit: 0.22 };
const CHANDELIER_WARM = "#ffd9a8";

/** Feet: fill lights stay above heads and centrepieces (decay-2 hot spots). */
const CLOUD_LIGHT_FLOOR = 9.5;

function cloudLightY(y: number) {
  /* 1–3.5 ft under the lights so the fabric above catches the glow too. */
  return Math.max(Math.min(y - 1, CLOUD_LIGHT_FLOOR), y - 3.5);
}

const washKey = (drapeId: string, index: number) => `${drapeId}:wash:${index}`;
const chandelierKey = (drapeId: string) => `${drapeId}:chandelier`;

const DrapeLights = memo(function DrapeLights({
  drapeId,
  plan,
  lightColor,
  uplightColor,
  rig,
  bloom,
  twinkle,
  lit,
}: {
  drapeId: string;
  plan: CeilingLightPlan;
  lightColor: DrapeColor;
  uplightColor: DrapeColor | null;
  rig: StudioLightingRig;
  bloom: boolean;
  twinkle: boolean;
  /** Request keys backed by a real light; the rest get the brighter glow fallback. */
  lit: ReadonlySet<string>;
}) {
  const pop = Math.sqrt(rig.practicalBoost) * (bloom ? 1 : NO_BLOOM_EMISSION);
  const tint = getStringLightHex(lightColor);
  const washTint = uplightColor ? getStudioLightHex(uplightColor) : null;
  const chandelierTint = mix(CHANDELIER_WARM, rig.practicalWarmth, 0.45);
  return (
    <>
      {plan.sparkle ? (
        <SparkleCloud
          positions={plan.sparkle.positions}
          seeds={plan.sparkle.seeds}
          size={plan.sparkle.kind === "fairy" ? FAIRY_SIZE : STARLIGHT_SIZE}
          color={tint}
          emission={
            (plan.sparkle.kind === "fairy" ? FAIRY_EMISSION : STARLIGHT_EMISSION) * pop
          }
          twinkle={twinkle}
        />
      ) : null}
      {plan.bistro ? (
        <BistroStringLights
          strings={plan.bistro}
          color={tint}
          emission={BISTRO_CORE_EMISSION * pop}
        />
      ) : null}
      {washTint
        ? plan.washes.map((wash, index) =>
            wash.patch ? (
              <FabricGlow
                key={index}
                patch={wash.patch}
                color={washTint}
                strength={
                  (lit.has(washKey(drapeId, index)) ? WASH_GLOW.lit : WASH_GLOW.unlit) *
                  rig.uplightBoost
                }
              />
            ) : null
          )
        : null}
      {plan.chandelier?.patch ? (
        <FabricGlow
          patch={plan.chandelier.patch}
          color={chandelierTint}
          strength={
            (lit.has(chandelierKey(drapeId)) ? CHANDELIER_GLOW.lit : CHANDELIER_GLOW.unlit) *
            rig.practicalBoost
          }
        />
      ) : null}
    </>
  );
});

/**
 * String lights, starlight, uplight washes and hub chandelier light for
 * every visible ceiling design, plus a small pool of shadowless real lights
 * so the strings actually glow onto the fabric and the room.
 */
export const CeilingLightsLayer = memo(function CeilingLightsLayer({
  ceilingDrapes,
  floor,
  wallHeight,
  mood,
  bounds,
}: {
  ceilingDrapes: StudioDesignJson["ceilingDrapes"];
  floor: StudioDesignJson["room"]["floor"];
  wallHeight: number;
  mood: StudioLightingMood;
  bounds: StudioBounds;
}) {
  const settings = useOptionalStudioSettings() ?? DEFAULT_STUDIO_EDITOR_SETTINGS;
  const quality = settings.quality;
  const visible = settings.layers.ceiling;
  const rig = LIGHTING_MOODS[mood] ?? LIGHTING_MOODS.neutral;

  const preset = getStudioQualityPreset(quality);
  const { ceilingPointBudget, ceilingSpotBudget, sparkleCap } = preset;

  const entries = useMemo(() => {
    if (!visible) return [];
    const shown = getCeilingDrapes({ ceilingDrapes }).filter((drape) => !drape.hidden);
    const lit = shown.filter((drape) => drape.lights !== "none").length;
    const density: CeilingLightDensity = {
      sparkleCap: Math.round(sparkleCap / sparkleShare(lit)),
      bistroPitch: BISTRO_PITCH[quality],
    };
    return shown.map((drape) => ({
      drape,
      plan: getCeilingLightPlan({ drape, floor, wallHeight, bounds, density }),
    }));
  }, [bounds, ceilingDrapes, floor, quality, sparkleCap, visible, wallHeight]);

  const allocation = useMemo(() => {
    const points: CeilingPointRequest[] = [];
    const spots: CeilingSpotRequest[] = [];
    if (ceilingPointBudget + ceilingSpotBudget === 0) {
      return allocateCeilingLights(points, spots, 0, 0);
    }
    const chandelierColor = mix(CHANDELIER_WARM, rig.practicalWarmth, 0.45);
    for (const { drape, plan } of entries) {
      const total = Math.min(MAX_CLOUD_CANDELA, plan.candela) * rig.practicalBoost;
      const color = mix(getStringLightHex(drape.lightColor), rig.practicalWarmth, 0.2);
      plan.clouds.forEach((cloud, index) => {
        points.push({
          key: `${drape.id}:cloud:${index}`,
          position: [cloud.position[0], cloudLightY(cloud.position[1]), cloud.position[2]],
          color,
          intensity: total * cloud.weight,
        });
      });
      if (plan.chandelier) {
        points.push({
          key: chandelierKey(drape.id),
          position: plan.chandelier.position,
          color: chandelierColor,
          intensity: CHANDELIER_CANDELA * rig.practicalBoost,
        });
      }
      if (drape.uplightColor) {
        const washColor = getStudioLightHex(drape.uplightColor);
        plan.washes.forEach((wash, index) => {
          spots.push({
            key: washKey(drape.id, index),
            position: wash.source,
            target: wash.target,
            angle: wash.angle,
            color: washColor,
            intensity: WASH_CANDELA * rig.uplightBoost * (0.75 + 0.25 * wash.weight),
          });
        });
      }
    }
    return allocateCeilingLights(points, spots, ceilingPointBudget, ceilingSpotBudget);
  }, [ceilingPointBudget, ceilingSpotBudget, entries, rig]);

  if (!visible || entries.length === 0) return null;
  const reach = Math.max(26, wallHeight * SCALE * 2.6);

  return (
    <>
      {entries.map(({ drape, plan }) => (
        <DrapeLights
          key={drape.id}
          drapeId={drape.id}
          plan={plan}
          lightColor={drape.lightColor}
          uplightColor={drape.uplightColor}
          rig={rig}
          bloom={preset.bloom}
          twinkle={preset.twinkle}
          lit={allocation.lit}
        />
      ))}
      <CeilingRealLights
        allocation={allocation}
        pointBudget={ceilingPointBudget}
        spotBudget={ceilingSpotBudget}
        reach={reach}
      />
    </>
  );
});
