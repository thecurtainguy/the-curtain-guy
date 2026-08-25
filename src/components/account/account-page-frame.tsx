import { AccountShell } from "@/components/account/account-shell";

export function AccountPageFrame({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return <AccountShell email={email}>{children}</AccountShell>;
}

export function EmailVerificationBanner({
  verified,
}: {
  verified: boolean;
}) {
  if (verified) return null;
  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      Please verify your email to view guest estimates submitted with this
      address and unlock full account features. Check your inbox for a
      confirmation link.
    </div>
  );
}
