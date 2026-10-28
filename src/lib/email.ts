import {
  buildEstimateBrief,
  formatEstimateReference,
  formatHeightSummaryValue,
  formatMeasurementSummaryValue,
  formatOptionSummaryValue,
  getEnglishOptionLabel,
  getEnglishOptionLabels,
  SUMMARY_NOT_PROVIDED,
  SUMMARY_NOT_SURE,
  type EstimateFormData,
} from "@/data/estimate";
import {
  getEstimateFrom,
  getEstimateNotifyTo,
  getEventPlanNotifyTo,
  getSiteUrl,
  shouldSendCustomerConfirmation,
} from "@/lib/env";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  formatEventPlanSummary,
  formatEventPlanSummaryText,
} from "@/lib/event-builder/format-event-plan-summary";
import type { StudioDesignJson } from "@/data/studio";
import type { CustomerLanguage } from "@/data/customer-language";
import {
  getDocumentText,
  getLocalizedDocumentText,
} from "@/lib/document-texts";
import type { EventPlanContact } from "@/lib/event-builder/event-plan-server";
import { emailBannerBrandHeaderHtml } from "@/lib/email-brand";
import { sendResendEmail } from "@/lib/resend";
import { formatFileSize, type TeamEmailFiles } from "@/lib/estimate-team-files";

export type SendEstimateNotificationInput = {
  requestId: string;
  opportunityRef?: string | null;
  data: EstimateFormData;
  apiKey: string;
  fileCount?: number;
  /** Uploaded files to attach (or link) on the team email. */
  files?: TeamEmailFiles | null;
};

export type SendEstimateCustomerConfirmationInput = {
  requestId: string;
  opportunityRef?: string | null;
  data: EstimateFormData;
  apiKey: string;
  fileCount?: number;
  language?: CustomerLanguage;
};

const CUSTOMER_EMAIL_COPY = {
  en: {
    estimateSubject: (ref: string) =>
      `We received your Curtain Guy estimate request — ${ref}`,
    hi: "Hi,",
    thanksText: "Thank you — we received your event drape estimate brief.",
    referenceNumber: "Reference number",
    filesText: (n: number) =>
      `You selected ${n} file${n === 1 ? "" : "s"} with this request. Files that finished uploading are attached to your estimate brief.`,
    filesHtml: (n: number) =>
      `You selected <strong>${n} file${n === 1 ? "" : "s"}</strong> with this request. Files that finished uploading are attached to your estimate brief.`,
    reviewText:
      "The Curtain Guy team will review your measurements, availability, delivery, installation, and teardown before preparing your rental estimate.",
    updatesText:
      "Need to add updates, photos, or a floor plan? Create an account or reply to this email and we will include them in your file.",
    signoff: "— The Curtain Guy",
    estimateHeadline: "We received your estimate brief",
    estimateIntroHtml:
      "Thank you for submitting your event drape planning brief. Our team has it on file and will review the details below.",
    reviewHtml:
      "We will review measurements, availability, delivery, installation, and teardown before preparing your rental estimate.",
    updatesHtml:
      "Have updates, photos, or a floor plan to share? Create an account or reply to this email and we will add them to your file.",
    footer: "The Curtain Guy · Montreal event drape rental",
    planSubject: (ref: string) => `We received your event drape plan — ${ref}`,
    planHeadline: "Event drape plan received",
    planThanksText: (ref: string) =>
      `Thank you — we received your event drape plan (${ref}).`,
    planReviewText:
      "Our team will review your room layout and selected setups within 24–48 hours and follow up by email with next steps.",
    planIntroHtml:
      "Thank you for submitting your event drape plan. Our team has it on file and will review the details below.",
  },
  fr: {
    estimateSubject: (ref: string) =>
      `Nous avons reçu votre demande d’estimation The Curtain Guy — ${ref}`,
    hi: "Bonjour,",
    thanksText:
      "Merci — nous avons bien reçu votre brief d’estimation de drapage.",
    referenceNumber: "Numéro de référence",
    filesText: (n: number) =>
      `Vous avez sélectionné ${n} fichier${n > 1 ? "s" : ""} avec cette demande. Les fichiers téléversés sont joints à votre brief.`,
    filesHtml: (n: number) =>
      `Vous avez sélectionné <strong>${n} fichier${n > 1 ? "s" : ""}</strong> avec cette demande. Les fichiers téléversés sont joints à votre brief.`,
    reviewText:
      "L’équipe The Curtain Guy révisera vos mesures, la disponibilité, la livraison, l’installation et le démontage avant de préparer votre estimation de location.",
    updatesText:
      "Vous souhaitez ajouter des mises à jour, des photos ou un plan de salle? Créez un compte ou répondez à ce courriel et nous les ajouterons à votre dossier.",
    signoff: "— The Curtain Guy",
    estimateHeadline: "Nous avons reçu votre brief",
    estimateIntroHtml:
      "Merci d’avoir soumis votre brief de planification de drapage. Notre équipe l’a bien reçu et révisera les détails ci-dessous.",
    reviewHtml:
      "Nous réviserons les mesures, la disponibilité, la livraison, l’installation et le démontage avant de préparer votre estimation de location.",
    updatesHtml:
      "Des mises à jour, des photos ou un plan de salle à partager? Créez un compte ou répondez à ce courriel et nous les ajouterons à votre dossier.",
    footer: "The Curtain Guy · Location de draperie événementielle à Montréal",
    planSubject: (ref: string) =>
      `Nous avons reçu votre plan de drapage — ${ref}`,
    planHeadline: "Plan de drapage reçu",
    planThanksText: (ref: string) =>
      `Merci — nous avons bien reçu votre plan de drapage (${ref}).`,
    planReviewText:
      "Notre équipe révisera l’aménagement de votre salle et les installations choisies d’ici 24 à 48 heures et vous écrira pour la suite.",
    planIntroHtml:
      "Merci d’avoir soumis votre plan de drapage. Notre équipe l’a bien reçu et révisera les détails ci-dessous.",
  },
} as const;

