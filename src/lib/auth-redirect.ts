import type { UserRole } from "@/lib/auth";

export function postLoginPath(role: UserRole | null | undefined): string {
  if (role === "owner") return "/admin";
  return "/account";
}

export function safeNextPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const url = new URL(value, "https://thecurtainguy.local");
    if (url.origin !== "https://thecurtainguy.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
