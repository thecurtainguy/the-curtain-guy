import type { Metadata } from "next";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
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
        <div className="border-b border-border/30 pb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
            Profile
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep your contact information current for estimate follow-up.
          </p>
        </div>
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
