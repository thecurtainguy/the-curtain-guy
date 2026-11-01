import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { normalizePipeDrapePlan } from "@/lib/pipe-drape";
import { getPipeDrapePlan, isPipeDrapePlanKey, savePipeDrapePlan } from "@/lib/pipe-drape-plans";

export const runtime = "nodejs";

const MAX_PLAN_BYTES = 64_000;

function forbidden() {
  return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
}

export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!isPipeDrapePlanKey(key)) {
    return NextResponse.json({ ok: false, message: "Unknown calculator layout." }, { status: 400 });
  }

  try {
    const plan = await getPipeDrapePlan(key);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load layout.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const owner = await requireOwner();
  if (!owner) return forbidden();

  const raw = await request.text();
  if (raw.length > MAX_PLAN_BYTES) {
    return NextResponse.json({ ok: false, message: "Layout is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : "";
  if (!isPipeDrapePlanKey(key)) {
    return NextResponse.json({ ok: false, message: "Unknown calculator layout." }, { status: 400 });
  }

  const plan = normalizePipeDrapePlan(body.plan);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "Add at least one run." }, { status: 400 });
  }

  const result = await savePipeDrapePlan({ key, plan, updatedBy: owner.user.id });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
