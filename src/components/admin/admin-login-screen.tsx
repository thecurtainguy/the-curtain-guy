import { Suspense } from "react";
import { AccountAuthBrandHeader } from "@/components/account/account-auth-brand-header";
import { AccountAuthShell } from "@/components/account/account-auth-shell";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export function AdminLoginScreen() {
  return (
    <AccountAuthShell>
      <AccountAuthBrandHeader label="Owner access" />
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Internal dashboard for The Curtain Guy estimate requests.
      </p>
      <div className="mt-8">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading…</p>
          }
        >
          <AdminLoginForm />
        </Suspense>
      </div>
    </AccountAuthShell>
  );
}
