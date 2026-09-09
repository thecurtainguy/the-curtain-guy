import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  ESTIMATE_FILES_BUCKET,
  ESTIMATE_MAX_FILE_BYTES,
  ESTIMATE_MAX_FILES,
  isAllowedEstimateMimeType,
  sanitizeFileName,
  validateEstimateFileInput,
} from "@/lib/estimate-files";
import {
  countEstimateFiles,
  fetchEstimateFiles,
  type EstimateFileRow,
} from "@/lib/estimate-access";
import { getOutboundEmailCopyTo, getResendApiKey, getSiteUrl } from "@/lib/env";
import {
  isValidEmailAddress,
  parseEmailList,
} from "@/lib/quote-email-compose";
import { sendQuoteReadyEmail } from "@/lib/quote-email";
import { buildPublicQuoteUrl } from "@/lib/quote-tokens";
import {
  fetchQuoteById,
  issuePublicQuoteToken,
  logQuoteEvent,
} from "@/lib/quotes";
import type { ResendEmailAttachment } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ComposeUpload = {
  filename: string;
  contentBase64: string;
  contentType: string;
  saveToOpportunity?: boolean;
};

type ComposeBody = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  bodyText?: string;
  attachPdf?: boolean;
  opportunityFileIds?: string[];
  uploads?: ComposeUpload[];
};

async function downloadEstimateFileAttachment(
  file: EstimateFileRow
): Promise<ResendEmailAttachment | null> {
  if (file.upload_status !== "uploaded") return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(file.bucket || ESTIMATE_FILES_BUCKET)
    .download(file.object_path);
  if (error || !data) {
    console.error("[quotes] opportunity file download failed", file.id, error?.message);
    return null;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    filename: file.original_file_name || "attachment",
    content: buffer.toString("base64"),
    contentType: file.content_type || "application/octet-stream",
  };
}

