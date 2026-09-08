import {
  initialEstimateFormData,
  isValidEmail,
  type EstimateFormData,
} from "@/data/estimate";
import { formatCadFromCents, type RentalCartLine } from "@/data/rentals";
import { cartSubtotalCents } from "@/lib/rentals";
import { getCurrentUser } from "@/lib/auth";
import {
  insertEstimateRequest,
  type EstimateInsertResult,
} from "@/lib/estimate-server";
import { getSupabaseServerConfig } from "@/lib/env";
import {
  createQuoteFromEstimate,
  upsertLineItems,
  type LineItemInput,
} from "@/lib/quotes";
import { fetchEstimateById } from "@/lib/estimate-access";

export type RentalsCheckoutInput = {
  name: string;
  email: string;
  phone?: string;
  eventDate?: string;
  eventType?: string;
  venueName?: string;
  venueAddress?: string;
  cityArea?: string;
  deliveryZoneId?: string;
  logisticsMode?: string;
  message?: string;
  lines: RentalCartLine[];
  submittedFromUrl?: string | null;
  userAgent?: string | null;
};

export type RentalsCheckoutResult =
  | {
      ok: true;
      estimateId: string;
      quoteId: string;
      opportunityRef: string | null;
      estimateTotalCents: number;
    }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function linesToEstimateForm(
  input: RentalsCheckoutInput,
  totalCents: number
): EstimateFormData {
  const summary = input.lines
    .map(
      (line) =>
        `• ${line.description} × ${line.quantity} @ ${formatCadFromCents(line.unitPriceCents)}`
    )
    .join("\n");

  return {
    ...initialEstimateFormData,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: (input.phone || "").trim(),
    eventType: (input.eventType || "other").trim() || "other",
    eventDate: (input.eventDate || "").trim(),
    venueName: (input.venueName || "").trim(),
    cityArea: (input.cityArea || "Montreal area").trim() || "Montreal area",
    drapeGoals: ["full-room"],
    fabricDirections: ["recommend"],
    measurementsKnown: "know",
    linearFeet: String(
      input.lines.find((l) => l.linearFeet)?.linearFeet || ""
    ),
    message: [
      input.message?.trim(),
      "Submitted from Rentals cart (estimate only — final quote by The Curtain Guy).",
      input.deliveryZoneId
        ? `Delivery zone: ${input.cityArea || input.deliveryZoneId}`
        : null,
      input.logisticsMode ? `Logistics mode: ${input.logisticsMode}` : null,
      input.venueAddress?.trim()
        ? `Venue address: ${input.venueAddress.trim()}`
        : null,
      `Cart estimate subtotal: ${formatCadFromCents(totalCents)}`,
      "",
      "Cart lines:",
      summary,
    ]
      .filter(Boolean)
      .join("\n"),
    addOns: input.lines
      .filter((l) => l.lineKind === "addon" || l.lineKind === "service")
      .map((l) => l.name),
  };
}

function cartLinesToQuoteItems(lines: RentalCartLine[]): LineItemInput[] {
  return lines.map((line, index) => {
    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        line.productId
      );
    return {
      category: line.category || "custom",
      description: line.description,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      status: "priced",
      customer_visible: true,
      is_taxable: line.isTaxable && line.unitPriceCents > 0,
      tax_category:
        line.isTaxable && line.unitPriceCents > 0 ? "standard" : "exempt",
      sort_order: index,
      product_id: looksLikeUuid ? line.productId : null,
      image_url: line.imageUrl,
      image_alt: line.imageAlt,
    };
  });
}

export async function submitRentalsCheckout(
  input: RentalsCheckoutInput
): Promise<RentalsCheckoutResult> {
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "Name is required.";
  const email = input.email.trim();
  if (!email) fieldErrors.email = "Email is required.";
  else if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email.";
  if (!input.venueName?.trim()) fieldErrors.venueName = "Venue name is required.";
  if (!input.deliveryZoneId?.trim()) {
    fieldErrors.deliveryZoneId = "Select a delivery area.";
  }
  if (!input.cityArea?.trim()) fieldErrors.cityArea = "City or area is required.";
  if (!input.lines.length) {
    return { ok: false, message: "Your cart is empty." };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please complete the required fields.",
      fieldErrors,
    };
  }

  const config = getSupabaseServerConfig();
  if (!config) {
    return { ok: false, message: "Server configuration error." };
  }

  const user = await getCurrentUser();
  const totalCents = cartSubtotalCents(input.lines);
  const form = linesToEstimateForm(input, totalCents);

  const insertResult: EstimateInsertResult = await insertEstimateRequest(
    config,
    form,
    {
      submittedFromUrl: input.submittedFromUrl,
      userAgent: input.userAgent,
      userId: user?.id ?? null,
      source: "rentals_cart",
      cartSnapshot: {
        version: 1,
        lines: input.lines,
        subtotalCents: totalCents,
        submittedAt: new Date().toISOString(),
      },
    }
  );

  if (!insertResult.ok) {
    return { ok: false, message: insertResult.message };
  }

  const estimate = await fetchEstimateById(insertResult.id);
  if (!estimate) {
    return { ok: false, message: "Estimate was created but could not be loaded." };
  }

  const quoteResult = await createQuoteFromEstimate({
    estimate,
    createdByUserId: user?.id ?? null,
  });

  if ("error" in quoteResult) {
    return {
      ok: false,
      message:
        quoteResult.error ||
        "Estimate saved, but draft quote could not be created.",
    };
  }

  // created_by may be empty string if guest — quotes allow null; fix if insert failed
  if (!quoteResult.quote) {
    return { ok: false, message: "Draft quote missing." };
  }

  const linesResult = await upsertLineItems({
    quoteId: quoteResult.quote.id,
    items: cartLinesToQuoteItems(input.lines),
    actorUserId: user?.id ?? null,
    actorEmail: email,
  });

  if (!linesResult.ok) {
    return {
      ok: false,
      message: linesResult.message || "Could not attach cart lines to quote.",
    };
  }

  return {
    ok: true,
    estimateId: estimate.id,
    quoteId: quoteResult.quote.id,
    opportunityRef: insertResult.opportunity_ref,
    estimateTotalCents: totalCents,
  };
}
