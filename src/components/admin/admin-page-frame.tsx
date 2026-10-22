import type { UserProfile } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getStudioLeadsNavBadge } from "@/lib/studio-leads-admin";

export function AdminPageFrame({
  email,
  profile,
  children,
}: {
  email: string;
  profile?: Pick<UserProfile, "full_name" | "email" | "phone">;
  children: React.ReactNode;
}) {
  return (
    <AdminShell
      email={email}
      profile={profile}
      studioLeadsBadge={getStudioLeadsNavBadge()}
    >
      {children}
    </AdminShell>
  );
}
