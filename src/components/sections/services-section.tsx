import Image from "next/image";
import { serviceCards } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { Card, CardContent } from "@/components/ui/card";

export function ServicesSection() {
  return (
    <SectionShell variant="fabric" divider="top" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Event Drape Rental Services"
          title="Montreal event draping for every occasion."
          description="From pipe and drape rental to wedding draping, gala drape rentals, stage backdrop rentals, and blackout drape — each service includes full-service installation and teardown."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {serviceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="group overflow-hidden border-border/40 bg-background/50 shadow-[0_2px_16px_rgba(0,0,0,0.15)] transition-all hover:border-primary/25 hover:shadow-[0_8px_28px_rgba(0,0,0,0.25),0_0_16px_rgba(212,175,106,0.06)]"
              >
                {card.image && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={card.image}
                      alt={card.alt ?? card.title}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="font-heading text-sm font-medium text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
