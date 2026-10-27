import { Eye } from "lucide-react";

export function ViewCountCell({ count, lastViewedAt }: { count: number; lastViewedAt: string | null }) {
  if (count <= 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-right">
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
        <Eye className="size-3" />
        {count}
      </span>
      {lastViewedAt ? (
        <div className="mt-1 text-[11px] text-muted-foreground" suppressHydrationWarning>
          {new Date(lastViewedAt).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}
