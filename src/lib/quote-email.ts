import {
  formatMoneyFromCents,
  formatQuoteDisplayRef,
  quoteDocumentLanguages,
  resolveQuoteDisplayRef,
  type QuoteRow,
} from "@/data/quotes";
import {
  getEstimateNotifyTo,
  getQuoteFrom,
  getSiteUrl,
} from "@/lib/env";
import {
  customerLocaleTag,
  normalizeCustomerLanguage,
  type CustomerLanguage,
} from "@/data/customer-language";
import { customerCcEmails } from "@/data/customers";
import { formatQuoteDate, labelWithColon } from "@/data/quote-copy";
import { QUOTE_PAYMENT_COPY, quotePaymentRows } from "@/data/quote-payment-terms";
import { listCustomerContacts } from "@/lib/customers";
import {
  getDocumentTextsMap,
  getLocalizedDocumentTexts,
} from "@/lib/document-texts";
import {
  QUOTE_EMAIL_LANGUAGES,
  brandQuoteEmailShell,
  buildDefaultQuoteEmailBodyText,
  buildDefaultQuoteEmailSubject,
  buildQuoteReadyEmailParts,
  escapeEmailHtml,
  joinBilingual,
  quotePdfAttachmentName,
  quoteUrlInLanguage,
} from "@/lib/quote-email-compose";
import { withLinkChannel } from "@/data/link-channel";
import { withOwnerCopySource } from "@/lib/document-views";
import { recordEmailMessage } from "@/lib/email-tracking";
import { renderQuotePdfBuffer } from "@/lib/quote-pdf";
import {
  localizeQuote,
  toCustomerSafeQuote,
  type QuoteWithRelations,
} from "@/lib/quotes";
import {
  sendResendEmail,
  type ResendEmailAttachment,
} from "@/lib/resend";

export type QuoteReadyComposeOptions = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  attachPdf?: boolean;
  extraAttachments?: ResendEmailAttachment[];
  /** When false, do not auto-BCC admin (compose Bcc field is source of truth). */
  copyOutbound?: boolean;
  /** Archive inboxes that get their own copy, so their clicks are not counted as customer views. */
  ownerCopyTo?: string[];
};

export async function sendQuoteReadyEmail(input: {
  apiKey: string;
  quote: QuoteWithRelations;
  publicQuoteUrl: string;
  compose?: QuoteReadyComposeOptions;
}): Promise<{ pdfLanguages: CustomerLanguage[] }> {
  const { quote, publicQuoteUrl, apiKey, compose } = input;
  const languages = quoteDocumentLanguages(quote);
  const [frTexts, enTexts] = await Promise.all(
    QUOTE_EMAIL_LANGUAGES.map((lang) => getLocalizedDocumentTexts(lang))
  );
  const emailFooter = joinBilingual(
    {
      fr: frTexts["quote.email_footer"],
      en: enTexts["quote.email_footer"],
    },
    " · ",
    languages
  );
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const attachPdf = compose?.attachPdf !== false;

  const bodyText =
    compose?.bodyText?.trim() ||
    buildDefaultQuoteEmailBodyText({
      quote,
      emailNotes: { fr: frTexts["quote.email_note"], en: enTexts["quote.email_note"] },
    });
  const subject =
    compose?.subject?.trim() || buildDefaultQuoteEmailSubject(quote);
  const to = (compose?.to?.length ? compose.to : [quote.customer_email]).filter(
    Boolean
  );
  if (to.length === 0) {
    throw new Error("Recipient email is required.");
  }

  const attachments: ResendEmailAttachment[] = [
    ...(compose?.extraAttachments ?? []),
  ];

  const pdfLanguages: CustomerLanguage[] = [];
  const pdfNames: string[] = [];
  if (attachPdf) {
    const pdfs: ResendEmailAttachment[] = [];
    for (const lang of languages) {
      try {
        const safe = toCustomerSafeQuote(await localizeQuote(quote, lang), {
          shareUrl: quoteUrlInLanguage(publicQuoteUrl, lang),
        });
        const pdfBuffer = await renderQuotePdfBuffer({
          quote: safe,
          publicUrl: quoteUrlInLanguage(publicQuoteUrl, lang),
          siteUrl,
        });
        const filename = quotePdfAttachmentName(quote, lang);
        pdfs.push({
          filename,
          content: pdfBuffer.toString("base64"),
          contentType: "application/pdf",
        });
        pdfLanguages.push(lang);
        pdfNames.push(filename);
      } catch (err) {
        console.error(`[quotes] ${lang} PDF attach failed`, err);
      }
    }
    attachments.unshift(...pdfs);
  }

  const buildParts = (url: string) => {
    const { text, html } = buildQuoteReadyEmailParts({
      quote,
      publicQuoteUrl: url,
      bodyText,
      emailFooter,
      pdfFilenames: pdfNames,
      lineItems: quote.line_items,
      assetBaseUrl: siteUrl,
    });
    return { text, html };
  };
  const cc = compose?.cc?.filter(Boolean) ?? [];
  const bcc = compose?.bcc?.filter(Boolean) ?? [];

  const sent = await sendResendEmail({
    apiKey,
    from: getQuoteFrom(),
    to,
    cc,
    bcc,
    replyTo: getEstimateNotifyTo(),
    subject,
    ...buildParts(withLinkChannel(publicQuoteUrl, "email")),
    attachments: attachments.length > 0 ? attachments : undefined,
    copyOutbound: compose?.copyOutbound,
    logLabel: "quotes",
  });
  await recordEmailMessage({
    resendId: sent.id,
    target: { quoteId: quote.id },
    audience: "customer",
    to,
    cc,
    bcc,
    subject,
  });

  const ownerCopyTo = compose?.ownerCopyTo?.filter(Boolean) ?? [];
  if (ownerCopyTo.length === 0) return { pdfLanguages };
  try {
    const copy = await sendResendEmail({
      apiKey,
      from: getQuoteFrom(),
      to: ownerCopyTo,
      replyTo: getEstimateNotifyTo(),
      subject,
      ...buildParts(withOwnerCopySource(publicQuoteUrl)),
      attachments: attachments.length > 0 ? attachments : undefined,
      copyOutbound: false,
      logLabel: "quotes",
    });
    await recordEmailMessage({
      resendId: copy.id,
      target: { quoteId: quote.id },
      audience: "owner_copy",
      to: ownerCopyTo,
      subject,
    });
  } catch (err) {
    console.error("[quotes] owner archive copy failed", err);
  }
  return { pdfLanguages };
}

