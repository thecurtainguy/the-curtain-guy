import { redirect } from "next/navigation";
import { requireCustomerOrOwner } from "@/lib/auth";

export async function requireAccountPage() {
  const current = await requireCustomerOrOwner();
  if (!current) {
    redirect("/account/login");
  }
  if (current.profile.role === "owner") {
    redirect("/admin");
  }
  return current;
}

export { isEmailVerified } from "@/lib/auth";
