"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  History,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import {
  EVENT_TYPE_ICONS,
  EVENT_TYPE_ICON_KEYS,
  EVENT_TYPE_LABEL_MAX,
  EVENT_TYPE_USAGE_LABELS,
  slugifyEventTypeLabel,
  totalEventTypeUsage,
  type EventType,
  type EventTypeIconKey,
  type EventTypeUsage,
} from "@/data/event-types";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type ApiResult = { ok?: boolean; message?: string; eventType?: EventType; usage?: EventTypeUsage | null };

async function callApi(url: string, init: RequestInit): Promise<ApiResult & { status: number }> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const json = (await response.json().catch(() => ({}))) as ApiResult;
    return { ...json, ok: response.ok && json.ok !== false, status: response.status };
  } catch {
    return { ok: false, message: "Network error. Try again.", status: 0 };
  }
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: typeof Tags;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card/25">
      <div className="flex items-start gap-3 border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function IconPicker({
  value,
  onChange,
  idPrefix,
}: {
  value: EventTypeIconKey;
  onChange: (icon: EventTypeIconKey) => void;
  idPrefix: string;
}) {
  return (
    <div role="radiogroup" aria-label="Icon" className="grid grid-cols-7 gap-1.5 sm:grid-cols-11">
      {EVENT_TYPE_ICON_KEYS.map((key) => {
        const Icon = EVENT_TYPE_ICONS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            id={`${idPrefix}-${key}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${key} icon`}
            title={key}
            onClick={() => onChange(key)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl border transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              selected
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function UsageTiles({ usage }: { usage: EventTypeUsage | undefined }) {
  const entries = (Object.keys(EVENT_TYPE_USAGE_LABELS) as Array<keyof EventTypeUsage>)
    .map((key) => ({ key, count: usage?.[key] ?? 0 }))
    .filter((entry) => entry.count > 0);
  if (entries.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
        <Check className="size-3.5 text-primary" aria-hidden />
        Not used by any record yet
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {entries.map(({ key, count }) => (
        <div key={key} className="rounded-xl border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5">
          <p className="font-heading text-sm font-semibold text-foreground">{count}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{EVENT_TYPE_USAGE_LABELS[key]}</p>
        </div>
      ))}
    </div>
  );
}

function VisibilitySwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-background shadow transition-all",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

type Draft = { label: string; label_fr: string; icon: EventTypeIconKey };

function EventTypeCard({
  type,
  usage,
  isFirst,
  isLast,
  busy,
  onMove,
  onSave,
  onToggle,
  onDelete,
}: {
  type: EventType;
  usage: EventTypeUsage | undefined;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (delta: number) => void;
  onSave: (draft: Draft) => Promise<boolean>;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ label: type.label, label_fr: type.label_fr, icon: type.icon });
  const Icon = EVENT_TYPE_ICONS[type.icon];
  const used = totalEventTypeUsage(usage);

  function startEdit() {
    setDraft({ label: type.label, label_fr: type.label_fr, icon: type.icon });
    setEditing(true);
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border transition-colors",
        type.active ? "border-primary/30 bg-primary/[0.03]" : "border-border/40 bg-card/20"
      )}
    >
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            type.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold">{type.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {type.label_fr.trim() ? `FR · ${type.label_fr}` : "No French name, uses English"}
            {!type.active ? <span className="sm:hidden"> · Hidden</span> : null}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "hidden shrink-0 sm:inline-flex",
            type.active ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"
          )}
        >
          {type.active ? "Visible" : "Hidden"}
        </Badge>
        <VisibilitySwitch
          checked={type.active}
          disabled={busy}
          onChange={onToggle}
          label={type.active ? `Hide ${type.label}` : `Show ${type.label}`}
        />
      </div>

      <div className="flex-1 space-y-3 p-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`et-${type.id}-en`}>English name</Label>
                <Input
                  id={`et-${type.id}-en`}
                  value={draft.label}
                  maxLength={EVENT_TYPE_LABEL_MAX}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`et-${type.id}-fr`}>French name</Label>
                <Input
                  id={`et-${type.id}-fr`}
                  value={draft.label_fr}
                  maxLength={EVENT_TYPE_LABEL_MAX}
                  placeholder={draft.label || "Optional"}
                  onChange={(e) => setDraft((d) => ({ ...d, label_fr: e.target.value }))}
                />
              </div>
            </div>
            <IconPicker
              idPrefix={`et-${type.id}-icon`}
              value={draft.icon}
              onChange={(icon) => setDraft((d) => ({ ...d, icon }))}
            />
            <p className="text-xs text-muted-foreground">
              Renaming updates the label everywhere, including past records. The saved id stays{" "}
              <code className="rounded bg-muted px-1">{type.id}</code>.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                <X className="size-3.5" />
                Cancel
              </Button>
              <LoadingButton
                type="button"
                size="sm"
                isLoading={busy}
                loadingText="Saving"
                disabled={!draft.label.trim()}
                onClick={async () => {
                  if (await onSave(draft)) setEditing(false);
                }}
              >
                <Check className="size-3.5" />
                Save
              </LoadingButton>
            </div>
          </div>
        ) : (
          <UsageTiles usage={usage} />
        )}
      </div>

      {!editing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-3 py-2">
          <div className="flex gap-1">
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" disabled={isFirst || busy} onClick={() => onMove(-1)}>
              <ArrowUp className="size-3.5" />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Move down" disabled={isLast || busy} onClick={() => onMove(1)}>
              <ArrowDown className="size-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={startEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
          {used > 0 ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              title="Used by existing records, so it can only be hidden."
            >
              <Lock className="size-3.5 text-primary" aria-hidden />
              In use · hide instead of deleting
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AdminEventTypesSettings({
  initialTypes,
  initialUsage,
}: {
  initialTypes: EventType[];
  initialUsage: Record<string, EventTypeUsage>;
}) {
  const router = useRouter();
  const [types, setTypes] = useState(initialTypes);
  const [usage, setUsage] = useState(initialUsage);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<Draft>({ label: "", label_fr: "", icon: "sparkles" });
  const [adding, setAdding] = useState(false);

  const visibleCount = types.filter((t) => t.active).length;
  const inUseCount = types.filter((t) => totalEventTypeUsage(usage[t.id]) > 0).length;
  const newId = slugifyEventTypeLabel(newDraft.label);
  const duplicate = types.find((t) => t.id === newId);

  function replaceType(next: EventType) {
    setTypes((prev) => prev.map((t) => (t.id === next.id ? next : t)));
  }

  async function addType() {
    setAdding(true);
    const result = await callApi("/api/admin/event-types", { method: "POST", body: JSON.stringify(newDraft) });
    setAdding(false);
    if (!result.ok || !result.eventType) {
      toast.error(result.message ?? "Could not add the event type.");
      return;
    }
    const created = result.eventType;
    setTypes((prev) => [...prev, created]);
    setUsage((prev) => ({
      ...prev,
      [created.id]: { estimates: 0, event_plans: 0, quotes: 0, invoices: 0, jobs: 0, studio_designs: 0, products: 0 },
    }));
    setNewDraft({ label: "", label_fr: "", icon: "sparkles" });
    toast.success(`“${created.label}” added. Clients can pick it right away.`);
    router.refresh();
  }

  async function saveType(type: EventType, draft: Draft): Promise<boolean> {
    setBusyId(type.id);
    const result = await callApi(`/api/admin/event-types/${encodeURIComponent(type.id)}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });
    setBusyId(null);
    if (!result.ok || !result.eventType) {
      toast.error(result.message ?? "Could not save the event type.");
      return false;
    }
    replaceType(result.eventType);
    toast.success("Event type saved.");
    router.refresh();
    return true;
  }

  async function toggleType(type: EventType) {
    if (type.active && visibleCount <= 1) {
      toast.error("Keep at least one event type visible so clients can submit requests.");
      return;
    }
    setBusyId(type.id);
    const result = await callApi(`/api/admin/event-types/${encodeURIComponent(type.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !type.active }),
    });
    setBusyId(null);
    if (!result.ok || !result.eventType) {
      toast.error(result.message ?? "Could not update the event type.");
      return;
    }
    replaceType(result.eventType);
    toast.success(
      result.eventType.active
        ? `“${type.label}” is visible again.`
        : `“${type.label}” is hidden. Past records keep their label.`
    );
    router.refresh();
  }

  async function moveType(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= types.length) return;
    const previous = types;
    const next = [...types];
    [next[index], next[target]] = [next[target], next[index]];
    setTypes(next);
    setBusyId(types[index].id);
    const result = await callApi("/api/admin/event-types", {
      method: "PUT",
      body: JSON.stringify({ order: next.map((t) => t.id) }),
    });
    setBusyId(null);
    if (!result.ok) {
      setTypes(previous);
      toast.error(result.message ?? "Could not save the new order.");
      return;
    }
    router.refresh();
  }

  async function deleteType(type: EventType) {
    if (!window.confirm(`Delete “${type.label}”? It isn’t used by any record, so nothing else changes.`)) return;
    setBusyId(type.id);
    const result = await callApi(`/api/admin/event-types/${encodeURIComponent(type.id)}`, { method: "DELETE" });
    setBusyId(null);
    if (!result.ok) {
      if (result.usage) setUsage((prev) => ({ ...prev, [type.id]: result.usage! }));
      toast.error(result.message ?? "Could not delete the event type.");
      return;
    }
    setTypes((prev) => prev.filter((t) => t.id !== type.id));
    toast.success(`“${type.label}” deleted.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card/25">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(212,175,55,0.1),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Event types</p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              The occasions clients can book
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Shown in the estimate builder, event planner, studio, checkout and product tags.
            </p>
            <div className="flex flex-wrap gap-2">
              {[`${visibleCount} visible`, `${types.length - visibleCount} hidden`, `${inUseCount} in use`].map((label) => (
                <Badge key={label} variant="outline" className="h-auto border-primary/20 bg-primary/5 py-1.5 text-foreground">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="relative min-h-[180px]">
            <SiteMediaImage mediaKey="home.cta.atmosphere" sizes="(max-width: 1024px) 100vw, 40vw" className="absolute inset-0" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            <div className="absolute inset-4 flex items-end">
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">History is protected</p>
                  <p className="mt-1 font-heading text-sm text-white">
                    Types used by past estimates, quotes, invoices or jobs can be hidden, never deleted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section icon={Plus} eyebrow="New" title="Add an event type" description="Visible to clients as soon as you add it.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="et-new-en">English name</Label>
              <Input
                id="et-new-en"
                value={newDraft.label}
                maxLength={EVENT_TYPE_LABEL_MAX}
                placeholder="e.g. Baby Shower"
                onChange={(e) => setNewDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et-new-fr">French name</Label>
              <Input
                id="et-new-fr"
                value={newDraft.label_fr}
                maxLength={EVENT_TYPE_LABEL_MAX}
                placeholder="e.g. Shower de bébé (optional)"
                onChange={(e) => setNewDraft((d) => ({ ...d, label_fr: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <IconPicker idPrefix="et-new-icon" value={newDraft.icon} onChange={(icon) => setNewDraft((d) => ({ ...d, icon }))} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={cn("text-xs", duplicate ? "text-destructive" : "text-muted-foreground")}>
              {duplicate
                ? `“${duplicate.label}” already exists${duplicate.active ? "" : " (hidden): show it instead"}.`
                : newId
                  ? <>Saved as <code className="rounded bg-muted px-1">{newId}</code></>
                  : "Pick a clear, client-facing name."}
            </p>
            <LoadingButton
              type="button"
              isLoading={adding}
              loadingText="Adding"
              disabled={!newId || Boolean(duplicate)}
              onClick={() => void addType()}
            >
              <Plus className="size-4" />
              Add event type
            </LoadingButton>
          </div>
        </div>
      </Section>

      <Section
        icon={Tags}
        eyebrow="Manage"
        title="Your event types"
        description="Order here is the order clients see. Hidden types disappear from pickers but stay on past records."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {types.map((type, index) => (
            <EventTypeCard
              key={type.id}
              type={type}
              usage={usage[type.id]}
              isFirst={index === 0}
              isLast={index === types.length - 1}
              busy={busyId === type.id}
              onMove={(delta) => void moveType(index, delta)}
              onSave={(draft) => saveType(type, draft)}
              onToggle={() => void toggleType(type)}
              onDelete={() => void deleteType(type)}
            />
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <History className="size-3.5 text-primary" aria-hidden />
          Usage counts every estimate, event plan, quote, invoice, job, studio design and product tagged with the type.
        </p>
      </Section>
    </div>
  );
}
