import {
  addOnOptions,
  buildEstimateBrief,
  drapeGoals,
  eventTypes,
  fabricDirections,
  floorPlanOptions,
  formatEstimateReference,
  formatHeightSummaryValue,
  formatMeasurementSummaryValue,
  formatOptionSummaryValue,
  getOptionLabel,
  getOptionLabels,
  measurementsKnownOptions,
  runLayouts,
  SUMMARY_NOT_PROVIDED,
  SUMMARY_NOT_SURE,
  type EstimateFormData,
  venueSettings,
} from "@/data/estimate";
import { getEstimateFrom, getEstimateNotifyTo } from "@/lib/env";

export type SendEstimateNotificationInput = {
  requestId: string;
  data: EstimateFormData;
  apiKey: string;
};

function buildNotificationSubject(data: EstimateFormData): string {
  const eventTypeLabel =
    getOptionLabel(eventTypes, data.eventType) ?? data.eventType ?? "Event";
  return `New The Curtain Guy estimate request — ${eventTypeLabel}`;
}

function buildNotificationText(
  requestId: string,
  data: EstimateFormData
): string {
  const reference = formatEstimateReference(requestId);
  const eventTypeLabel =
    getOptionLabel(eventTypes, data.eventType) ?? data.eventType ?? "—";
  const venueSettingLabel = data.venueSetting
    ? formatOptionSummaryValue(venueSettings, data.venueSetting)
    : SUMMARY_NOT_PROVIDED;
  const measurementsKnownLabel = data.measurementsKnown
    ? formatOptionSummaryValue(measurementsKnownOptions, data.measurementsKnown)
    : SUMMARY_NOT_SURE;
  const runLayoutLabel = data.runLayout
    ? formatOptionSummaryValue(runLayouts, data.runLayout)
    : SUMMARY_NOT_SURE;

  const header = [
    "New estimate request from thecurtainguy.com",
    "",
    `Request ID: ${requestId}`,
    `Reference: ${reference}`,
    "",
    "--- CUSTOMER ---",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone.trim() || "—"}`,
    "",
    "--- EVENT ---",
    `Event type: ${eventTypeLabel}`,
    `Event date: ${data.eventDate || "—"}`,
    `Venue: ${data.venueName.trim() || "—"}`,
    `City / area: ${data.cityArea}`,
    `Setting: ${venueSettingLabel}`,
    `Guest count: ${data.guestCount.trim() || "—"}`,
    "",
    "--- DRAPE GOALS ---",
    getOptionLabels(drapeGoals, data.drapeGoals).join(", ") || "—",
    "",
    "--- MEASUREMENTS ---",
    `Confidence: ${measurementsKnownLabel}`,
    `Linear feet: ${formatMeasurementSummaryValue(data.linearFeet)}`,
    `Height: ${formatHeightSummaryValue(data)}`,
    `Walls / sections: ${formatMeasurementSummaryValue(data.wallSections)}`,
    `Run layout: ${runLayoutLabel}`,
    `Doors / openings: ${formatMeasurementSummaryValue(data.doorsOpenings)}`,
    `Floor plan: ${
      data.floorPlanAvailable
        ? formatOptionSummaryValue(floorPlanOptions, data.floorPlanAvailable)
        : SUMMARY_NOT_SURE
    }`,
    "",
    "--- LOOK & FABRIC ---",
    getOptionLabels(fabricDirections, data.fabricDirections).join(", ") || "—",
    "",
    "--- ADD-ONS ---",
    getOptionLabels(addOnOptions, data.addOns).join(", ") || "None selected",
    "",
    "--- NOTES ---",
    data.message.trim() || "—",
    "",
    "--- FULL BRIEF ---",
    buildEstimateBrief(data),
    "",
    "Reminder: This is a planning brief, not final pricing.",
  ];

  return header.join("\n");
}

export async function sendEstimateNotificationEmail(
  input: SendEstimateNotificationInput
): Promise<void> {
  const { requestId, data, apiKey } = input;
  const subject = buildNotificationSubject(data);
  const text = buildNotificationText(requestId, data);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEstimateFrom(),
      to: [getEstimateNotifyTo()],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(
      "[estimate] Resend notification failed:",
      response.status,
      errorBody
    );
    throw new Error("Failed to send estimate notification email");
  }
}
