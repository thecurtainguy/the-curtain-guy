import { cn } from "@/lib/utils";

type AccountAuthFormCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function AccountAuthFormCard({
  children,
  className,
}: AccountAuthFormCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[min(var(--radius-4xl),24px)]",
        "border border-border/45 bg-card/55 shadow-[0_16px_48px_oklch(0_0_0/10%)]",
        "ring-1 ring-primary/10 backdrop-blur-sm",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        aria-hidden
      />
      <div className="relative px-6 py-8 sm:px-8 sm:py-9">{children}</div>
    </div>
  );
}
