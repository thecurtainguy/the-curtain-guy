"use client";

import { Eye } from "lucide-react";
import type { DocumentPreviewKind } from "@/data/document-texts";
import { siteConfig } from "@/data/site";
import { QuoteTermsList } from "@/components/quotes/quote-terms-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function PdfPaper({
  children,
  footer,
  highlightFooter,
}: {
  children: React.ReactNode;
  footer: string;
  highlightFooter?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e8e0d4] bg-[#fffdf9] text-[#1a1612] shadow-[0_16px_40px_rgba(26,22,18,0.18)]">
      <div className="flex items-center gap-3 bg-[#14121a] px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[10px] font-semibold tracking-wide text-[#14121a]">
          TCG
        </span>
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#c4a035]">
            {siteConfig.name}
          </p>
          <p className="font-heading text-sm text-white">Proposal preview</p>
        </div>
      </div>
      <div className="min-h-[220px] px-5 py-5">{children}</div>
      <div
        className={cn(
          "flex items-end justify-between gap-4 border-t border-[#e8e0d4] px-5 py-3 text-[10px] leading-relaxed text-[#9a9186]",
          highlightFooter && "bg-[#f5efe0] ring-1 ring-inset ring-[#c4a035]/40"
        )}
      >
        <p className="max-w-[70%] whitespace-pre-wrap">
          {siteConfig.name} · {siteConfig.email} · {siteConfig.phone} ·{" "}
          {siteConfig.location}
          {"\n"}
          {footer}
        </p>
        <p className="text-right">
          Generated preview
          {"\n"}
          {siteConfig.domain}
        </p>
      </div>
    </div>
  );
}

function EmailShell({
  title,
  children,
  footer,
  highlightFooter,
}: {
  title: string;
  children: React.ReactNode;
  footer: string;
  highlightFooter?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/25 bg-[#0b0d12] p-4">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-[#151922] to-[#0f1218] p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
          {siteConfig.name}
        </p>
        <h3 className="mt-1 font-heading text-xl text-[#f8f5ec]">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
      <p
        className={cn(
          "mt-3 text-center text-xs text-[#8b909a]",
          highlightFooter &&
            "rounded-lg bg-primary/10 px-3 py-2 text-primary ring-1 ring-primary/30"
        )}
      >
        {footer}
      </p>
    </div>
  );
}

function PreviewBody({
  kind,
  body,
  pdfFooter,
}: {
  kind: DocumentPreviewKind;
  body: string;
  pdfFooter?: string;
}) {
  if (kind === "pdf_terms") {
    return (
      <PdfPaper footer={pdfFooter || "Planning proposal only."}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6d1d]">
          Terms & conditions
        </p>
        <div className="mt-3">
          <QuoteTermsList terms={body} compact tone="paper" />
        </div>
      </PdfPaper>
    );
  }

  if (kind === "pdf_footer") {
    return (
      <PdfPaper footer={body || "—"} highlightFooter>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6d1d]">
          Terms & conditions
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[#6b635a]">
          Numbered terms print above this footer on the proposal PDF.
        </p>
      </PdfPaper>
    );
  }

  if (kind === "email_note") {
    return (
      <EmailShell title="Your proposal is ready" footer={siteConfig.domain}>
        <p className="text-sm leading-relaxed text-[#d7d2c6]">
          Review, request changes, or add options. No payment is collected on
          this page.
        </p>
        <p className="mt-4 rounded-xl border border-primary/20 bg-white/5 px-3 py-3 text-xs leading-relaxed text-[#8b909a]">
          {body}
        </p>
      </EmailShell>
    );
  }

  if (kind === "email_footer") {
    return (
      <EmailShell title="Your proposal is ready" footer={body} highlightFooter>
        <p className="text-sm leading-relaxed text-[#d7d2c6]">
          Small print under the branded quote email.
        </p>
      </EmailShell>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#f4f4f5]">
      <div className="bg-[#111827] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          {siteConfig.name}
        </p>
        <p className="mt-1 font-heading text-lg text-white">Estimate email</p>
      </div>
      <div className="bg-white px-5 py-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          {body}
        </div>
      </div>
    </div>
  );
}

export function DocumentTextPreviewButton({
  kind,
  label,
  body,
  pdfFooter,
}: {
  kind: DocumentPreviewKind;
  label: string;
  body: string;
  pdfFooter?: string;
}) {
  const isPdf = kind === "pdf_terms" || kind === "pdf_footer";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Eye className="size-3.5" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-primary/20 bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {isPdf
              ? "How this copy lands on the proposal PDF. One term per line becomes a numbered list."
              : "How this copy appears on the generated email."}
          </DialogDescription>
        </DialogHeader>
        <PreviewBody kind={kind} body={body} pdfFooter={pdfFooter} />
      </DialogContent>
    </Dialog>
  );
}
