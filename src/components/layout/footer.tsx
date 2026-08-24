import Link from "next/link";
import { navLinks, siteConfig } from "@/data/site";

export function Footer() {
  const footerNav = navLinks.filter((link) => link.href !== "/");

  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">
              {siteConfig.name}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {siteConfig.tagline}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Luxury event drape and curtain rentals for Montreal weddings,
              corporate events, galas, mitzvahs, and venue transformations.
              Full-service rental with delivery, installation, and teardown — not
              window treatments or e-commerce curtain sales.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Navigate</p>
            <ul className="mt-4 space-y-2">
              {footerNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Contact</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="transition-colors hover:text-primary"
                >
                  {siteConfig.email}
                </a>
              </li>
              <li>{siteConfig.location}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/40 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
          <p>{siteConfig.domain}</p>
        </div>
      </div>
    </footer>
  );
}
