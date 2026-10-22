"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  CalendarRange,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  STUDIO_DESIGN_SOURCES,
  STUDIO_LEAD_STAGES,
  STUDIO_LEAD_STAGE_LABELS,
} from "@/data/studio-leads";
import { cn } from "@/lib/utils";
import { STUDIO_LEAD_STAGE_ICONS } from "./lead-badges";
import {
  DEFAULT_STUDIO_LEAD_FILTERS,
  STUDIO_LEAD_SORTS,
  STUDIO_LEAD_SORT_LABELS,
  STUDIO_LEAD_SOURCE_LABELS,
  buildStudioLeadsHref,
  hasActiveStudioLeadFilters,
  type StudioLeadFilters,
} from "./studio-leads-shared";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        active
          ? "border-primary/55 bg-primary/15 text-primary"
          : "border-border/50 bg-background/40 text-muted-foreground hover:border-primary/35 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function StudioLeadsFilters({
  filters,
  total,
}: {
  filters: StudioLeadFilters;
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [syncedQuery, setSyncedQuery] = useState(filters.q);
  if (filters.q !== syncedQuery) {
    setSyncedQuery(filters.q);
    // Adopt URL changes made elsewhere (stat tiles, clear) unless the user is still typing past them.
    if (!filters.q || !search.trim().startsWith(filters.q)) setSearch(filters.q);
  }

  const navigate = (patch: Partial<StudioLeadFilters>) => {
    startTransition(() => {
      router.push(buildStudioLeadsHref(filters, patch), { scroll: false });
    });
  };

  useEffect(() => {
    const term = search.trim();
    if (term === filters.q) return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.push(buildStudioLeadsHref(filters, { q: term }), { scroll: false });
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [filters, router, search]);

  const linked = filters.estimateId || filters.quoteId || filters.jobId;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_60%)] px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <SlidersHorizontal className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
            Pipeline filters
          </p>
          <p className="font-heading text-sm text-foreground" aria-live="polite">
            {total.toLocaleString()} {total === 1 ? "lead" : "leads"}
            {pending ? (
              <Loader2 className="ml-2 inline size-3.5 animate-spin text-primary" aria-label="Updating" />
            ) : null}
          </p>
        </div>
        <label className="relative w-full sm:w-80">
          <span className="sr-only">Search leads</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, phone, event, venue"
            className="h-9 rounded-full bg-background/60 pl-9"
          />
        </label>
        {hasActiveStudioLeadFilters(filters) ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              navigate({ ...DEFAULT_STUDIO_LEAD_FILTERS, sort: filters.sort });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/50 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <GroupLabel>Stage</GroupLabel>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!filters.stage} onClick={() => navigate({ stage: null })}>
              All stages
            </FilterChip>
            {STUDIO_LEAD_STAGES.map((stage) => {
              const Icon = STUDIO_LEAD_STAGE_ICONS[stage];
              return (
                <FilterChip
                  key={stage}
                  active={filters.stage === stage}
                  onClick={() => navigate({ stage: filters.stage === stage ? null : stage })}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {STUDIO_LEAD_STAGE_LABELS[stage]}
                </FilterChip>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <GroupLabel>Source</GroupLabel>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!filters.source} onClick={() => navigate({ source: null })}>
              All sources
            </FilterChip>
            {STUDIO_DESIGN_SOURCES.map((source) => (
              <FilterChip
                key={source}
                active={filters.source === source}
                onClick={() => navigate({ source: filters.source === source ? null : source })}
              >
                {STUDIO_LEAD_SOURCE_LABELS[source]}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <GroupLabel>Last activity</GroupLabel>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange className="size-4 text-primary" aria-hidden />
            <Input
              type="date"
              aria-label="Active from"
              value={filters.from ?? ""}
              max={filters.to ?? undefined}
              onChange={(event) => navigate({ from: event.target.value || null })}
              className="h-8 w-40 rounded-full bg-background/60 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              aria-label="Active until"
              value={filters.to ?? ""}
              min={filters.from ?? undefined}
              onChange={(event) => navigate({ to: event.target.value || null })}
              className="h-8 w-40 rounded-full bg-background/60 text-xs"
            />
            <FilterChip
              active={filters.upcoming}
              onClick={() => navigate({ upcoming: !filters.upcoming })}
            >
              <Sparkles className="size-3.5" aria-hidden />
              Upcoming event date
            </FilterChip>
          </div>
        </div>
        <div className="space-y-2">
          <GroupLabel>Sort</GroupLabel>
          <div className="flex flex-wrap gap-1.5">
            {STUDIO_LEAD_SORTS.map((sort) => (
              <FilterChip
                key={sort}
                active={filters.sort === sort}
                onClick={() => navigate({ sort, page: 1 })}
              >
                {filters.sort === sort ? <ArrowDownUp className="size-3.5" aria-hidden /> : null}
                {STUDIO_LEAD_SORT_LABELS[sort]}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {linked ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span>Showing rooms linked to this</span>
          <span className="font-medium text-foreground">
            {filters.jobId ? "job" : filters.quoteId ? "quote" : "estimate"}
          </span>
          <button
            type="button"
            onClick={() => navigate({ estimateId: null, quoteId: null, jobId: null })}
            className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
            Remove link filter
          </button>
        </div>
      ) : null}
    </section>
  );
}
