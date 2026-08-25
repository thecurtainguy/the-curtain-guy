import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  rating: number;
  className?: string;
  size?: "sm" | "md";
};

export function StarRating({ rating, className, size = "sm" }: StarRatingProps) {
  const starClass = size === "md" ? "size-4" : "size-3.5";

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            starClass,
            index < rating
              ? "fill-primary text-primary"
              : "fill-transparent text-border/70"
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
