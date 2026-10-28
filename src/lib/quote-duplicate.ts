import { randomUUID } from "node:crypto";
import { initialEstimateFormData, type EstimateFormData } from "@/data/estimate";
import { quotePaymentTermsFrom } from "@/data/quote-payment-terms";
import type { QuoteDuplicateRequest } from "@/data/quote-duplicate";
import {
  computeLineTotalCents,
  DEFAULT_GST_RATE,
  DEFAULT_QST_RATE,
  formatQuoteDisplayRef,
  normalizeManualTaxLines,
  normalizeUnitPriceCents,
  type QuoteRow,
} from "@/data/quotes";
import { normalizeCustomerLanguage } from "@/data/customer-language";
import { ensureCustomerVenue } from "@/lib/customers";
import { getLocalizedDocumentText, resolveQuoteTermsForView } from "@/lib/document-texts";
import { fetchEstimateFiles } from "@/lib/estimate-access";
import { logEstimateFileEvent } from "@/lib/estimate-file-events";
import { buildEstimateObjectPath } from "@/lib/estimate-files-shared";
import { buildEstimateInsertRow } from "@/lib/estimate-server";
import {
  ensureOpportunityRef,
  fetchQuoteById,
  logQuoteEvent,
  recalculateQuoteTotals,
} from "@/lib/quotes";
import { buildQuoteDisplayRef } from "@/lib/quote-tokens";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Actor = { userId: string; email: string | null };

/** Opportunity columns that make up the brief (what the customer asked for). */
const BRIEF_COLUMNS = [
  "venue_setting",
  "guest_count",
  "drape_goals",
  "measurements",
  "look_and_fabric",
  "add_ons",
  "notes",
  "estimate_brief",
  "raw_payload",
  "cart_snapshot",
  "internal_notes",
] as const;

/**
 * Copies a quote into a brand-new opportunity (new TCG number) as a draft.
 * Every field is carried over unless overridden in `request.details` or
 * switched off in `request.copy`; customer activity (sends, views, requests,
 * acceptance) is never copied.
 */
