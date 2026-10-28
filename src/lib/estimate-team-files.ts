import type { EstimateFileRow } from "@/lib/estimate-access";
import { fetchEstimateFiles } from "@/lib/estimate-access";
import { ESTIMATE_FILES_BUCKET } from "@/lib/estimate-files";
import type { ResendEmailAttachment } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Files finishing within this window after a submission ride along on the team
 * email; anything later is emailed on its own. Kept well under the 60s function limit.
 */
export const SUBMISSION_UPLOAD_WAIT_MS = 40_000;
const POLL_INTERVAL_MS = 2_000;
const SETTLE_MARGIN_MS = 3_000;

/** Raw bytes; Resend caps a message at 40 MB after base64 (+33%). */
const ATTACHMENT_BUDGET_BYTES = 25 * 1024 * 1024;
const LINK_EXPIRES_SEC = 7 * 24 * 60 * 60;

export type TeamEmailFile = {
  name: string;
  sizeBytes: number;
  /** Signed download link when the file could not be attached. */
  url: string | null;
};

export type TeamEmailFiles = {
  files: TeamEmailFile[];
  attachments: ResendEmailAttachment[];
  /** Expected files that never finished uploading in time. */
  missing: number;
};

export function submissionUploadDeadline(estimateCreatedAt: string): number {
  return new Date(estimateCreatedAt).getTime() + SUBMISSION_UPLOAD_WAIT_MS;
}

function uploadedBy(file: EstimateFileRow, deadline: number): boolean {
  return Boolean(file.uploaded_at) && new Date(file.uploaded_at as string).getTime() <= deadline;
}

/** Polls until every expected file is uploaded or the window closes. */
export async function waitForSubmissionUploads(input: {
  estimateRequestId: string;
  estimateCreatedAt: string;
  expectedCount: number;
}): Promise<EstimateFileRow[]> {
  const deadline = submissionUploadDeadline(input.estimateCreatedAt);
  for (;;) {
    const files = (await fetchEstimateFiles(input.estimateRequestId, ["uploaded"])).filter(
      (file) => uploadedBy(file, deadline)
    );
    if (files.length >= input.expectedCount || Date.now() > deadline + SETTLE_MARGIN_MS) {
      return files;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/** Attaches files up to the size budget; the rest get a 7-day signed link. */
export async function buildTeamEmailFiles(
  rows: EstimateFileRow[],
  expectedCount = rows.length
): Promise<TeamEmailFiles> {
  const admin = createAdminSupabaseClient();
  const files: TeamEmailFile[] = [];
  const attachments: ResendEmailAttachment[] = [];
  let budget = ATTACHMENT_BUDGET_BYTES;

  for (const row of rows) {
    const bucket = row.bucket || ESTIMATE_FILES_BUCKET;
    const size = Number(row.file_size_bytes) || 0;
    if (size > 0 && size <= budget) {
      const { data, error } = await admin.storage.from(bucket).download(row.object_path);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        budget -= buffer.byteLength;
        attachments.push({
          filename: row.original_file_name,
          content: buffer.toString("base64"),
          contentType: row.content_type || undefined,
        });
        files.push({ name: row.original_file_name, sizeBytes: size, url: null });
        continue;
      }
    }
    const { data: signed } = await admin.storage
      .from(bucket)
      .createSignedUrl(row.object_path, LINK_EXPIRES_SEC, { download: row.original_file_name });
    files.push({ name: row.original_file_name, sizeBytes: size, url: signed?.signedUrl ?? null });
  }

  return { files, attachments, missing: Math.max(0, expectedCount - rows.length) };
}

/** Same files as links only — the fallback when Resend rejects the attachments. */
export async function linkOnlyTeamEmailFiles(
  rows: EstimateFileRow[],
  expectedCount = rows.length
): Promise<TeamEmailFiles> {
  const admin = createAdminSupabaseClient();
  const files = await Promise.all(
    rows.map(async (row) => {
      const { data } = await admin.storage
        .from(row.bucket || ESTIMATE_FILES_BUCKET)
        .createSignedUrl(row.object_path, LINK_EXPIRES_SEC, { download: row.original_file_name });
      return {
        name: row.original_file_name,
        sizeBytes: Number(row.file_size_bytes) || 0,
        url: data?.signedUrl ?? null,
      };
    })
  );
  return { files, attachments: [], missing: Math.max(0, expectedCount - rows.length) };
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
