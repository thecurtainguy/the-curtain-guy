import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  canManageEventPlan,
  fetchEventPlanById,
  parseEventPlanBrief,
  parseEventPlanDesign,
  toCustomerSafeEventPlan,
} from "@/lib/event-plan-access";
import {
  parseEventPlanPayload,
  updateEventPlanSubmission,
  validateEventPlanSubmission,
} from "@/lib/event-builder/event-plan-server";
import { normalizeStudioDesign } from "@/data/studio";
import { getSupabaseServerConfig } from "@/lib/env";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const plan = await fetchEventPlanById(id);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!canManageEventPlan({ plan, user, profile: profile?.profile ?? null })) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const brief = parseEventPlanBrief(plan);
  const design = parseEventPlanDesign(plan);
  if (!brief || !design) {
    return NextResponse.json(
      { ok: false, message: "Invalid stored event plan." },
      { status: 500 }
    );
  }

  const isOwner = profile?.profile.role === "owner";

  return NextResponse.json({
    ok: true,
    plan: isOwner ? plan : toCustomerSafeEventPlan(plan),
    brief,
    design,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const plan = await fetchEventPlanById(id);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  if (!canManageEventPlan({ plan, user, profile: profile?.profile ?? null })) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseEventPlanPayload(payload);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, message: "Invalid event plan payload." },
      { status: 400 }
    );
  }

  const validation = validateEventPlanSubmission(parsed);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        message: validation.message ?? "Validation failed.",
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 }
    );
  }

  const config = getSupabaseServerConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, message: "Server configuration error." },
      { status: 503 }
    );
  }

  const normalizedDesign = normalizeStudioDesign(parsed.design);
  const updateResult = await updateEventPlanSubmission(config, id, {
    ...parsed,
    design: normalizedDesign,
  });

  if (!updateResult.ok) {
    return NextResponse.json(
      { ok: false, message: updateResult.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: updateResult.id,
    reference: updateResult.reference,
    message: "Your event plan was updated successfully.",
  });
}
