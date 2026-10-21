"use client";

import { Html } from "@react-three/drei";

/** Premium glass chip pinned to a 3D point during a gizmo drag. */
export function ReadoutChip({
  position,
  title,
  detail,
}: {
  position: [number, number, number];
  title: string;
  detail?: string;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[60, 40]}
      pointerEvents="none"
      style={{ pointerEvents: "none" }}
    >
      <div className="pointer-events-none flex -translate-y-7 flex-col items-center gap-0.5 rounded-2xl border border-primary/45 bg-black/72 px-3 py-1.5 whitespace-nowrap shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md select-none">
        <span className="font-heading text-[0.78rem] leading-none font-semibold tracking-wide text-primary tabular-nums">
          {title}
        </span>
        {detail ? (
          <span className="text-[0.6rem] leading-none font-medium tracking-[0.14em] text-primary/70 uppercase">
            {detail}
          </span>
        ) : null}
      </div>
    </Html>
  );
}
