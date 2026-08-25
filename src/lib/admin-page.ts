import { redirect } from "next/navigation";
import { getCurrentProfile, requireOwner } from "@/lib/auth";

/**
 * Owner-only admin pages. Logged-in customers are silently sent to
 * the customer portal (mirror of owners hitting /account → /admin).
 */
export async function requireAdminPage() {
  const owner = await requireOwner();
  if (owner) {
    return owner;
  }

  const current = await getCurrentProfile();
  if (current?.profile.role === "customer") {
    redirect("/account");
  }

  redirect("/admin/login");
}
