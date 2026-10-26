import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchCustomerById } from "@/lib/customers";
import { createDirectInvoice, createInvoiceFromJob, type DirectInvoiceInput } from "@/lib/invoices";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Create an invoice from the admin: for a customer (direct) or for one of their jobs. */
export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as (DirectInvoiceInput & { jobId?: string | null }) | null;
  if (!body || typeof body !== "object" || typeof body.customerId !== "string") {
    return NextResponse.json({ ok: false, message: "Pick a customer first." }, { status: 400 });
  }
  const customer = await fetchCustomerById(body.customerId);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }

  if (typeof body.jobId === "string" && body.jobId) {
    const admin = createAdminSupabaseClient();
    const { data: job } = await admin
      .from("event_jobs")
      .select("id, customer_id")
      .eq("id", body.jobId)
      .maybeSingle();
    if (!job || job.customer_id !== customer.id) {
      return NextResponse.json({ ok: false, message: "That job belongs to a different customer." }, { status: 400 });
    }
    try {
      const created = await createInvoiceFromJob(body.jobId, owner.user.id);
      return NextResponse.json({ ok: true, ...created });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Could not create invoice." },
        { status: 400 }
      );
    }
  }

  const result = await createDirectInvoice(body, owner.user.id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
