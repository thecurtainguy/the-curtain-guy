import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import {
  downloadPaymentDocument,
  getBusinessSettings,
  removePaymentDocument,
  uploadPaymentDocument,
} from "@/lib/business-settings";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Owner access required." },
    { status: 403 }
  );
}

export async function GET() {
  if (!(await requireOwner())) return forbidden();
  const settings = await getBusinessSettings();
  if (!settings.payment_document_path) {
    return NextResponse.json({ ok: false, message: "No payment document uploaded." }, { status: 404 });
  }
  const bytes = await downloadPaymentDocument(settings.payment_document_path);
  if (!bytes) {
    return NextResponse.json({ ok: false, message: "Could not load the document." }, { status: 502 });
  }
  const fileName = (settings.payment_document_name || "payment-document.pdf").replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Choose a PDF to upload." }, { status: 400 });
  }
  const result = await uploadPaymentDocument({
    bytes: new Uint8Array(await file.arrayBuffer()),
    fileName: file.name || "payment-document.pdf",
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, settings: result.settings });
}

export async function DELETE() {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const result = await removePaymentDocument({
    actorUserId: owner.user.id,
    actorEmail: owner.profile.email,
  });
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, settings: result.settings });
}
