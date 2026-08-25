"use client";

import { Button } from "@/components/ui/button";
import { getStudioMaterials } from "@/data/studio";
import { Canvas } from "@react-three/fiber";
import { Eye, Focus, RotateCcw, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import * as THREE from "three";
import type { StudioEditorProps } from "./studio-types";
import { RoomScene } from "./three/room-scene";
import { LIGHTING_MOODS } from "./three/scene-finishes";

export function Studio3DViewer({
  design,
  onChange,
  selection,
  onSelect,
}: StudioEditorProps) {
  const [resetSignal, setResetSignal] = useState(0);
  const [fitSignal, setFitSignal] = useState(0);
  const { resolvedTheme } = useTheme();
  const darkTheme = resolvedTheme === "dark";
  const materials = getStudioMaterials(design);
  const lighting = LIGHTING_MOODS[materials.lighting];
  const sceneBackground = darkTheme
    ? lighting.backgroundDark
    : lighting.backgroundLight;
  const transparentWalls = Boolean(design.view.transparentWalls);

  return (
    <div
      className="relative h-full min-h-[420px] overflow-hidden bg-muted"
      aria-label={`Interactive 3D view of ${design.room.name}`}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [24, 18, 28], fov: 41, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: lighting.exposure,
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={[sceneBackground]} />
        <fog attach="fog" args={[sceneBackground, 75, 240]} />
        <RoomScene
          design={design}
          selection={selection}
          onSelect={onSelect}
          transparentWalls={transparentWalls}
          resetSignal={resetSignal}
          fitSignal={fitSignal}
          darkTheme={darkTheme}
        />
      </Canvas>

      {design.drapeRuns.length === 0 ? (
        <div className="pointer-events-none absolute top-3 left-3 max-w-[min(18rem,calc(100%-10rem))] rounded-2xl border border-primary/25 bg-background/82 p-3 shadow-lg backdrop-blur-md">
          <div className="flex gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-primary uppercase">
                Preview ready
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                Select a wall and add a drape treatment to preview the setup.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setFitSignal((value) => value + 1)}
          className="bg-background/85 shadow-md backdrop-blur"
        >
          <Focus aria-hidden="true" />
          Fit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setResetSignal((value) => value + 1)}
          className="bg-background/85 shadow-md backdrop-blur"
        >
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          variant={transparentWalls ? "default" : "secondary"}
          aria-pressed={transparentWalls}
          onClick={() =>
            onChange({
              ...design,
              view: {
                ...design.view,
                transparentWalls: !transparentWalls,
              },
            })
          }
          className="shadow-md"
        >
          <Eye aria-hidden="true" />
          Glass walls
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-border/60 bg-background/75 px-3 py-1 text-[0.65rem] text-muted-foreground shadow-sm backdrop-blur">
        Drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
