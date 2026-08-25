import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { areas } from "@/data/areas";
import { areaCardMediaKey } from "@/data/site-media";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Card, CardContent } from "@/components/ui/card";

export function AreasTeaserSection() {
  return (
    <SectionShell variant="fabric" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Service area"
          title="Montreal and surrounding areas."
          description="Event drape rentals for Montreal, Laval, Longueuil, the West Island, and nearby venues — planned with delivery, installation, and strike."
        />

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => {
            const Icon = area.icon;
            const mediaKey = areaCardMediaKey[area.slug];
            return (
              <Link
                key={area.slug}
                href={`/areas/${area.slug}`}
                className="group block h-full"
              >
                <Card className="h-full overflow-hidden border-border/40 bg-background/50 transition-all hover:border-primary/25 hover:bg-background/70">
                  {mediaKey && (
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <SiteMediaImage
                        mediaKey={mediaKey}
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="absolute inset-0"
                        imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 backdrop-blur-sm">
                        <Icon className="size-4" />
                      </div>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h3 className="font-heading text-base font-medium text-foreground group-hover:text-primary">
                      {area.name}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {area.intro}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary/80">
                      View area
                      <ArrowRight className="size-3" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
