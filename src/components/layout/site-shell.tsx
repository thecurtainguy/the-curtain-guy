"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppShell =
    pathname.startsWith("/admin") || pathname.startsWith("/account");

  if (isAppShell) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
