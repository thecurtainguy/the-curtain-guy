import Link from "next/link";
import type { ServicePage } from "@/data/services";
import { serviceCardMediaKey } from "@/data/site-media";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ServiceCardProps = {
  service: ServicePage;
  className?: string;
};

export function ServiceCard({ service, className }: ServiceCardProps) {
  const Icon = service.icon;
  const mediaKey = serviceCardMediaKey[service.slug];

  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn("group block h-full", className)}
    >
      <Card className="h-full overflow-hidden border-border/40 bg-background/50 shadow-[0_2px_16px_rgba(0,0,0,0.15)] transition-all hover:border-primary/25 hover:shadow-[0_8px_28px_rgba(0,0,0,0.25),0_0_16px_rgba(212,175,55,0.06)]">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {mediaKey ? (
            <>
              <SiteMediaImage
                mediaKey={mediaKey}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="absolute inset-0"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-velvet via-secondary to-background" />
          )}
          <div className="absolute inset-0 flex items-end p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 backdrop-blur-sm transition-colors group-hover:bg-primary/25">
              <Icon className="size-5" />
            </div>
          </div>
        </div>
        <CardContent className="pt-5 pb-6">
          <h3 className="font-heading text-base font-medium text-foreground transition-colors group-hover:text-primary">
            {service.shortTitle}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {service.hubCardDescription}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-primary/80">
            View service
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
