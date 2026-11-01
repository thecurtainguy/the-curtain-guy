import NextLink from "next/link";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NON_LOCALIZED_PREFIXES = ["/admin", "/account"];

/**
 * Shared back control — pill with icon badge.
 * Used across admin, account, and public product pages.
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
  const LinkComponent = NON_LOCALIZED_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`))
    ? NextLink
    : Link;
  return (
    <LinkComponent
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
    </LinkComponent>
  );
}
