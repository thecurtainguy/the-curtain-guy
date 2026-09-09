"use client";

import { useMemo, useState } from "react";
import {
  Check,
  FileText,
  Mail,
  RotateCcw,
  ScrollText,
  Send,
} from "lucide-react";
import {
  DOCUMENT_TEXT_DEFS,
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPES,
  type DocumentTextDefinition,
  type DocumentTextSlug,
  type DocumentType,
} from "@/data/document-texts";
import { DocumentTextPreviewButton } from "@/components/admin/document-text-preview";
import { AdminFloatingSaveButton } from "@/components/admin/admin-floating-save-button";
import { SiteMediaImage } from "@/components/media/site-media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AdminDocumentTextItem = DocumentTextDefinition & {
  body: string;
  updated_at: string | null;
  isCustomized: boolean;
};

const DOC_ICONS = {
  quote_pdf: FileText,
  quote_email: Mail,
  estimate_email: Send,
} as const;

export function AdminDocumentTextsEditor({
  initialTexts,
}: {
  initialTexts: AdminDocumentTextItem[];
}) {
  const [texts, setTexts] = useState(initialTexts);
  const [drafts, setDrafts] = useState<Record<DocumentTextSlug, string>>(() =>
    Object.fromEntries(initialTexts.map((item) => [item.slug, item.body])) as Record<
      DocumentTextSlug,
      string
    >
  );
  const [selectedType, setSelectedType] = useState<DocumentType>("quote_pdf");
  const [savingSlug, setSavingSlug] = useState<DocumentTextSlug | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(
    () => DOCUMENT_TEXT_DEFS.filter((def) => def.documentType === selectedType),
    [selectedType]
  );

  const dirtySlugs = useMemo(() => {
    return fields
      .map((def) => def.slug)
      .filter((slug) => {
        const stored = texts.find((item) => item.slug === slug);
        const draft = drafts[slug] ?? stored?.body ?? "";
        return draft !== (stored?.body ?? DOCUMENT_TEXT_DEFS.find((d) => d.slug === slug)?.defaultBody ?? "");
      });
  }, [drafts, fields, texts]);

  async function save(slug: DocumentTextSlug, restoreDefault = false): Promise<boolean> {
    setSavingSlug(slug);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/document-texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          restoreDefault
            ? { slug, restoreDefault: true }
            : { slug, body: drafts[slug] ?? "" }
        ),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        text?: { body: string; updated_at: string | null; isCustomized: boolean };
      };
      if (!response.ok || !json.ok || !json.text) {
        setError(json.message || "Could not save.");
        return false;
      }
      setDrafts((prev) => ({ ...prev, [slug]: json.text!.body }));
      setTexts((prev) =>
        prev.map((item) =>
          item.slug === slug
            ? {
                ...item,
                body: json.text!.body,
                updated_at: json.text!.updated_at,
                isCustomized: json.text!.isCustomized,
              }
            : item
        )
      );
      setMessage(
        restoreDefault ? "Restored factory default." : "Saved. New documents will use this copy."
      );
      return true;
    } catch {
      setError("Could not save.");
      return false;
    } finally {
      setSavingSlug(null);
    }
  }

  async function saveAllDirty() {
    const slugs = dirtySlugs;
    if (slugs.length === 0) return;
    for (const slug of slugs) {
      const ok = await save(slug);
      if (!ok) return;
    }
    setMessage(
      slugs.length === 1
        ? "Saved. New documents will use this copy."
        : `Saved ${slugs.length} fields. New documents will use this copy.`
    );
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
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Generated documents
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              One place for proposal terms and email copy
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              These texts appear on documents the system generates. Quote terms
              are copied onto each new proposal; emails and the PDF footer always
              use the latest saved version.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Quote PDF", "Quote email", "Estimate emails"].map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="h-auto border-primary/20 bg-primary/5 py-1.5 text-foreground"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="relative min-h-[180px]">
            <SiteMediaImage
              mediaKey="home.cta.atmosphere"
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="absolute inset-0"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            <div className="absolute inset-4 flex items-end">
              <div className="rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                  Owner only
                </p>
                <p className="mt-1 font-heading text-sm text-white">
                  Customers never see this editor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {DOCUMENT_TYPES.map((type) => {
          const meta = DOCUMENT_TYPE_META[type];
          const Icon = DOC_ICONS[type];
          const selected = selectedType === type;
          const fieldCount = DOCUMENT_TEXT_DEFS.filter(
            (def) => def.documentType === type
          ).length;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedType(type);
                setMessage(null);
                setError(null);
              }}
              className={cn(
                "group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                selected &&
                  "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  selected
                    ? "bg-primary/20 text-primary"
                    : "bg-primary/10 text-primary/80"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {meta.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {meta.description}
                </span>
                <span className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-primary">
                  {fieldCount} {fieldCount === 1 ? "field" : "fields"}
                </span>
              </span>
              <span
                className={cn(
                  "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70"
                )}
              >
                {selected ? <Check className="size-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {(message || error) && (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/25 bg-primary/10 text-foreground"
          )}
        >
          {error || message}
        </p>
      )}

      <div className="space-y-4">
        {fields.map((def) => {
          const stored = texts.find((item) => item.slug === def.slug);
          const draft = drafts[def.slug] ?? stored?.body ?? def.defaultBody;
          const dirty = draft !== (stored?.body ?? def.defaultBody);
          const busy = savingSlug === def.slug;
          return (
            <section
              key={def.slug}
              className="overflow-hidden rounded-2xl border border-border/40 bg-card/25"
            >
              <div className="border-b border-border/40 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <ScrollText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-semibold">
                        {def.label}
                      </h3>
                      {stored?.isCustomized ? (
                        <Badge variant="outline" className="border-primary/30">
                          Customized
                        </Badge>
                      ) : (
                        <Badge variant="outline">Factory default</Badge>
                      )}
                      {dirty ? (
                        <Badge variant="secondary">Unsaved</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {def.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {def.appliesTo.map((label) => (
                        <Badge
                          key={label}
                          variant="outline"
                          className="h-auto border-border/50 bg-background/40 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <Textarea
                  rows={def.rows}
                  value={draft}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [def.slug]: event.target.value }))
                  }
                  className="min-h-32 resize-y font-sans text-sm leading-relaxed"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {def.previewKind === "pdf_terms"
                      ? "One term per line. The PDF and proposal page show this as a numbered list."
                      : `${draft.length.toLocaleString()} characters`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <DocumentTextPreviewButton
                      kind={def.previewKind}
                      label={def.label}
                      body={draft}
                      pdfFooter={drafts["quote.pdf_footer"]}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void save(def.slug, true)}
                      disabled={busy}
                    >
                      <RotateCcw className="size-3.5" />
                      Restore default
                    </Button>
                    <LoadingButton
                      type="button"
                      isLoading={busy}
                      loadingText="Saving"
                      disabled={!dirty && !busy}
                      onClick={() => void save(def.slug)}
                    >
                      Save
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <AdminFloatingSaveButton
        active={dirtySlugs.length > 0}
        saving={savingSlug !== null}
        label={
          dirtySlugs.length > 1
            ? `Save ${dirtySlugs.length} changes`
            : "Save changes"
        }
        onSave={() => void saveAllDirty()}
      />
    </div>
  );
}
