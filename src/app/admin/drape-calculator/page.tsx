import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { PipeDrapeCalculatorPage } from "@/components/admin/pipe-drape/pipe-drape-calculator";

export const metadata: Metadata = {
  title: "Drape calculator",
  robots: { index: false, follow: false },
};

export default async function AdminDrapeCalculatorPage() {
  const owner = await requireAdminPage();

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <PipeDrapeCalculatorPage currency="CAD" />
    </AdminPageFrame>
  );
}
