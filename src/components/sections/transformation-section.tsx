import { transformationCards } from "@/data/site";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { Card, CardContent } from "@/components/ui/card";

export function TransformationSection() {
  return (
    <SectionShell className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Event Transformation"
          title="Venue transformation draping that solves real event problems."
          description="We rent and install temporary drape for live events — masking walls, building backdrops, dividing rooms, and shaping atmosphere. Not residential curtains. Not an online shop."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transformationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="border-border/40 bg-card/40 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all hover:border-primary/25 hover:bg-card/60 hover:shadow-[0_8px_28px_rgba(0,0,0,0.3),0_0_20px_rgba(212,175,106,0.05)]"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-heading text-base font-medium text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
