import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { StudioDesigner } from "@/components/studio/studio-designer";
import { Button } from "@/components/ui/button";
import { getAdminStudioDesign, type StudioActor } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Edit Studio design",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStudioDesignPage({ params }: PageProps) {
  const [owner, { id }] = await Promise.all([requireAdminPage(), params]);
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const result = await getAdminStudioDesign(actor, id);
  if (!result.ok) notFound();
  const design = result.design;

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/20 px-3 py-2">
          <Link
            href="/admin/studio"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← All Studio designs
          </Link>
          <div className="flex flex-wrap gap-2">
            {design.estimate_request_id ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/estimates/${design.estimate_request_id}`}>
                  Open estimate
                </Link>
              </Button>
            ) : null}
            {design.quote_id ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/quotes/${design.quote_id}`}>Open quote</Link>
              </Button>
            ) : null}
            {design.job_id ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/jobs/${design.job_id}`}>Open job</Link>
              </Button>
            ) : null}
          </div>
        </div>
        <StudioDesigner
          initialDesignRecord={design}
          accessMode="admin"
          apiBase="/api/admin/studio"
          className="min-h-0 flex-1"
        />
      </div>
    </AdminPageFrame>
  );
}
