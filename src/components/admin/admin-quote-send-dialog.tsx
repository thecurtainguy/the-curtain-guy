"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Paperclip,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { OpportunityFileItem } from "@/components/estimates/opportunity-files-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TEXT_DEFS } from "@/data/document-texts";
import {
  ESTIMATE_MAX_FILE_BYTES,
  formatFileSize,
  validateEstimateFileInput,
} from "@/lib/estimate-files-shared";
import {
  buildDefaultQuoteEmailBodyText,
  buildDefaultQuoteEmailSubject,
  buildQuoteReadyEmailParts,
  isValidEmailAddress,
  parseEmailList,
  quotePdfAttachmentName,
} from "@/lib/quote-email-compose";
import type { QuoteWithRelations } from "@/lib/quotes";
import { cn } from "@/lib/utils";

const DEFAULT_BCC = "admin@thecurtainguy.com";

type ExtraUpload = {
  id: string;
  file: File;
  saveToOpportunity: boolean;
};

function shortType(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType === "image/png") return "PNG";
  if (contentType === "image/jpeg") return "JPG";
  if (contentType === "image/webp") return "WEBP";
  return contentType.split("/").pop()?.toUpperCase() || "FILE";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

const defaultEmailNote =
  DOCUMENT_TEXT_DEFS.find((def) => def.slug === "quote.email_note")
    ?.defaultBody ?? "";
const defaultEmailFooter =
  DOCUMENT_TEXT_DEFS.find((def) => def.slug === "quote.email_footer")
    ?.defaultBody ?? "Montreal event drape rental · thecurtainguy.com";

