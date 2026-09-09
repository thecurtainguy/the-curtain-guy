"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  PRODUCT_GALLERY_MAX,
  type ProductImageRow,
} from "@/data/product-images";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminProductGalleryProps = {
  productId: string | null;
  colorVariantId?: string | null;
  /** Called when the product primary image may have changed. */
  onProductRefresh?: (product: unknown) => void;
  /** Fired whenever the gallery list changes (upload/delete/reorder). */
  onImagesChange?: (images: ProductImageRow[]) => void;
  onError?: (message: string | null) => void;
  onEnsureSaved?: () => Promise<string | null>;
  className?: string;
  title?: string;
  description?: string;
};

function filesFromList(files: FileList | File[] | null): File[] {
  if (!files) return [];
  return Array.from(files).filter((file) => file.type.startsWith("image/"));
}

export function AdminProductGallery({
  productId,
  colorVariantId = null,
  onProductRefresh,
  onImagesChange,
  onError,
  onEnsureSaved,
  className,
  title = "Gallery",
  description = "Up to 8 photos. First photo is the primary image on cards and PDFs.",
}: AdminProductGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  async function load(id: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (colorVariantId) params.set("colorVariantId", colorVariantId);
      const response = await fetch(
        `/api/admin/products/${id}/images?${params.toString()}`
      );
      const data = (await response.json()) as {
        ok?: boolean;
        images?: ProductImageRow[];
        message?: string;
      };
      if (!response.ok || !data.ok) {
        onError?.(data.message ?? "Could not load gallery.");
        return;
      }
      const next = data.images || [];
      setImages(next);
      onImagesChange?.(next);
    } catch {
      onError?.("Could not load gallery.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!productId) {
      setImages([]);
      return;
    }
    void load(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when gallery scope changes
  }, [productId, colorVariantId]);

  async function ensureId(): Promise<string | null> {
    if (productId) return productId;
    if (!onEnsureSaved) return null;
    return onEnsureSaved();
  }

  async function onUpload(files: FileList | File[] | null) {
    const list = filesFromList(files);
    if (!list.length) return;
    const id = await ensureId();
    if (!id) return;

    const remaining = PRODUCT_GALLERY_MAX - images.length;
    if (remaining <= 0) {
      onError?.(`Galleries can have at most ${PRODUCT_GALLERY_MAX} photos.`);
      return;
    }

    setUploading(true);
    onError?.(null);
    try {
      for (const file of list.slice(0, remaining)) {
        const body = new FormData();
        body.append("file", file);
        if (colorVariantId) body.append("colorVariantId", colorVariantId);
        body.append(
          "imageAlt",
          file.name.replace(/\.[^.]+$/, "") || "Product photo"
        );
        const response = await fetch(`/api/admin/products/${id}/images`, {
          method: "POST",
          body,
        });
        const data = (await response.json()) as {
          ok?: boolean;
          message?: string;
          images?: ProductImageRow[];
          product?: unknown;
        };
        if (!response.ok || !data.ok) {
          onError?.(data.message ?? "Upload failed.");
          break;
        }
        const next = data.images || [];
        setImages(next);
        onImagesChange?.(next);
        if (data.product) onProductRefresh?.(data.product);
      }
    } catch {
      onError?.("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onDelete(imageId: string) {
    if (!productId) return;
    setBusyId(imageId);
    onError?.(null);
    try {
      const response = await fetch(
        `/api/admin/products/${productId}/images/${imageId}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        images?: ProductImageRow[];
        product?: unknown;
      };
      if (!response.ok || !data.ok) {
        onError?.(data.message ?? "Could not delete photo.");
        return;
      }
      const next = data.images || [];
      setImages(next);
      onImagesChange?.(next);
      if (data.product) onProductRefresh?.(data.product);
    } catch {
      onError?.("Could not delete photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function onMove(imageId: string, direction: -1 | 1) {
    if (!productId) return;
    const index = images.findIndex((row) => row.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= images.length) return;

    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setImages(next);
    setBusyId(imageId);
    onError?.(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorVariantId,
          imageIds: next.map((row) => row.id),
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        images?: ProductImageRow[];
        product?: unknown;
      };
      if (!response.ok || !data.ok) {
        onError?.(data.message ?? "Could not reorder photos.");
        await load(productId);
        return;
      }
      const nextImages = data.images || next;
      setImages(nextImages);
      onImagesChange?.(nextImages);
      if (data.product) onProductRefresh?.(data.product);
    } catch {
      onError?.("Could not reorder photos.");
      await load(productId);
    } finally {
      setBusyId(null);
    }
  }

  const atMax = images.length >= PRODUCT_GALLERY_MAX;
  const canUpload = !uploading && !atMax && Boolean(productId || onEnsureSaved);

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!canUpload) return;
    dragDepth.current += 1;
    setDragOver(true);
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (canUpload) event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    if (!canUpload) return;
    void onUpload(event.dataTransfer.files);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={!canUpload}
            onChange={(e) => void onUpload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-2xl"
            disabled={!canUpload}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-3.5" aria-hidden />
            )}
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading gallery…
        </div>
      ) : images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canUpload}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-background/30 px-4 py-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border/50 hover:border-primary/35",
            !canUpload && "pointer-events-none opacity-60"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-foreground">
            {dragOver ? "Drop photos to upload" : "Add gallery photos"}
          </span>
          <span className="text-xs text-muted-foreground">
            Drag & drop or click · JPG, PNG, WEBP, or GIF — up to{" "}
            {PRODUCT_GALLERY_MAX}
          </span>
        </button>
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-2xl transition-colors",
            dragOver && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
          )}
        >
          {dragOver ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/15 backdrop-blur-[1px]">
              <p className="rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium text-primary">
                Drop to add photos
              </p>
            </div>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => {
              const busy = busyId === image.id || uploading;
              return (
                <li
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-border/40 bg-background/40"
                >
                  <div className="relative aspect-[4/3] bg-muted/30">
                    {/* Native img avoids Next/Image issues with fresh storage URLs */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.image_url}
                      alt={image.image_alt || `Photo ${index + 1}`}
                      className="size-full object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-border/40 p-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy || index === 0}
                        onClick={() => void onMove(image.id, -1)}
                        aria-label="Move earlier"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy || index === images.length - 1}
                        onClick={() => void onMove(image.id, 1)}
                        aria-label="Move later"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => void onDelete(image.id)}
                      aria-label="Delete photo"
                    >
                      {busyId === image.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              );
            })}
            {!atMax ? (
              <li>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canUpload}
                  className="flex h-full min-h-[8.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/50 bg-background/25 px-3 py-6 text-center transition-colors hover:border-primary/35"
                >
                  <Upload className="size-4 text-primary" aria-hidden />
                  <span className="text-xs font-medium">Add or drop</span>
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}
