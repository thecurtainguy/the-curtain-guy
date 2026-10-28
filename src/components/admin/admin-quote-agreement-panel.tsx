"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Download,
  FileSignature,
  Fingerprint,
  Globe2,
  Laptop,
  Mail,
  MapPin,
  Stamp,
} from "lucide-react";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  SignatureAdopter,
  adoptedSignatureImage,
} from "@/components/signing/signature-adopter";
import type { QuoteAgreementAudit, SignatureMethod } from "@/data/quote-signing";
import { cn } from "@/lib/utils";

function stamp(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-CA", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "America/Toronto",
      })
    : "—";
}

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "—";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /CriOS|Chrome\//.test(userAgent)
      ? "Chrome"
      : /FxiOS|Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : "";
  return [browser, os].filter(Boolean).join(" · ");
}

export function AdminQuoteAgreementPanel({
  quoteId,
  audit: auditProp,
  defaultCountersignerName,
}: {
  quoteId: string;
  audit: QuoteAgreementAudit;
  defaultCountersignerName: string;
}) {
  const router = useRouter();
  const [countersigned, setCountersigned] = useState<QuoteAgreementAudit | null>(null);
  const audit = countersigned ?? auditProp;
  const executed = audit.status === "countersigned";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultCountersignerName);
  const [title, setTitle] = useState("Owner");
  const [method, setMethod] = useState<SignatureMethod>("typed");
  const [drawnImage, setDrawnImage] = useState<string | null>(null);
  const [sendCopy, setSendCopy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfUrl = `/api/admin/quotes/${quoteId}/agreement`;

  async function countersign() {
    setError(null);
    if (name.trim().length < 2) return setError("Enter your full name.");
    setBusy(true);
    try {
      const signatureImage = await adoptedSignatureImage({ method, name, drawnImage });
      if (!signatureImage) throw new Error("Type or draw your signature.");
      const res = await fetch(`/api/admin/quotes/${quoteId}/countersign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), title: title.trim(), method, signatureImage, sendCopy }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        agreement?: QuoteAgreementAudit;
      } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Could not countersign.");
      if (data.agreement) setCountersigned(data.agreement);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not countersign.");
    } finally {
      setBusy(false);
    }
  }

  const auditRows: Array<{ icon: typeof Mail; label: string; value: string }> = [
    { icon: Mail, label: "Email verified", value: `${audit.signerEmail} · ${stamp(audit.verifiedAt)}` },
    { icon: Globe2, label: "IP address", value: audit.signerIp || "—" },
    { icon: Laptop, label: "Device", value: deviceLabel(audit.signerUserAgent) },
    { icon: MapPin, label: "Location", value: audit.signerLocation || "—" },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/25 p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(212,175,55,0.14),transparent_55%)]"
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <FileSignature className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold">E-signed agreement</h2>
            <p className="text-xs text-muted-foreground">
              {audit.signerName}
              {audit.signerTitle ? ` · ${audit.signerTitle}` : ""} · {stamp(audit.signedAt)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              executed
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {executed ? <BadgeCheck className="size-3" /> : <Stamp className="size-3" />}
            {executed ? "Fully executed" : "Needs countersign"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#fbf8f1] p-2.5">
          {[
            { party: "Client", image: audit.signatureImage, name: audit.signerName },
            { party: "The Curtain Guy", image: executed ? audit.countersignImage : null, name: audit.countersignerName },
          ].map((block) => (
            <div key={block.party} className="rounded-lg border border-[#14121a]/10 bg-white/70 p-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8a6d1d]">{block.party}</p>
              <div className="flex h-12 items-end border-b border-[#14121a]/50">
                {block.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL signature
                  <img src={block.image} alt={block.name ?? block.party} className="max-h-11 max-w-full object-contain" />
                ) : (
                  <span className="pb-1 text-[11px] italic text-[#14121a]/40">Pending</span>
                )}
              </div>
              <p className="mt-1 truncate text-[11px] font-medium text-[#14121a]">{block.name || "—"}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-1.5">
          {audit.acknowledgements.map((item) => (
            <div key={item.key} className="flex items-center gap-2 rounded-lg border border-border/35 bg-background/30 px-2.5 py-1.5 text-xs">
              <span className="rounded border border-primary/40 px-1.5 font-semibold text-primary">{audit.initials}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{stamp(item.initialed_at)}</span>
            </div>
          ))}
        </div>

        <dl className="grid gap-1.5 text-xs">
          {auditRows.map((row) => (
            <div key={row.label} className="flex items-start gap-2">
              <row.icon className="mt-0.5 size-3.5 shrink-0 text-primary/80" aria-hidden />
              <dt className="w-24 shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 flex-1 break-words text-foreground">{row.value}</dd>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <Fingerprint className="mt-0.5 size-3.5 shrink-0 text-primary/80" aria-hidden />
            <dt className="w-24 shrink-0 text-muted-foreground">SHA-256</dt>
            <dd className="min-w-0 flex-1 break-all font-mono text-[10px] text-foreground">{audit.documentHash}</dd>
          </div>
          {executed ? (
            <div className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
              <dt className="w-24 shrink-0 text-muted-foreground">Countersigned</dt>
              <dd className="min-w-0 flex-1 text-foreground">
                {audit.countersignerName} · {stamp(audit.countersignedAt)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className={cn("grid gap-2", executed ? "grid-cols-1" : "grid-cols-2")}>
          {!executed ? (
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              <Stamp className="size-4" />
              Countersign
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" />
              Signed PDF
            </a>
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => (busy ? null : setOpen(next))}>
        <BrandDialogContent
          eyebrow="Countersignature"
          title="Countersign the agreement"
          description={`Fully execute ${audit.signerName}'s signed agreement on behalf of The Curtain Guy.`}
          icon={Stamp}
          size="md"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <LoadingButton
                type="button"
                isLoading={busy}
                loadingText="Countersigning…"
                icon={<FileSignature className="size-4" />}
                onClick={countersign}
              >
                Countersign
              </LoadingButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="countersign-name">Full name</Label>
                <Input id="countersign-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="countersign-title">Title</Label>
                <Input id="countersign-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
            </div>
            <SignatureAdopter
              name={name}
              method={method}
              onMethodChange={(next) => {
                setMethod(next);
                setDrawnImage(null);
              }}
              drawnImage={drawnImage}
              onDrawnChange={setDrawnImage}
              labels={{
                typeTab: "Type",
                drawTab: "Draw",
                drawHint: "Sign with your finger or mouse",
                clear: "Clear",
                caption: `${name.trim() || "—"}${title.trim() ? `, ${title.trim()}` : ""} · The Curtain Guy`,
              }}
            />
            <button
              type="button"
              role="checkbox"
              aria-checked={sendCopy}
              onClick={() => setSendCopy((value) => !value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-sm transition",
                sendCopy ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card/40"
              )}
            >
              <Mail className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="flex-1">Email the fully executed agreement to {audit.signerEmail}</span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  sendCopy ? "border-primary bg-primary text-primary-foreground" : "border-border/60"
                )}
                aria-hidden
              >
                {sendCopy ? <BadgeCheck className="size-3" /> : null}
              </span>
            </button>
            {error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </BrandDialogContent>
      </Dialog>
    </section>
  );
}
