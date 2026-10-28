"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Mail,
  Monitor,
  Paperclip,
  Send,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CustomerLanguageBadge } from "@/components/quotes/customer-language-badge";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import {
  fetchQuoteEmailTexts,
  type QuoteEmailTexts,
} from "@/lib/quote-email-defaults";
import {
  bilingualQuotePdfNames,
  buildDefaultQuoteEmailBodyText,
  buildDefaultQuoteEmailSubject,
  buildQuoteReadyEmailParts,
} from "@/lib/quote-email-compose";
import type { QuoteWithRelations } from "@/lib/quotes";
import { cn } from "@/lib/utils";

type PreviewTab = "page" | "email" | "pdf";
type Device = "desktop" | "mobile";

const TABS: Array<{
  value: PreviewTab;
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    value: "page",
    icon: Globe,
    title: "Proposal page",
    description: "The link they open",
  },
  {
    value: "email",
    icon: Mail,
    title: "Email",
    description: "What lands in their inbox",
  },
  {
    value: "pdf",
    icon: FileText,
    title: "PDF",
    description: "The attached proposal",
  },
];

function PreviewTabCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200",
        "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/60",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        selected &&
          "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_oklch(0.76_0.15_88/20%)]"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors",
          selected && "bg-primary/20"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/70 bg-background/85 text-transparent group-hover:border-primary/45"
        )}
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </button>
  );
}

export function AdminQuotePreviewDialog({
  open,
  onOpenChange,
  quote,
  publicUrl,
  hasUnsavedChanges,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithRelations;
  publicUrl: string | null;
  hasUnsavedChanges: boolean;
  onSend?: () => void;
}) {
  const language = normalizeCustomerLanguage(quote.language);
  const [tab, setTab] = useState<PreviewTab>("page");
  const [device, setDevice] = useState<Device>("desktop");
  const [emailTexts, setEmailTexts] = useState<QuoteEmailTexts | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchQuoteEmailTexts().then((texts) => {
      if (!cancelled) setEmailTexts(texts);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pdfNames = useMemo(() => bilingualQuotePdfNames(quote), [quote]);
  const subject = buildDefaultQuoteEmailSubject(quote);
  const emailHtml = useMemo(() => {
    if (!emailTexts) return null;
    return buildQuoteReadyEmailParts({
      quote,
      publicQuoteUrl:
        publicUrl ||
        `https://www.thecurtainguy.com/quote/preview-${quote.opportunity_ref}`,
      bodyText: buildDefaultQuoteEmailBodyText({
        quote,
        emailNotes: emailTexts.notes,
      }),
      emailFooter: emailTexts.footer,
      pdfFilenames: pdfNames,
      lineItems: quote.line_items,
      assetBaseUrl: typeof window === "undefined" ? null : window.location.origin,
    }).html;
  }, [emailTexts, pdfNames, publicUrl, quote]);

  const version = encodeURIComponent(quote.updated_at ?? "");
  const pageSrc = `/quote/preview/${quote.id}?v=${version}`;
  const pdfSrc = `/api/quotes/${quote.id}/pdf?preview=1&v=${version}`;
  const openInTabHref = tab === "pdf" ? pdfSrc : tab === "page" ? pageSrc : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="xl"
        icon={Eye}
        eyebrow="Customer preview"
        title={`See it as ${quote.customer_name || "your customer"} will`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Exactly what goes out for {quote.opportunity_ref}. Buttons on the
            preview are disabled.
            <CustomerLanguageBadge language={language} />
          </span>
        }
        scrollBody={false}
        className="h-[min(92vh,940px)]"
        bodyClassName="gap-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {onSend ? (
              <Button
                type="button"
                disabled={hasUnsavedChanges}
                onClick={() => {
                  onOpenChange(false);
                  onSend();
                }}
              >
                <Send className="size-4" />
                Looks good — send quote
              </Button>
            ) : null}
          </>
        }
      >
        <div role="tablist" className="grid shrink-0 gap-2 sm:grid-cols-3">
          {TABS.map((item) => (
            <PreviewTabCard
              key={item.value}
              icon={item.icon}
              title={item.title}
              description={item.description}
              selected={tab === item.value}
              onSelect={() => setTab(item.value)}
            />
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          {hasUnsavedChanges ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-3.5" aria-hidden />
              Showing the last saved version — save to preview your edits.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {tab === "email"
                ? "Default message — you can still edit the text when sending."
                : "Live from the saved quote."}
            </p>
          )}
          <div className="flex items-center gap-2">
            {tab === "page" ? (
              <div className="flex rounded-full border border-border/50 bg-background/60 p-0.5">
                {(
                  [
                    { value: "desktop", icon: Monitor, label: "Desktop" },
                    { value: "mobile", icon: Smartphone, label: "Mobile" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={device === option.value}
                    onClick={() => setDevice(option.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      device === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <option.icon className="size-3.5" aria-hidden />
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            {openInTabHref ? (
              <Button asChild variant="ghost" size="sm">
                <a href={openInTabHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open in new tab
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {tab === "page" ? (
            <div
              className={cn(
                "h-full overflow-hidden border border-border/50 bg-background shadow-inner",
                device === "mobile"
                  ? "mx-auto w-[390px] max-w-full rounded-[2rem] border-4 border-foreground/80"
                  : "rounded-2xl"
              )}
            >
              <iframe
                key={`${pageSrc}-${device}`}
                title="Customer proposal page preview"
                src={pageSrc}
                className="size-full"
              />
            </div>
          ) : null}

          {tab === "email" ? (
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50">
              <dl className="grid shrink-0 gap-x-4 gap-y-1.5 border-b border-border/40 bg-card/60 px-4 py-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-xs font-medium text-muted-foreground">
                  To
                </dt>
                <dd className="truncate text-foreground">
                  {quote.customer_email || "No email on this quote"}
                </dd>
                <dt className="text-xs font-medium text-muted-foreground">
                  Subject
                </dt>
                <dd className="truncate font-medium text-foreground">
                  {subject}
                </dd>
                <dt className="text-xs font-medium text-muted-foreground">
                  Attached
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {pdfNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      <Paperclip className="size-3" aria-hidden />
                      {name}
                    </span>
                  ))}
                </dd>
              </dl>
              {emailHtml ? (
                <iframe
                  title="Customer email preview"
                  sandbox=""
                  srcDoc={emailHtml}
                  className="min-h-0 w-full flex-1 bg-[#0b0d12]"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center bg-[#0b0d12] text-sm text-[#8b909a]">
                  Loading email…
                </div>
              )}
            </div>
          ) : null}

          {tab === "pdf" ? (
            <div className="h-full overflow-hidden rounded-2xl border border-border/50 bg-muted/30">
              <iframe
                key={pdfSrc}
                title="Customer PDF preview"
                src={pdfSrc}
                className="size-full"
              />
            </div>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}
