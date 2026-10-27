import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  fetchEstimateById,
  normalizeEstimateFileRow,
  type EstimateFileRow,
} from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";
import {
  ESTIMATE_FILE_CAPTION_MAX,
  estimateFileKindLabel,
  isEstimateFileKind,
} from "@/data/estimate-file-kinds";
import { logEstimateFileEvent } from "@/lib/estimate-file-events";
import type { EstimateFileEventType } from "@/data/estimate-file-events";

type PatchBody = {
  customerVisible?: boolean;
  fileKind?: string;
  caption?: string | null;
  includeInQuote?: boolean;
  includeInInvoice?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!getSupabaseServerConfig()) {
    return NextResponse.json(
      { ok: false, message: "File updates are not configured." },
      { status: 503 }
    );
  }

  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const fileId = id?.trim();
  if (!fileId) {
    return NextResponse.json(
      { ok: false, message: "File id is required." },
      { status: 400 }
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  for (const key of ["customerVisible", "includeInQuote", "includeInInvoice"] as const) {
    if (key in body && typeof body[key] !== "boolean") {
      return NextResponse.json(
        { ok: false, message: `${key} must be a boolean.` },
        { status: 400 }
      );
    }
  }
  if ("fileKind" in body) {
    if (!isEstimateFileKind(body.fileKind)) {
      return NextResponse.json(
        { ok: false, message: "Unknown file type." },
        { status: 400 }
      );
    }
    update.file_kind = body.fileKind;
  }
  if ("caption" in body) {
    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    if (caption.length > ESTIMATE_FILE_CAPTION_MAX) {
      return NextResponse.json(
        { ok: false, message: `Caption is limited to ${ESTIMATE_FILE_CAPTION_MAX} characters.` },
        { status: 400 }
      );
    }
    update.caption = caption || null;
  }

  const admin = createAdminSupabaseClient();
  const { data: fileRow, error: fileError } = await admin
    .from("estimate_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (fileError || !fileRow) {
    return NextResponse.json(
      { ok: false, message: "File not found." },
      { status: 404 }
    );
  }

  const file = fileRow as EstimateFileRow;
  if (file.upload_status === "deleted") {
    return NextResponse.json(
      { ok: false, message: "This file was deleted. Restore it first." },
      { status: 409 }
    );
  }
  const estimate = await fetchEstimateById(file.estimate_request_id);
  if (!estimate) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  const customerVisible =
    typeof body.customerVisible === "boolean"
      ? body.customerVisible
      : file.customer_visible !== false;
  if (
    !customerVisible &&
    (body.includeInQuote === true || body.includeInInvoice === true)
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "Internal files can't be attached to quotes or invoices. Share the file first.",
      },
      { status: 400 }
    );
  }
  if (typeof body.customerVisible === "boolean") {
    update.customer_visible = body.customerVisible;
  }
  if (typeof body.includeInQuote === "boolean") {
    update.include_in_quote = body.includeInQuote;
  }
  if (typeof body.includeInInvoice === "boolean") {
    update.include_in_invoice = body.includeInInvoice;
  }
  if (!customerVisible) {
    update.include_in_quote = false;
    update.include_in_invoice = false;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, message: "Nothing to update." },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("estimate_files")
    .update(update)
    .eq("id", fileId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error(
      "[estimate-files] Update failed:",
      updateError?.message
    );
    return NextResponse.json(
      { ok: false, message: "Could not update the file." },
      { status: 500 }
    );
  }

  const before = normalizeEstimateFileRow(file);
  const row = normalizeEstimateFileRow(updated as EstimateFileRow);
  await logFileChanges({
    before,
    after: row,
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
  });

  return NextResponse.json({
    ok: true,
    file: {
      id: row.id,
      customer_visible: row.customer_visible,
      file_kind: row.file_kind,
      caption: row.caption,
      include_in_quote: row.include_in_quote,
      include_in_invoice: row.include_in_invoice,
    },
  });
}

type FileChange = {
  type: EstimateFileEventType;
  summary: string;
  metadata?: Record<string, unknown>;
};

