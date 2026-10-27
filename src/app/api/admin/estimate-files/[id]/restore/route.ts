import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  countEstimateFiles,
  normalizeEstimateFileRow,
  type EstimateFileRow,
} from "@/lib/estimate-access";
import { ESTIMATE_MAX_FILES } from "@/lib/estimate-files";
import { logEstimateFileEvent } from "@/lib/estimate-file-events";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
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
  if (file.upload_status !== "deleted") {
    return NextResponse.json({ ok: true });
  }
  if (!file.uploaded_at) {
    return NextResponse.json(
      { ok: false, message: "This upload never finished, so there's nothing to restore." },
      { status: 400 }
    );
  }

  const activeCount = await countEstimateFiles(file.estimate_request_id);
  if (activeCount >= ESTIMATE_MAX_FILES) {
    return NextResponse.json(
      {
        ok: false,
        message: `This opportunity already has ${ESTIMATE_MAX_FILES} files. Delete one before restoring.`,
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("estimate_files")
    .update({
      upload_status: "uploaded",
      deleted_at: null,
      deleted_by_user_id: null,
    })
    .eq("id", fileId)
    .eq("upload_status", "deleted");

  if (updateError) {
    console.error("[estimate-files] Restore failed:", updateError.message);
    return NextResponse.json(
      { ok: false, message: "Could not restore the file." },
      { status: 500 }
    );
  }

  await logEstimateFileEvent({
    fileId: file.id,
    estimateRequestId: file.estimate_request_id,
    fileName: file.original_file_name,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "file_restored",
    summary: `Restored (${file.customer_visible ? "shared" : "internal"}, not attached to PDFs)`,
    metadata: { deleted_at: file.deleted_at ?? null },
  });

  return NextResponse.json({ ok: true });
}
