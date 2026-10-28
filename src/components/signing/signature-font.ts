import { Great_Vibes } from "next/font/google";

export const signatureFont = Great_Vibes({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const INK = "#14121a";

/** Renders text in the signature font to a transparent PNG data URL (used for typed signatures and initials). */
export async function renderScriptToPng(
  text: string,
  options: { width: number; height: number; maxFontSize: number }
): Promise<string | null> {
  const value = text.trim();
  if (!value || typeof document === "undefined") return null;
  const family = signatureFont.style.fontFamily;
  await document.fonts.load(`${options.maxFontSize}px ${family}`, value).catch(() => undefined);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = options.width * scale;
  canvas.height = options.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  let size = options.maxFontSize;
  ctx.font = `${size}px ${family}`;
  const maxWidth = options.width - 24;
  while (size > 14 && ctx.measureText(value).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, options.width / 2, options.height / 2 + size * 0.08);
  return canvas.toDataURL("image/png");
}
