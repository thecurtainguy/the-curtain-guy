import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import { StudioDesignCard } from "@/components/studio/studio-design-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listAdminStudioDesigns,
  type StudioActor,
} from "@/lib/studio";
import {
  STUDIO_STATUSES,
  type StudioDesignStatus,
} from "@/data/studio";

export const metadata: Metadata = {
  title: "Studio designs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  estimateId?: string;
  quoteId?: string;
  jobId?: string;
}>;

export default async function AdminStudioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [owner, params] = await Promise.all([
    requireAdminPage(),
    searchParams,
  ]);
  const actor: StudioActor = {
    userId: owner.user.id,
    role: "owner",
    user: owner.user,
  };
  const status = STUDIO_STATUSES.includes(params.status as StudioDesignStatus)
    ? (params.status as StudioDesignStatus)
    : null;
  const result = await listAdminStudioDesigns(actor, {
    search: params.q?.trim() || undefined,
    status,
    limit: 200,
    estimateRequestId: params.estimateId,
    quoteId: params.quoteId,
    jobId: params.jobId,
  });
  const designs = result.ok ? result.designs : [];

  return (
    <AdminPageFrame email={owner.profile.email}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-border/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Studio
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Room designs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review customer and owner room plans, drape layouts, and generated
              3D previews.
            </p>
          </div>
          <Button asChild>
            <Link href="/studio/new">
              <Plus className="size-4" />
              New room design
            </Link>
          </Button>
        </header>

        <form className="grid gap-3 rounded-2xl border border-border/40 bg-card/20 p-4 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-end">
          {params.estimateId ? (
            <input type="hidden" name="estimateId" value={params.estimateId} />
          ) : null}
          {params.quoteId ? (
            <input type="hidden" name="quoteId" value={params.quoteId} />
          ) : null}
          {params.jobId ? (
            <input type="hidden" name="jobId" value={params.jobId} />
          ) : null}
          <div className="space-y-2">
            <label htmlFor="studio-q" className="text-xs text-muted-foreground">
              Search title, reference, customer, or venue
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="studio-q"
                name="q"
                defaultValue={params.q}
                className="pl-9"
                placeholder="Ballroom or TCG-10001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="studio-status"
              className="text-xs text-muted-foreground"
            >
              Status
            </label>
            <select
              id="studio-status"
              name="status"
              defaultValue={status ?? ""}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">All designs</option>
              {STUDIO_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Filter</Button>
        </form>

        {!result.ok ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            Studio designs could not be loaded. The Studio database migration
            may still be pending.
          </div>
        ) : designs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/20 px-6 py-14 text-center">
            <p className="font-heading text-xl font-semibold">
              No room designs yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start a design here or create one from an estimate or job.
            </p>
            <Button asChild className="mt-5">
              <Link href="/studio/new">Create room design</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {designs.map((design) => (
              <StudioDesignCard
                key={design.id}
                design={design}
                href={`/admin/studio/${design.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </AdminPageFrame>
  );
}
