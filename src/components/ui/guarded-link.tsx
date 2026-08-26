"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useOptionalUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import {
  getLocaleFromPathname,
  isAccountAuthPath,
  isRootOnlyPath,
  localizeAuthHref,
} from "@/lib/i18n/path-locale";

type GuardedLinkProps = ComponentProps<typeof Link> & {
  /** Skip the unsaved-progress guard for this link. */
  bypassGuard?: boolean;
};

function resolveHref(href: ComponentProps<typeof Link>["href"]): string {
  if (typeof href === "string") return href;
  if (href && typeof href === "object") {
    const path =
      "pathname" in href && typeof href.pathname === "string"
        ? href.pathname
        : "";
    return path || "/";
  }
  return "/";
}

/**
 * Drop-in Link that shows the themed leave-estimate modal when progress is dirty.
 * Account, admin, studio workspace, and /ai use root paths (no /fr prefix).
 */
export function GuardedLink({
  href,
  onClick,
  bypassGuard = false,
  ...props
}: GuardedLinkProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const { isDirty, requestNavigation } = useOptionalUnsavedChanges();
  const resolved = resolveHref(href);
  const authHref = isAccountAuthPath(resolved)
    ? localizeAuthHref(resolved, locale)
    : null;
  const useRoot = isRootOnlyPath(resolved);
  const navigationTarget = authHref ?? resolved;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || bypassGuard) return;

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    if (!isDirty) return;

    event.preventDefault();
    requestNavigation(navigationTarget);
  }

  if (authHref) {
    return (
      <NextLink href={authHref} onClick={handleClick} {...props} />
    );
  }

  if (useRoot) {
    return (
      <NextLink href={resolved} onClick={handleClick} {...props} />
    );
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
