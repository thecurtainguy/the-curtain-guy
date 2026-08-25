import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { StudioDesignCard } from "@/components/studio/studio-design-card";
import { Button } from "@/components/ui/button";
import {
  listCustomerStudioDesigns,
  type StudioActor,
} from "@/lib/studio";

export const metadata: Metadata = {
  title: "Your Studio designs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  estimateId?: string;
  quoteId?: string;
  jobId?: string;
}>;

export default async function AccountStudioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [current, params] = await Promise.all([
    requireAccountPage(),
    searchParams,
  ]);
  const actor: StudioActor = {
    userId: current.user.id,
    role: "customer",
    user: current.user,
  };
  const result = await listCustomerStudioDesigns(actor, {
    limit: 200,
    estimateRequestId: params.estimateId,
    quoteId: params.quoteId,
    jobId: params.jobId,
  });
  const designs = result.ok ? result.designs : [];

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={isEmailVerified(current.user)} />
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-border/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Studio
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Your room designs
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Draw event spaces, place drape runs and a stage, and review each
              design in 3D.
            </p>
          </div>
          <Button asChild>
            <Link href="/studio/new">
              <Plus className="size-4" />
              New design
            </Link>
          </Button>
        </header>

        {!result.ok ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            Your Studio designs could not be loaded. Please try again after the
            Studio database update is available.
          </div>
        ) : designs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/20 px-6 py-14 text-center">
            <p className="font-heading text-xl font-semibold">
              No room designs yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a rectangle, L-shape, or basic custom room.
            </p>
            <Button asChild className="mt-5">
              <Link href="/studio/new">Draw your room</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {designs.map((design) => (
              <StudioDesignCard
                key={design.id}
                design={design}
                href={`/account/studio/${design.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </AccountPageFrame>
  );
}
