import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireOwner } from "@/lib/auth";
import { AdminLoginScreen } from "@/components/admin/admin-login-screen";

export const metadata: Metadata = {
  title: "Owner sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const owner = await requireOwner();
  if (owner) {
    redirect("/admin");
  }

  const current = await getCurrentProfile();
  if (current?.profile.role === "customer") {
    redirect("/account");
  }

  return <AdminLoginScreen />;
}