type EstimateEmailContext = {
  requestId: string;
  reference: string;
  data: EstimateFormData;
  fileCount: number;
  teamFiles?: TeamEmailFiles | null;
};

function adminEstimateUrl(requestId: string): string {
  return `${getSiteUrl()}/admin/estimates/${requestId}`;
}

function teamFilesText(files: TeamEmailFiles, requestId: string): string[] {
  const lines = [`--- FILES (${files.files.length}) ---`];
  for (const file of files.files) {
    lines.push(
      `${file.name} (${formatFileSize(file.sizeBytes)}) — ${
        file.url ? `download: ${file.url}` : "attached"
      }`
    );
  }
  if (files.missing > 0) {
    lines.push(
      `${files.missing} more file${files.missing === 1 ? "" : "s"} did not finish uploading. Any that arrive later are emailed separately.`
    );
  }
  lines.push(`Admin: ${adminEstimateUrl(requestId)}`, "");
  return lines;
}

function teamFilesHtml(files: TeamEmailFiles, requestId: string): string {
  const rows = files.files
    .map(
      (file) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">${escapeHtml(file.name)}<br><span style="font-size:12px;color:#6b7280;">${formatFileSize(file.sizeBytes)}</span></td>
          <td style="padding:8px 0 8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-size:13px;">${
            file.url
              ? `<a href="${escapeHtml(file.url)}" style="color:#b8860b;font-weight:600;">Download</a><br><span style="font-size:11px;color:#6b7280;">link valid 7 days</span>`
              : `<span style="color:#166534;font-weight:600;">Attached</span>`
          }</td>
        </tr>`
    )
    .join("");
  const missing =
    files.missing > 0
      ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#92400e;">${files.missing} more file${files.missing === 1 ? "" : "s"} did not finish uploading. Any that arrive later are emailed separately.</p>`
      : "";
  return `<div style="margin-bottom:24px;padding:16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
          <h2 style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#166534;">Customer files (${files.files.length})</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tbody>${rows}</tbody></table>
          ${missing}
          <p style="margin:12px 0 0;font-size:13px;"><a href="${escapeHtml(adminEstimateUrl(requestId))}" style="color:#b8860b;font-weight:600;">Open in admin →</a></p>
        </div>`;
}

type EmailSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEstimateEmailContext(
  requestId: string,
  data: EstimateFormData,
  fileCount = 0,
  opportunityRef?: string | null
): EstimateEmailContext {
  return {
    requestId,
    reference: formatEstimateReference(requestId, opportunityRef),
    data,
    fileCount: Math.max(0, fileCount),
  };
}

function buildAdminEmailSections(data: EstimateFormData): EmailSection[] {
  const eventTypeLabel =
    getEnglishOptionLabel("eventTypes", data.eventType) ?? data.eventType ?? "—";
  const venueSettingLabel = data.venueSetting
    ? formatOptionSummaryValue("venueSettings", data.venueSetting)
    : SUMMARY_NOT_PROVIDED;
  const measurementsKnownLabel = data.measurementsKnown
    ? formatOptionSummaryValue("measurementsKnown", data.measurementsKnown)
    : SUMMARY_NOT_SURE;
  const runLayoutLabel = data.runLayout
    ? formatOptionSummaryValue("runLayouts", data.runLayout)
    : SUMMARY_NOT_SURE;
  const floorPlanLabel = data.floorPlanAvailable
    ? formatOptionSummaryValue("floorPlanOptions", data.floorPlanAvailable)
    : SUMMARY_NOT_SURE;

  return [
    {
      title: "Customer",
      rows: [
        { label: "Name", value: data.name },
        { label: "Email", value: data.email },
        { label: "Phone", value: data.phone.trim() || "—" },
      ],
    },
    {
      title: "Event",
      rows: [
        { label: "Event type", value: eventTypeLabel },
        { label: "Event date", value: data.eventDate || "—" },
        { label: "Venue", value: data.venueName.trim() || "—" },
        { label: "City / area", value: data.cityArea },
        { label: "Setting", value: venueSettingLabel },
        { label: "Guest count", value: data.guestCount.trim() || "—" },
      ],
    },
    {
      title: "Drape goals",
      rows: [
        {
          label: "Goals",
          value:
            getEnglishOptionLabels("drapeGoals", data.drapeGoals).join(", ") || "—",
        },
      ],
    },
    {
      title: "Measurements",
      rows: [
        { label: "Confidence", value: measurementsKnownLabel },
        {
          label: "Linear feet",
          value: formatMeasurementSummaryValue(data.linearFeet),
        },
        { label: "Height", value: formatHeightSummaryValue(data) },
        {
          label: "Walls / sections",
          value: formatMeasurementSummaryValue(data.wallSections),
        },
        { label: "Run layout", value: runLayoutLabel },
        {
          label: "Doors / openings",
          value: formatMeasurementSummaryValue(data.doorsOpenings),
        },
        { label: "Floor plan", value: floorPlanLabel },
      ],
    },
    {
      title: "Look & fabric",
      rows: [
        {
          label: "Direction",
          value:
            getEnglishOptionLabels("fabricDirections", data.fabricDirections).join(
              ", "
            ) || "—",
        },
      ],
    },
    {
      title: "Add-ons",
      rows: [
        {
          label: "Selected",
          value:
            getEnglishOptionLabels("addOns", data.addOns).join(", ") ||
            "None selected",
        },
      ],
    },
    {
      title: "Notes",
      rows: [{ label: "Message", value: data.message.trim() || "—" }],
    },
  ];
}

function buildNotificationSubject(data: EstimateFormData, reference: string): string {
  const eventTypeLabel =
    getEnglishOptionLabel("eventTypes", data.eventType) ?? data.eventType ?? "Event";
  return `New estimate request — ${reference} — ${eventTypeLabel}`;
}

function buildNotificationText(ctx: EstimateEmailContext, disclaimer: string): string {
  const { requestId, reference, data, fileCount, teamFiles } = ctx;
  const sections = buildAdminEmailSections(data);

  const lines = [
    "New estimate request from thecurtainguy.com",
    "",
    `Reference: ${reference}`,
    `Request ID: ${requestId}`,
    "",
    disclaimer,
    "",
  ];

  if (teamFiles && (teamFiles.files.length > 0 || teamFiles.missing > 0)) {
    lines.push(...teamFilesText(teamFiles, requestId));
  } else if (fileCount > 0) {
    lines.push(
      `Files selected: ${fileCount}`,
      "Uploaded files are available in the admin dashboard once transfer completes.",
      ""
    );
  }

  for (const section of sections) {
    lines.push(`--- ${section.title.toUpperCase()} ---`);
    for (const row of section.rows) {
      lines.push(`${row.label}: ${row.value}`);
    }
    lines.push("");
  }

  lines.push("--- FULL BRIEF ---");
  lines.push(buildEstimateBrief(data));
  lines.push("");
  lines.push(`Reminder: ${disclaimer}`);

  return lines.join("\n");
}

function renderEmailSectionHtml(section: EmailSection): string {
  const rows = section.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap;width:140px;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;line-height:1.5;vertical-align:top;">${escapeHtml(row.value).replace(/\n/g, "<br>")}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="margin-bottom:24px;">
      <h2 style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b8860b;">${escapeHtml(section.title)}</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function disclaimerBannerHtml(disclaimer: string): string {
  return `<div style="margin-bottom:24px;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#92400e;">${escapeHtml(disclaimer).replace(/\n/g, "<br>")}</p>
        </div>`;
}

function buildNotificationHtml(ctx: EstimateEmailContext, disclaimer: string): string {
  const { requestId, reference, data, fileCount, teamFiles } = ctx;
  const sections = buildAdminEmailSections(data)
    .map(renderEmailSectionHtml)
    .join("");
  const brief = escapeHtml(buildEstimateBrief(data)).replace(/\n/g, "<br>");
  const filesBlock =
    teamFiles && (teamFiles.files.length > 0 || teamFiles.missing > 0)
      ? teamFilesHtml(teamFiles, requestId)
      : fileCount > 0
      ? `<div style="margin-bottom:24px;padding:14px 16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#166534;"><strong>${fileCount} file${fileCount === 1 ? "" : "s"} selected.</strong> View and download uploads from the admin dashboard once transfer completes.</p>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        ${emailBannerBrandHeaderHtml()}
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#ffffff;">New estimate request</h1>
        <p style="margin:0;font-size:14px;color:#d1d5db;">Reference <strong style="color:#ffffff;">${escapeHtml(reference)}</strong></p>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        ${disclaimerBannerHtml(disclaimer)}
        ${filesBlock}
        ${sections}
        <div style="margin-top:8px;padding-top:20px;border-top:1px solid #e5e7eb;">
          <h2 style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b8860b;">Full brief</h2>
          <div style="padding:16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#374151;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;white-space:normal;">${brief}</div>
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">Reply to this email to reach the customer directly.</p>
    </div>
  </body>
</html>`;
}

function buildCustomerConfirmationSubject(
  reference: string,
  language: CustomerLanguage
): string {
  return CUSTOMER_EMAIL_COPY[language].estimateSubject(reference);
}

function buildCustomerConfirmationText(
  ctx: EstimateEmailContext,
  disclaimer: string,
  language: CustomerLanguage
): string {
  const { reference, fileCount } = ctx;
  const c = CUSTOMER_EMAIL_COPY[language];

  const lines = [
    c.hi,
    "",
    c.thanksText,
    "",
    `${c.referenceNumber}: ${reference}`,
    "",
  ];

  if (fileCount > 0) {
    lines.push(c.filesText(fileCount), "");
  }

  lines.push(
    c.reviewText,
    "",
    disclaimer,
    "",
    c.updatesText,
    "",
    c.signoff,
    "thecurtainguy.com"
  );

  return lines.join("\n");
}

function buildCustomerConfirmationHtml(
  ctx: EstimateEmailContext,
  disclaimer: string,
  language: CustomerLanguage
): string {
  const { reference, fileCount } = ctx;
  const c = CUSTOMER_EMAIL_COPY[language];
  const filesBlock =
    fileCount > 0
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${c.filesHtml(fileCount)}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="${language}">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        ${emailBannerBrandHeaderHtml()}
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">${c.estimateHeadline}</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${c.estimateIntroHtml}</p>
        <div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${c.referenceNumber}</p>
          <p style="margin:0;font-size:20px;font-weight:600;color:#111827;">${escapeHtml(reference)}</p>
        </div>
        ${filesBlock}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${c.reviewHtml}</p>
        ${disclaimerBannerHtml(disclaimer)}
        <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">${c.updatesHtml}</p>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">${c.footer}</p>
    </div>
  </body>
</html>`;
}

export async function sendEstimateNotificationEmail(
  input: SendEstimateNotificationInput
): Promise<void> {
  const { requestId, opportunityRef, data, apiKey, fileCount = 0, files = null } = input;
  const ctx = {
    ...buildEstimateEmailContext(requestId, data, fileCount, opportunityRef),
    teamFiles: files,
  };
  const disclaimer = await getDocumentText("estimate.email_disclaimer");
  const customerEmail = data.email.trim();

  await sendResendEmail({
    apiKey,
    from: getEstimateFrom(),
    to: [getEstimateNotifyTo()],
    replyTo: customerEmail || undefined,
    subject: buildNotificationSubject(data, ctx.reference),
    text: buildNotificationText(ctx, disclaimer),
    html: buildNotificationHtml(ctx, disclaimer),
    attachments: files?.attachments,
    logLabel: "estimate",
  });
}

/** A customer file that arrived after the submission email went out. */
export async function sendEstimateLateFileEmail(input: {
  apiKey: string;
  requestId: string;
  reference: string;
  customerName: string | null;
  customerEmail: string | null;
  files: TeamEmailFiles;
}): Promise<void> {
  const { requestId, reference, files } = input;
  const who = input.customerName?.trim() || input.customerEmail?.trim() || "The customer";
  const count = files.files.length;
  const subject = `New customer file${count === 1 ? "" : "s"} — ${reference}`;
  const intro = `${who} uploaded ${count === 1 ? "a file" : `${count} files`} to ${reference}.`;

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getEstimateFrom(),
    to: [getEstimateNotifyTo()],
    replyTo: input.customerEmail?.trim() || undefined,
    subject,
    text: [intro, "", ...teamFilesText(files, requestId)].join("\n"),
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        ${emailBannerBrandHeaderHtml()}
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#ffffff;">New customer file${count === 1 ? "" : "s"}</h1>
        <p style="margin:0;font-size:14px;color:#d1d5db;">Reference <strong style="color:#ffffff;">${escapeHtml(reference)}</strong></p>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(intro)}</p>
        ${teamFilesHtml(files, requestId)}
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">Reply to this email to reach the customer directly.</p>
    </div>
  </body>
</html>`,
    attachments: files.attachments,
    logLabel: "estimate",
  });
}

