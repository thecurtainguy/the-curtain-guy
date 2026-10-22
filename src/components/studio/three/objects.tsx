"use client";

import {
  DEFAULT_CHAIR_STYLE,
  SEATED_OBJECT_TYPES,
  type StudioChairStyle,
  type StudioDesignJson,
  type StudioObject,
} from "@/data/studio";
import type { StudioBounds } from "@/lib/studio-geometry";
import { useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  DEFAULT_STUDIO_EDITOR_SETTINGS,
  useOptionalStudioSelection,
  useOptionalStudioSettings,
  type StudioQuality,
} from "../editor/studio-editor-context";
import { useIsStudioHovered } from "../editor/hover-store";
import type { StudioSelection } from "../studio-types";
import { CeilingDrapeModel, FreestandingDrapeModel } from "./fabric/freestanding";
import {
  BatchFrameProvider,
  BatchMeshes,
  InstanceBatcher,
  type BatchFrame,
} from "./objects/batch";
import {
  ChairInstances,
  InstanceMatrices,
  PlaceSettingInstances,
} from "./objects/chairs-instanced";
import { ChandelierModel, ColumnModel, PlantModel, UplightModel } from "./objects/decor";
import { layoutSeating, resolveChairStyle, resolveSeatingCount } from "./objects/layout";
import {
  AvScreenModel,
  BarModel,
  DanceFloorModel,
  DjBoothModel,
  EntranceArchModel,
  PhotoBoothModel,
  PianoModel,
  PodiumModel,
  StageModel,
} from "./objects/production";
import {
  CeremonyModel,
  LoungeAreaModel,
  SofaModel,
  TableAreaModel,
} from "./objects/seating";
import { SelectionHighlight } from "./objects/selection";
import { CocktailTableModel, RectTableModel, RoundTableModel } from "./objects/tables";
import type { ModelProps } from "./objects/types";

const SCALE = 1 / 12;

const ROUND_TYPES = new Set<StudioObject["type"]>([
  "round_table",
  "cocktail_table",
  "cake_table",
  "plant",
  "column",
  "uplight",
  "chandelier",
]);

/** Types that usually repeat in a room; their parts are instanced across objects. */
const BATCHED_TYPES = new Set<StudioObject["type"]>([
  "round_table",
  "cake_table",
  "rectangle_table",
  "head_table",
  "sweetheart_table",
  "buffet_table",
  "cocktail_table",
  "table_area",
  "plant",
  "column",
  "uplight",
  "chandelier",
]);

const ObjectModel = memo(function ObjectModel(
  props: ModelProps & { wallHeight: number }
) {
  const { object, wallHeight } = props;
  switch (object.type) {
    case "round_table":
    case "cake_table":
      return <RoundTableModel {...props} />;
    case "rectangle_table":
    case "head_table":
    case "sweetheart_table":
    case "buffet_table":
      return <RectTableModel {...props} />;
    case "cocktail_table":
      return <CocktailTableModel {...props} />;
    case "table_area":
      return <TableAreaModel {...props} />;
    case "lounge_area":
      return <LoungeAreaModel {...props} />;
    case "ceremony_seating":
      return <CeremonyModel {...props} />;
    case "chair":
      return null;
    case "sofa":
      return <SofaModel {...props} />;
    case "stage":
      return <StageModel {...props} />;
    case "dance_floor":
      return <DanceFloorModel {...props} />;
    case "dj_booth":
      return <DjBoothModel {...props} />;
    case "bar":
      return <BarModel {...props} />;
    case "photo_booth":
      return <PhotoBoothModel {...props} />;
    case "podium":
      return <PodiumModel {...props} />;
    case "av_screen":
      return <AvScreenModel {...props} />;
    case "piano":
      return <PianoModel {...props} />;
    case "entrance_marker":
      return <EntranceArchModel {...props} />;
    case "plant":
      return <PlantModel {...props} />;
    case "column":
      return <ColumnModel {...props} />;
    case "uplight":
      return <UplightModel {...props} />;
    case "chandelier":
      return <ChandelierModel {...props} wallHeight={wallHeight} />;
    case "drape_backdrop":
      return <FreestandingDrapeModel object={object} />;
    case "ceiling_drape":
      return <CeilingDrapeModel object={object} wallHeight={wallHeight} />;
    default:
      return null;
  }
});