export async function duplicateQuote(input: {
  sourceQuoteId: string;
  request: QuoteDuplicateRequest;
  actor: Actor;
}): Promise<{ quote: QuoteRow; warnings: string[] } | { error: string }> {
  const { request, actor } = input;
  const { details, copy } = request;
  const source = await fetchQuoteById(input.sourceQuoteId);
  if (!source) return { error: "Source quote not found." };

  const admin = createAdminSupabaseClient();
  const sourceRef = formatQuoteDisplayRef(source.opportunity_ref, source.revision_number);
  const warnings: string[] = [];

  const { data: sourceEstimate } = await admin
    .from("estimate_requests")
    .select("*")
    .eq("id", source.estimate_request_id)
    .maybeSingle();
  const estimate = sourceEstimate as Record<string, unknown> | null;

  const customerFields = {
    customer_name: details.customer_name || source.customer_name || details.customer_email,
    customer_email: details.customer_email,
    event_type: details.event_type,
    event_date: details.event_date,
    venue_name: details.venue_name,
    city_area: details.city_area,
    language: details.language,
  };
  const duplicatedFrom = {
    source_quote_id: source.id,
    source_ref: sourceRef,
    source_estimate_request_id: source.estimate_request_id,
  };

  let estimateRow: Record<string, unknown>;
  if (copy.brief && estimate) {
    const brief = Object.fromEntries(BRIEF_COLUMNS.map((column) => [column, estimate[column] ?? null]));
    const rawPayload =
      brief.raw_payload && typeof brief.raw_payload === "object" ? brief.raw_payload : {};
    estimateRow = {
      ...brief,
      ...customerFields,
      customer_phone: estimate.customer_phone ?? null,
      user_id: estimate.user_id ?? null,
      drape_goals: brief.drape_goals ?? [],
      measurements: brief.measurements ?? {},
      look_and_fabric: brief.look_and_fabric ?? {},
      add_ons: brief.add_ons ?? [],
      estimate_brief: brief.estimate_brief ?? "",
      raw_payload: { ...rawPayload, duplicated_from: duplicatedFrom },
    };
  } else {
    const form: EstimateFormData = {
      ...initialEstimateFormData,
      name: customerFields.customer_name ?? "",
      email: details.customer_email,
      phone: typeof estimate?.customer_phone === "string" ? estimate.customer_phone : "",
      eventType: details.event_type ?? "",
      eventDate: details.event_date ?? "",
      venueName: details.venue_name ?? "",
      cityArea: details.city_area ?? "Montreal area",
      drapeGoals: ["full-room"],
      measurementsKnown: "help",
      floorPlanAvailable: "no",
      fabricDirections: ["recommend"],
    };
    estimateRow = {
      ...buildEstimateInsertRow(form, {
        userId: typeof estimate?.user_id === "string" ? estimate.user_id : null,
        language: details.language,
      }),
      ...customerFields,
      raw_payload: { ...form, duplicated_from: duplicatedFrom },
    };
  }

  const { data: insertedEstimate, error: estimateError } = await admin
    .from("estimate_requests")
    .insert({
      ...estimateRow,
      source: "admin_duplicate",
      status: "quoted",
      customer_id: source.customer_id ?? (estimate?.customer_id as string | null) ?? null,
    })
    .select("id")
    .single();
  if (estimateError || !insertedEstimate) {
    console.error("[quote-duplicate] estimate insert", estimateError);
    return { error: estimateError?.message || "Could not create the new opportunity." };
  }
  const newEstimateId = insertedEstimate.id as string;
  const rollback = async () => {
    await admin.from("estimate_requests").delete().eq("id", newEstimateId);
  };

  const opportunityRef = await ensureOpportunityRef(newEstimateId);
  if (!opportunityRef) {
    await rollback();
    return { error: "Could not assign a new opportunity number." };
  }

  const sourceLanguage = normalizeCustomerLanguage(source.language);
  const sameLanguage = sourceLanguage === details.language;
  /** Text and its translation, swapped when the duplicate changes language. */
  const pair = (base: string | null | undefined, translated: string | null | undefined) =>
    sameLanguage || !translated?.trim()
      ? { text: base ?? null, translated: sameLanguage ? translated ?? null : null }
      : { text: translated, translated: base ?? null };
  const terms = copy.terms
    ? await resolveQuoteTermsForView(
        source.terms,
        sourceLanguage,
        details.language,
        source.terms_translated
      )
    : await getLocalizedDocumentText("quote.terms", details.language);
  const termsTranslated = copy.terms ? pair(source.terms, source.terms_translated).translated : null;
  const notes = pair(source.customer_notes, source.customer_notes_translated);
  const displayRef = buildQuoteDisplayRef(opportunityRef, 1);

  const { data: inserted, error: quoteError } = await admin
    .from("quotes")
    .insert({
      estimate_request_id: newEstimateId,
      customer_id: source.customer_id ?? null,
      opportunity_ref: opportunityRef,
      revision_number: 1,
      quote_display_ref: displayRef,
      status: "draft",
      ...customerFields,
      venue_address: details.venue_address,
      customer_venue_id: details.customer_venue_id,
      valid_until: details.valid_until,
      currency: details.currency,
      event_start_time: details.event_start_time,
      event_end_time: details.event_end_time,
      install_date: details.install_date,
      install_start_time: details.install_start_time,
      install_end_time: details.install_end_time,
      teardown_date: details.teardown_date,
      teardown_start_time: details.teardown_start_time,
      teardown_end_time: details.teardown_end_time,
      ...(copy.paymentTerms ? quotePaymentTermsFrom(source) : {}),
      tax_mode: source.tax_mode || "quebec_gst_qst",
      gst_rate: Number(source.gst_rate ?? DEFAULT_GST_RATE),
      qst_rate: Number(source.qst_rate ?? DEFAULT_QST_RATE),
      manual_tax_label: source.manual_tax_label,
      manual_tax_cents: source.manual_tax_cents || 0,
      manual_tax_lines: normalizeManualTaxLines(source.manual_tax_lines),
      customer_notes: copy.customerNotes ? notes.text : null,
      customer_notes_translated: copy.customerNotes ? notes.translated : null,
      owner_notes: copy.ownerNotes ? source.owner_notes : null,
      terms,
      terms_translated: termsTranslated,
      created_by_user_id: actor.userId,
    })
    .select("*")
    .single();
  if (quoteError || !inserted) {
    console.error("[quote-duplicate] quote insert", quoteError);
    await rollback();
    return { error: quoteError?.message || "Could not create the duplicate quote." };
  }
  let quote = inserted as QuoteRow;

  const choices = new Map(request.lines.map((line) => [line.sourceId, line]));
  const lineCopies = source.line_items.flatMap((item, index) => {
    const choice = choices.get(item.id);
    if (choice && !choice.include) return [];
    const quantity = choice ? choice.quantity : Number(item.quantity);
    const unitPrice = choice
      ? normalizeUnitPriceCents(choice.unitPriceCents)
      : Number(item.unit_price_cents);
    const description = pair(item.description, item.description_translated);
    return [
      {
        quote_id: quote.id,
        category: item.category,
        category_label: item.category_label ?? null,
        category_label_fr: item.category_label_fr ?? null,
        description: description.text ?? item.description,
        description_translated: description.translated,
        quantity,
        unit_label: item.unit_label ?? null,
        unit_price_cents: unitPrice,
        line_total_cents: computeLineTotalCents(quantity, unitPrice),
        status: item.status,
        customer_visible: item.customer_visible,
        is_taxable: item.is_taxable !== false,
        tax_category: item.tax_category || "standard",
        sort_order: item.sort_order ?? index,
        product_id: item.product_id ?? null,
        image_url: item.image_url ?? null,
        image_alt: item.image_alt ?? null,
      },
    ];
  });
  if (lineCopies.length > 0) {
    const { error: lineError } = await admin.from("quote_line_items").insert(lineCopies);
    if (lineError) {
      console.error("[quote-duplicate] line items", lineError);
      await rollback();
      return { error: "Could not copy the line items." };
    }
  }
  await recalculateQuoteTotals(quote.id);

  if (quote.customer_id && quote.venue_name && !quote.customer_venue_id) {
    const venue = await ensureCustomerVenue({
      customerId: quote.customer_id,
      venueName: quote.venue_name,
      venueAddress: quote.venue_address,
      actor,
      source: { kind: "quote", id: quote.id, ref: displayRef },
    });
    if (venue) {
      await admin.from("quotes").update({ customer_venue_id: venue.id }).eq("id", quote.id);
      quote = { ...quote, customer_venue_id: venue.id };
    }
  }

  const copiedFiles = await copyOpportunityFiles({
    sourceEstimateId: source.estimate_request_id,
    targetEstimateId: newEstimateId,
    fileIds: request.fileIds,
    sourceRef,
    actor,
    warnings,
  });

  const copiedDesigns = copy.studioDesigns
    ? await copyStudioDesigns({
        sourceQuoteId: source.id,
        sourceEstimateId: source.estimate_request_id,
        targetQuote: quote,
        targetEstimateId: newEstimateId,
        warnings,
      })
    : 0;

  const skipped = Object.entries(copy)
    .filter(([, on]) => !on)
    .map(([key]) => key);
  await logQuoteEvent({
    quoteId: quote.id,
    actorType: "owner",
    actorUserId: actor.userId,
    actorEmail: actor.email,
    eventType: "quote_created",
    summary: `Duplicated from ${sourceRef}`,
    metadata: {
      ...duplicatedFrom,
      line_items: lineCopies.length,
      files: copiedFiles,
      studio_designs: copiedDesigns,
      not_copied: skipped,
      warnings,
    },
  });

  return { quote, warnings };
}

