import { ExternalLink, FileText, Sparkles } from "lucide-react";
import type { CustomerLanguage } from "@/data/customer-language";
import {
  estimateFileKindLabel,
  getAttachmentCopy,
  type AttachmentViewItem,
} from "@/data/estimate-file-kinds";
import { cn } from "@/lib/utils";

export function QuoteAttachmentGallery({
  items,
  language,
}: {
  items: AttachmentViewItem[];
  language: CustomerLanguage;
}) {
  const copy = getAttachmentCopy(language);
  const images = items.filter((item) => item.contentType.startsWith("image/"));
  const documents = items.filter((item) => !item.contentType.startsWith("image/"));
  const hasConcept = items.some((item) => item.kind === "concept");

  return (
    <div className="space-y-4">
      {images.length > 0 ? (
        <div
          className={cn(
            "grid gap-4",
            images.length > 1 && "sm:grid-cols-2"
          )}
        >
          {images.map((image) => (
            <figure
              key={image.id}
              className="overflow-hidden rounded-2xl border border-border/40 bg-background/30"
            >
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block bg-black/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URLs */}
                <img
                  src={image.url}
                  alt={image.caption || estimateFileKindLabel(image.kind, language)}
                  loading="lazy"
                  className="max-h-[32rem] w-full object-contain transition-opacity group-hover:opacity-90"
                />
                <span className="absolute left-3 top-3 rounded-full border border-primary/35 bg-background/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-primary backdrop-blur">
                  {estimateFileKindLabel(image.kind, language)}
                </span>
              </a>
              {image.caption ? (
                <figcaption className="px-4 py-3 text-sm font-medium text-foreground">
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-border/40 bg-background/30 p-3.5 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
                <FileText className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {doc.caption || doc.fileName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {estimateFileKindLabel(doc.kind, language)}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs text-primary">
                {copy.open}
                <ExternalLink className="size-3.5" />
              </span>
            </a>
          ))}
        </div>
      ) : null}

      {hasConcept ? (
        <div className="flex gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              {estimateFileKindLabel("concept", language)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {copy.conceptDisclaimer}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
