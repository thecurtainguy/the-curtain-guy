const PDF_NATIVE_IMAGE = /\.(jpe?g|png)(\?|#|$)/i;

/** react-pdf only decodes JPEG/PNG; convert anything else (WebP, GIF…) to a PNG data URI. */
export async function toPdfSafeImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (PDF_NATIVE_IMAGE.test(url)) return url;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "";
    if (/image\/(jpe?g|png)/i.test(type)) return url;
    const { default: sharp } = await import("sharp");
    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(240, 240, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (error) {
    console.error("[pdf-image] convert", error);
    return null;
  }
}
