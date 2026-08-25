import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type UserRole = "owner" | "customer";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at);
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getCurrentProfile(): Promise<{
  user: User;
  profile: UserProfile;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const profile = data as UserProfile;

    if (!profile.is_active) {
      return null;
    }

    return { user, profile };
  } catch {
    return null;
  }
}

export async function requireOwner(): Promise<{
  user: User;
  profile: UserProfile;
} | null> {
  const current = await getCurrentProfile();
  if (!current) return null;
  if (!isEmailVerified(current.user)) return null;
  if (current.profile.role !== "owner") return null;
  return current;
}

export async function requireCustomerOrOwner(): Promise<{
  user: User;
  profile: UserProfile;
} | null> {
  const current = await getCurrentProfile();
  if (!current) return null;
  if (current.profile.role !== "customer" && current.profile.role !== "owner") {
    return null;
  }
  return current;
}

export function isOwnerProfile(profile: UserProfile | null | undefined): boolean {
  return Boolean(profile && profile.role === "owner" && profile.is_active);
}