const QUOTE_ACCEPTED_COPY = {
  en: {
    subject: (ref: string) => `Proposal accepted — ${ref}`,
    title: "Thank you — your proposal is accepted",
    intro: (name: string, ref: string) =>
      `Hi ${name}, thank you for accepting proposal ${ref}. Here is a copy for your records.`,
    proposal: "Proposal",
    acceptedBy: "Accepted by",
    acceptedOn: "Accepted on",
    eventDate: "Event date",
    venue: "Venue",
    total: "Total",
    nextTitle: "What happens next",
    nextWithDeposit:
      "We’ll send your deposit invoice shortly, then confirm delivery, installation, and teardown with you.",
    nextNoDeposit:
      "Our team will confirm delivery, installation, and teardown with you shortly.",
    button: "View your proposal",
    pdfNote: (file: string) => `The accepted proposal is attached (${file}).`,
    questions: "Questions? Just reply to this email.",
  },
  fr: {
    subject: (ref: string) => `Soumission acceptée — ${ref}`,
    title: "Merci — votre soumission est acceptée",
    intro: (name: string, ref: string) =>
      `Bonjour ${name}, merci d’avoir accepté la soumission ${ref}. Voici une copie pour vos dossiers.`,
    proposal: "Soumission",
    acceptedBy: "Acceptée par",
    acceptedOn: "Acceptée le",
    eventDate: "Date de l’événement",
    venue: "Lieu",
    total: "Total",
    nextTitle: "Prochaines étapes",
    nextWithDeposit:
      "Nous vous enverrons votre facture de dépôt sous peu, puis confirmerons avec vous la livraison, l’installation et le démontage.",
    nextNoDeposit:
      "Notre équipe confirmera avec vous la livraison, l’installation et le démontage sous peu.",
    button: "Voir ma soumission",
    pdfNote: (file: string) => `La soumission acceptée est jointe (${file}).`,
    questions: "Des questions? Répondez simplement à ce courriel.",
  },
} as const;

const QUOTE_SIGNED_COPY = {
  en: {
    subject: (ref: string) => `Agreement signed — ${ref}`,
    title: "Your agreement is signed",
    intro: (name: string, ref: string) =>
      `Hi ${name}, thank you for signing proposal ${ref}. Your signed agreement and its audit certificate are attached for your records. The Curtain Guy will countersign shortly to fully execute it.`,
    acceptedBy: "Signed by",
    acceptedOn: "Signed on",
    fingerprint: "Fingerprint",
    pdfNote: (file: string) => `Signed agreement with audit certificate attached (${file}).`,
  },
  fr: {
    subject: (ref: string) => `Entente signée — ${ref}`,
    title: "Votre entente est signée",
    intro: (name: string, ref: string) =>
      `Bonjour ${name}, merci d’avoir signé la soumission ${ref}. Votre entente signée et son certificat d’audit sont joints pour vos dossiers. The Curtain Guy la contresignera sous peu pour la rendre pleinement exécutée.`,
    acceptedBy: "Signée par",
    acceptedOn: "Signée le",
    fingerprint: "Empreinte",
    pdfNote: (file: string) => `Entente signée avec certificat d’audit jointe (${file}).`,
  },
} as const;

