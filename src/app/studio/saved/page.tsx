import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function SavedStudioDesignsRedirect() {
  const current = await getCurrentProfile();
  if (!current) redirect("/account/login?next=/studio/saved");
  redirect(
    current.profile.role === "owner" ? "/admin/studio" : "/account/studio"
  );
}
