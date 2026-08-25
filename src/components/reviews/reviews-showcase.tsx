"use client";

import { useMemo, useState } from "react";
import {
  clientReviews,
  getFeaturedReviews,
  getReviewsByCategory,
  reviewCategories,
  reviewStats,
  type ReviewCategory,
} from "@/data/reviews";
import { ReviewCard } from "@/components/reviews/review-card";
import { ShareExperienceDialog } from "@/components/reviews/share-experience-dialog";
import { StarRating } from "@/components/reviews/star-rating";
import { Reveal } from "@/components/animation/reveal";
import { Stagger, StaggerItem } from "@/components/animation/stagger";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterId = ReviewCategory | "all";

export function ReviewsShowcase() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const featured = getFeaturedReviews();

  const filteredReviews = useMemo(() => {
    const items = getReviewsByCategory(activeFilter);
    if (activeFilter === "all") {
      return items.filter((review) => !review.featured);
    }
    return items;
  }, [activeFilter]);

  return (
    <>
      <section className="border-b border-border/40 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {reviewStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-border/40 bg-card/25 px-5 py-4 text-center shadow-[inset_0_1px_0_oklch(1_0_0/6%)]"
                >
                  <p className="font-heading text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up" className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              Featured voices
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              Planners, venues, and hosts on working with us
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <StarRating rating={5} size="md" />
              <p className="text-sm text-muted-foreground">
                Mostly five-star feedback from planners, venues, and hosts we
                work with around Montreal.
              </p>
            </div>
          </Reveal>

          <Stagger className="mt-8 grid gap-4 lg:grid-cols-3">
            {featured.map((review) => (
              <StaggerItem key={review.id}>
                <ReviewCard review={review} variant="featured" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="border-y border-border/40 bg-card/15 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="fade-up" className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                Browse by event type
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground">
                Thirty client perspectives across Montreal events
              </h2>
            </div>
            <ShareExperienceDialog>
              <Button variant="outline" className="shrink-0 rounded-2xl">
                Share your experience
              </Button>
            </ShareExperienceDialog>
          </Reveal>

          <div className="mt-8 flex flex-wrap gap-2">
            {reviewCategories.map((category) => {
              const Icon = category.icon;
              const active = activeFilter === category.id;
              const count =
                category.id === "all"
                  ? clientReviews.length
                  : getReviewsByCategory(category.id).length;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveFilter(category.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground shadow-[0_0_0_1px_oklch(0.76_0.15_88/18%)]"
                      : "border-border/45 bg-card/30 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                  )}
                >
                  {Icon ? <Icon className="size-3.5 text-primary/80" /> : null}
                  {category.label}
                  <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            key={activeFilter}
            className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {filteredReviews.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              No reviews in this category yet.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