type QuoteAcceptedEmailInput = {
  quote: QuoteWithRelations;
  proposalUrl: string;
  acceptedByName: string;
  /** Extra recipient, e.g. the signed-in portal user when it differs from the quote email. */
  alsoTo?: string | null;
  /** Language the customer accepted in; defaults to the agreed, then the quote language. */
  language?: CustomerLanguage;
  /** E-signed agreement PDF; replaces the plain proposal attachment and switches to signed wording. */
  signedAgreement?: { buffer: Buffer; filename: string; documentHash: string } | null;
};

/** Customer-facing receipt after they accept a quote on the public link or in the portal. */
export async function sendQuoteAcceptedCustomerEmail(
  input: QuoteAcceptedEmailInput & { apiKey: string }
): Promise<void> {
  const email = await buildQuoteAcceptedCustomerEmail(input);
  if (!email) return;
  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    replyTo: getEstimateNotifyTo(),
    logLabel: "quotes",
    ...email,
  });
}

export async function buildQuoteAcceptedCustomerEmail(input: QuoteAcceptedEmailInput): Promise<{
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: ResendEmailAttachment[];
} | null> {
  const { proposalUrl, acceptedByName } = input;
  const emailUrl = withLinkChannel(proposalUrl, "email");
  const language =
    input.language ?? normalizeCustomerLanguage(input.quote.agreed_language ?? input.quote.language);
  const quote = await localizeQuote(input.quote, language);
  const to = [quote.customer_email, input.alsoTo]
    .map((email) => (email || "").trim().toLowerCase())
    .filter((email, index, list) => email && list.indexOf(email) === index);
  if (to.length === 0) return null;

  const signed = input.signedAgreement ?? null;
  const c = signed
    ? { ...QUOTE_ACCEPTED_COPY[language], ...QUOTE_SIGNED_COPY[language] }
    : QUOTE_ACCEPTED_COPY[language];
  const colon = (label: string) => labelWithColon(label, language);
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  // "TCG-10007" / "TCG-10007-R1" without the "Quote" / "Soumission" word; the copy supplies it.
  const displayRef = formatQuoteDisplayRef(quote.opportunity_ref, quote.revision_number).replace(
    /^\S+\s+/,
    ""
  );
  const copy = await getLocalizedDocumentTexts(language);

  const contacts = quote.customer_id ? await listCustomerContacts(quote.customer_id) : [];
  const cc = customerCcEmails(contacts, "quotes", to);

  const acceptedOn = new Intl.DateTimeFormat(customerLocaleTag(language), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  }).format(quote.accepted_at ? new Date(quote.accepted_at) : new Date());
  const eventDate = quote.event_date ? formatQuoteDate(quote.event_date, language, "") : "";
  const venue = [quote.venue_name, quote.venue_address].filter(Boolean).join(" — ");
  const total = formatMoneyFromCents(quote.total_cents, language, quote.currency);
  const paymentRows = quotePaymentRows(quote, language);
  const paymentCopy = QUOTE_PAYMENT_COPY[language];
  const firstName = (quote.customer_name || acceptedByName).trim().split(/\s+/)[0] || acceptedByName;

  const summary: Array<[string, string]> = [
    [c.proposal, displayRef],
    [c.acceptedBy, acceptedByName],
    [c.acceptedOn, acceptedOn],
    ...(eventDate ? ([[c.eventDate, eventDate]] as Array<[string, string]>) : []),
    ...(venue ? ([[c.venue, venue]] as Array<[string, string]>) : []),
    [c.total, total],
    ...(signed
      ? ([[QUOTE_SIGNED_COPY[language].fingerprint, `${signed.documentHash.slice(0, 16)}…`]] as Array<
          [string, string]
        >)
      : []),
  ];
  const nextStep = paymentRows.some((row) => row.key === "deposit")
    ? c.nextWithDeposit
    : c.nextNoDeposit;

  const attachments: ResendEmailAttachment[] = [];
  const pdfFilename = signed?.filename ?? quotePdfAttachmentName(quote);
  if (signed) {
    attachments.push({
      filename: signed.filename,
      content: signed.buffer.toString("base64"),
      contentType: "application/pdf",
    });
  } else {
    try {
      const safe = toCustomerSafeQuote(quote, { shareUrl: proposalUrl });
      const pdfBuffer = await renderQuotePdfBuffer({ quote: safe, publicUrl: proposalUrl, siteUrl });
      attachments.push({
        filename: pdfFilename,
        content: pdfBuffer.toString("base64"),
        contentType: "application/pdf",
      });
    } catch (err) {
      console.error("[quotes] accepted PDF attach failed; sending without PDF", err);
    }
  }

  const text = [
    c.title,
    "",
    c.intro(firstName, displayRef),
    "",
    ...summary.map(([label, value]) => `${colon(label)} ${value}`),
    ...(paymentRows.length
      ? [
          "",
          paymentCopy.title,
          ...paymentRows.map(
            (row) =>
              `${row.label}: ${formatMoneyFromCents(row.amountCents, language, quote.currency)} — ${row.due}`
          ),
        ]
      : []),
    "",
    c.nextTitle,
    nextStep,
    "",
    `${c.button}: ${emailUrl}`,
    attachments.length ? c.pdfNote(pdfFilename) : "",
    c.questions,
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  const summaryRows = summary
    .map(
      ([label, value]) => `<tr>
        <td style="padding:7px 12px 7px 16px;font-size:13px;color:#8b909a;vertical-align:top;white-space:nowrap;">${escapeEmailHtml(label)}</td>
        <td style="padding:7px 16px 7px 0;font-size:14px;color:#f8f5ec;text-align:right;">${escapeEmailHtml(value)}</td>
      </tr>`
    )
    .join("");
  const paymentHtml = paymentRows.length
    ? `<p style="margin:22px 0 8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#d4af37;">${escapeEmailHtml(paymentCopy.title)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${paymentRows
          .map(
            (row) => `<tr>
          <td style="padding:10px 0;border-top:1px solid rgba(212,175,55,0.18);">
            <div style="font-size:14px;color:#f8f5ec;">${escapeEmailHtml(row.label)}</div>
            <div style="margin-top:2px;font-size:12px;color:#8b909a;">${escapeEmailHtml(row.due)}</div>
          </td>
          <td style="padding:10px 0;border-top:1px solid rgba(212,175,55,0.18);text-align:right;font-size:15px;color:#d4af37;white-space:nowrap;">${escapeEmailHtml(formatMoneyFromCents(row.amountCents, language, quote.currency))}</td>
        </tr>`
          )
          .join("")}
      </table>`
    : "";

  const html = brandQuoteEmailShell(
    c.title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d7d2c6;">${escapeEmailHtml(c.intro(firstName, displayRef))}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.18);">
      ${summaryRows}
    </table>
    ${paymentHtml}
    <p style="margin:22px 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#d4af37;">${escapeEmailHtml(c.nextTitle)}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#cfc8b8;">${escapeEmailHtml(nextStep)}</p>
    <a href="${escapeEmailHtml(emailUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">${escapeEmailHtml(c.button)}</a>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#8b909a;">
      ${attachments.length ? `${escapeEmailHtml(c.pdfNote(pdfFilename))}<br/>` : ""}${escapeEmailHtml(c.questions)}
    </p>`,
    copy["quote.email_footer"],
    language
  );

  return {
    to,
    cc: cc.length ? cc : undefined,
    subject: c.subject(displayRef),
    text,
    html,
    attachments: attachments.length ? attachments : undefined,
  };
}

export async function sendQuoteOwnerActionNotification(input: {
  apiKey: string;
  quote: QuoteRow;
  actionLabel: string;
  details?: string | null;
}): Promise<void> {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const adminUrl = `${siteUrl}/admin/quotes/${input.quote.id}`;
  const displayRef = resolveQuoteDisplayRef(input.quote);
  const text = [
    `Customer action on ${displayRef}`,
    `Action: ${input.actionLabel}`,
    input.details || "",
    `Customer: ${input.quote.customer_name || "—"} <${input.quote.customer_email}>`,
    `Total: ${formatMoneyFromCents(input.quote.total_cents, "en", input.quote.currency)} ${input.quote.currency || "CAD"}`,
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = await getDocumentTextsMap();
  const html = brandQuoteEmailShell(
    "Quote activity",
    `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#d7d2c6;">
      ${escapeEmailHtml(input.actionLabel)} on <strong style="color:#f8f5ec;">${escapeEmailHtml(displayRef)}</strong>
    </p>
    ${
      input.details
        ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#cfc8b8;">${escapeEmailHtml(input.details)}</p>`
        : ""
    }
    <p style="margin:0 0 16px;font-size:14px;color:#cfc8b8;">
      ${escapeEmailHtml(input.quote.customer_name || "Customer")} · ${escapeEmailHtml(input.quote.customer_email)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;color:#d4af37;">
      ${escapeEmailHtml(formatMoneyFromCents(input.quote.total_cents, "en", input.quote.currency))}
    </p>
    <a href="${escapeEmailHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
      Open in admin
    </a>
  `,
    copy["quote.email_footer"]
  );

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getQuoteFrom(),
    to: [getEstimateNotifyTo()],
    replyTo: input.quote.customer_email,
    subject: `${input.actionLabel} — ${displayRef}`,
    text,
    html,
    logLabel: "quotes",
  });
}
