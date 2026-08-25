import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  fetchEstimateById,
  type EstimateFileRow,
} from "@/lib/estimate-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseServerConfig } from "@/lib/env";

type PatchBody = {
  customerVisible?: boolean;
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

  if (typeof body.customerVisible !== "boolean") {
    return NextResponse.json(
      { ok: false, message: "customerVisible must be a boolean." },
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

  const file = fileRow as EstimateFileRow;
  const estimate = await fetchEstimateById(file.estimate_request_id);
  if (!estimate) {
    return NextResponse.json(
      { ok: false, message: "Estimate not found." },
      { status: 404 }
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("estimate_files")
    .update({ customer_visible: body.customerVisible })
    .eq("id", fileId)
    .select("id, customer_visible")
    .single();

  if (updateError || !updated) {
    console.error(
      "[estimate-files] Visibility update failed:",
      updateError?.message
    );
    return NextResponse.json(
      { ok: false, message: "Could not update file visibility." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    file: {
      id: updated.id,
      customer_visible: updated.customer_visible !== false,
    },
  });
}
