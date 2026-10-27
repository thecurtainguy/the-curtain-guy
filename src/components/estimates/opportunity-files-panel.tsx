"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  History,
  Loader2,
  Lock,
  Receipt,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useBrandConfirm } from "@/components/ui/brand-dialog";
import type { FileActivityItem } from "@/data/estimate-file-events";
import {
  EstimateFilePicker,
  uploadEstimateFiles,
  type FileUploadProgress,
  type SelectedEstimateFile,
} from "@/components/estimates/estimate-file-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectInput } from "@/components/ui/select-input";
import {
  ESTIMATE_FILE_CAPTION_MAX,
  ESTIMATE_FILE_KINDS,
  ESTIMATE_FILE_KIND_HINTS,
  estimateFileKindLabel,
  type EstimateFileKind,
} from "@/data/estimate-file-kinds";
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
  file_kind?: EstimateFileKind;
  caption?: string | null;
  include_in_quote?: boolean;
  include_in_invoice?: boolean;
  deleted_at?: string | null;
};

type FilePatch = {
  customerVisible?: boolean;
  fileKind?: EstimateFileKind;
  caption?: string | null;
  includeInQuote?: boolean;
  includeInInvoice?: boolean;
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
  deletedFiles = [],
  activity,
  className,
}: {
  estimateRequestId: string;
  files: OpportunityFileItem[];
  audience: "admin" | "customer";
  title?: string;
  description?: string;
  totalFileCount?: number;
  /** Admin only. Soft-deleted files that can be restored. */
  deletedFiles?: OpportunityFileItem[];
  /** Admin only. Omit where another log (e.g. the quote change log) already shows it. */
  activity?: FileActivityItem[];
  className?: string;
}) {
  const isAdmin = audience === "admin";
  const poolCount = totalFileCount ?? files.length;
  const remainingSlots = Math.max(0, ESTIMATE_MAX_FILES - poolCount);
  const defaultDescription = isAdmin
    ? "Internal or shared · synced on estimate & quote"
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
              Files
            </p>
            {isAdmin ? (
              <span
                className="rounded-full border border-border/50 bg-background/40 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground"
                title={`${poolCount} of ${ESTIMATE_MAX_FILES} files used`}
              >
                {poolCount}/{ESTIMATE_MAX_FILES}
              </span>
            ) : null}
          </div>
          <h2 className="mt-0.5 font-heading text-base font-semibold leading-snug">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description ?? defaultDescription}
          </p>
        </div>
      </div>

      <OpportunityFilesList files={files} audience={audience} />

      {isAdmin && deletedFiles.length > 0 ? (
        <DeletedFilesDrawer files={deletedFiles} />
      ) : null}
      {isAdmin && activity ? <FileActivityDrawer items={activity} /> : null}

      {remainingSlots > 0 || isAdmin ? (
        <div className={isAdmin ? undefined : "border-t border-border/60 pt-3"}>
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
  const [confirm, confirmDialog] = useBrandConfirm();
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

  async function patchFile(
    file: OpportunityFileItem,
    patch: FilePatch,
    busyKey: string
  ) {
    if (audience !== "admin") return;
    setBusyId(busyKey);
    setError(null);
    try {
      const response = await fetch(`/api/admin/estimate-files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not update the file.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update the file.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleVisibility(file: OpportunityFileItem) {
    return patchFile(
      file,
      { customerVisible: file.customer_visible === false },
      `vis-${file.id}`
    );
  }

  async function deleteFile(file: OpportunityFileItem) {
    if (audience !== "admin") return;
    const attachedTo = [
      file.include_in_quote ? "quote" : null,
      file.include_in_invoice ? "invoice" : null,
    ].filter(Boolean);
    const ok = await confirm({
      title: "Delete this file?",
      eyebrow: "Opportunity files",
      icon: Trash2,
      description: (
        <>
          <span className="font-medium text-foreground">{file.original_file_name}</span>{" "}
          will be hidden everywhere
          {attachedTo.length ? ` and removed from the ${attachedTo.join(" and ")} PDF` : ""}.
          It stays in the audit trail and can be restored from Deleted files.
        </>
      ),
      confirmLabel: "Delete file",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(`del-${file.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/estimate-files/${file.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not delete the file.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete the file.");
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

                {file.upload_status === "uploaded" || audience === "admin" ? (
                  <div className="-mr-1 -mt-0.5 flex shrink-0 items-center gap-0.5">
                    {audience === "admin" && file.upload_status === "uploaded" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
                    {file.upload_status === "uploaded" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
                    ) : null}
                    {audience === "admin" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => void deleteFile(file)}
                        disabled={Boolean(busyId)}
                        title="Delete file"
                        aria-label={`Delete ${file.original_file_name}`}
                      >
                        {busyId === `del-${file.id}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {audience === "admin" && file.upload_status === "uploaded" ? (
                <OpportunityFileControls
                  file={file}
                  busyId={busyId}
                  onPatch={(patch, busyKey) => void patchFile(file, patch, busyKey)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {confirmDialog}
    </div>
  );
}

function DrawerSummary({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof History;
  label: string;
  count: number;
}) {
  return (
    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
      <Icon className="size-3.5 text-primary" aria-hidden />
      <span className="flex-1">{label}</span>
      <span className="rounded-full border border-border/50 bg-background/40 px-1.5 py-0.5 text-[10px]">
        {count}
      </span>
      <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
    </summary>
  );
}

function DeletedFilesDrawer({ files }: { files: OpportunityFileItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(file: OpportunityFileItem) {
    setBusyId(file.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/estimate-files/${file.id}/restore`, {
        method: "POST",
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not restore the file.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not restore the file.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <details className="group rounded-xl border border-border/40 bg-background/25">
      <DrawerSummary icon={Trash2} label="Deleted files" count={files.length} />
      <ul className="space-y-1.5 px-3 pb-3">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-medium text-muted-foreground line-through decoration-muted-foreground/50"
                title={file.original_file_name}
              >
                {file.original_file_name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {file.customer_visible === false ? "Internal" : "Shared"}
                {file.deleted_at ? ` · deleted ${shortWhen(file.deleted_at)}` : ""}
              </p>
            </div>
            {file.uploaded_at ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={() => void restore(file)}
                disabled={Boolean(busyId)}
              >
                {busyId === file.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RotateCcw className="size-3" />
                )}
                Restore
              </Button>
            ) : (
              <span className="shrink-0 text-[10px] text-muted-foreground">Unfinished</span>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="px-3 pb-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </details>
  );
}

function FileActivityDrawer({ items }: { items: FileActivityItem[] }) {
  return (
    <details className="group rounded-xl border border-border/40 bg-background/25">
      <DrawerSummary icon={History} label="File activity" count={items.length} />
      {items.length === 0 ? (
        <p className="px-3 pb-3 text-xs text-muted-foreground">No file activity yet.</p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto px-3 pb-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border/30 bg-card/40 px-2.5 py-2"
            >
              <p className="truncate text-xs font-medium text-foreground" title={item.file_name}>
                {item.file_name}
              </p>
              <p className="text-[11px] text-muted-foreground">{item.summary}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                {new Date(item.created_at).toLocaleString("en-CA", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}
                {item.actor_email ?? item.actor_type}
              </p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function OpportunityFileControls({
  file,
  busyId,
  onPatch,
}: {
  file: OpportunityFileItem;
  busyId: string | null;
  onPatch: (patch: FilePatch, busyKey: string) => void;
}) {
  const shared = file.customer_visible !== false;
  const kind = file.file_kind ?? "document";
  const included = Boolean(file.include_in_quote || file.include_in_invoice);
  const [caption, setCaption] = useState(file.caption ?? "");

  const targets = [
    {
      key: "quote" as const,
      label: "Quote",
      icon: FileText,
      on: Boolean(file.include_in_quote),
      patch: (next: boolean): FilePatch => ({ includeInQuote: next }),
    },
    {
      key: "invoice" as const,
      label: "Invoice",
      icon: Receipt,
      on: Boolean(file.include_in_invoice),
      patch: (next: boolean): FilePatch => ({ includeInInvoice: next }),
    },
  ];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <SelectInput
          size="sm"
          className="h-8 min-w-[7.5rem] flex-1 text-xs"
          value={kind}
          disabled={Boolean(busyId)}
          aria-label="File type"
          onChange={(next) =>
            next !== kind &&
            onPatch({ fileKind: next as EstimateFileKind }, `kind-${file.id}`)
          }
          options={ESTIMATE_FILE_KINDS.map((value) => ({
            value,
            label: estimateFileKindLabel(value),
            description: ESTIMATE_FILE_KIND_HINTS[value],
          }))}
        />
        <div
          role="group"
          aria-label="Add to PDF"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-0.5 rounded-xl border border-border/50 bg-background/40 p-0.5",
            !shared && "opacity-50"
          )}
        >
          <span className="px-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            PDF
          </span>
          {targets.map((target) => {
            const Icon = target.icon;
            const busy = busyId === `${target.key}-${file.id}`;
            return (
              <button
                key={target.key}
                type="button"
                aria-pressed={target.on}
                aria-label={`${target.on ? "Remove from" : "Attach to"} the ${target.label.toLowerCase()} PDF`}
                disabled={!shared || Boolean(busyId)}
                title={
                  shared
                    ? `${target.on ? "Remove from" : "Attach to"} the ${target.label.toLowerCase()} PDF`
                    : "Share the file first. Internal files never go to the customer."
                }
                onClick={() =>
                  onPatch(target.patch(!target.on), `${target.key}-${file.id}`)
                }
                className={cn(
                  "inline-flex h-full items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors",
                  target.on
                    ? "bg-primary/15 text-primary ring-1 ring-primary/35"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                  !shared && "cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                )}
              >
                {busy ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : target.on ? (
                  <Check className="size-3" />
                ) : (
                  <Icon className="size-3" />
                )}
                {target.label}
              </button>
            );
          })}
        </div>
      </div>
      {kind === "concept" && shared ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="size-3 shrink-0 text-primary" />
          Customer sees an AI-concept disclaimer.
        </p>
      ) : null}
      {!shared ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          Internal: never on quotes, invoices, or emails.
        </p>
      ) : null}
      {included ? (
        <Input
          value={caption}
          maxLength={ESTIMATE_FILE_CAPTION_MAX}
          placeholder="Caption on the PDF (optional)"
          className="h-8 text-xs"
          disabled={Boolean(busyId)}
          onChange={(event) => setCaption(event.target.value)}
          onBlur={() => {
            if (caption.trim() !== (file.caption ?? "")) {
              onPatch({ caption: caption.trim() || null }, `cap-${file.id}`);
            }
          }}
        />
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

  const visibilityToggle = (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-background/40 p-1"
      role="group"
      aria-label="Upload visibility"
    >
      <button
        type="button"
        onClick={() => setCustomerVisible(false)}
        aria-pressed={!customerVisible}
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
        aria-pressed={customerVisible}
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
  );

  const feedback = (
    <>
      {message ? <p className="text-xs feedback-success">{message}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (isAdmin) {
    return (
      <div className="space-y-2">
        <EstimateFilePicker
          files={files}
          onChange={setFiles}
          disabled={busy}
          dense
          uploadProgress={busy || progress.length > 0 ? progress : undefined}
        />
        {files.length > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            {visibilityToggle}
            <Button type="button" size="sm" onClick={() => void upload()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Upload ({files.length})
            </Button>
          </div>
        ) : null}
        {feedback}
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
      {feedback}
    </div>
  );
}
