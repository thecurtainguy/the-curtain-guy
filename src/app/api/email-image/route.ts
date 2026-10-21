import { NextResponse } from "next/server";
import {
  getSupabaseBrowserConfig,
  getSupabaseServerConfig,
} from "@/lib/env";

/** Rendered at 2x for the 56px email thumbnail. */
const SIZE = 112;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const LOCAL_IMAGE = /^\/(?!\/)[\w\-./]+\.(jpe?g|png|webp|gif|avif)$/i;

function allowedSource(src: string, requestUrl: string): URL | null {
  if (LOCAL_IMAGE.test(src)) return new URL(src, requestUrl);

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  const supabaseUrl =
    getSupabaseServerConfig()?.url || getSupabaseBrowserConfig()?.url;
  if (!supabaseUrl) return null;
  const supabaseHost = new URL(supabaseUrl).host;
  if (
    url.protocol !== "https:" ||
    url.host !== supabaseHost ||
    !url.pathname.startsWith("/storage/v1/object/public/")
  ) {
    return null;
  }
  return url;
}

/**
 * Email-safe thumbnails: Outlook desktop can't show WebP and full-size product
 * photos are too heavy for an inbox, so every source becomes a small PNG.
 */
export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src")?.trim() || "";
  const source = allowedSource(src, request.url);
  if (!source) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const response = await fetch(source, {
      signal: AbortSignal.timeout(8000),
    });
    const length = Number(response.headers.get("content-length") || 0);
    if (!response.ok || length > MAX_SOURCE_BYTES) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    const { default: sharp } = await import("sharp");
    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(SIZE, SIZE, { fit: "cover" })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toBuffer();

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[email-image]", error);
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
