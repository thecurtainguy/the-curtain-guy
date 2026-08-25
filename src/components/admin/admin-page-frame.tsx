import { AdminShell } from "@/components/admin/admin-shell";

export function AdminPageFrame({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return <AdminShell email={email}>{children}</AdminShell>;
}
