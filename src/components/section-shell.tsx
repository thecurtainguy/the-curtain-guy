import { cn } from "@/lib/utils";

type SectionShellProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "fabric" | "glow" | "elevated";
  divider?: "top" | "bottom" | "both" | "none";
  id?: string;
};

export function SectionShell({
  children,
  className,
  variant = "default",
  divider = "none",
  id,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative",
        divider === "top" || divider === "both" ? "section-divider-top" : "",
        divider === "bottom" || divider === "both" ? "section-divider-bottom" : "",
        variant === "fabric" && "fabric-section",
        variant === "glow" && "glow-section",
        variant === "elevated" && "bg-card/10",
        className
      )}
    >
      {variant === "glow" && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,106,0.06),transparent_55%)]"
          aria-hidden
        />
      )}
      {variant === "fabric" && (
        <div className="fabric-section-overlay pointer-events-none absolute inset-0" aria-hidden />
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
