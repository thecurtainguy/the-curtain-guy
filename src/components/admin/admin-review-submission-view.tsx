import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckCircle2,
  MessageSquareQuote,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getReviewCategoryLabel } from "@/data/reviews";
import {
  getRecommendLabel,
  type ReviewSubmissionRow,
} from "@/data/review-submissions";
import { StarRating } from "@/components/reviews/star-rating";
import { cn } from "@/lib/utils";

function DetailCard({
  icon: Icon,
  eyebrow,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/40 bg-card/25 p-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-heading text-lg font-semibold text-foreground">
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DetailTile({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/30 bg-background/40 p-4",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{value}</div>
    </div>
  );
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "—";
}

export function AdminReviewSubmissionView({
  review,
}: {
  review: ReviewSubmissionRow;
}) {
  return (
    <div className="space-y-6">
      <DetailCard icon={UserRound} eyebrow="About them" title="Contact details">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailTile label="Full name" value={review.name} />
          <DetailTile label="Email" value={review.email} />
          <DetailTile label="Phone" value={displayValue(review.phone)} />
          <DetailTile label="Role / title" value={displayValue(review.role)} />
          <DetailTile
            label="Company / organization"
            value={displayValue(review.organization)}
            className="sm:col-span-2"
          />
        </div>
      </DetailCard>

      <DetailCard icon={CalendarDays} eyebrow="Their event" title="Event context">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailTile
            label="Event type"
            value={
              review.event_category
                ? getReviewCategoryLabel(review.event_category)
                : "—"
            }
          />
          <DetailTile
            label="Event name / label"
            value={displayValue(review.event_label)}
          />
          <DetailTile label="Event date" value={displayValue(review.event_date)} />
          <DetailTile label="Venue" value={displayValue(review.venue)} />
          <DetailTile
            label="City / area"
            value={displayValue(review.location)}
            className="sm:col-span-2"
          />
        </div>
      </DetailCard>

      <DetailCard
        icon={MessageSquareQuote}
        eyebrow="Their review"
        title="Experience & feedback"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/30 bg-background/40 p-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Star rating
              </p>
              <StarRating rating={review.rating} size="md" className="mt-2" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Would recommend
              </p>
              <p className="mt-2 text-sm font-medium capitalize text-foreground">
                {getRecommendLabel(review.would_recommend)}
              </p>
            </div>
          </div>

          <DetailTile
            label="Experience"
            value={
              <p className="whitespace-pre-wrap">{review.experience.trim()}</p>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile
              label="Services used"
              value={
                <p className="whitespace-pre-wrap">
                  {displayValue(review.services_used)}
                </p>
              }
            />
            <DetailTile
              label="Highlights"
              value={
                <p className="whitespace-pre-wrap">
                  {displayValue(review.highlights)}
                </p>
              }
            />
          </div>
        </div>
      </DetailCard>

      <DetailCard icon={Sparkles} eyebrow="Permissions" title="Publishing consent">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailTile
            label="OK to publish on website"
            value={
              <span className="inline-flex items-center gap-2">
                <CheckCircle2
                  className={cn(
                    "size-4",
                    review.publish_on_website
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/40"
                  )}
                />
                {review.publish_on_website ? "Yes" : "No"}
              </span>
            }
          />
          <DetailTile
            label="OK to contact for follow-up"
            value={
              <span className="inline-flex items-center gap-2">
                <CheckCircle2
                  className={cn(
                    "size-4",
                    review.ok_to_contact
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/40"
                  )}
                />
                {review.ok_to_contact ? "Yes" : "No"}
              </span>
            }
          />
        </div>
      </DetailCard>
    </div>
  );
}
