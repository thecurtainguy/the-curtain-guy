import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { estimateSteps } from "@/data/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Get an Event Drape Rental Estimate",
  description:
    "Request a luxury event drape rental estimate for your Montreal wedding, corporate event, gala, or venue transformation. Full interactive estimator with 3D preview coming soon.",
  path: "/get-estimate",
});

export default function GetEstimatePage() {
  return (
    <>
      <PageHero
        eyebrow="Get Estimate"
        title="Request an event drape rental estimate."
        description="The full interactive estimate builder is coming next. For now, share your event details and we'll help you plan the right pipe and drape, wedding draping, stage backdrop, or venue transformation setup."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                How our estimate process will work
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Our upcoming estimator will guide you through every decision for
                your Montreal event drape rental — with support for manual room
                building, AI floor plan upload, and a live 3D drape preview
                before you commit.
              </p>

              <ol className="mt-8 space-y-4">
                {estimateSteps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <Sparkles className="size-3" />
                  AI floor plan upload
                </Badge>
                <Badge variant="outline">Manual room builder</Badge>
                <Badge variant="outline">3D drape preview</Badge>
              </div>
            </div>

            <Card className="border-border/40 bg-card/40">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Request an event drape rental estimate
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Share your event type, Montreal venue, and draping goals. This
                  form is for planning purposes — submission will be enabled in
                  a future phase.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" role="form" aria-label="Estimate request form">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your name" disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-type">Event type</Label>
                      <Input
                        id="event-type"
                        placeholder="Wedding, corporate gala, mitzvah..."
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue">Venue / city</Label>
                      <Input
                        id="venue"
                        placeholder="Venue name, Montreal"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your draping needs — pipe and drape, stage backdrop, room dividers, blackout drape..."
                      rows={4}
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Form submission coming soon. For now, reach us at{" "}
                    <a
                      href="mailto:admin@thecurtainguy.com"
                      className="text-primary hover:underline"
                    >
                      admin@thecurtainguy.com
                    </a>
                    .
                  </p>
                  <Button type="button" disabled className="w-full">
                    Submit — Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Want to preview the future experience?{" "}
              <Link href="/ai" className="text-primary hover:underline">
                Explore AI Drape Studio
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
