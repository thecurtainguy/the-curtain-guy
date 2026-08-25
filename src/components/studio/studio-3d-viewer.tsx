"use client";

import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { Eye, Focus, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import type { StudioEditorProps } from "./studio-types";
import { RoomScene } from "./three/room-scene";

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
  const sceneBackground = darkTheme ? "#171411" : "#e9e2d7";
  const transparentWalls = Boolean(design.view.transparentWalls);

  return (
    <div
      className="relative h-full min-h-[420px] overflow-hidden bg-muted"
      aria-label={`Interactive 3D view of ${design.room.name}`}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [18, 16, 18], fov: 42, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
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
