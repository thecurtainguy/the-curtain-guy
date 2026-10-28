import { BadgeCheck, Download, FileSignature, Fingerprint, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customerLocaleTag, type CustomerLanguage } from "@/data/customer-language";
import { QUOTE_SIGNING_COPY, type QuoteAgreementSummary } from "@/data/quote-signing";
import { siteConfig } from "@/data/site";
import { cn } from "@/lib/utils";

function SignatureBlock({
  party,
  image,
  name,
  title,
  date,
  pending,
}: {
  party: string;
  image: string | null;
  name: string | null;
  title: string | null;
  date: string | null;
  pending?: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-[#14121a]/10 bg-white/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6d1d]">{party}</p>
      <div className="mt-2 flex h-20 items-end border-b border-[#14121a]/60 pb-1">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL signature
          <img src={image} alt={name ?? party} className="max-h-[4.5rem] max-w-full object-contain" />
        ) : (
          <span className="pb-2 text-sm italic text-[#14121a]/40">{pending}</span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#14121a]">{name || "—"}</p>
      {title ? <p className="text-xs text-[#14121a]/60">{title}</p> : null}
      {date ? <p className="text-xs text-[#14121a]/60">{date}</p> : null}
    </div>
  );
}

export function QuoteAgreementCard({
  agreement,
  language,
  pdfUrl,
}: {
  agreement: QuoteAgreementSummary;
  language: CustomerLanguage;
  pdfUrl: string | null;
}) {
  const s = QUOTE_SIGNING_COPY[language];
  const locale = customerLocaleTag(language);
  const executed = agreement.status === "countersigned";
  const stamp = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(locale, {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "America/Toronto",
        })
      : null;

  return (
    <section className="relative overflow-hidden rounded-[min(var(--radius-4xl),24px)] border border-primary/30 bg-card/25 ring-1 ring-foreground/5">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(212,175,55,0.16),transparent_55%)]"
        aria-hidden
      />
      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <FileSignature className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              {s.agreementTitle}
            </p>
            <p className="mt-1 font-heading text-xl font-semibold text-foreground">
              {s.signedBy} {agreement.signerName}
            </p>
            <p className="text-xs text-muted-foreground">{stamp(agreement.signedAt)}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              executed
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {executed ? <BadgeCheck className="size-3.5" aria-hidden /> : <Stamp className="size-3.5" aria-hidden />}
            {executed ? s.fullyExecuted : s.awaitingCountersign}
          </span>
        </div>

        <div className="rounded-2xl bg-[#fbf8f1] p-3 shadow-[0_24px_60px_-40px_rgba(212,175,55,0.7)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SignatureBlock
              party="Client"
              image={agreement.signatureImage}
              name={agreement.signerName}
              title={agreement.signerTitle}
              date={stamp(agreement.signedAt)}
            />
            <SignatureBlock
              party={siteConfig.name}
              image={executed ? agreement.countersignImage : null}
              name={agreement.countersignerName}
              title={agreement.countersignerTitle}
              date={stamp(agreement.countersignedAt)}
              pending={s.awaitingCountersign}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <Fingerprint className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate" title={agreement.documentHash}>
              {s.fingerprint}: {agreement.documentHash}
            </span>
          </p>
          {pdfUrl ? (
            <Button asChild className="rounded-full">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
                {s.downloadSigned}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
