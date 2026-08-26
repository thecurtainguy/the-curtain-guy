import type { Metadata } from "next";
import Link from "next/link";
import { PanelsTopLeft, Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { AdminStudioList } from "@/components/admin/lists/admin-studio-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import {
  listAdminStudioDesigns,
  type StudioActor,
} from "@/lib/studio";

export const metadata: Metadata = {
  title: "Studio designs",
  robots: { index: false, follow: false },
};

export default async function AdminStudioPage() {
  const owner = await requireAdminPage();
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const result = await listAdminStudioDesigns(actor, {
    limit: 500,
  });
  const designs = result.ok ? result.designs : [];

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Studio"
          title="Room designs"
          description="Review customer and owner room plans, drape layouts, and generated 3D previews."
          icon={PanelsTopLeft}
          actions={
            <Button asChild>
              <Link href="/studio/new">
                <Plus className="size-4" />
                New room design
              </Link>
            </Button>
          }
        />
        <AdminStudioList
          rows={designs}
          loadError={
            result.ok
              ? null
              : "Studio designs could not be loaded. The Studio database migration may still be pending."
          }
        />
      </div>
    </AdminPageFrame>
  );
}