export async function sendEstimateCustomerConfirmationEmail(
  input: SendEstimateCustomerConfirmationInput
): Promise<void> {
  if (!shouldSendCustomerConfirmation()) {
    return;
  }

  const {
    requestId,
    opportunityRef,
    data,
    apiKey,
    fileCount = 0,
    language = "en",
  } = input;
  const customerEmail = data.email.trim();

  if (!customerEmail) {
    return;
  }

  const ctx = buildEstimateEmailContext(
    requestId,
    data,
    fileCount,
    opportunityRef
  );

  const disclaimer = await getLocalizedDocumentText(
    "estimate.email_disclaimer",
    language
  );

  await sendResendEmail({
    apiKey,
    from: getEstimateFrom(),
    to: [customerEmail],
    replyTo: getEstimateNotifyTo(),
    subject: buildCustomerConfirmationSubject(ctx.reference, language),
    text: buildCustomerConfirmationText(ctx, disclaimer, language),
    html: buildCustomerConfirmationHtml(ctx, disclaimer, language),
    logLabel: "estimate",
  });
}

export type SendEventPlanNotificationInput = {
  reference: string;
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  contact: EventPlanContact;
  apiKey: string;
};

export type SendEventPlanCustomerConfirmationInput = {
  reference: string;
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  contact: EventPlanContact;
  apiKey: string;
  language?: CustomerLanguage;
};

