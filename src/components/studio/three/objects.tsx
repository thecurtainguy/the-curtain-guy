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
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  DEFAULT_STUDIO_EDITOR_SETTINGS,
  useOptionalStudioEditor,
  type StudioQuality,
} from "../editor/studio-editor-context";
import type { StudioSelection } from "../studio-types";
import { CeilingDrapeModel, FreestandingDrapeModel } from "./fabric/freestanding";
import { ChairInstances, PlaceSettingInstances } from "./objects/chairs-instanced";
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

type SeatingBuffers = {
  chairs: Map<StudioChairStyle, THREE.Matrix4[]>;
  settings: THREE.Matrix4[];
};

function buildSeating(
  objects: StudioObject[],
  bounds: StudioBounds,
  showSeating: boolean
): SeatingBuffers {
  const chairs = new Map<StudioChairStyle, THREE.Matrix4[]>();
  const settings: THREE.Matrix4[] = [];
  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  for (const object of objects) {
    if (object.hidden) continue;
    const single = object.type === "chair";
    if (!single && (!showSeating || !SEATED_OBJECT_TYPES.includes(object.type))) continue;
    if (object.type === "lounge_area") continue;
    let style = resolveChairStyle(object);
    if (style === "none") {
      if (!single) continue;
      style = DEFAULT_CHAIR_STYLE;
    }
    if (!single && resolveSeatingCount(object) === 0) continue;
    const layout = layoutSeating(object);
    base.compose(
      position.set(
        (object.x - bounds.centerX) * SCALE,
        0,
        (object.z - bounds.centerZ) * SCALE
      ),
      rotation.setFromAxisAngle(up, (-object.rotation * Math.PI) / 180),
      unit
    );
    const list = chairs.get(style) ?? [];
    for (const chair of layout.chairs) {
      local.compose(
        position.set(chair.x, 0, chair.z),
        rotation.setFromAxisAngle(up, chair.yaw),
        unit
      );
      list.push(base.clone().multiply(local));
      if (chair.setting) {
        local.compose(
          position.set(chair.setting.x, layout.settingHeight + 0.02, chair.setting.z),
          rotation.setFromAxisAngle(up, chair.setting.yaw),
          unit
        );
        settings.push(base.clone().multiply(local));
      }
    }
    chairs.set(style, list);
  }
  return { chairs, settings };
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
    return 1.35;
  }
  return 0.3;
}

export function StudioObjects(props: {
  design: StudioDesignJson;
  bounds: StudioBounds;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
  darkTheme: boolean;
}) {
  const { design, bounds, selection } = props;
  const editor = useOptionalStudioEditor();
  const settings = editor?.settings ?? DEFAULT_STUDIO_EDITOR_SETTINGS;
  const quality: StudioQuality = settings.quality;
  const showSeating = settings.showSeating;
  const layerVisible = settings.layers.objects;
  const hoveredId = editor?.hoveredId ?? null;
  const selectedIds = useMemo(
    () =>
      editor?.selectedIds ??
      (selection?.kind === "object" ? [selection.id] : []),
    [editor?.selectedIds, selection]
  );
  const invalidate = useThree((state) => state.invalidate);
  const wallHeight = design.room.wallHeight * SCALE;

  const seating = useMemo(
    () => buildSeating(design.objects, bounds, showSeating),
    [design.objects, bounds, showSeating]
  );

  useEffect(() => {
    invalidate();
  }, [invalidate, quality, showSeating, layerVisible, hoveredId, selectedIds]);

  if (!layerVisible) return null;

  return (
    <group>
      {design.objects.map((object) => {
        if (object.hidden) return null;
        const w = Math.max(0.08, object.width * SCALE);
        const d = Math.max(0.08, object.depth * SCALE);
        const h = Math.max(0.08, object.height * SCALE);
        const selected = selectedIds.includes(object.id);
        const hovered = !selected && hoveredId === object.id;
        return (
          <group
            key={object.id}
            position={[
              (object.x - bounds.centerX) * SCALE,
              0,
              (object.z - bounds.centerZ) * SCALE,
            ]}
            rotation={[0, (-object.rotation * Math.PI) / 180, 0]}
          >
            <ObjectModel
              object={object}
              w={w}
              d={d}
              h={h}
              quality={quality}
              wallHeight={wallHeight}
            />
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
      })}
      {[...seating.chairs.entries()].map(([style, matrices]) => (
        <ChairInstances key={style} style={style} matrices={matrices} quality={quality} />
      ))}
      <PlaceSettingInstances matrices={seating.settings} quality={quality} />
    </group>
  );
}
