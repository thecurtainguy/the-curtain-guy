"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ESTIMATE_MAX_FILE_BYTES,
  ESTIMATE_MAX_FILES,
  formatFileSize,
  isAllowedEstimateMimeType,
  validateEstimateFileInput,
} from "@/lib/estimate-files-shared";
import { cn } from "@/lib/utils";

export type SelectedEstimateFile = {
  id: string;
  file: File;
};

export type FileUploadProgressStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed";

export type FileUploadProgress = {
  id: string;
  name: string;
  size: number;
  status: FileUploadProgressStatus;
  message?: string;
};

type Props = {
  files: SelectedEstimateFile[];
  onChange: (files: SelectedEstimateFile[]) => void;
  disabled?: boolean;
  className?: string;
  /** Denser layout for narrow portal rails */
  compact?: boolean;
  /** Optional live upload statuses shown after estimate submit */
  uploadProgress?: FileUploadProgress[];
};

function normalizeMime(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
}

export function EstimateFilePicker({
  files,
  onChange,
  disabled,
  className,
  compact = false,
  uploadProgress,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);

    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= ESTIMATE_MAX_FILES) {
        setError(`Maximum of ${ESTIMATE_MAX_FILES} files per estimate.`);
        break;
      }

      const contentType = normalizeMime(file);

      if (!isAllowedEstimateMimeType(contentType)) {
        setError("Only PDF, PNG, JPG, and WEBP files are allowed.");
        continue;
      }

      const validation = validateEstimateFileInput({
        originalFileName: file.name,
        contentType,
        fileSizeBytes: file.size,
      });

      if (!validation.ok) {
        setError(validation.message);
        continue;
      }

      if (file.size > ESTIMATE_MAX_FILE_BYTES) {
        setError("Each file must be 10MB or smaller.");
        continue;
      }

      next.push({ id: crypto.randomUUID(), file });
    }

    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    onChange(files.filter((item) => item.id !== id));
    setError(null);
  }

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      <div
        className={cn(
          "rounded-2xl border border-primary/30 bg-card/30 shadow-[0_0_40px_-28px_oklch(0.76_0.15_88/0.8)]",
          compact ? "p-3" : "p-4 sm:p-5"
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            compact
              ? "flex-col"
              : "flex-col sm:flex-row sm:items-start sm:justify-between"
          )}
        >
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25",
                compact ? "size-8" : "size-10"
              )}
            >
              <FileUp className={compact ? "size-4" : "size-5"} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                Optional uploads
              </p>
              <p
                className={cn(
                  "mt-0.5 font-medium text-foreground",
                  compact ? "text-xs leading-snug" : "mt-1 text-sm"
                )}
              >
                {compact
                  ? "Floor plan, photo, or inspiration"
                  : "Upload floor plan, venue photo, or inspiration image"}
              </p>
              {compact ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  PDF / PNG / JPG / WEBP · 10MB
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, PNG, JPG, or WEBP · max {ESTIMATE_MAX_FILES} files · 10MB
                  each · optional
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={compact ? "w-full" : undefined}
            disabled={disabled || files.length >= ESTIMATE_MAX_FILES}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="size-4" />
            Add files
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
          multiple
          disabled={disabled}
          onChange={(event) => handleSelect(event.target.files)}
        />

        {files.length > 0 && !uploadProgress?.length && (
          <ul className={cn("space-y-2", compact ? "mt-3" : "mt-4")}>
            {files.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground sm:text-sm">
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => removeFile(item.id)}
                  disabled={disabled}
                  aria-label={`Remove ${item.file.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploadProgress && uploadProgress.length > 0 && (
          <ul className={cn("space-y-2", compact ? "mt-3" : "mt-4")}>
            {uploadProgress.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground sm:text-sm">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(item.size)}
                    {item.message ? ` · ${item.message}` : ""}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] capitalize text-muted-foreground">
                  {item.status === "uploading" || item.status === "queued" ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : null}
                  {item.status === "uploaded" ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  ) : null}
                  {item.status === "failed" ? (
                    <X className="size-3.5 text-destructive" />
                  ) : null}
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
          <X className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export async function uploadEstimateFiles(input: {
  estimateRequestId: string;
  uploadToken: string | null;
  files: SelectedEstimateFile[];
  /** Admin only. When omitted, server defaults apply (shared for customers, internal for owners). */
  customerVisible?: boolean;
  onProgress?: (items: FileUploadProgress[]) => void;
}): Promise<{ uploaded: number; failed: number; progress: FileUploadProgress[] }> {
  const progress: FileUploadProgress[] = input.files.map((item) => ({
    id: item.id,
    name: item.file.name,
    size: item.file.size,
    status: "queued",
  }));

  input.onProgress?.([...progress]);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < input.files.length; i++) {
    const item = input.files[i];
    const file = item.file;
    const contentType = normalizeMime(file);

    progress[i] = { ...progress[i], status: "uploading" };
    input.onProgress?.([...progress]);

    try {
      const signResponse = await fetch("/api/estimate-files/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateRequestId: input.estimateRequestId,
          uploadToken: input.uploadToken,
          originalFileName: file.name,
          contentType,
          fileSizeBytes: file.size,
          ...(typeof input.customerVisible === "boolean"
            ? { customerVisible: input.customerVisible }
            : {}),
        }),
      });

      const signPayload = (await signResponse.json()) as {
        ok?: boolean;
        message?: string;
        estimateFileId?: string;
        signedUrl?: string;
      };

      if (!signResponse.ok || !signPayload.ok || !signPayload.signedUrl) {
        failed += 1;
        progress[i] = {
          ...progress[i],
          status: "failed",
          message: signPayload.message || "Could not start upload",
        };
        input.onProgress?.([...progress]);
        continue;
      }

      const putResponse = await fetch(signPayload.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType || file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!putResponse.ok) {
        failed += 1;
        progress[i] = {
          ...progress[i],
          status: "failed",
          message: "Storage upload failed",
        };
        input.onProgress?.([...progress]);
        continue;
      }

      const completeResponse = await fetch("/api/estimate-files/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateFileId: signPayload.estimateFileId,
          uploadToken: input.uploadToken,
        }),
      });

      const completePayload = (await completeResponse.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!completeResponse.ok || !completePayload.ok) {
        failed += 1;
        progress[i] = {
          ...progress[i],
          status: "failed",
          message: completePayload.message || "Could not finalize upload",
        };
        input.onProgress?.([...progress]);
        continue;
      }

      uploaded += 1;
      progress[i] = { ...progress[i], status: "uploaded", message: "Ready" };
      input.onProgress?.([...progress]);
    } catch {
      failed += 1;
      progress[i] = {
        ...progress[i],
        status: "failed",
        message: "Upload error",
      };
      input.onProgress?.([...progress]);
    }
  }

  return { uploaded, failed, progress };
}