async function copyOpportunityFiles(input: {
  sourceEstimateId: string;
  targetEstimateId: string;
  fileIds: string[];
  sourceRef: string;
  actor: Actor;
  warnings: string[];
}): Promise<number> {
  if (input.fileIds.length === 0) return 0;
  const wanted = new Set(input.fileIds);
  const files = (await fetchEstimateFiles(input.sourceEstimateId, ["uploaded"])).filter((file) =>
    wanted.has(file.id)
  );
  const admin = createAdminSupabaseClient();
  let copied = 0;
  for (const file of files) {
    const id = randomUUID();
    const objectPath = buildEstimateObjectPath({
      estimateId: input.targetEstimateId,
      fileId: id,
      originalFileName: file.original_file_name,
    });
    const { error: copyError } = await admin.storage
      .from(file.bucket)
      .copy(file.object_path, objectPath);
    if (copyError) {
      console.error("[quote-duplicate] storage copy", file.id, copyError.message);
      input.warnings.push(`File not copied: ${file.original_file_name}`);
      continue;
    }
    const { error } = await admin.from("estimate_files").insert({
      id,
      estimate_request_id: input.targetEstimateId,
      uploaded_by_user_id: file.uploaded_by_user_id,
      uploader_email: file.uploader_email,
      bucket: file.bucket,
      object_path: objectPath,
      original_file_name: file.original_file_name,
      content_type: file.content_type,
      file_size_bytes: file.file_size_bytes,
      upload_status: "uploaded",
      uploaded_at: file.uploaded_at ?? new Date().toISOString(),
      customer_visible: file.customer_visible,
      file_kind: file.file_kind,
      caption: file.caption,
      include_in_quote: file.include_in_quote,
      include_in_invoice: file.include_in_invoice,
    });
    if (error) {
      console.error("[quote-duplicate] file row", file.id, error.message);
      await admin.storage.from(file.bucket).remove([objectPath]);
      input.warnings.push(`File not copied: ${file.original_file_name}`);
      continue;
    }
    copied += 1;
    await logEstimateFileEvent({
      fileId: id,
      estimateRequestId: input.targetEstimateId,
      fileName: file.original_file_name,
      actorType: "owner",
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      eventType: "file_uploaded",
      summary: `Copied from ${input.sourceRef}`,
      metadata: { source_file_id: file.id },
    });
  }
  return copied;
}

