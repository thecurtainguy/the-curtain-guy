import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StudioDesigner } from "@/components/studio/studio-designer";
import { getCurrentProfile } from "@/lib/auth";
import {
  getAdminStudioDesign,
  getCustomerStudioDesign,
  type StudioActor,
} from "@/lib/studio";

export const metadata: Metadata = {
  title: "Room design Studio",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FocusedStudioDesignPage({ params }: PageProps) {
  const [current, { id }] = await Promise.all([getCurrentProfile(), params]);
  if (!current) redirect("/account/login");

  const actor: StudioActor = {
    userId: current.user.id,
    role: current.profile.role,
    user: current.user,
  };
  const result =
    current.profile.role === "owner"
      ? await getAdminStudioDesign(actor, id)
      : await getCustomerStudioDesign(actor, id);
  if (!result.ok) notFound();

  const isOwner = current.profile.role === "owner";
  return (
    <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background p-1.5 sm:p-2">
      <div className="mx-auto mb-1.5 flex w-full max-w-[1920px] shrink-0 items-center justify-between gap-3 px-1">
        <Link
          href={isOwner ? "/admin/studio" : "/account/studio"}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to saved designs
        </Link>
        {result.design.opportunity_ref ? (
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {result.design.opportunity_ref}
          </span>
        ) : null}
      </div>
      <StudioDesigner
        initialDesignRecord={result.design}
        accessMode={isOwner ? "admin" : "customer"}
        apiBase={isOwner ? "/api/admin/studio" : "/api/account/studio"}
        className="mx-auto min-h-0 w-full max-w-[1920px] flex-1"
      />
    </div>
  );
}
