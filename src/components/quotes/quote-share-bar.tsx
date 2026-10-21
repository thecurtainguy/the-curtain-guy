"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerLanguage } from "@/data/customer-language";
import { getQuoteCopy } from "@/data/quote-copy";
import { siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";

type QuoteShareBarProps = {
  shareUrl: string;
  quoteRef: string;
  className?: string;
  /** Taller glass-style actions for proposal rail */
  elevated?: boolean;
  language?: CustomerLanguage;
};

const elevatedBtn =
  "h-10 gap-2 rounded-2xl border-border/50 bg-background/75 px-3 text-sm font-medium text-foreground shadow-[0_3px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:border-primary/35 hover:bg-primary/[0.07] hover:text-foreground dark:bg-background/45 dark:shadow-[0_3px_12px_rgba(0,0,0,0.2)]";

export function QuoteShareBar({
  shareUrl,
  quoteRef,
  className,
  elevated = false,
  language = "en",
}: QuoteShareBarProps) {
  const [copied, setCopied] = useState(false);
  const t = getQuoteCopy(language);

  const subject = encodeURIComponent(`${quoteRef} · ${siteConfig.name}`);
  const body = encodeURIComponent(t.shareMailBody(siteConfig.name, shareUrl));
  const mailHref = `mailto:?subject=${subject}&body=${body}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    t.shareWhatsApp(quoteRef, siteConfig.name, shareUrl)
  )}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: quoteRef,
          text: t.shareNativeText(siteConfig.name),
          url: shareUrl,
        });
        return;
      } catch {
        /* user cancelled or share failed — fall through to copy */
      }
    }
    await copyLink();
  }

  if (elevated) {
    return (
      <div className={cn("grid grid-cols-2 gap-2.5", className)}>
        <Button
          type="button"
          variant="outline"
          className={cn(elevatedBtn, "w-full")}
          onClick={() => void copyLink()}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? t.copied : t.copyLink}
        </Button>
        <Button asChild variant="outline" className={cn(elevatedBtn, "w-full")}>
          <a href={mailHref}>
            <Mail className="size-4" />
            {t.email}
          </a>
        </Button>
        <Button asChild variant="outline" className={cn(elevatedBtn, "w-full")}>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(elevatedBtn, "w-full")}
          onClick={() => void nativeShare()}
        >
          <Share2 className="size-4" />
          {t.share}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void copyLink()}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? t.copied : t.copyLink}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={mailHref}>
          <Mail className="size-3.5" />
          {t.email}
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-3.5" />
          WhatsApp
        </a>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void nativeShare()}
      >
        <Share2 className="size-3.5" />
        {t.share}
      </Button>
    </div>
  );
}
