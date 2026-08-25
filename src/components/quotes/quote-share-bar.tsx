"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";

type QuoteShareBarProps = {
  shareUrl: string;
  quoteRef: string;
  className?: string;
};

export function QuoteShareBar({
  shareUrl,
  quoteRef,
  className,
}: QuoteShareBarProps) {
  const [copied, setCopied] = useState(false);

  const subject = encodeURIComponent(`${quoteRef} · ${siteConfig.name}`);
  const body = encodeURIComponent(
    `Here is the draping proposal from ${siteConfig.name}:\n\n${shareUrl}`
  );
  const mailHref = `mailto:?subject=${subject}&body=${body}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${quoteRef} from ${siteConfig.name}: ${shareUrl}`
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
          text: `Draping proposal from ${siteConfig.name}`,
          url: shareUrl,
        });
        return;
      } catch {
        /* user cancelled or share failed — fall through to copy */
      }
    }
    await copyLink();
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
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={mailHref}>
          <Mail className="size-3.5" />
          Email
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
        Share
      </Button>
    </div>
  );
}
