import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  canManageEstimateUploads,
  fetchEstimateById,
  type EstimateFileRow,
} from "@/lib/estimate-access";
import { ESTIMATE_FILES_BUCKET } from "@/lib/estimate-files";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";

type CompleteBody = {
  estimateFileId?: string;
  uploadToken?: string;
};

export async function POST(request: NextRequest) {
  if (!getSupabaseServerConfig()) {
    return NextResponse.json(
      { ok: false, message: "File uploads are not configured." },
      { status: 503 }
    );
  }

  let body: CompleteBody;

  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const estimateFileId = body.estimateFileId?.trim();
  const uploadToken = body.uploadToken?.trim() || null;

  if (!estimateFileId) {
    return NextResponse.json(
      { ok: false, message: "File id is required." },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: fileRow, error: fileError } = await admin
    .from("estimate_files")
    .select("*")
    .eq("id", estimateFileId)
    .maybeSingle();

  if (fileError || !fileRow) {
    return NextResponse.json(
      { ok: false, message: "File record not found." },
      { status: 404 }
    );
  }

  const file = fileRow as EstimateFileRow;
  const estimate = await fetchEstimateById(file.estimate_request_id);

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
      { ok: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  if (file.upload_status === "uploaded") {
    return NextResponse.json({ ok: true, estimateFileId: file.id });
  }

  const { data: signedCheck, error: checkError } = await admin.storage
    .from(file.bucket || ESTIMATE_FILES_BUCKET)
    .createSignedUrl(file.object_path, 10);

  if (checkError || !signedCheck?.signedUrl) {
    console.error(
      "[estimate-files] Object missing after upload:",
      checkError?.message
    );
    return NextResponse.json(
      {
        ok: false,
        message: "Upload not found in storage. Please try again.",
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("estimate_files")
    .update({
      upload_status: "uploaded",
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", file.id);

  if (updateError) {
    console.error("[estimate-files] Complete update failed:", updateError.message);
    return NextResponse.json(
      { ok: false, message: "Could not finalize upload." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, estimateFileId: file.id });
}