/* ------------------------------------------------------------------ */
/* Seating: per-object matrices cached by object identity              */
/* ------------------------------------------------------------------ */

/** Instance matrices (room space, feet, before the bounds offset) for one object. */
type SeatEntry = {
  style: StudioChairStyle;
  chairs: Float32Array;
  settings: Float32Array;
};

/** Index 0: seating hidden, 1: shown. Unchanged objects keep their entries. */
const seatCache = [
  new WeakMap<StudioObject, SeatEntry | null>(),
  new WeakMap<StudioObject, SeatEntry | null>(),
];

const UP = new THREE.Vector3(0, 1, 0);
const UNIT_SCALE = new THREE.Vector3(1, 1, 1);

function buildSeatEntry(object: StudioObject, showSeating: boolean): SeatEntry | null {
  if (object.hidden) return null;
  const single = object.type === "chair";
  if (!single && (!showSeating || !SEATED_OBJECT_TYPES.includes(object.type))) return null;
  if (object.type === "lounge_area") return null;
  let style = resolveChairStyle(object);
  if (style === "none") {
    if (!single) return null;
    style = DEFAULT_CHAIR_STYLE;
  }
  if (!single && resolveSeatingCount(object) === 0) return null;
  const layout = layoutSeating(object);
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const base = new THREE.Matrix4().compose(
    position.set(object.x * SCALE, 0, object.z * SCALE),
    rotation.setFromAxisAngle(UP, (-object.rotation * Math.PI) / 180),
    UNIT_SCALE
  );
  const local = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  const settingCount = layout.chairs.filter((chair) => chair.setting).length;
  const chairs = new Float32Array(layout.chairs.length * 16);
  const settings = new Float32Array(settingCount * 16);
  let s = 0;
  layout.chairs.forEach((chair, index) => {
    local.compose(position.set(chair.x, 0, chair.z), rotation.setFromAxisAngle(UP, chair.yaw), UNIT_SCALE);
    world.multiplyMatrices(base, local).toArray(chairs, index * 16);
    if (chair.setting) {
      local.compose(
        position.set(chair.setting.x, layout.settingHeight + 0.02, chair.setting.z),
        rotation.setFromAxisAngle(UP, chair.setting.yaw),
        UNIT_SCALE
      );
      world.multiplyMatrices(base, local).toArray(settings, s * 16);
      s++;
    }
  });
  return { style, chairs, settings };
}

function seatEntry(object: StudioObject, showSeating: boolean) {
  const cache = seatCache[showSeating ? 1 : 0];
  let entry = cache.get(object);
  if (entry === undefined) {
    entry = buildSeatEntry(object, showSeating);
    cache.set(object, entry);
  }
  return entry;
}

