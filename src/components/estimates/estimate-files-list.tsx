"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/estimate-files-shared";

export type FileListItem = {
  id: string;
  original_file_name: string;
  content_type: string;
  file_size_bytes: number;
  uploaded_at: string | null;
  upload_status: string;
  customer_visible?: boolean;
};

export function EstimateFilesList({
  files,
  emptyMessage = "No files attached.",
  showVisibility = false,
}: {
  files: FileListItem[];
  emptyMessage?: string;
  showVisibility?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadFile(fileId: string) {
    setBusyId(fileId);
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

  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/40">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex flex-col gap-3 bg-card/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.original_file_name}
                </p>
                {showVisibility ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {file.customer_visible === false ? "Internal" : "Shared"}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {file.content_type} · {formatFileSize(file.file_size_bytes)}
                {file.uploaded_at
                  ? ` · ${new Date(file.uploaded_at).toLocaleString()}`
                  : file.upload_status === "pending"
                    ? " · pending"
                    : ""}
              </p>
            </div>
            {file.upload_status === "uploaded" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void downloadFile(file.id)}
                disabled={busyId === file.id}
              >
                {busyId === file.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                View / download
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
