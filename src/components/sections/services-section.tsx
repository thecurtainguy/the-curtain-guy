import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { services } from "@/data/services";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { ServiceCard } from "@/components/marketing/service-card";
import { Button } from "@/components/ui/button";

export function ServicesSection() {
  return (
    <SectionShell variant="fabric" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Event Drape Rental Services"
            title="Montreal event draping for every occasion."
            description="Wedding draping, pipe and drape, corporate and gala setups, stage backdrops, blackout dividers, and celebration draping — each with full-service install and strike."
          />
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link href="/services">
              View Services
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
