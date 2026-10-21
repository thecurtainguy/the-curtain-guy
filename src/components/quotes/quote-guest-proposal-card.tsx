"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerLanguage } from "@/data/customer-language";
import { cn } from "@/lib/utils";

const COPY = {
  en: {
    eyebrow: "Guest proposal",
    title: "Public token page",
    body: "The shareable `/quote/…` page guests open from email — no login required.",
    open: "Open guest proposal",
    copy: "Copy guest link",
    copied: "Copied",
    openError: "Could not open guest proposal.",
    copyError: "Could not copy link.",
  },
  fr: {
    eyebrow: "Lien invité",
    title: "Page de soumission publique",
    body: "La page `/quote/…` à partager — vos invités l’ouvrent sans se connecter.",
    open: "Ouvrir la soumission",
    copy: "Copier le lien",
    copied: "Copié",
    openError: "Impossible d’ouvrir la soumission.",
    copyError: "Impossible de copier le lien.",
  },
} as const;

/**
 * Right-rail card — opens the public guest proposal (`/quote/[token]`).
 */
export function QuoteGuestProposalCard({
  ensureEndpoint,
  initialUrl = null,
  language = "en",
  className,
}: {
  /** POST endpoint that returns `{ ok, publicUrl }` */
  ensureEndpoint: string;
  initialUrl?: string | null;
  language?: CustomerLanguage;
  className?: string;
}) {
  const t = COPY[language];
  const [createdUrl, setUrl] = useState<string | null>(null);
  const url = createdUrl ?? initialUrl;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureUrl(): Promise<string | null> {
    if (url) return url;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(ensureEndpoint, {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        publicUrl?: string;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.publicUrl) {
        setError(
          language === "en" ? (payload.message ?? t.openError) : t.openError
        );
        return null;
      }
      setUrl(payload.publicUrl);
      return payload.publicUrl;
    } catch {
      setError(t.openError);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openGuestPage() {
    const next = await ensureUrl();
    if (next) {
      window.open(next, "_blank", "noopener,noreferrer");
    }
  }

  async function copyLink() {
    const next = await ensureUrl();
    if (!next) return;
    try {
      await navigator.clipboard.writeText(next);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t.copyError);
    }
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm",
        className
      )}
    >
      <div className="relative p-5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(212,175,55,0.16),transparent_55%)]"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Link2 className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                {t.eyebrow}
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold text-foreground">
                {t.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              className="w-full justify-center gap-2"
              onClick={() => void openGuestPage()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              {t.open}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => void copyLink()}
              disabled={busy}
            >
              {copied ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-300" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? t.copied : t.copy}
            </Button>
          </div>

          {url ? (
            <p className="mt-3 truncate rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
              {url}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
