import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared portal/list back control — pill with icon badge.
 * Use for “All quotes”, “Your estimates”, etc. across admin + account.
 */
export function PortalBackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground shadow-sm transition-[color,background-color,border-color] duration-150 hover:border-primary/40 hover:bg-primary/[0.06] hover:text-foreground",
        className
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/25 transition-colors group-hover:bg-primary/18">
        <ChevronLeft className="size-3.5" aria-hidden />
      </span>
      <span className="truncate font-medium">{children}</span>
    </Link>
  );
}