async function copyStudioDesigns(input: {
  sourceQuoteId: string;
  sourceEstimateId: string;
  targetQuote: QuoteRow;
  targetEstimateId: string;
  warnings: string[];
}): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select("*")
    .or(`quote_id.eq.${input.sourceQuoteId},estimate_request_id.eq.${input.sourceEstimateId}`)
    .neq("status", "archived");
  if (error) {
    console.error("[quote-duplicate] load studio designs", error.message);
    input.warnings.push("Studio designs not copied.");
    return 0;
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return 0;
  const { targetQuote } = input;
  const copies = rows.map((row) => {
    const rest = Object.fromEntries(
      Object.entries(row).filter(
        ([key]) =>
          ![
            "id",
            "created_at",
            "updated_at",
            "job_id",
            "public_token_hash",
            "public_token_expires_at",
            "last_activity_at",
          ].includes(key)
      )
    );
    return {
      ...rest,
      estimate_request_id: input.targetEstimateId,
      quote_id: row.quote_id === input.sourceQuoteId ? targetQuote.id : null,
      opportunity_ref: targetQuote.opportunity_ref,
      event_type: targetQuote.event_type,
      event_date: targetQuote.event_date,
      venue_name: targetQuote.venue_name?.slice(0, 160) ?? null,
      city_area: targetQuote.city_area?.slice(0, 160) ?? null,
    };
  });
  const { error: insertError } = await admin.from("studio_designs").insert(copies);
  if (insertError) {
    console.error("[quote-duplicate] copy studio designs", insertError.message);
    input.warnings.push("Studio designs not copied.");
    return 0;
  }
  return copies.length;
}
