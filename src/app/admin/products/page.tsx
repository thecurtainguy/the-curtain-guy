import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminProductsList,
  type AdminProductListRow,
} from "@/components/admin/lists/admin-products-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/products";
import { mapProductsCompleteness } from "@/lib/rentals";

export const metadata: Metadata = {
  title: "Inventory",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  const owner = await requireAdminPage();
  const products = await listProducts({ limit: 500 });
  const completenessById = await mapProductsCompleteness(products);

  const listRows: AdminProductListRow[] = products.map((row) => {
    const completeness = completenessById.get(row.id);
    const readyForPublic = completeness?.readyForPublic ?? false;
    const missingSetup = (completeness?.issues || [])
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);

    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      kind: row.kind,
      category: row.category,
      default_unit_price_cents: row.default_unit_price_cents,
      quantity_on_hand: row.quantity_on_hand,
      availability_status: row.availability_status,
      is_active: row.is_active,
      is_public: row.is_public,
      ready_for_public: readyForPublic,
      missing_setup: missingSetup,
      image_url: row.image_url,
      image_alt: row.image_alt,
      unit_label: row.unit_label,
      created_at: row.created_at,
    };
  });

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Inventory"
          title="Inventory"
          description="Products and services you can pull into quotes — with photos, pricing, and stock."
          icon={Package}
          actions={
            <Button asChild>
              <Link href="/admin/products/new">Add item</Link>
            </Button>
          }
        />
        <AdminProductsList rows={listRows} />
      </div>
    </AdminPageFrame>
  );
}
