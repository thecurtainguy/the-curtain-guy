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
        "rounded-2xl border border-border/40 bg-card/25",
        padding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
