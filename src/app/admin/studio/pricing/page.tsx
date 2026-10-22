import type { Metadata } from "next";
import Link from "next/link";
import { PanelsTopLeft, Tags } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  StudioPricingManager,
  type StudioPricingProductOption,
} from "@/components/admin/studio-quote/studio-pricing-manager";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import { resolveProductCategoryLabel } from "@/data/product-categories";
import { listProductCategories } from "@/lib/product-categories";
import { listProducts } from "@/lib/products";
import {
  STUDIO_MAPPING_CATALOG,
  listStudioProductMappings,
} from "@/lib/studio-product-mappings";

export const metadata: Metadata = {
  title: "Studio pricing",
  robots: { index: false, follow: false },
};

export default async function AdminStudioPricingPage() {
  const owner = await requireAdminPage();
  const [mappings, products, categories] = await Promise.all([
    listStudioProductMappings(),
    listProducts({ limit: 500 }),
    listProductCategories(),
  ]);

  const productOptions: StudioPricingProductOption[] = products.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    kind: row.kind,
    categoryLabel: resolveProductCategoryLabel(String(row.category), categories),
    unitLabel: row.unit_label,
    priceCents: row.default_unit_price_cents,
    imageUrl: row.image_url,
    isActive: row.is_active,
    linearFt: row.configurator_mode === "linear_ft",
  }));

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Studio"
          title="Studio pricing"
          description="Link each Studio option to a catalog product. “Build quote” prices designs from these links — anything left unlinked lands on the quote as “Not priced yet”."
          icon={Tags}
          backHref="/admin/studio"
          backLabel="Studio leads"
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/products">
                <PanelsTopLeft className="size-4" />
                Inventory
              </Link>
            </Button>
          }
        />
        <StudioPricingManager
          catalog={[...STUDIO_MAPPING_CATALOG]}
          mappings={mappings}
          products={productOptions}
        />
      </div>
    </AdminPageFrame>
  );
}
