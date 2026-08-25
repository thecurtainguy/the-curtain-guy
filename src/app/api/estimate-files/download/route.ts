import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, isOwnerProfile } from "@/lib/auth";
import {
  customerCanAccessEstimate,
  fetchEstimateById,
  type EstimateFileRow,
} from "@/lib/estimate-access";
import {
  ESTIMATE_FILES_BUCKET,
  SIGNED_READ_URL_EXPIRES_SEC,
} from "@/lib/estimate-files";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (!getSupabaseServerConfig()) {
    return NextResponse.json(
      { ok: false, message: "Downloads are not configured." },
      { status: 503 }
    );
  }

  const fileId = request.nextUrl.searchParams.get("fileId")?.trim();
  if (!fileId) {
    return NextResponse.json(
      { ok: false, message: "fileId is required." },
      { status: 400 }
    );
  }

  const current = await getCurrentProfile();
  if (!current) {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: fileRow, error } = await admin
    .from("estimate_files")
    .select("*")
    .eq("id", fileId)
    .maybeSingle();

  if (error || !fileRow) {
    return NextResponse.json(
      { ok: false, message: "File not found." },
      { status: 404 }
    );
  }

  const file = fileRow as EstimateFileRow;

  if (file.upload_status !== "uploaded") {
    return NextResponse.json(
      { ok: false, message: "File is not available." },
      { status: 400 }
    );
  }

  const estimate = await fetchEstimateById(file.estimate_request_id);
  if (!estimate) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  const isOwner = isOwnerProfile(current.profile);
  const isCustomer = customerCanAccessEstimate(estimate, current.user);

  if (!isOwner && !isCustomer) {
    return NextResponse.json(
      { ok: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  const { data: signed, error: signError } = await admin.storage
    .from(file.bucket || ESTIMATE_FILES_BUCKET)
    .createSignedUrl(file.object_path, SIGNED_READ_URL_EXPIRES_SEC);

  if (signError || !signed?.signedUrl) {
    console.error("[estimate-files] Signed read URL failed:", signError?.message);
    return NextResponse.json(
      { ok: false, message: "Could not create download link." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    url: signed.signedUrl,
    expiresIn: SIGNED_READ_URL_EXPIRES_SEC,
    fileName: file.original_file_name,
    contentType: file.content_type,
  });
}
