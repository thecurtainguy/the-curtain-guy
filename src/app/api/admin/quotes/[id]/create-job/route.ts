import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getResendApiKey } from "@/lib/env";
import { sendJobConfirmedEmail } from "@/lib/job-email";
import { createJobFromQuote, getAdminJob } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id: quoteId } = await context.params;

  try {
    const result = await createJobFromQuote(quoteId, owner.user.id);

    let emailSent = false;
    if (result.created) {
      const apiKey = getResendApiKey();
      const job = await getAdminJob(result.jobId);
      if (apiKey && job?.customer_email) {
        try {
          await sendJobConfirmedEmail({ apiKey, job });
          emailSent = true;
        } catch (err) {
          console.error("[jobs] confirmation email failed", err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      jobId: result.jobId,
      created: result.created,
      emailSent,
      message: result.created
        ? "Job created from accepted quote."
        : "Job already exists for this quote.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create job.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
