import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/business-settings";
import { buildPortalInviteEmail, sendPortalInviteEmail } from "@/lib/customer-email";
import { fetchCustomerById, markPortalInvited } from "@/lib/customers";
import { getResendApiKey } from "@/lib/env";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

/** Preview of the invitation email (no send). */
export async function GET(_request: Request, context: RouteContext) {
  if (!(await requireOwner())) return forbidden();
  const { id } = await context.params;
  const customer = await fetchCustomerById(id);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  const email = await buildPortalInviteEmail({ customer, settings: await getBusinessSettings() });
  return NextResponse.json({ ok: true, ...email, to: customer.primary_email });
}

export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) return forbidden();
  const { id } = await context.params;
  const customer = await fetchCustomerById(id);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Customer not found." }, { status: 404 });
  }
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "Email sending is not configured." }, { status: 500 });
  }
  try {
    const { url } = await sendPortalInviteEmail({
      apiKey,
      customer,
      settings: await getBusinessSettings(),
    });
    await markPortalInvited(id, { userId: owner.user.id }, customer.primary_email);
    return NextResponse.json({ ok: true, url, message: `Invitation sent to ${customer.primary_email}.` });
  } catch (error) {
    console.error("[customers] invite", error);
    return NextResponse.json({ ok: false, message: "Could not send the invitation." }, { status: 500 });
  }
}
