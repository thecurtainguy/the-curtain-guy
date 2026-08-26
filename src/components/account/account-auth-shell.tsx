import { AccountAuthShowcase } from "@/components/account/account-auth-showcase";
import { AccountAuthFormCard } from "@/components/account/account-auth-form-card";
import { cn } from "@/lib/utils";

type AccountAuthShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AccountAuthShell({ children, className }: AccountAuthShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] flex-1 flex-col bg-background",
        "sm:min-h-[calc(100dvh-4.25rem-env(safe-area-inset-top,0px))]",
        "lg:min-h-[calc(100svh-4.25rem)]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,oklch(0.76_0.15_88/0.1),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_100%,oklch(0.76_0.15_88/0.08),transparent_45%)]" />

      <div className="relative grid min-h-0 flex-1 lg:grid-cols-2 lg:grid-rows-1">
        <div
          className={cn(
            "order-1 flex min-h-0 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12 lg:order-1 lg:h-full lg:px-10 lg:py-12 xl:px-16",
            className
          )}
        >
          <AccountAuthFormCard className="w-full max-w-md">{children}</AccountAuthFormCard>
        </div>

        <div className="order-2 flex min-h-0 flex-col px-4 pb-10 pt-2 sm:px-6 sm:pb-12 lg:order-2 lg:h-full lg:min-h-0 lg:p-0">
          <AccountAuthShowcase />
        </div>
      </div>
    </div>
  );
}
