import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";

export async function requireAdminPage() {
  const owner = await requireOwner();
  if (!owner) {
    redirect("/admin/login");
  }
  return owner;
}
