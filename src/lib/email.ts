import enEstimate from "../../messages/en/estimate.json";
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
  shouldSendCustomerConfirmation,
} from "@/lib/env";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import {
  formatEventPlanSummary,
  formatEventPlanSummaryText,
} from "@/lib/event-builder/format-event-plan-summary";
import type { StudioDesignJson } from "@/data/studio";
import type { EventPlanContact } from "@/lib/event-builder/event-plan-server";

export type SendEstimateNotificationInput = {
  requestId: string;
  opportunityRef?: string | null;
  data: EstimateFormData;
  apiKey: string;
  fileCount?: number;
};

export type SendEstimateCustomerConfirmationInput = {
  requestId: string;
  opportunityRef?: string | null;
  data: EstimateFormData;
  apiKey: string;
  fileCount?: number;
};

type EstimateEmailContext = {
  requestId: string;
  reference: string;
  data: EstimateFormData;
  fileCount: number;
};

type EmailSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

type ResendEmailPayload = {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
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

function buildNotificationText(ctx: EstimateEmailContext): string {
  const { requestId, reference, data, fileCount } = ctx;
  const sections = buildAdminEmailSections(data);

  const lines = [
    "New estimate request from thecurtainguy.com",
    "",
    `Reference: ${reference}`,
    `Request ID: ${requestId}`,
    "",
    "This is a planning brief, not final pricing.",
    "",
  ];

  if (fileCount > 0) {
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
  lines.push(`Reminder: ${enEstimate.disclaimer}`);

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

function buildNotificationHtml(ctx: EstimateEmailContext): string {
  const { reference, data, fileCount } = ctx;
  const sections = buildAdminEmailSections(data)
    .map(renderEmailSectionHtml)
    .join("");
  const brief = escapeHtml(buildEstimateBrief(data)).replace(/\n/g, "<br>");
  const filesBlock =
    fileCount > 0
      ? `<div style="margin-bottom:24px;padding:14px 16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#166534;"><strong>${fileCount} file${fileCount === 1 ? "" : "s"} selected.</strong> View and download uploads from the admin dashboard once transfer completes.</p>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;">The Curtain Guy</p>
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#ffffff;">New estimate request</h1>
        <p style="margin:0;font-size:14px;color:#d1d5db;">Reference <strong style="color:#ffffff;">${escapeHtml(reference)}</strong></p>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <div style="margin-bottom:24px;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#92400e;"><strong>Planning brief only.</strong> Review measurements, availability, delivery, installation, and teardown before confirming final pricing.</p>
        </div>
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

function buildCustomerConfirmationSubject(reference: string): string {
  return `We received your Curtain Guy estimate request — ${reference}`;
}

function buildCustomerConfirmationText(ctx: EstimateEmailContext): string {
  const { reference, fileCount } = ctx;

  const lines = [
    "Hi,",
    "",
    "Thank you — we received your event drape estimate brief.",
    "",
    `Reference number: ${reference}`,
    "",
  ];

  if (fileCount > 0) {
    lines.push(
      `You selected ${fileCount} file${fileCount === 1 ? "" : "s"} with this request. Files that finished uploading are attached to your estimate brief.`,
      ""
    );
  }

  lines.push(
    "The Curtain Guy team will review your measurements, availability, delivery, installation, and teardown before preparing your rental estimate.",
    "",
    "This is a planning brief, not final pricing. We will follow up by email once we have reviewed your details.",
    "",
    "Need to add updates, photos, or a floor plan? Create an account or reply to this email and we will include them in your file.",
    "",
    "— The Curtain Guy",
    "thecurtainguy.com"
  );

  return lines.join("\n");
}

function buildCustomerConfirmationHtml(ctx: EstimateEmailContext): string {
  const { reference, fileCount } = ctx;
  const filesBlock =
    fileCount > 0
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">You selected <strong>${fileCount} file${fileCount === 1 ? "" : "s"}</strong> with this request. Files that finished uploading are attached to your estimate brief.</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;">The Curtain Guy</p>
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">We received your estimate brief</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">Thank you for submitting your event drape planning brief. Our team has it on file and will review the details below.</p>
        <div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Reference number</p>
          <p style="margin:0;font-size:20px;font-weight:600;color:#111827;">${escapeHtml(reference)}</p>
        </div>
        ${filesBlock}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">We will review measurements, availability, delivery, installation, and teardown before preparing your rental estimate.</p>
        <div style="margin:0 0 20px;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#92400e;"><strong>Planning brief only.</strong> This is not final pricing. We will follow up by email once your details are reviewed.</p>
        </div>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">Have updates, photos, or a floor plan to share? Create an account or reply to this email and we will add them to your file.</p>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">The Curtain Guy · Montreal event drape rental</p>
    </div>
  </body>
</html>`;
}

async function sendResendEmail(payload: ResendEmailPayload): Promise<void> {
  const body: Record<string, unknown> = {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };

  if (payload.replyTo) {
    body.reply_to = payload.replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[estimate] Resend send failed:", response.status, errorBody);
    throw new Error("Failed to send email via Resend");
  }
}

export async function sendEstimateNotificationEmail(
  input: SendEstimateNotificationInput
): Promise<void> {
  const { requestId, opportunityRef, data, apiKey, fileCount = 0 } = input;
  const ctx = buildEstimateEmailContext(
    requestId,
    data,
    fileCount,
    opportunityRef
  );
  const customerEmail = data.email.trim();

  await sendResendEmail({
    apiKey,
    from: getEstimateFrom(),
    to: [getEstimateNotifyTo()],
    replyTo: customerEmail || undefined,
    subject: buildNotificationSubject(data, ctx.reference),
    text: buildNotificationText(ctx),
    html: buildNotificationHtml(ctx),
  });
}

export async function sendEstimateCustomerConfirmationEmail(
  input: SendEstimateCustomerConfirmationInput
): Promise<void> {
  if (!shouldSendCustomerConfirmation()) {
    return;
  }

  const { requestId, opportunityRef, data, apiKey, fileCount = 0 } = input;
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

  await sendResendEmail({
    apiKey,
    from: getEstimateFrom(),
    to: [customerEmail],
    replyTo: getEstimateNotifyTo(),
    subject: buildCustomerConfirmationSubject(ctx.reference),
    text: buildCustomerConfirmationText(ctx),
    html: buildCustomerConfirmationHtml(ctx),
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
};

function buildEventPlanSections(
  brief: EventBuilderBrief,
  design: StudioDesignJson,
  contact: EventPlanContact
) {
  return formatEventPlanSummary(brief, design, contact);
}

function buildEventPlanHtml(
  reference: string,
  sections: ReturnType<typeof formatEventPlanSummary>,
  intro: string
): string {
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
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;">The Curtain Guy</p>
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">Event drape plan received</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(intro)}</p>
        <div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Reference number</p>
          <p style="margin:0;font-size:20px;font-weight:600;color:#111827;">${escapeHtml(reference)}</p>
        </div>
        ${sectionHtml}
        <div style="margin:0;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#92400e;"><strong>Planning brief only.</strong> This is not final pricing. Our team will review your room and setups before sending a rental estimate.</p>
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280;">The Curtain Guy · Montreal event drape rental</p>
    </div>
  </body>
</html>`;
}

export async function sendEventPlanNotificationEmail(
  input: SendEventPlanNotificationInput
): Promise<void> {
  const { reference, brief, design, contact, apiKey } = input;
  const sections = buildEventPlanSections(brief, design, contact);
  const text = formatEventPlanSummaryText(reference, sections);
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
      "A new event plan was submitted from the Studio Event Builder."
    ),
  });
}

export async function sendEventPlanCustomerConfirmationEmail(
  input: SendEventPlanCustomerConfirmationInput
): Promise<void> {
  if (!shouldSendCustomerConfirmation()) return;

  const customerEmail = input.contact.email.trim();
  if (!customerEmail) return;

  const sections = buildEventPlanSections(
    input.brief,
    input.design,
    input.contact
  );
  const text = [
    `Thank you — we received your event drape plan (${input.reference}).`,
    "",
    formatEventPlanSummaryText(input.reference, sections),
    "",
    "Our team will review your room layout and selected setups within 24–48 hours and follow up by email with next steps.",
    "",
    "This is a planning brief, not final pricing.",
    "",
    "— The Curtain Guy",
  ].join("\n");

  await sendResendEmail({
    apiKey: input.apiKey,
    from: getEstimateFrom(),
    to: [customerEmail],
    replyTo: getEventPlanNotifyTo(),
    subject: `We received your event drape plan — ${input.reference}`,
    text,
    html: buildEventPlanHtml(
      input.reference,
      sections,
      "Thank you for submitting your event drape plan. Our team has it on file and will review the details below."
    ),
  });
}
