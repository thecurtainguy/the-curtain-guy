import type { CustomerLanguage } from "@/data/customer-language";
import { SIGNING_CODE_TTL_MINUTES } from "@/data/quote-signing";
import { getLocalizedDocumentTexts } from "@/lib/document-texts";
import { getEstimateNotifyTo, getQuoteFrom } from "@/lib/env";
import { brandQuoteEmailShell, escapeEmailHtml } from "@/lib/quote-email-compose";
import type { QuoteWithRelations } from "@/lib/quotes";
import { sendResendEmail } from "@/lib/resend";

const CODE_COPY = {
  en: {
    subject: (code: string, ref: string) => `${code} is your signing code — ${ref}`,
    title: "Your signing code",
    intro: (ref: string) => `Use this code to verify your identity and sign ${ref}.`,
    expires: `It expires in ${SIGNING_CODE_TTL_MINUTES} minutes. Never share it with anyone.`,
    ignore: "Didn’t request this? You can safely ignore this email.",
  },
  fr: {
    subject: (code: string, ref: string) => `${code} est votre code de signature — ${ref}`,
    title: "Votre code de signature",
    intro: (ref: string) => `Utilisez ce code pour confirmer votre identité et signer ${ref}.`,
    expires: `Il expire dans ${SIGNING_CODE_TTL_MINUTES} minutes. Ne le partagez avec personne.`,
    ignore: "Vous n’avez rien demandé? Vous pouvez ignorer ce courriel.",
  },
} as const;

const EXECUTED_COPY = {
  en: {
    subject: (ref: string) => `Fully executed agreement — ${ref}`,
    title: "Your agreement is fully executed",
    intro: (name: string, ref: string, signer: string) =>
      `Hi ${name}, ${signer} has countersigned ${ref} on behalf of The Curtain Guy. Your fully executed agreement with its audit certificate is attached.`,
    questions: "Questions? Just reply to this email.",
  },
  fr: {
    subject: (ref: string) => `Entente pleinement exécutée — ${ref}`,
    title: "Votre entente est pleinement exécutée",
    intro: (name: string, ref: string, signer: string) =>
      `Bonjour ${name}, ${signer} a contresigné ${ref} au nom de The Curtain Guy. Votre entente pleinement exécutée et son certificat d’audit sont joints.`,
    questions: "Des questions? Répondez simplement à ce courriel.",
  },
} as const;

export async function sendSigningCodeEmail(input: {
  apiKey: string;
  quote: QuoteWithRelations;
  email: string;
  code: string;
  language: CustomerLanguage;
}): Promise<void> {
  const c = CODE_COPY[input.language];
  const ref = input.quote.quote_display_ref;
  const texts = await getLocalizedDocumentTexts(input.language);
  const spaced = `${input.code.slice(0, 3)} ${input.code.slice(3)}`;
  const html = brandQuoteEmailShell(
    c.title,
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#d7d2c6;">${escapeEmailHtml(c.intro(ref))}</p>
    <div style="margin:0 0 18px;padding:18px;border-radius:16px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.35);text-align:center;">
      <span style="font-family:'Courier New',monospace;font-size:34px;letter-spacing:0.32em;color:#f8f5ec;font-weight:700;">${escapeEmailHtml(spaced)}</span>
    </div>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#cfc8b8;">${escapeEmailHtml(c.expires)}</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#8b909a;">${escapeEmailHtml(c.ignore)}</p>`,
    texts["quote.email_footer"],
    input.language
  );
  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    to: [input.email],
    replyTo: getEstimateNotifyTo(),
    subject: c.subject(input.code, ref),
    text: [c.title, "", c.intro(ref), "", spaced, "", c.expires, c.ignore].join("\n"),
    html,
    copyOutbound: false,
    logLabel: "signing",
  });
}

export async function sendAgreementExecutedEmail(input: {
  apiKey: string;
  quote: QuoteWithRelations;
  language: CustomerLanguage;
  countersignerName: string;
  pdf: { buffer: Buffer; filename: string };
  to: string[];
}): Promise<void> {
  const c = EXECUTED_COPY[input.language];
  const ref = input.quote.quote_display_ref;
  const texts = await getLocalizedDocumentTexts(input.language);
  const firstName = (input.quote.customer_name || "").trim().split(/\s+/)[0] || "";
  const intro = c.intro(firstName, ref, input.countersignerName).replace(/^(Hi|Bonjour) ,/, "$1,");
  const html = brandQuoteEmailShell(
    c.title,
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#d7d2c6;">${escapeEmailHtml(intro)}</p>
    <div style="padding:14px 16px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.18);font-size:13px;color:#f8f5ec;">${escapeEmailHtml(input.pdf.filename)}</div>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#8b909a;">${escapeEmailHtml(c.questions)}</p>`,
    texts["quote.email_footer"],
    input.language
  );
  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    to: input.to,
    replyTo: getEstimateNotifyTo(),
    subject: c.subject(ref),
    text: [c.title, "", intro, "", input.pdf.filename, c.questions].join("\n"),
    html,
    attachments: [
      {
        filename: input.pdf.filename,
        content: input.pdf.buffer.toString("base64"),
        contentType: "application/pdf",
      },
    ],
    logLabel: "signing",
  });
}
