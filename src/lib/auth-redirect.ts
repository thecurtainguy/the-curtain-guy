import type { UserRole } from "@/lib/auth";

export function postLoginPath(role: UserRole | null | undefined): string {
  if (role === "owner") return "/admin";
  return "/account";
}
