export const ESTIMATE_FILES_BUCKET = "estimate-files";
export const ESTIMATE_MAX_FILES = 5;
export const ESTIMATE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const SIGNED_READ_URL_EXPIRES_SEC = 60;

export const ALLOWED_ESTIMATE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedEstimateMimeType =
  (typeof ALLOWED_ESTIMATE_MIME_TYPES)[number];

const EXTENSION_BY_MIME: Record<AllowedEstimateMimeType, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

export function isAllowedEstimateMimeType(
  value: string
): value is AllowedEstimateMimeType {
  return (ALLOWED_ESTIMATE_MIME_TYPES as readonly string[]).includes(value);
}

export function sanitizeFileName(original: string): string {
  const base = original.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return cleaned || "file";
}

export function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

export function validateEstimateFileInput(input: {
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
}): { ok: true } | { ok: false; message: string } {
  const { originalFileName, contentType, fileSizeBytes } = input;

  if (!originalFileName.trim()) {
    return { ok: false, message: "File name is required." };
  }

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return { ok: false, message: "Invalid file size." };
  }

  if (fileSizeBytes > ESTIMATE_MAX_FILE_BYTES) {
    return { ok: false, message: "Each file must be 10MB or smaller." };
  }

  if (!isAllowedEstimateMimeType(contentType)) {
    return {
      ok: false,
      message: "Only PDF, PNG, JPG, and WEBP files are allowed.",
    };
  }

  const ext = getExtension(originalFileName);
  const allowedExts = EXTENSION_BY_MIME[contentType];
  if (!ext || !allowedExts.includes(ext)) {
    return {
      ok: false,
      message: "File extension does not match an allowed type.",
    };
  }

  const dangerous =
    /\.(exe|sh|bat|cmd|js|mjs|cjs|php|html|htm|svg|dll|com|scr)$/i;
  if (dangerous.test(originalFileName)) {
    return { ok: false, message: "This file type is not allowed." };
  }

  return { ok: true };
}

export function buildEstimateObjectPath(input: {
  estimateId: string;
  fileId: string;
  originalFileName: string;
}): string {
  const safe = sanitizeFileName(input.originalFileName);
  return `estimates/${input.estimateId}/${input.fileId}-${safe}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
