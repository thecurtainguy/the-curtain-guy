"use client";

import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

const INK = "#14121a";

type Point = { x: number; y: number };

/** Finger / mouse / stylus signature canvas. Emits a PNG data URL after each stroke, or null when cleared. */
export function SignaturePad({
  onChange,
  hint,
  clearLabel,
  hasValue,
  className,
}: {
  onChange: (dataUrl: string | null) => void;
  hint: string;
  clearLabel: string;
  hasValue: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<Point | null>(null);
  const strokes = useRef(0);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
    };
    let width = 0;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry?.contentRect.width ?? 0);
      if (next === width) return;
      const hadInk = width > 0 && strokes.current > 0;
      width = next;
      resize();
      strokes.current = 0;
      if (hadInk) onChangeRef.current(null);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best-effort; strokes still work without it.
    }
    drawing.current = true;
    const p = point(event);
    last.current = p;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    strokes.current += 1;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    strokes.current = 0;
    onChange(null);
  };

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        aria-label={hint}
        className="block h-full w-full cursor-crosshair touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      />
      {!hasValue ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-[#14121a]/35">
          {hint}
        </p>
      ) : null}
      <button
        type="button"
        onClick={clear}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-[#14121a]/15 bg-white/80 px-2.5 py-1 text-xs font-medium text-[#14121a]/70 transition hover:bg-white hover:text-[#14121a]"
      >
        <Eraser className="size-3.5" aria-hidden />
        {clearLabel}
      </button>
    </div>
  );
}
