import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminProductEditor } from "@/components/admin/admin-product-editor";
import { listProductCategoriesWithCounts } from "@/lib/product-categories";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "New inventory item",
  robots: { index: false, follow: false },
};

export default async function AdminNewProductPage() {
  const owner = await requireAdminPage();
  const [allProducts, categories] = await Promise.all([
    listProducts({ limit: 500 }),
    listProductCategoriesWithCounts(),
  ]);

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <AdminProductEditor
        allProducts={allProducts}
        initialCategories={categories}
      />
    </AdminPageFrame>
  );
}
