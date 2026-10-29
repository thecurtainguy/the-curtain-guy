"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  EstimateFilePicker,
  uploadEstimateFiles,
  type FileUploadProgress,
  type SelectedEstimateFile,
} from "@/components/estimates/estimate-file-picker";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

export function AccountEstimateUploader({
  estimateId,
  remainingSlots = 5,
}: {
  estimateId: string;
  remainingSlots?: number;
}) {
  const router = useRouter();
  const t = useTranslations("estimate.filePicker.toasts");
  const [files, setFiles] = useState<SelectedEstimateFile[]>([]);
  const [progress, setProgress] = useState<FileUploadProgress[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (files.length === 0) return;
    if (remainingSlots <= 0) {
      setError("This estimate already has the maximum of 5 files.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const limited = files.slice(0, remainingSlots);
      const result = await uploadEstimateFiles({
        estimateRequestId: estimateId,
        uploadToken: null,
        files: limited,
        onProgress: setProgress,
      });
      if (result.uploaded > 0) {
        setMessage(t("uploaded", { count: result.uploaded }));
        toast.success(t("uploaded", { count: result.uploaded }));
        setFiles([]);
        router.refresh();
      }
      if (result.failed > 0) {
        setError(t("uploadPartialFailed", { count: result.failed }));
        toast.error(t("uploadPartialFailed", { count: result.failed }));
      }
    } catch {
      setError(t("uploadFailed"));
      toast.error(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <EstimateFilePicker
        files={files}
        onChange={setFiles}
        disabled={busy || remainingSlots <= 0}
        uploadProgress={busy || progress.length > 0 ? progress : undefined}
      />
      <Button
        type="button"
        onClick={() => void upload()}
        disabled={busy || files.length === 0 || remainingSlots <= 0}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Upload files
      </Button>
      {message && <p className="feedback-success">{message}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
