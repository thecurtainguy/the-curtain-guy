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
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Profile
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">
            Your details
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep your contact information current for estimate follow-up.
          </p>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/25 p-6">
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
