"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Globe2,
  Languages,
  Paperclip,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { OpportunityFileItem } from "@/components/estimates/opportunity-files-panel";
import { RecipientInput } from "@/components/admin/recipient-input";
import { OptionCard } from "@/components/estimate/option-card";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import type { CustomerContactOption } from "@/data/customers";
import { linesMissingTranslation } from "@/data/quotes";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultQuoteEmailTexts,
  fetchQuoteEmailTexts,
} from "@/lib/quote-email-defaults";
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
  quotePdfNames,
} from "@/lib/quote-email-compose";
import type { QuoteWithRelations } from "@/lib/quotes";
import { cn } from "@/lib/utils";

const DEFAULT_BCC = "admin@thecurtainguy.com";

const LANGUAGE_NAMES = { fr: "French", en: "English" } as const;

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

export function AdminQuoteSendDialog({
  open,
  onOpenChange,
  quote,
  opportunityFiles,
  publicQuoteUrlPreview,
  defaultCc = [],
  contacts = [],
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithRelations;
  opportunityFiles: OpportunityFileItem[];
  publicQuoteUrlPreview: string | null;
  defaultCc?: string[];
  contacts?: CustomerContactOption[];
  onSent: (result: { publicUrl?: string; message?: string; emailSent?: boolean; to?: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseLanguage = normalizeCustomerLanguage(quote.language);
  const missingTranslations =
    linesMissingTranslation(quote.line_items ?? []).length +
    (quote.customer_notes?.trim() && !quote.customer_notes_translated?.trim() ? 1 : 0);
  const [bilingual, setBilingual] = useState(quote.bilingual !== false);
  const bilingualRef = useRef(bilingual);
  const composeQuote = useMemo(() => ({ ...quote, bilingual }), [quote, bilingual]);
  const [emailTexts, setEmailTexts] = useState(defaultQuoteEmailTexts);
  const [to, setTo] = useState(quote.customer_email || "");
  const [cc, setCc] = useState(defaultCc.join(", "));
  const [bcc, setBcc] = useState(DEFAULT_BCC);
  const [subject, setSubject] = useState(() => buildDefaultQuoteEmailSubject(composeQuote));
  const [bodyText, setBodyText] = useState(() =>
    buildDefaultQuoteEmailBodyText({ quote: composeQuote, emailNotes: emailTexts.notes })
  );
  const emailFooter = bilingual ? emailTexts.footer : emailTexts.footers[baseLanguage];
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
    void fetchQuoteEmailTexts().then((texts) => {
      if (cancelled) return;
      setEmailTexts(texts);
      setBodyText(
        buildDefaultQuoteEmailBodyText({
          quote: { ...quote, bilingual: bilingualRef.current },
          emailNotes: texts.notes,
        })
      );
    });
    return () => {
      cancelled = true;
    };
    // Mounted fresh each time the dialog opens (parent remount key).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot defaults load
  }, []);

  const previewUrl =
    publicQuoteUrlPreview ||
    `https://www.thecurtainguy.com/quote/preview-${quote.opportunity_ref}`;

  const pdfNames = useMemo(() => quotePdfNames(composeQuote), [composeQuote]);
  const previewHtml = useMemo(() => {
    return buildQuoteReadyEmailParts({
      quote: composeQuote,
      publicQuoteUrl: previewUrl,
      bodyText,
      emailFooter,
      pdfFilenames: attachPdf ? pdfNames : [],
      lineItems: quote.line_items,
      assetBaseUrl: typeof window === "undefined" ? null : window.location.origin,
    }).html;
  }, [attachPdf, bodyText, composeQuote, emailFooter, pdfNames, previewUrl, quote.line_items]);

  /** Switches languages; subject and body follow unless the owner edited them. */
  function chooseBilingual(next: boolean) {
    if (next === bilingual) return;
    const before = { ...quote, bilingual };
    const after = { ...quote, bilingual: next };
    if (subject.trim() === buildDefaultQuoteEmailSubject(before)) {
      setSubject(buildDefaultQuoteEmailSubject(after));
    }
    if (
      bodyText.trim() ===
      buildDefaultQuoteEmailBodyText({ quote: before, emailNotes: emailTexts.notes }).trim()
    ) {
      setBodyText(buildDefaultQuoteEmailBodyText({ quote: after, emailNotes: emailTexts.notes }));
    }
    bilingualRef.current = next;
    setBilingual(next);
    setError(null);
  }

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
          bilingual,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        publicUrl?: string;
        emailSent?: boolean;
      };
      if (!response.ok || !payload.ok) {
        const failure = payload.message || "Could not send quote.";
        setError(failure);
        toast.error(failure);
        return;
      }
      onSent({
        publicUrl: payload.publicUrl,
        message: payload.message,
        emailSent: payload.emailSent,
        to: toList.join(", "),
      });
      onOpenChange(false);
    } catch {
      setError("Could not send quote.");
      toast.error("Could not send quote.");
    } finally {
      setSending(false);
    }
  }

  const canSaveToOpportunity = Boolean(quote.estimate_request_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="xl"
        icon={Send}
        eyebrow="Quote email"
        title="Send quote"
        description={
          <>
            Compose the customer email, preview the HTML, and choose attachments
            before sending {quote.opportunity_ref}. The email goes out{" "}
            <span className="font-medium text-primary">
              {bilingual ? "French first, then English" : `in ${LANGUAGE_NAMES[baseLanguage]} only`}
            </span>
            {bilingual ? ", with both proposal PDFs." : "."}
          </>
        }
        footer={
          <>
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
          </>
        }
      >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-border/50 bg-card/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Languages className="size-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Language
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Email, PDF, quote page and signing
                    </p>
                  </div>
                </div>
                <div role="radiogroup" aria-label="Quote language" className="grid gap-2 sm:grid-cols-2">
                  <OptionCard
                    option={{
                      id: "bilingual",
                      label: "French + English",
                      description: "French first. Required for Québec customers.",
                      icon: Languages,
                    }}
                    selected={bilingual}
                    onSelect={() => chooseBilingual(true)}
                  />
                  <OptionCard
                    option={{
                      id: "single",
                      label: `${LANGUAGE_NAMES[baseLanguage]} only`,
                      description: "For customers outside Québec. No translation needed.",
                      icon: Globe2,
                    }}
                    selected={!bilingual}
                    onSelect={() => chooseBilingual(false)}
                  />
                </div>
                {bilingual && missingTranslations > 0 ? (
                  <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-200">
                    {missingTranslations} item{missingTranslations === 1 ? " has" : "s have"} no{" "}
                    {baseLanguage === "fr" ? "English" : "French"} version yet. Use “Translate missing” in
                    the quote, or send in {LANGUAGE_NAMES[baseLanguage]} only.
                  </p>
                ) : null}
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="quote-send-to">To</Label>
                  <RecipientInput
                    id="quote-send-to"
                    value={to}
                    onChange={setTo}
                    contacts={contacts}
                    usedElsewhere={{ Cc: cc }}
                    placeholder="customer@email.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="quote-send-cc">Cc</Label>
                  <RecipientInput
                    id="quote-send-cc"
                    value={cc}
                    onChange={setCc}
                    contacts={contacts}
                    usedElsewhere={{ To: to }}
                    placeholder={contacts.length > 1 ? "Click to pick other contacts" : "optional@email.com"}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="quote-send-bcc">Bcc</Label>
                  <RecipientInput
                    id="quote-send-bcc"
                    value={bcc}
                    onChange={setBcc}
                    contacts={[]}
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
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-foreground">
                      {pdfNames.map((name) => (
                        <span key={name} className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-primary" />
                          {name}
                        </span>
                      ))}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {bilingual
                        ? "French and English proposal PDFs · attaching the French PDF records that the French version was provided"
                        : `${LANGUAGE_NAMES[baseLanguage]} proposal PDF`}
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
                      const internal = file.customer_visible === false;
                      const checked = !internal && selectedFileIds.includes(file.id);
                      const ready = file.upload_status === "uploaded" && !internal;
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
                              {internal
                                ? " · internal, never sent to the customer"
                                : !ready
                                  ? " · uploading…"
                                  : ""}
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
      </BrandDialogContent>
    </Dialog>
  );
}