function concat(parts: Float32Array[]) {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Float32Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Concatenated instance buffers per chair style (object order, so one object stays contiguous). */
function collectSeating(objects: StudioObject[], showSeating: boolean) {
  const byStyle = new Map<StudioChairStyle, Float32Array[]>();
  const settings: Float32Array[] = [];
  for (const object of objects) {
    const entry = seatEntry(object, showSeating);
    if (!entry) continue;
    const list = byStyle.get(entry.style) ?? [];
    list.push(entry.chairs);
    byStyle.set(entry.style, list);
    if (entry.settings.length) settings.push(entry.settings);
  }
  return {
    chairs: [...byStyle.entries()].map(([style, parts]) => ({
      style,
      matrices: new InstanceMatrices(concat(parts)),
    })),
    settings: new InstanceMatrices(concat(settings)),
  };
}

/** Footprint padding so the selection ring clears auto-arranged chairs. */
function selectionPad(object: StudioObject, showSeating: boolean) {
  if (
    showSeating &&
    SEATED_OBJECT_TYPES.includes(object.type) &&
    object.type !== "ceremony_seating" &&
    object.type !== "table_area" &&
    object.type !== "lounge_area" &&
    resolveSeatingCount(object) > 0 &&
    resolveChairStyle(object) !== "none"
  ) {
    return 1.8;
  }
  return 0.3;
}

/* ------------------------------------------------------------------ */
/* Objects                                                             */
/* ------------------------------------------------------------------ */

/**
 * One placed object. Memoized on object identity, so dragging one table
 * re-renders only that table; hover is read per item so hovering doesn't
 * re-render the room.
 */
const ObjectItem = memo(function ObjectItem({
  object,
  centerX,
  centerZ,
  quality,
  wallHeight,
  selected,
  showSeating,
  batcher,
}: {
  object: StudioObject;
  centerX: number;
  centerZ: number;
  quality: StudioQuality;
  wallHeight: number;
  selected: boolean;
  showSeating: boolean;
  batcher: InstanceBatcher;
}) {
  const hovered = useIsStudioHovered(object.id) && !selected;
  const invalidate = useThree((state) => state.invalidate);
  const x = (object.x - centerX) * SCALE;
  const z = (object.z - centerZ) * SCALE;
  const yaw = (-object.rotation * Math.PI) / 180;
  const batched = BATCHED_TYPES.has(object.type);
  const frame = useMemo<BatchFrame | null>(
    () =>
      batched
        ? {
            batcher,
            matrix: new THREE.Matrix4().compose(
              new THREE.Vector3(x, 0, z),
              new THREE.Quaternion().setFromAxisAngle(UP, yaw),
              UNIT_SCALE
            ),
            mirrored: false,
          }
        : null,
    [batched, batcher, x, yaw, z]
  );

  useEffect(() => {
    invalidate();
  }, [invalidate, hovered, selected]);

  const w = Math.max(0.08, object.width * SCALE);
  const d = Math.max(0.08, object.depth * SCALE);
  const h = Math.max(0.08, object.height * SCALE);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <BatchFrameProvider frame={frame}>
        <ObjectModel
          object={object}
          w={w}
          d={d}
          h={h}
          quality={quality}
          wallHeight={wallHeight}
        />
      </BatchFrameProvider>
      {selected || hovered ? (
        <SelectionHighlight
          w={w}
          d={d}
          round={ROUND_TYPES.has(object.type)}
          pad={selectionPad(object, showSeating)}
          mode={selected ? "selected" : "hover"}
          locked={object.locked}
        />
      ) : null}
    </group>
  );
});

export function StudioObjects(props: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  darkTheme: boolean;
}) {
  const { design, bounds, selection } = props;
  const editorSelection = useOptionalStudioSelection();
  const settings = useOptionalStudioSettings() ?? DEFAULT_STUDIO_EDITOR_SETTINGS;
  const quality: StudioQuality = settings.quality;
  const showSeating = settings.showSeating;
  const layerVisible = settings.layers.objects;
  const selectedIds = useMemo(
    () =>
      editorSelection?.selectedIds ??
      (selection?.kind === "object" ? [selection.id] : []),
    [editorSelection?.selectedIds, selection]
  );
  const invalidate = useThree((state) => state.invalidate);
  const [batcher] = useState(() => new InstanceBatcher(() => invalidate()));
  const wallHeight = design.room.wallHeight * SCALE;

  const seating = useMemo(
    () => collectSeating(design.objects, showSeating),
    [design.objects, showSeating]
  );

  useEffect(() => {
    invalidate();
  }, [invalidate, quality, showSeating, layerVisible]);

  if (!layerVisible) return null;

  return (
    <group>
      {design.objects.map((object) =>
        object.hidden ? null : (
          <ObjectItem
            key={object.id}
            object={object}
            centerX={bounds.centerX}
            centerZ={bounds.centerZ}
            quality={quality}
            wallHeight={wallHeight}
            selected={selectedIds.includes(object.id)}
            showSeating={showSeating}
            batcher={batcher}
          />
        )
      )}
      <BatchMeshes batcher={batcher} />
      <group position={[-bounds.centerX * SCALE, 0, -bounds.centerZ * SCALE]}>
        {seating.chairs.map(({ style, matrices }) => (
          <ChairInstances key={style} style={style} matrices={matrices} quality={quality} />
        ))}
        <PlaceSettingInstances matrices={seating.settings} quality={quality} />
      </group>
    </group>
  );
}
