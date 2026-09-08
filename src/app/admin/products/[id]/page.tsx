import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminProductEditor } from "@/components/admin/admin-product-editor";
import { fetchProductById, listProducts } from "@/lib/products";
import { getAdminProductRentalsBundle } from "@/lib/rentals";

export const metadata: Metadata = {
  title: "Inventory item",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductDetailPage({ params }: PageProps) {
  const owner = await requireAdminPage();
  const { id } = await params;
  const [product, allProducts, rentalsBundle] = await Promise.all([
    fetchProductById(id),
    listProducts({ limit: 500 }),
    getAdminProductRentalsBundle(id),
  ]);
  if (!product) notFound();

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <AdminProductEditor
        product={product}
        allProducts={allProducts}
        rentalsBundle={rentalsBundle}
      />
    </AdminPageFrame>
  );
}
