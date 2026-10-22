import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile, isEmailVerified } from "@/lib/auth";
import {
  STUDIO_LINKED_COOKIE,
  STUDIO_VISITOR_COOKIE,
  linkStudioLeadsToAccount,
  readStudioVisitorId,
  studioLinkedCookieOptions,
} from "@/lib/studio-leads-server";

export async function GET(request: NextRequest) {
  const current = await getCurrentProfile();

  if (!current) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      role: null,
      email: null,
      emailVerified: false,
    });
  }

  const emailVerified = isEmailVerified(current.user);
  const response = NextResponse.json({
    ok: true,
    authenticated: true,
    role: current.profile.role,
    email: current.profile.email,
    emailVerified,
  });

  // Login, signup and the site header all call this route, so it is the one
  // hook every new session passes through. Studio rows saved anonymously are
  // attached here; the marker cookie keeps repeat page loads cheap.
  if (current.profile.role === "customer" && emailVerified) {
    const visitorId = readStudioVisitorId(request.cookies);
    const marker = request.cookies.get(STUDIO_LINKED_COOKIE)?.value;
    if (visitorId || marker !== current.user.id) {
      try {
        await linkStudioLeadsToAccount({
          userId: current.user.id,
          email: current.user.email,
          visitorId,
        });
        response.cookies.set(
          STUDIO_LINKED_COOKIE,
          current.user.id,
          studioLinkedCookieOptions()
        );
        if (visitorId) response.cookies.delete(STUDIO_VISITOR_COOKIE);
      } catch {
        console.error("[account] Studio lead linking failed");
      }
    }
  }

  return response;
}
