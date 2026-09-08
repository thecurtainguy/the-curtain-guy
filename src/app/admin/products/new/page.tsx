import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminProductEditor } from "@/components/admin/admin-product-editor";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "New inventory item",
  robots: { index: false, follow: false },
};

export default async function AdminNewProductPage() {
  const owner = await requireAdminPage();
  const allProducts = await listProducts({ limit: 500 });

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <AdminProductEditor allProducts={allProducts} />
    </AdminPageFrame>
  );
}
