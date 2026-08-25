import { Quote } from "lucide-react";
import type { ClientReview } from "@/data/reviews";
import { getInitials, getReviewCategoryLabel } from "@/data/reviews";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/reviews/star-rating";

type ReviewCardProps = {
  review: ClientReview;
  variant?: "default" | "featured";
  className?: string;
};

export function ReviewCard({
  review,
  variant = "default",
  className,
}: ReviewCardProps) {
  const featured = variant === "featured";

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/45 bg-card/30 shadow-[0_10px_36px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-300",
        "hover:border-primary/30 hover:shadow-[0_16px_44px_rgba(0,0,0,0.1),0_0_0_1px_oklch(0.76_0.15_88/12%)]",
        featured &&
          "border-primary/25 bg-gradient-to-br from-card/50 via-card/35 to-primary/[0.06] shadow-[0_14px_48px_rgba(0,0,0,0.08),0_0_32px_oklch(0.76_0.15_88/10%)]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,oklch(0.76_0.15_88/12%),transparent_70%)] opacity-70"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Quote
            className={cn(
              "size-8 shrink-0 text-primary/35",
              featured && "size-9 text-primary/45"
            )}
            aria-hidden
          />
          <Badge
            variant="outline"
            className="rounded-full border-border/50 bg-background/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            {getReviewCategoryLabel(review.category)}
          </Badge>
        </div>

        <StarRating
          rating={review.rating}
          size={featured ? "md" : "sm"}
          className="mt-4"
        />

        <p
          className={cn(
            "mt-4 flex-1 text-sm leading-relaxed text-foreground/90",
            featured && "text-base leading-relaxed sm:text-[1.05rem]"
          )}
        >
          “{review.quote}”
        </p>

        <div className="mt-6 flex items-center gap-3 border-t border-border/40 pt-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold-metallic text-sm font-semibold text-primary-foreground shadow-sm">
            {getInitials(review.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-foreground">
              {review.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {review.role}
              {review.organization ? ` · ${review.organization}` : ""}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary/80">
              {review.eventLabel}
              {review.venue ? ` · ${review.venue}` : ""} · {review.location}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
