"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandDialogContent, useBrandConfirm } from "@/components/ui/brand-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRODUCT_CATEGORY_LABEL_MAX,
  sortProductCategories,
  type ProductCategoryWithCount,
} from "@/data/product-categories";
import { cn } from "@/lib/utils";

type ApiResult<T> = { ok?: boolean; message?: string } & T;

async function requestJson<T>(
  url: string,
  init: RequestInit
): Promise<{ data: ApiResult<T> | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
    const data = (await response.json().catch(() => null)) as ApiResult<T> | null;
    if (!response.ok || !data?.ok) {
      return { data, error: data?.message || "Something went wrong." };
    }
    return { data, error: null };
  } catch {
    return { data: null, error: "Network error — try again." };
  }
}

/** Inline "new category" form shared by the manager dialog and product editor. */
export function ProductCategoryCreateForm({
  onCreated,
  onCancel,
  autoFocus = false,
  className,
}: {
  onCreated: (category: ProductCategoryWithCount) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const [label, setLabel] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = Boolean(label.trim() && labelFr.trim()) && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const { data, error: requestError } = await requestJson<{
      category?: ProductCategoryWithCount;
    }>("/api/admin/product-categories", {
      method: "POST",
      body: JSON.stringify({ label, label_fr: labelFr }),
    });
    setSaving(false);
    if (requestError || !data?.category) {
      setError(requestError || "Could not create category.");
      return;
    }
    setLabel("");
    setLabelFr("");
    onCreated(data.category);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary/5 p-4",
        className
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-category-label" className="gap-2 text-xs">
            <LanguageTag code="EN" />
            English name
          </Label>
          <Input
            id="new-category-label"
            value={label}
            autoFocus={autoFocus}
            maxLength={PRODUCT_CATEGORY_LABEL_MAX}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Lighting"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="new-category-label-fr" className="gap-2 text-xs">
            <LanguageTag code="FR" />
            French name
          </Label>
          <Input
            id="new-category-label-fr"
            value={labelFr}
            maxLength={PRODUCT_CATEGORY_LABEL_MAX}
            onChange={(e) => setLabelFr(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ex. Éclairage"
            lang="fr"
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            French customers see the French name on their proposal, PDF, and
            the /fr Rentals page.
          </p>
        )}
        <div className="flex shrink-0 justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Add category
          </Button>
        </div>
      </div>
    </div>
  );
}