function buildEventPlanSections(
  brief: EventBuilderBrief,
  design: StudioDesignJson,
  contact: EventPlanContact,
  language: CustomerLanguage = "en"
) {
  return formatEventPlanSummary(brief, design, contact, language);
}

function buildEventPlanHtml(
  reference: string,
  sections: ReturnType<typeof formatEventPlanSummary>,
  intro: string,
  disclaimer: string,
  language: CustomerLanguage = "en"
): string {
  const c = CUSTOMER_EMAIL_COPY[language];
  const sectionHtml = sections
    .map((section) => {
      const rows = section.rows
        .map(
          (row) =>
            `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;vertical-align:top;">${escapeHtml(row.label)}</td><td style="padding:6px 0;font-size:14px;color:#111827;">${escapeHtml(row.value)}</td></tr>`
        )
        .join("");
      return `<div style="margin-bottom:20px;"><p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${escapeHtml(section.title)}</p><table style="border-collapse:collapse;width:100%;">${rows}</table></div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${language}">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        ${emailBannerBrandHeaderHtml()}
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">${c.planHeadline}</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(intro)}</p>
        <div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${c.referenceNumber}</p>
          <p style="margin:0;font-size:20px;font-weight:600;color:#111827;">${escapeHtml(reference)}</p>
        </div>
        ${sectionHtml}
        ${disclaimerBannerHtml(disclaimer)}
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">${c.footer}</p>
    </div>
  </body>
</html>`;
}

export async function sendEventPlanNotificationEmail(
  input: SendEventPlanNotificationInput
): Promise<void> {
  const { reference, brief, design, contact, apiKey } = input;
  const sections = buildEventPlanSections(brief, design, contact);
  const disclaimer = await getDocumentText("estimate.email_disclaimer");
  const text = `${formatEventPlanSummaryText(reference, sections)}\n\n${disclaimer}`;
  const customerEmail = contact.email.trim();

  await sendResendEmail({
    apiKey,
    from: getEstimateFrom(),
    to: [getEventPlanNotifyTo()],
    replyTo: customerEmail || undefined,
    subject: `New event drape plan — ${reference}`,
    text: text,
    html: buildEventPlanHtml(
      reference,
      sections,
      "A new event plan was submitted from the Studio Event Builder.",
      disclaimer
    ),
    logLabel: "estimate",
  });
}

export async function sendEventPlanCustomerConfirmationEmail(
  input: SendEventPlanCustomerConfirmationInput
): Promise<void> {
  if (!shouldSendCustomerConfirmation()) return;

  const customerEmail = input.contact.email.trim();
  if (!customerEmail) return;

  const language = input.language ?? "en";
  const c = CUSTOMER_EMAIL_COPY[language];
  const sections = buildEventPlanSections(
    input.brief,
    input.design,
    input.contact,
    language
  );
  const disclaimer = await getLocalizedDocumentText(
    "estimate.email_disclaimer",
    language
  );
  const text = [
    c.planThanksText(input.reference),
    "",
    formatEventPlanSummaryText(input.reference, sections, language),
    "",
    c.planReviewText,
    "",
    disclaimer,
    "",
    c.signoff,
  ].join("\n");

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getEstimateFrom(),
    to: [customerEmail],
    replyTo: getEventPlanNotifyTo(),
    subject: c.planSubject(input.reference),
    text,
    html: buildEventPlanHtml(
      input.reference,
      sections,
      c.planIntroHtml,
      disclaimer,
      language
    ),
    logLabel: "estimate",
  });
}