async function logFileChanges(input: {
  before: EstimateFileRow;
  after: EstimateFileRow;
  actorUserId: string;
  actorEmail: string | null;
}) {
  const { before, after } = input;
  const changes: FileChange[] = [];

  if (before.customer_visible !== after.customer_visible) {
    if (after.customer_visible) {
      changes.push({ type: "file_shared", summary: "Shared with the customer" });
    } else {
      const removedFrom = [
        before.include_in_quote ? "quote" : null,
        before.include_in_invoice ? "invoice" : null,
      ].filter(Boolean);
      changes.push({
        type: "file_made_internal",
        summary: removedFrom.length
          ? `Made internal (removed from the ${removedFrom.join(" and ")} PDF)`
          : "Made internal",
        metadata: { removed_from: removedFrom },
      });
    }
  }
  if (before.file_kind !== after.file_kind) {
    changes.push({
      type: "file_kind_changed",
      summary: `Type changed: ${estimateFileKindLabel(before.file_kind)} → ${estimateFileKindLabel(after.file_kind)}`,
      metadata: { from: before.file_kind, to: after.file_kind },
    });
  }
  if ((before.caption ?? null) !== (after.caption ?? null)) {
    changes.push({
      type: "file_caption_changed",
      summary: after.caption ? `Caption set: “${after.caption}”` : "Caption removed",
      metadata: { from: before.caption, to: after.caption },
    });
  }
  // Detachments caused by making the file internal are covered above.
  const visibilityDetach = before.customer_visible && !after.customer_visible;
  if (before.include_in_quote !== after.include_in_quote && !visibilityDetach) {
    changes.push(
      after.include_in_quote
        ? { type: "file_attached_quote", summary: "Attached to the quote PDF" }
        : { type: "file_detached_quote", summary: "Removed from the quote PDF" }
    );
  }
  if (before.include_in_invoice !== after.include_in_invoice && !visibilityDetach) {
    changes.push(
      after.include_in_invoice
        ? { type: "file_attached_invoice", summary: "Attached to the invoice PDF" }
        : { type: "file_detached_invoice", summary: "Removed from the invoice PDF" }
    );
  }

  for (const change of changes) {
    await logEstimateFileEvent({
      fileId: after.id,
      estimateRequestId: after.estimate_request_id,
      fileName: after.original_file_name,
      actorType: "owner",
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      eventType: change.type,
      summary: change.summary,
      metadata: change.metadata,
    });
  }
}

/** Soft delete: hidden everywhere, detached from PDFs, storage object kept for restore. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!getSupabaseServerConfig()) {
    return NextResponse.json(
      { ok: false, message: "File updates are not configured." },
      { status: 503 }
    );
  }

  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const fileId = id?.trim();
  if (!fileId) {
    return NextResponse.json(
      { ok: false, message: "File id is required." },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: fileRow, error: fileError } = await admin
    .from("estimate_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (fileError || !fileRow) {
    return NextResponse.json(
      { ok: false, message: "File not found." },
      { status: 404 }
    );
  }

  const file = normalizeEstimateFileRow(fileRow as EstimateFileRow);
  if (file.upload_status === "deleted") {
    return NextResponse.json({ ok: true });
  }
  if (file.upload_status !== "uploaded" && file.upload_status !== "pending") {
    return NextResponse.json(
      { ok: false, message: "This file can't be deleted." },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("estimate_files")
    .update({
      upload_status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: owner.user.id,
      include_in_quote: false,
      include_in_invoice: false,
    })
    .eq("id", fileId)
    .in("upload_status", ["uploaded", "pending"]);

  if (updateError) {
    console.error("[estimate-files] Delete failed:", updateError.message);
    return NextResponse.json(
      { ok: false, message: "Could not delete the file." },
      { status: 500 }
    );
  }

  const detachedFrom = [
    file.include_in_quote ? "quote" : null,
    file.include_in_invoice ? "invoice" : null,
  ].filter(Boolean);
  await logEstimateFileEvent({
    fileId: file.id,
    estimateRequestId: file.estimate_request_id,
    fileName: file.original_file_name,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "file_deleted",
    summary: detachedFrom.length
      ? `Deleted (removed from the ${detachedFrom.join(" and ")} PDF)`
      : `Deleted (${file.customer_visible ? "shared" : "internal"} file)`,
    metadata: {
      previous_status: file.upload_status,
      customer_visible: file.customer_visible,
      file_kind: file.file_kind,
      detached_from: detachedFrom,
    },
  });

  return NextResponse.json({ ok: true });
}