function LanguageTag({ code }: { code: "EN" | "FR" }) {
  return (
    <span className="inline-flex h-4 min-w-6 items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-1 text-[9px] font-semibold tracking-wide text-primary">
      {code}
    </span>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
  busy,
  onMove,
  onRename,
  onToggleActive,
  onDelete,
}: {
  category: ProductCategoryWithCount;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onRename: (names: { label: string; label_fr: string }) => Promise<boolean>;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.label);
  const [draftFr, setDraftFr] = useState(category.label_fr ?? "");
  const inUse = category.product_count > 0;
  const missingFr = !category.label_fr?.trim();

  function startEditing() {
    setDraft(category.label);
    setDraftFr(category.label_fr ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(category.label);
    setDraftFr(category.label_fr ?? "");
    setEditing(false);
  }

  async function commitRename() {
    const next = draft.trim();
    const nextFr = draftFr.trim();
    if (!next || !nextFr) return;
    if (next === category.label && nextFr === (category.label_fr ?? "")) {
      setEditing(false);
      return;
    }
    const ok = await onRename({ label: next, label_fr: nextFr });
    if (ok) setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  }

  return (
    <li
      className={cn(
        "rounded-2xl border p-3 transition-colors",
        category.is_active
          ? "border-border/40 bg-card/40"
          : "border-dashed border-border/40 bg-background/30 opacity-75"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            disabled={busy || isFirst}
            onClick={() => onMove(-1)}
            aria-label={`Move ${category.label} up`}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            disabled={busy || isLast}
            onClick={() => onMove(1)}
            aria-label={`Move ${category.label} down`}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {editing ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
                  <label className="flex min-w-0 items-center gap-1.5">
                    <LanguageTag code="EN" />
                    <Input
                      value={draft}
                      autoFocus
                      maxLength={PRODUCT_CATEGORY_LABEL_MAX}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      className="h-8"
                      aria-label="English name"
                    />
                  </label>
                  <label className="flex min-w-0 items-center gap-1.5">
                    <LanguageTag code="FR" />
                    <Input
                      value={draftFr}
                      autoFocus={missingFr}
                      maxLength={PRODUCT_CATEGORY_LABEL_MAX}
                      onChange={(e) => setDraftFr(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Nom en français"
                      lang="fr"
                      className="h-8"
                      aria-label="French name"
                    />
                  </label>
                </div>
                <div className="flex shrink-0 justify-end gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    disabled={busy || !draft.trim() || !draftFr.trim()}
                    onClick={() => void commitRename()}
                    aria-label="Save names"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={cancelEditing}
                    aria-label="Cancel rename"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {category.label}
                  </p>
                  <p
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 text-xs",
                      missingFr ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                    )}
                    lang="fr"
                  >
                    <LanguageTag code="FR" />
                    <span className="truncate">
                      {missingFr ? "French name missing" : category.label_fr}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={`Rename ${category.label}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <span className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {category.product_count}{" "}
                  {category.product_count === 1 ? "item" : "items"}
                </span>
                {!category.is_active ? (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Archived
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={onToggleActive}
            title={category.is_active ? "Archive" : "Restore"}
            aria-label={
              category.is_active
                ? `Archive ${category.label}`
                : `Restore ${category.label}`
            }
          >
            {category.is_active ? (
              <Archive className="size-4" />
            ) : (
              <ArchiveRestore className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy || inUse}
            onClick={onDelete}
            title={
              inUse
                ? "Move its items to another category before deleting"
                : "Delete"
            }
            aria-label={`Delete ${category.label}`}
            className="hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Header button on the Inventory page; refreshes the list after edits. */
export function AdminProductCategoriesButton({
  initialCategories,
}: {
  initialCategories: ProductCategoryWithCount[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [dirty, setDirty] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Tags className="size-4" aria-hidden />
        Categories
      </Button>
      <AdminProductCategoriesManager
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && dirty) {
            setDirty(false);
            router.refresh();
          }
        }}
        categories={categories}
        onCategoriesChange={(next) => {
          setCategories(next);
          setDirty(true);
        }}
      />
    </>
  );
}

export function AdminProductCategoriesManager({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategoryWithCount[];
  onCategoriesChange: (next: ProductCategoryWithCount[]) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, confirmDialog] = useBrandConfirm();
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortProductCategories(categories), [categories]);
  const active = sorted.filter((row) => row.is_active);
  const archived = sorted.filter((row) => !row.is_active);

  function replaceCategory(next: Partial<ProductCategoryWithCount> & { id: string }) {
    onCategoriesChange(
      categories.map((row) => (row.id === next.id ? { ...row, ...next } : row))
    );
  }

  async function patchCategory(
    category: ProductCategoryWithCount,
    body: Record<string, unknown>
  ): Promise<boolean> {
    setBusyId(category.id);
    setError(null);
    const { data, error: requestError } = await requestJson<{
      category?: ProductCategoryWithCount;
    }>(`/api/admin/product-categories/${category.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (requestError || !data?.category) {
      setError(requestError || "Could not update category.");
      return false;
    }
    replaceCategory({ ...data.category, product_count: category.product_count });
    return true;
  }

  async function move(category: ProductCategoryWithCount, direction: -1 | 1) {
    const ordered = [...active, ...archived];
    const index = ordered.findIndex((row) => row.id === category.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    const reindexed = next.map((row, i) => ({ ...row, sort_order: (i + 1) * 10 }));
    const previous = categories;
    onCategoriesChange(reindexed);

    setBusyId(category.id);
    setError(null);
    const { error: requestError } = await requestJson<{
      categories?: unknown;
    }>("/api/admin/product-categories/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: reindexed.map((row) => row.id) }),
    });
    setBusyId(null);
    if (requestError) {
      onCategoriesChange(previous);
      setError(requestError);
    }
  }

  async function remove(category: ProductCategoryWithCount) {
    const confirmed = await confirm({
      icon: Trash2,
      eyebrow: "Inventory",
      title: `Delete “${category.label}”?`,
      description: "This category is removed from the list for good.",
      confirmLabel: "Delete category",
      destructive: true,
    });
    if (!confirmed) return;
    setBusyId(category.id);
    setError(null);
    const { error: requestError } = await requestJson<object>(
      `/api/admin/product-categories/${category.id}`,
      { method: "DELETE" }
    );
    setBusyId(null);
    if (requestError) {
      setError(requestError);
      return;
    }
    onCategoriesChange(categories.filter((row) => row.id !== category.id));
  }

  function renderRows(rows: ProductCategoryWithCount[], offset: number, total: number) {
    return rows.map((category, index) => (
      <CategoryRow
        key={category.id}
        category={category}
        isFirst={offset + index === 0}
        isLast={offset + index === total - 1}
        busy={busyId !== null}
        onMove={(direction) => void move(category, direction)}
        onRename={(names) => patchCategory(category, names)}
        onToggleActive={() =>
          void patchCategory(category, { is_active: !category.is_active })
        }
        onDelete={() => void remove(category)}
      />
    ));
  }

  const total = active.length + archived.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        icon={Tags}
        eyebrow="Inventory"
        title="Categories"
        description="Each category has an English and a French name. French customers see the French one on proposals, PDFs, emails, and the /fr Rentals page."
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        }
      >
        <div className="space-y-5">
          <ProductCategoryCreateForm
            onCreated={(category) =>
              onCategoriesChange([...categories, category])
            }
          />

          {error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Active · {active.length}
            </h3>
            {active.length ? (
              <ul className="space-y-2">{renderRows(active, 0, total)}</ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/50 px-4 py-6 text-center text-sm text-muted-foreground">
                No active categories — add one above.
              </p>
            )}
          </section>

          {archived.length ? (
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Archived · {archived.length}
              </h3>
              <p className="text-xs text-muted-foreground">
                Hidden when picking a category. Items already in them keep it.
              </p>
              <ul className="space-y-2">
                {renderRows(archived, active.length, total)}
              </ul>
            </section>
          ) : null}
        </div>
      </BrandDialogContent>
      {confirmDialog}
    </Dialog>
  );
}
