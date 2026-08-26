"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

/** Link to root-only routes (account, admin, studio workspace, /ai) — never locale-prefixed. */
export function RootLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} />;
}
