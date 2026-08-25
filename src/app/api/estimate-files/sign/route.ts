import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  canManageEstimateUploads,
  countEstimateFiles,
  fetchEstimateById,
} from "@/lib/estimate-access";
import {
  buildEstimateObjectPath,
  ESTIMATE_FILES_BUCKET,
  ESTIMATE_MAX_FILES,
  validateEstimateFileInput,
} from "@/lib/estimate-files";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";

type SignBody = {
  estimateRequestId?: string;
  uploadToken?: string;
  originalFileName?: string;
  contentType?: string;
  fileSizeBytes?: number;
};

export async function POST(request: NextRequest) {
  if (!getSupabaseServerConfig()) {
    return NextResponse.json(
      { ok: false, message: "File uploads are not configured." },
      { status: 503 }
    );
  }

  let body: SignBody;

  try {
    body = (await request.json()) as SignBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const estimateRequestId = body.estimateRequestId?.trim();
  const originalFileName = body.originalFileName?.trim() ?? "";
  const contentType = body.contentType?.trim() ?? "";
  const fileSizeBytes = body.fileSizeBytes ?? 0;
  const uploadToken = body.uploadToken?.trim() || null;

  if (!estimateRequestId) {
    return NextResponse.json(
      { ok: false, message: "Estimate id is required." },
      { status: 400 }
    );
  }

  const validation = validateEstimateFileInput({
    originalFileName,
    contentType,
    fileSizeBytes,
  });

  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, message: validation.message },
      { status: 400 }
    );
  }

  const estimate = await fetchEstimateById(estimateRequestId);
  if (!estimate) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  const current = await getCurrentProfile();
  const allowed = canManageEstimateUploads({
    estimate,
    user: current?.user ?? null,
    profile: current?.profile ?? null,
    uploadToken,
  });

  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Not authorized to upload files for this estimate." },
      { status: 403 }
    );
  }

  const existingCount = await countEstimateFiles(estimateRequestId);
  if (existingCount >= ESTIMATE_MAX_FILES) {
    return NextResponse.json(
      {
        ok: false,
        message: `Maximum of ${ESTIMATE_MAX_FILES} files per estimate.`,
      },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const fileId = crypto.randomUUID();
  const objectPath = buildEstimateObjectPath({
    estimateId: estimateRequestId,
    fileId,
    originalFileName,
  });

  const { data: inserted, error: insertError } = await admin
    .from("estimate_files")
    .insert({
      id: fileId,
      estimate_request_id: estimateRequestId,
      uploaded_by_user_id: current?.user.id ?? null,
      uploader_email:
        current?.user.email ?? estimate.customer_email ?? null,
      bucket: ESTIMATE_FILES_BUCKET,
      object_path: objectPath,
      original_file_name: originalFileName,
      content_type: contentType,
      file_size_bytes: fileSizeBytes,
      upload_status: "pending",
    })
    .select("id, object_path, bucket")
    .single();

  if (insertError || !inserted) {
    console.error("[estimate-files] Insert pending failed:", insertError?.message);
    return NextResponse.json(
      { ok: false, message: "Could not prepare file upload." },
      { status: 500 }
    );
  }

  const { data: signed, error: signError } = await admin.storage
    .from(ESTIMATE_FILES_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (signError || !signed) {
    await admin
      .from("estimate_files")
      .update({ upload_status: "rejected" })
      .eq("id", fileId);
    console.error("[estimate-files] Signed upload URL failed:", signError?.message);
    return NextResponse.json(
      { ok: false, message: "Could not create upload URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    estimateFileId: inserted.id,
    bucket: inserted.bucket,
    objectPath: inserted.object_path,
    signedUrl: signed.signedUrl,
    token: signed.token,
    path: signed.path,
  });
}
