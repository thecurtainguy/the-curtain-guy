"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  EyeOff,
  FileUp,
  Loader2,
  Lock,
  Share2,
} from "lucide-react";
import {
  EstimateFilePicker,
  uploadEstimateFiles,
  type FileUploadProgress,
  type SelectedEstimateFile,
} from "@/components/estimates/estimate-file-picker";
import { Button } from "@/components/ui/button";
import { ESTIMATE_MAX_FILES, formatFileSize } from "@/lib/estimate-files-shared";
import { cn } from "@/lib/utils";

export type OpportunityFileItem = {
  id: string;
  original_file_name: string;
  content_type: string;
  file_size_bytes: number;
  uploaded_at: string | null;
  upload_status: string;
  customer_visible?: boolean;
};

function shortType(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType === "image/png") return "PNG";
  if (contentType === "image/jpeg") return "JPG";
  if (contentType === "image/webp") return "WEBP";
  return contentType.split("/").pop()?.toUpperCase() || contentType;
}

function shortWhen(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function OpportunityFilesPanel({
  estimateRequestId,
  files,
  audience,
  title = "Floor plans & inspiration",
  description,
  totalFileCount,
  className,
}: {
  estimateRequestId: string;
  files: OpportunityFileItem[];
  audience: "admin" | "customer";
  title?: string;
  description?: string;
  totalFileCount?: number;
  className?: string;
}) {
  const isAdmin = audience === "admin";
  const poolCount = totalFileCount ?? files.length;
  const remainingSlots = Math.max(0, ESTIMATE_MAX_FILES - poolCount);
  const defaultDescription = isAdmin
    ? `Internal or shared · synced on estimate & quote · max ${ESTIMATE_MAX_FILES} · 10MB`
    : `Upload or view · synced on estimate & quote · max ${ESTIMATE_MAX_FILES} · 10MB`;

  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <FileUp className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            Files
          </p>
          <h2 className="mt-0.5 font-heading text-base font-semibold leading-snug">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description ?? defaultDescription}
          </p>
        </div>
      </div>

      <OpportunityFilesList files={files} audience={audience} />

      {remainingSlots > 0 || isAdmin ? (
        <div className="border-t border-border/60 pt-3">
          <OpportunityFileUploader
            estimateRequestId={estimateRequestId}
            remainingSlots={remainingSlots}
            audience={audience}
          />
        </div>
      ) : null}
    </section>
  );
}

function OpportunityFilesList({
  files,
  audience,
}: {
  files: OpportunityFileItem[];
  audience: "admin" | "customer";
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadFile(fileId: string) {
    setBusyId(`dl-${fileId}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/estimate-files/download?fileId=${encodeURIComponent(fileId)}`
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        url?: string;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.message ?? "Could not create download link.");
        return;
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Could not create download link.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVisibility(file: OpportunityFileItem) {
    if (audience !== "admin") return;
    setBusyId(`vis-${file.id}`);
    setError(null);
    try {
      const nextVisible = file.customer_visible === false;
      const response = await fetch(`/api/admin/estimate-files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerVisible: nextVisible }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not update visibility.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update visibility.");
    } finally {
      setBusyId(null);
    }
  }

  if (files.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-xs text-muted-foreground">
        {audience === "admin"
          ? "No files yet — upload internal or shared."
          : "No files attached yet."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="overflow-hidden rounded-xl border border-border/40">
        {files.map((file, index) => {
          const shared = file.customer_visible !== false;
          const visBusy = busyId === `vis-${file.id}`;
          const dlBusy = busyId === `dl-${file.id}`;
          return (
            <li
              key={file.id}
              className={cn(
                "bg-background/35 px-3 py-2.5",
                index > 0 && "border-t border-border/35"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p
                      className="min-w-0 truncate text-sm font-medium text-foreground"
                      title={file.original_file_name}
                    >
                      {file.original_file_name}
                    </p>
                    {audience === "admin" ? (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]",
                          shared
                            ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                            : "bg-muted text-muted-foreground ring-1 ring-border/40"
                        )}
                      >
                        {shared ? (
                          <Share2 className="size-2.5" aria-hidden />
                        ) : (
                          <Lock className="size-2.5" aria-hidden />
                        )}
                        {shared ? "Shared" : "Internal"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {shortType(file.content_type)} ·{" "}
                    {formatFileSize(file.file_size_bytes)}
                    {file.uploaded_at
                      ? ` · ${shortWhen(file.uploaded_at)}`
                      : file.upload_status === "pending"
                        ? " · pending"
                        : ""}
                  </p>
                </div>

                {file.upload_status === "uploaded" ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {audience === "admin" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        onClick={() => void toggleVisibility(file)}
                        disabled={Boolean(busyId)}
                        title={
                          shared ? "Make internal only" : "Share with customer"
                        }
                        aria-label={
                          shared ? "Make internal only" : "Share with customer"
                        }
                      >
                        {visBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : shared ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      onClick={() => void downloadFile(file.id)}
                      disabled={Boolean(busyId)}
                      title="View / download"
                      aria-label="View or download file"
                    >
                      {dlBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function OpportunityFileUploader({
  estimateRequestId,
  remainingSlots,
  audience,
}: {
  estimateRequestId: string;
  remainingSlots: number;
  audience: "admin" | "customer";
}) {
  const router = useRouter();
  const isAdmin = audience === "admin";
  const [files, setFiles] = useState<SelectedEstimateFile[]>([]);
  const [progress, setProgress] = useState<FileUploadProgress[]>([]);
  const [customerVisible, setCustomerVisible] = useState(!isAdmin);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (files.length === 0) return;
    if (remainingSlots <= 0) {
      setError(`Maximum of ${ESTIMATE_MAX_FILES} files for this opportunity.`);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const limited = files.slice(0, remainingSlots);
      const result = await uploadEstimateFiles({
        estimateRequestId,
        uploadToken: null,
        files: limited,
        customerVisible: isAdmin ? customerVisible : true,
        onProgress: setProgress,
      });
      if (result.uploaded > 0) {
        setMessage(
          `${result.uploaded} uploaded${
            isAdmin
              ? customerVisible
                ? " · shared"
                : " · internal"
              : ""
          }.`
        );
        setFiles([]);
        router.refresh();
      }
      if (result.failed > 0) {
        setError(
          `${result.failed} file${result.failed === 1 ? "" : "s"} failed.`
        );
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (remainingSlots <= 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Limit reached ({ESTIMATE_MAX_FILES} files).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin ? (
        <div
          className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-background/40 p-1"
          role="group"
          aria-label="Upload visibility"
        >
          <button
            type="button"
            onClick={() => setCustomerVisible(false)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              !customerVisible
                ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
            )}
          >
            <Lock className="size-3 text-primary" aria-hidden />
            Internal
          </button>
          <button
            type="button"
            onClick={() => setCustomerVisible(true)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              customerVisible
                ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
            )}
          >
            <Share2 className="size-3 text-primary" aria-hidden />
            Shared
          </button>
        </div>
      ) : null}

      <EstimateFilePicker
        files={files}
        onChange={setFiles}
        disabled={busy}
        compact
        uploadProgress={busy || progress.length > 0 ? progress : undefined}
      />
      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={() => void upload()}
        disabled={busy || files.length === 0}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Upload{files.length > 0 ? ` (${files.length})` : ""}
      </Button>
      {message ? <p className="text-xs feedback-success">{message}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
