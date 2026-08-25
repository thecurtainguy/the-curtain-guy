import { navLinks, siteConfig } from "@/data/site";
import { services } from "@/data/services";
import { BrandLogo } from "@/components/brand-logo";
import { GuardedLink } from "@/components/ui/guarded-link";
import { Reveal } from "@/components/animation/reveal";

const footerExtras = [
  { label: "Reviews", href: "/reviews" },
  { label: "Privacy", href: "/privacy" },
];

export function Footer() {
  const footerNav = [
    ...navLinks.filter((link) => link.href !== "/"),
    ...footerExtras,
  ];

  return (
    <footer className="border-t border-border/40 bg-card/30">
      <Reveal variant="fade-up" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo href="/" size="footer" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Luxury event drape rentals for Montreal weddings, corporate events,
              galas, mitzvahs, and venue transformations. Full-service rental
              with delivery, installation, and teardown.
            </p>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-primary/80">
              {siteConfig.motto}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Montreal, Quebec, Canada
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Navigate</p>
            <ul className="mt-4 space-y-2">
              {footerNav.map((link) => (
                <li key={link.href}>
                  <GuardedLink
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </GuardedLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Services</p>
            <ul className="mt-4 space-y-2">
              {services.map((service) => (
                <li key={service.slug}>
                  <GuardedLink
                    href={`/services/${service.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {service.shortTitle}
                  </GuardedLink>
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
              <li>
                <a
                  href={siteConfig.phoneHref}
                  className="transition-colors hover:text-primary"
                >
                  {siteConfig.phone}
                </a>
              </li>
              <li>{siteConfig.location}</li>
              <li>
                <GuardedLink
                  href="/get-estimate"
                  className="transition-colors hover:text-primary"
                >
                  Get Estimate
                </GuardedLink>
              </li>
              <li>
                <GuardedLink
                  href="/privacy"
                  className="transition-colors hover:text-primary"
                >
                  Privacy
                </GuardedLink>
              </li>
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
      </Reveal>
    </footer>
  );
}
