import { cn } from "@/lib/utils";

export function PortalCard({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm",
        padding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
