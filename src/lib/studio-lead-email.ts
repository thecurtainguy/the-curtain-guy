import "server-only";

import type { CustomerLanguage } from "@/data/customer-language";
import type { StudioEventDetails } from "@/data/studio-leads";
import {
  formatStudioEventDate,
  formatStudioGuestCount,
  studioEventTypeLabel,
} from "@/components/studio/lead/event-details-format";
import { emailBannerBrandHeaderHtml } from "@/lib/email-brand";
import {
  getEstimateFrom,
  getEventPlanNotifyTo,
  getSiteUrl,
} from "@/lib/env";
import { sendResendEmail } from "@/lib/resend";

const COPY = {
  en: {
    subject: "Your Curtain Guy design is saved",
    headline: "Your design is saved",
    hi: (name: string) => `Hi ${name},`,
    intro:
      "Thanks for designing with The Curtain Guy Studio. Your room is saved — pick up right where you left off with your private link:",
    button: "Open my design",
    privateNote:
      "This link is private to you and works for 90 days. Anyone with the link can open the design, so please don’t share it publicly.",
    followUp:
      "Our team will follow up about your event. Reply to this email any time with questions, photos, or your floor plan.",
    eventTitle: "Your event",
    labels: {
      design: "Design",
      event: "Event",
      type: "Type",
      date: "Date",
      guests: "Guests",
      venue: "Venue",
      city: "City",
    },
    signoff: "— The Curtain Guy",
    footer: "The Curtain Guy · Montreal event drape rental",
  },
  fr: {
    subject: "Votre design The Curtain Guy est enregistré",
    headline: "Votre design est enregistré",
    hi: (name: string) => `Bonjour ${name},`,
    intro:
      "Merci d’avoir créé votre salle avec le Studio The Curtain Guy. Votre design est enregistré — reprenez là où vous en étiez avec votre lien privé :",
    button: "Ouvrir mon design",
    privateNote:
      "Ce lien vous est réservé et reste valide 90 jours. Toute personne qui possède le lien peut ouvrir le design; ne le partagez pas publiquement.",
    followUp:
      "Notre équipe communiquera avec vous au sujet de votre événement. Répondez à ce courriel en tout temps pour vos questions, photos ou plan de salle.",
    eventTitle: "Votre événement",
    labels: {
      design: "Design",
      event: "Événement",
      type: "Type",
      date: "Date",
      guests: "Invités",
      venue: "Lieu",
      city: "Ville",
    },
    signoff: "— The Curtain Guy",
    footer: "The Curtain Guy · Location de draperie événementielle à Montréal",
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Row = { label: string; value: string };

function eventRows(
  details: StudioEventDetails,
  language: CustomerLanguage
): Row[] {
  const labels = COPY[language].labels;
  const rows: Array<[string, string | null]> = [
    [labels.event, details.eventName],
    [labels.type, studioEventTypeLabel(details.eventType, language)],
    [labels.date, formatStudioEventDate(details.eventDate, language, "long")],
    [labels.guests, formatStudioGuestCount(details.guestCount, language)],
    [labels.venue, details.venueName],
    [labels.city, details.cityArea],
  ];
  return rows
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(([label, value]) => ({ label, value }));
}

function rowsHtml(rows: Row[]): string {
  return rows
    .map(
      (row) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td><td style="padding:6px 0;font-size:14px;color:#111827;">${escapeHtml(row.value)}</td></tr>`
    )
    .join("");
}

function shellHtml(input: {
  language: CustomerLanguage;
  headline: string;
  body: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="${input.language}">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        ${emailBannerBrandHeaderHtml()}
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">${escapeHtml(input.headline)}</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        ${input.body}
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">${escapeHtml(input.footer)}</p>
    </div>
  </body>
</html>`;
}

export type StudioDesignSavedEmailInput = {
  apiKey: string;
  to: string;
  name: string;
  title: string;
  resumeUrl: string;
  details: StudioEventDetails;
  language: CustomerLanguage;
};

/** Customer email with the private resume link (bilingual). */
export async function sendStudioDesignSavedEmail(
  input: StudioDesignSavedEmailInput
): Promise<void> {
  const c = COPY[input.language];
  const firstName = input.name.trim().split(/\s+/)[0] || input.name.trim();
  const rows = [
    { label: c.labels.design, value: input.title },
    ...eventRows(input.details, input.language),
  ];

  const text = [
    c.hi(firstName),
    "",
    c.intro,
    input.resumeUrl,
    "",
    c.privateNote,
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    c.followUp,
    "",
    c.signoff,
  ].join("\n");

  const body = `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(c.hi(firstName))}</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(c.intro)}</p>
        <p style="margin:0 0 20px;text-align:center;">
          <a href="${escapeHtml(input.resumeUrl)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#d4af37;color:#111827;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(c.button)}</a>
        </p>
        <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#6b7280;">${escapeHtml(c.privateNote)}</p>
        <div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b8860b;">${escapeHtml(c.eventTitle)}</p>
          <table role="presentation" style="border-collapse:collapse;width:100%;">${rowsHtml(rows)}</table>
        </div>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(c.followUp)}</p>`;

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getEstimateFrom(),
    to: [input.to],
    replyTo: getEventPlanNotifyTo(),
    subject: c.subject,
    text,
    html: shellHtml({
      language: input.language,
      headline: c.headline,
      body,
      footer: c.footer,
    }),
    logLabel: "studio-lead",
  });
}

export type StudioLeadOwnerEmailInput = {
  apiKey: string;
  designId: string;
  title: string;
  contact: { name: string; email: string; phone: string };
  details: StudioEventDetails;
  language: CustomerLanguage;
  source: string;
};

/** Owner notification for a new contact-captured studio design. */
export async function sendStudioLeadOwnerNotification(
  input: StudioLeadOwnerEmailInput
): Promise<void> {
  const adminUrl = `${getSiteUrl()}/admin/studio/${input.designId}`;
  const contactRows: Row[] = [
    { label: "Name", value: input.contact.name },
    { label: "Email", value: input.contact.email },
    { label: "Phone", value: input.contact.phone },
    { label: "Language", value: input.language === "fr" ? "Français" : "English" },
    {
      label: "Source",
      value: input.source === "event_builder" ? "Event builder" : "Studio",
    },
  ];
  const detailRows = eventRows(input.details, "en");
  const eventLine =
    input.details.eventName ??
    studioEventTypeLabel(input.details.eventType) ??
    input.title;

  const text = [
    "A visitor saved a Studio design and left their contact details.",
    "",
    ...contactRows.map((row) => `${row.label}: ${row.value}`),
    "",
    `Design: ${input.title}`,
    ...detailRows.map((row) => `${row.label}: ${row.value}`),
    "",
    `Open in admin: ${adminUrl}`,
  ].join("\n");

  const body = `
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">A visitor saved a Studio design and left their contact details.</p>
        <div style="margin:0 0 20px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b8860b;">Contact</p>
          <table role="presentation" style="border-collapse:collapse;width:100%;">${rowsHtml(contactRows)}</table>
        </div>
        <div style="margin:0 0 20px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b8860b;">Event</p>
          <table role="presentation" style="border-collapse:collapse;width:100%;">${rowsHtml([{ label: "Design", value: input.title }, ...detailRows])}</table>
        </div>
        <p style="margin:0;text-align:center;">
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Open lead in admin</a>
        </p>`;

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getEstimateFrom(),
    to: [getEventPlanNotifyTo()],
    replyTo: input.contact.email,
    subject: `New Studio lead — ${input.contact.name} · ${eventLine}`,
    text,
    html: shellHtml({
      language: "en",
      headline: "New Studio lead",
      body,
      footer: "Reply to this email to reach the customer directly.",
    }),
    copyOutbound: false,
    logLabel: "studio-lead",
  });
}
