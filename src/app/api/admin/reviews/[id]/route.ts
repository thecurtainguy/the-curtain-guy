import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { isReviewSubmissionStatus } from "@/data/review-submissions";
import {
  fetchReviewSubmissionById,
  updateReviewSubmission,
} from "@/lib/review-submissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json(
      { ok: false, message: "Owner access required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const existing = await fetchReviewSubmissionById(id);
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Review submission not found." },
      { status: 404 }
    );
  }

  let body: {
    status?: string;
    internalNotes?: string;
    markViewed?: boolean;
  };

  try {
    body = (await request.json()) as {
      status?: string;
      internalNotes?: string;
      markViewed?: boolean;
    };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof body.status === "string" && !isReviewSubmissionStatus(body.status)) {
    return NextResponse.json(
      { ok: false, message: "Invalid status." },
      { status: 400 }
    );
  }

  const updated = await updateReviewSubmission(id, {
    status:
      typeof body.status === "string" && isReviewSubmissionStatus(body.status)
        ? body.status
        : undefined,
    internalNotes:
      typeof body.internalNotes === "string" ? body.internalNotes : undefined,
    markViewed: body.markViewed,
  });

  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "Could not update review submission." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, review: updated });
}
