import Link from "next/link";
import {
  ClipboardList,
  MessageSquare,
  Ruler,
  FileCheck,
} from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SectionShell } from "@/components/section-shell";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Share your event details",
    description:
      "Date, venue, event type, and what you want draping to achieve.",
    icon: ClipboardList,
  },
  {
    title: "We review venue and drape needs",
    description:
      "Our team looks at layout, access, and the right rental approach.",
    icon: MessageSquare,
  },
  {
    title: "We plan fabric, hardware, and install",
    description:
      "Pipe and drape, backdrops, masking, and timing are scoped carefully.",
    icon: Ruler,
  },
  {
    title: "You receive an estimate follow-up",
    description:
      "A rental estimate conversation — not automatic final online pricing.",
    icon: FileCheck,
  },
];

export function HowItWorksSection() {
  return (
    <SectionShell variant="elevated" divider="top" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/40 sm:aspect-[5/4] lg:aspect-[4/5]">
            <SiteMediaImage
              mediaKey="home.how_it_works.visual"
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="absolute inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          </div>

          <div>
            <SectionHeading
              eyebrow="How it works"
              title="From brief to rental estimate."
              description="Honest planning for Montreal event drape rentals — we review your details and follow up. No instant checkout prices."
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card
                    key={step.title}
                    className="border-border/40 bg-background/50"
                  >
                    <CardContent className="p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                          <Icon className="size-4" />
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary/70">
                          Step {index + 1}
                        </span>
                      </div>
                      <h3 className="font-heading text-sm font-medium text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8">
              <Button asChild className="min-h-11">
                <Link href="/get-estimate">Start your event drape brief</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
