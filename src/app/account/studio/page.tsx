import type { Metadata } from "next";
import Link from "next/link";
import { PanelsTopLeft, Plus } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { AccountStudioList } from "@/components/admin/lists/admin-studio-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";
import {
  listCustomerStudioDesigns,
  type StudioActor,
} from "@/lib/studio";

export const metadata: Metadata = {
  title: "Your Studio designs",
  robots: { index: false, follow: false },
};

export default async function AccountStudioPage() {
  const current = await requireAccountPage();
  const actor: StudioActor = {
    userId: current.user.id,
    role: "customer",
    user: current.user,
  };
  const result = await listCustomerStudioDesigns(actor, {
    limit: 500,
  });
  const designs = result.ok ? result.designs : [];

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={isEmailVerified(current.user)} />
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Studio"
          title="Your room designs"
          description="Draw event spaces, place drape runs and a stage, and review each design in 3D."
          icon={PanelsTopLeft}
          actions={
            <Button asChild>
              <Link href="/studio/new">
                <Plus className="size-4" />
                New design
              </Link>
            </Button>
          }
        />
        <AccountStudioList
          rows={designs}
          loadError={
            result.ok
              ? null
              : "Your Studio designs could not be loaded. Please try again after the Studio database update is available."
          }
        />
      </div>
    </AccountPageFrame>
  );
}
