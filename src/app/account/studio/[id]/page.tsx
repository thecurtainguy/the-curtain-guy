import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { StudioDesigner } from "@/components/studio/studio-designer";
import { Button } from "@/components/ui/button";
import { getCustomerStudioDesign, type StudioActor } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Edit your Studio design",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AccountStudioDesignPage({ params }: PageProps) {
  const [current, { id }] = await Promise.all([requireAccountPage(), params]);
  const actor: StudioActor = {
    userId: current.user.id,
    role: "customer",
    user: current.user,
  };
  const result = await getCustomerStudioDesign(actor, id);
  if (!result.ok) notFound();
  const design = result.design;

  return (
    <AccountPageFrame email={current.profile.email}>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <EmailVerificationBanner verified={isEmailVerified(current.user)} />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/20 px-3 py-2">
          <Link
            href="/account/studio"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← Your Studio designs
          </Link>
          <div className="flex flex-wrap gap-2">
            {design.estimate_request_id ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/account/estimates/${design.estimate_request_id}`}>
                  Open estimate
                </Link>
              </Button>
            ) : null}
            {design.quote_id ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/account/quotes/${design.quote_id}`}>
                  Open quote
                </Link>
              </Button>
            ) : null}
            {design.job_id ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/account/events/${design.job_id}`}>
                  Open event
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <StudioDesigner
          initialDesignRecord={design}
          accessMode="customer"
          apiBase="/api/account/studio"
          className="min-h-0 flex-1"
        />
      </div>
    </AccountPageFrame>
  );
}