export function AdminQuoteSendDialog({
  open,
  onOpenChange,
  quote,
  opportunityFiles,
  publicQuoteUrlPreview,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithRelations;
  opportunityFiles: OpportunityFileItem[];
  publicQuoteUrlPreview: string | null;
  onSent: (result: { publicUrl?: string; message?: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState(quote.customer_email || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState(DEFAULT_BCC);
  const [subject, setSubject] = useState(buildDefaultQuoteEmailSubject(quote));
  const [bodyText, setBodyText] = useState(
    buildDefaultQuoteEmailBodyText({ quote, emailNote: defaultEmailNote })
  );
  const [emailFooter, setEmailFooter] = useState(defaultEmailFooter);
  const [attachPdf, setAttachPdf] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [uploads, setUploads] = useState<ExtraUpload[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadedOpportunityFiles = useMemo(
    () =>
      opportunityFiles.filter(
        (file) =>
          file.upload_status === "uploaded" || file.upload_status === "pending"
      ),
    [opportunityFiles]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/document-texts");
        const json = (await response.json()) as {
          ok?: boolean;
          texts?: Array<{ slug: string; body: string }>;
        };
        if (!response.ok || !json.ok || cancelled) return;
        const note =
          json.texts?.find((item) => item.slug === "quote.email_note")?.body ||
          defaultEmailNote;
        const footer =
          json.texts?.find((item) => item.slug === "quote.email_footer")
            ?.body || defaultEmailFooter;
        setEmailFooter(footer);
        setBodyText(buildDefaultQuoteEmailBodyText({ quote, emailNote: note }));
      } catch {
        // Keep defaults from initial state.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mounted fresh each time the dialog opens (parent remount key).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot defaults load
  }, []);

  const previewUrl =
    publicQuoteUrlPreview ||
    `https://www.thecurtainguy.com/quote/preview-${quote.opportunity_ref}`;

  const pdfName = quotePdfAttachmentName(quote);
  const previewHtml = useMemo(() => {
    return buildQuoteReadyEmailParts({
      quote,
      publicQuoteUrl: previewUrl,
      bodyText,
      emailFooter,
      pdfFilename: attachPdf ? pdfName : null,
    }).html;
  }, [attachPdf, bodyText, emailFooter, pdfName, previewUrl, quote]);

  function toggleOpportunityFile(id: string) {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const next: ExtraUpload[] = [];
    for (const file of Array.from(fileList)) {
      const validation = validateEstimateFileInput({
        originalFileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
      });
      if (!validation.ok) {
        setError(validation.message);
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        saveToOpportunity: Boolean(quote.estimate_request_id),
      });
    }
    if (next.length) {
      setUploads((prev) => [...prev, ...next].slice(0, 5));
      setError(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    setError(null);
    const toList = parseEmailList(to);
    const ccList = parseEmailList(cc);
    const bccList = parseEmailList(bcc);
    if (toList.length === 0) {
      setError("Add at least one recipient in To.");
      return;
    }
    const invalid = [...toList, ...ccList, ...bccList].find(
      (email) => !isValidEmailAddress(email)
    );
    if (invalid) {
      setError(`Invalid email: ${invalid}`);
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!bodyText.trim()) {
      setError("Email body is required.");
      return;
    }

    setSending(true);
    try {
      const uploadPayload = [];
      for (const item of uploads) {
        const contentBase64 = await fileToBase64(item.file);
        uploadPayload.push({
          filename: item.file.name,
          contentBase64,
          contentType: item.file.type || "application/octet-stream",
          saveToOpportunity: item.saveToOpportunity,
        });
      }

      const response = await fetch(`/api/admin/quotes/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          cc,
          bcc,
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          attachPdf,
          opportunityFileIds: selectedFileIds,
          uploads: uploadPayload,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        publicUrl?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message || "Could not send quote.");
        return;
      }
      onSent({
        publicUrl: payload.publicUrl,
        message: payload.message,
      });
      onOpenChange(false);
    } catch {
      setError("Could not send quote.");
    } finally {
      setSending(false);
    }
  }

  const canSaveToOpportunity = Boolean(quote.estimate_request_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,920px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="border-b border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 py-4 sm:px-6">
          <DialogTitle className="font-heading text-xl">Send quote</DialogTitle>
          <DialogDescription>
            Compose the customer email, preview the HTML, and choose attachments
            before sending {quote.opportunity_ref}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="quote-send-to">To</Label>
                  <Input
                    id="quote-send-to"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="customer@email.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-send-cc">Cc</Label>
                  <Input
                    id="quote-send-cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="optional@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-send-bcc">Bcc</Label>
                  <Input
                    id="quote-send-bcc"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="admin@thecurtainguy.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="quote-send-subject">Subject</Label>
                  <Input
                    id="quote-send-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quote-send-body">Body</Label>
                <Textarea
                  id="quote-send-body"
                  rows={10}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="min-h-40 resize-y font-sans text-sm leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Plain text. Blank lines become paragraphs. Quote summary, CTA,
                  and footer stay in the branded HTML shell.
                </p>
              </div>

              <section className="rounded-2xl border border-border/50 bg-card/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Paperclip className="size-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Attachments
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF plus opportunity files and extras
                    </p>
                  </div>
                </div>

                <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-border accent-primary"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FileText className="size-3.5 text-primary" />
                      {pdfName}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Generated proposal PDF · always recommended
                    </span>
                  </span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    PDF
                  </span>
                </label>

                {uploadedOpportunityFiles.length > 0 ? (
                  <div className="mb-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Opportunity files
                    </p>
                    {uploadedOpportunityFiles.map((file) => {
                      const checked = selectedFileIds.includes(file.id);
                      const ready = file.upload_status === "uploaded";
                      return (
                        <label
                          key={file.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5",
                            checked
                              ? "border-primary/40 bg-primary/10"
                              : "border-border/40 bg-background/30",
                            !ready && "opacity-60"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 size-4 rounded border-border accent-primary"
                            checked={checked}
                            disabled={!ready}
                            onChange={() => toggleOpportunityFile(file.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {file.original_file_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size_bytes)}
                              {!ready ? " · uploading…" : ""}
                            </span>
                          </span>
                          <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {shortType(file.content_type)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-muted-foreground">
                    No opportunity files on this quote yet.
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Add files
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-3.5" />
                      Browse
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => onPickFiles(e.target.files)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    PDF, PNG, JPG, WEBP · max {formatFileSize(ESTIMATE_MAX_FILE_BYTES)} each
                  </p>
                  {uploads.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/40 bg-background/40 px-3 py-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(item.file.size)}
                          </span>
                        </span>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${item.file.name}`}
                          onClick={() =>
                            setUploads((prev) =>
                              prev.filter((entry) => entry.id !== item.id)
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {canSaveToOpportunity ? (
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            className="size-3.5 rounded border-border accent-primary"
                            checked={item.saveToOpportunity}
                            onChange={(e) =>
                              setUploads((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        saveToOpportunity: e.target.checked,
                                      }
                                    : entry
                                )
                              )
                            }
                          />
                          Also save to opportunity files
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Live HTML preview
              </p>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-[#0b0d12] shadow-inner">
                <iframe
                  title="Quote email preview"
                  className="h-[min(58vh,560px)] w-full bg-[#0b0d12]"
                  sandbox=""
                  srcDoc={previewHtml}
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/50 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            isLoading={sending}
            loadingText="Sending"
            onClick={() => void handleSend()}
            icon={<Send className="size-4" />}
          >
            Send quote
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
