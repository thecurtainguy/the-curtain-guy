import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { AccountProfileForm } from "@/components/account/account-profile-form";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function AccountProfilePage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Profile"
          title="Profile"
          description="Keep your contact information current for estimate follow-up."
          icon={UserRound}
        />
        <div className="max-w-xl rounded-2xl border border-border/40 bg-card/25 p-6">
          <AccountProfileForm
            email={current.profile.email}
            initialFullName={current.profile.full_name ?? ""}
            initialPhone={current.profile.phone ?? ""}
          />
        </div>
      </div>
    </AccountPageFrame>
  );
}