async function persistUploadToOpportunity(input: {
  estimateRequestId: string;
  ownerUserId: string;
  ownerEmail: string | null;
  upload: ComposeUpload;
  bytes: Buffer;
}): Promise<string | null> {
  const validation = validateEstimateFileInput({
    originalFileName: input.upload.filename,
    contentType: input.upload.contentType,
    fileSizeBytes: input.bytes.length,
  });
  if (!validation.ok) {
    console.error("[quotes] skip save upload:", validation.message);
    return null;
  }

  const existingCount = await countEstimateFiles(input.estimateRequestId);
  if (existingCount >= ESTIMATE_MAX_FILES) {
    console.error("[quotes] opportunity file limit reached; skip save");
    return null;
  }

  const admin = createAdminSupabaseClient();
  const safeName = sanitizeFileName(input.upload.filename);
  const objectPath = `${input.estimateRequestId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from(ESTIMATE_FILES_BUCKET)
    .upload(objectPath, input.bytes, {
      contentType: input.upload.contentType,
      upsert: false,
    });
  if (uploadError) {
    console.error("[quotes] save upload failed", uploadError.message);
    return null;
  }

  const { data: row, error: insertError } = await admin
    .from("estimate_files")
    .insert({
      estimate_request_id: input.estimateRequestId,
      uploaded_by_user_id: input.ownerUserId,
      uploader_email: input.ownerEmail,
      bucket: ESTIMATE_FILES_BUCKET,
      object_path: objectPath,
      original_file_name: input.upload.filename,
      content_type: input.upload.contentType,
      file_size_bytes: input.bytes.length,
      upload_status: "uploaded",
      customer_visible: false,
      uploaded_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (insertError || !row) {
    console.error("[quotes] estimate_files insert failed", insertError?.message);
    return null;
  }
  return row.id as string;
}

export async function POST(request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const quote = await fetchQuoteById(id);
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "Quote not found." },
      { status: 404 }
    );
  }

  let compose: ComposeBody = {};
  try {
    const json = (await request.json()) as ComposeBody;
    compose = json ?? {};
  } catch {
    compose = {};
  }

  const toList = parseEmailList(compose.to ?? quote.customer_email ?? "");
  const ccList = parseEmailList(compose.cc ?? "");
  const bccList = parseEmailList(
    compose.bcc ?? getOutboundEmailCopyTo()
  );

  if (toList.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Customer email is required before sending." },
      { status: 400 }
    );
  }

  const invalid = [...toList, ...ccList, ...bccList].find(
    (email) => !isValidEmailAddress(email)
  );
  if (invalid) {
    return NextResponse.json(
      { ok: false, message: `Invalid email address: ${invalid}` },
      { status: 400 }
    );
  }

  const subject = (compose.subject ?? "").trim();
  const bodyText = (compose.bodyText ?? "").trim();
  if (!subject) {
    return NextResponse.json(
      { ok: false, message: "Subject is required." },
      { status: 400 }
    );
  }
  if (!bodyText) {
    return NextResponse.json(
      { ok: false, message: "Email body is required." },
      { status: 400 }
    );
  }

  const issued = await issuePublicQuoteToken(id);
  if (!issued) {
    return NextResponse.json(
      { ok: false, message: "Could not create public quote link." },
      { status: 500 }
    );
  }

  const publicUrl = buildPublicQuoteUrl(getSiteUrl(), issued.token);
  const now = new Date().toISOString();
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("quotes")
    .update({
      status: "sent",
      sent_at: now,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const opportunityFileIds = Array.isArray(compose.opportunityFileIds)
    ? compose.opportunityFileIds.filter((value) => typeof value === "string")
    : [];
  const uploads = Array.isArray(compose.uploads) ? compose.uploads : [];

  const extraAttachments: ResendEmailAttachment[] = [];
  const attachmentNames: string[] = [];

  if (opportunityFileIds.length > 0 && quote.estimate_request_id) {
    const files = await fetchEstimateFiles(quote.estimate_request_id, [
      "uploaded",
    ]);
    const byId = new Map(files.map((file) => [file.id, file]));
    for (const fileId of opportunityFileIds) {
      const file = byId.get(fileId);
      if (!file) continue;
      const attachment = await downloadEstimateFileAttachment(file);
      if (attachment) {
        extraAttachments.push(attachment);
        attachmentNames.push(attachment.filename);
      }
    }
  }

  for (const upload of uploads.slice(0, 5)) {
    if (!upload?.filename || !upload.contentBase64 || !upload.contentType) {
      continue;
    }
    let bytes: Buffer;
    try {
      bytes = Buffer.from(upload.contentBase64, "base64");
    } catch {
      continue;
    }
    if (bytes.length <= 0 || bytes.length > ESTIMATE_MAX_FILE_BYTES) continue;
    if (!isAllowedEstimateMimeType(upload.contentType)) continue;

    if (upload.saveToOpportunity && quote.estimate_request_id) {
      await persistUploadToOpportunity({
        estimateRequestId: quote.estimate_request_id,
        ownerUserId: owner.user.id,
        ownerEmail: owner.profile.email,
        upload,
        bytes,
      });
    }

    extraAttachments.push({
      filename: sanitizeFileName(upload.filename),
      content: bytes.toString("base64"),
      contentType: upload.contentType,
    });
    attachmentNames.push(upload.filename);
  }

  await logQuoteEvent({
    quoteId: id,
    actorType: "owner",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
    eventType: "quote_sent",
    summary: `Quote sent to ${toList.join(", ")}`,
    metadata: {
      public_token: issued.token,
      public_url: publicUrl,
      public_token_expires_at: issued.expiresAt,
      to: toList,
      cc: ccList,
      bcc: bccList,
      subject,
      attachment_names: attachmentNames,
      attach_pdf: compose.attachPdf !== false,
    },
  });

  const apiKey = getResendApiKey();
  let emailSent = false;
  if (apiKey) {
    try {
      const fresh = await fetchQuoteById(id);
      if (fresh) {
        await sendQuoteReadyEmail({
          apiKey,
          quote: fresh,
          publicQuoteUrl: publicUrl,
          compose: {
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject,
            bodyText,
            attachPdf: compose.attachPdf !== false,
            extraAttachments,
            copyOutbound: false,
          },
        });
        emailSent = true;
      }
    } catch (err) {
      console.error("[quotes] send email failed", err);
    }
  }

  return NextResponse.json({
    ok: true,
    publicUrl,
    emailSent,
    message: emailSent
      ? "Quote sent."
      : apiKey
        ? "Quote link created; email failed to send."
        : "Quote link created; Resend not configured.",
  });
}
