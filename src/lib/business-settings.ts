import {
  BUSINESS_TEXT_FIELDS,
  clampPercent,
  isBalanceDueRule,
  normalizePaymentMethods,
  type BusinessSettings,
  type InvoiceFieldChange,
  type PaymentMethod,
} from "@/data/invoices";
import { siteConfig } from "@/data/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const FALLBACK_SETTINGS: BusinessSettings = {
  legal_name: "9395-2521 Québec Inc.",
  trade_name: siteConfig.name,
  address_line1: "",
  address_line2: "",
  city: "Montréal",
  province: "QC",
  postal_code: "",
  country: "Canada",
  phone: siteConfig.phone,
  email: siteConfig.email,
  website: siteConfig.domain,
  gst_number: "",
  qst_number: "",
  neq: "",
  invoice_prefix: "INV",
  default_deposit_percent: 50,
  default_balance_due_rule: "event_date",
  default_due_days: 14,
  default_deposit_due_days: 0,
  invoice_notes: "",
  invoice_notes_fr: "",
  invoice_terms: "",
  invoice_terms_fr: "",
  invoice_footer: "",
  invoice_footer_fr: "",
  payment_page_title: "How to pay",
  payment_page_title_fr: "Modes de paiement",
  payment_page_intro: "",
  payment_page_intro_fr: "",
  payment_methods: [],
  payment_document_path: null,
  payment_document_name: null,
  payment_document_label: "Void cheque — direct deposit / EFT",
  payment_document_label_fr: "Chèque annulé — dépôt direct / TEF",
  payment_document_enabled: true,
  payment_document_uploaded_at: null,
  updated_at: null,
};

export const BILLING_DOCUMENTS_BUCKET = "billing-documents";
const MAX_PAYMENT_DOCUMENT_BYTES = 10 * 1024 * 1024;

function normalizeSettings(row: Record<string, unknown> | null): BusinessSettings {
  if (!row) return FALLBACK_SETTINGS;
  const result = { ...FALLBACK_SETTINGS };
  for (const key of BUSINESS_TEXT_FIELDS) {
    const value = row[key];
    if (typeof value === "string") result[key] = value;
  }
  result.default_deposit_percent = clampPercent(row.default_deposit_percent);
  if (isBalanceDueRule(row.default_balance_due_rule)) {
    result.default_balance_due_rule = row.default_balance_due_rule;
  }
  result.default_due_days = Math.max(0, Number(row.default_due_days) || 0);
  result.default_deposit_due_days = Math.max(
    0,
    Number(row.default_deposit_due_days) || 0
  );
  result.payment_methods = normalizePaymentMethods(row.payment_methods);
  result.payment_document_path =
    typeof row.payment_document_path === "string" && row.payment_document_path ? row.payment_document_path : null;
  result.payment_document_name =
    typeof row.payment_document_name === "string" && row.payment_document_name ? row.payment_document_name : null;
  result.payment_document_enabled = row.payment_document_enabled !== false;
  result.payment_document_uploaded_at =
    typeof row.payment_document_uploaded_at === "string" ? row.payment_document_uploaded_at : null;
  result.updated_at = typeof row.updated_at === "string" ? row.updated_at : null;
  return result;
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("business_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("[business-settings] load", error);
      return FALLBACK_SETTINGS;
    }
    return normalizeSettings(data as Record<string, unknown> | null);
  } catch (error) {
    console.error("[business-settings] load failed", error);
    return FALLBACK_SETTINGS;
  }
}

const SETTINGS_LABELS: Partial<Record<keyof BusinessSettings, string>> = {
  legal_name: "Legal name",
  trade_name: "Trade name",
  address_line1: "Address",
  address_line2: "Address line 2",
  city: "City",
  province: "Province",
  postal_code: "Postal code",
  country: "Country",
  phone: "Phone",
  email: "Email",
  website: "Website",
  gst_number: "GST #",
  qst_number: "QST #",
  neq: "NEQ",
  invoice_prefix: "Invoice prefix",
  default_deposit_percent: "Default deposit %",
  default_balance_due_rule: "Balance due rule",
  default_due_days: "Balance due days",
  default_deposit_due_days: "Deposit due days",
  invoice_notes: "Default notes (EN)",
  invoice_notes_fr: "Default notes (FR)",
  invoice_terms: "Terms (EN)",
  invoice_terms_fr: "Terms (FR)",
  invoice_footer: "Footer (EN)",
  invoice_footer_fr: "Footer (FR)",
  payment_page_title: "Payment page title (EN)",
  payment_page_title_fr: "Payment page title (FR)",
  payment_page_intro: "Payment page intro (EN)",
  payment_page_intro_fr: "Payment page intro (FR)",
  payment_document_label: "Payment document name (EN)",
  payment_document_label_fr: "Payment document name (FR)",
  payment_document_enabled: "Attach payment document to invoices",
};

function settingText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function describeMethodFields(method: PaymentMethod): string | null {
  const lines = method.fields.map((f) => {
    const english = `${f.label}: ${f.value || "—"}`;
    const french = f.label_fr || f.value_fr ? ` | FR ${f.label_fr || f.label}: ${f.value_fr || "—"}` : "";
    return english + french;
  });
  return lines.length ? lines.join("\n") : null;
}

function diffPaymentMethods(before: PaymentMethod[], after: PaymentMethod[]): InvoiceFieldChange[] {
  const changes: InvoiceFieldChange[] = [];
  const beforeById = new Map(before.map((m) => [m.id, m]));
  const afterById = new Map(after.map((m) => [m.id, m]));
  for (const method of after) {
    const prev = beforeById.get(method.id);
    const name = method.label || method.id;
    if (!prev) {
      changes.push({ field: `pm:${method.id}`, label: `Payment method “${name}”`, from: null, to: "Added" });
      continue;
    }
    if (prev.label !== method.label) {
      changes.push({ field: `pm:${method.id}:label`, label: `Payment method name`, from: prev.label, to: method.label });
    }
    if (prev.enabled !== method.enabled) {
      changes.push({ field: `pm:${method.id}:enabled`, label: `${name}: shown on invoices`, from: prev.enabled ? "Yes" : "No", to: method.enabled ? "Yes" : "No" });
    }
    const prevFields = describeMethodFields(prev);
    const nextFields = describeMethodFields(method);
    if (prevFields !== nextFields) {
      changes.push({ field: `pm:${method.id}:fields`, label: `${name}: details`, from: prevFields, to: nextFields });
    }
    if (prev.instructions !== method.instructions) {
      changes.push({ field: `pm:${method.id}:instructions`, label: `${name}: instructions`, from: settingText(prev.instructions), to: settingText(method.instructions) });
    }
    if ((prev.label_fr ?? "") !== (method.label_fr ?? "")) {
      changes.push({ field: `pm:${method.id}:label_fr`, label: `${name}: French name`, from: settingText(prev.label_fr), to: settingText(method.label_fr) });
    }
    if ((prev.instructions_fr ?? "") !== (method.instructions_fr ?? "")) {
      changes.push({ field: `pm:${method.id}:instructions_fr`, label: `${name}: French instructions`, from: settingText(prev.instructions_fr), to: settingText(method.instructions_fr) });
    }
  }
  for (const method of before) {
    if (!afterById.has(method.id)) {
      changes.push({ field: `pm:${method.id}`, label: `Payment method “${method.label || method.id}”`, from: "Present", to: "Removed" });
    }
  }
  const beforeOrder = before.filter((m) => afterById.has(m.id)).map((m) => m.id).join(",");
  const afterOrder = after.filter((m) => beforeById.has(m.id)).map((m) => m.id).join(",");
  if (beforeOrder !== afterOrder) {
    changes.push({ field: "pm:order", label: "Payment method order", from: beforeOrder, to: afterOrder });
  }
  return changes;
}

function diffSettings(before: BusinessSettings, after: BusinessSettings): InvoiceFieldChange[] {
  const changes: InvoiceFieldChange[] = [];
  for (const [field, label] of Object.entries(SETTINGS_LABELS) as Array<[keyof BusinessSettings, string]>) {
    const asText = (value: unknown) =>
      typeof value === "boolean" ? (value ? "Yes" : "No") : settingText(value);
    const from = asText(before[field]);
    const to = asText(after[field]);
    if (from !== to) changes.push({ field, label, from, to });
  }
  return [...changes, ...diffPaymentMethods(before.payment_methods, after.payment_methods)];
}

export type BusinessSettingsEventRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  summary: string;
  changes: InvoiceFieldChange[];
  created_at: string;
};

export async function listBusinessSettingsEvents(limit = 50): Promise<BusinessSettingsEventRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_settings_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[business-settings] list events", error);
    return [];
  }
  return (data ?? []) as BusinessSettingsEventRow[];
}

export async function updateBusinessSettings(
  input: Partial<BusinessSettings>,
  updatedBy: string | null,
  actorEmail?: string | null
): Promise<{ settings: BusinessSettings } | { error: string }> {
  const before = await getBusinessSettings();
  const payload: Record<string, unknown> = { id: 1, updated_by: updatedBy };

  for (const key of BUSINESS_TEXT_FIELDS) {
    const value = input[key];
    if (typeof value === "string") {
      payload[key] = value.slice(0, 4000);
    }
  }
  if (typeof payload.invoice_prefix === "string") {
    const prefix = payload.invoice_prefix.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,12}$/.test(prefix)) {
      return { error: "Invoice prefix must be 1–12 letters or numbers." };
    }
    payload.invoice_prefix = prefix;
  }
  if (input.default_deposit_percent !== undefined) {
    payload.default_deposit_percent = clampPercent(input.default_deposit_percent);
  }
  if (input.default_balance_due_rule !== undefined) {
    if (!isBalanceDueRule(input.default_balance_due_rule)) {
      return { error: "Unknown balance due rule." };
    }
    payload.default_balance_due_rule = input.default_balance_due_rule;
  }
  if (input.default_due_days !== undefined) {
    payload.default_due_days = Math.min(365, Math.max(0, Math.round(Number(input.default_due_days) || 0)));
  }
  if (input.default_deposit_due_days !== undefined) {
    payload.default_deposit_due_days = Math.min(
      365,
      Math.max(0, Math.round(Number(input.default_deposit_due_days) || 0))
    );
  }
  if (input.payment_methods !== undefined) {
    payload.payment_methods = normalizePaymentMethods(input.payment_methods);
  }
  if (typeof input.payment_document_enabled === "boolean") {
    payload.payment_document_enabled = input.payment_document_enabled;
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[business-settings] save", error);
    return { error: error?.message || "Could not save settings." };
  }
  const settings = normalizeSettings(data as Record<string, unknown>);
  const changes = diffSettings(before, settings);
  if (changes.length > 0) {
    const labels = [...new Set(changes.map((c) => c.label))];
    const { error: auditError } = await admin.from("business_settings_events").insert({
      actor_user_id: updatedBy,
      actor_email: actorEmail ?? null,
      summary: `Billing settings changed: ${labels.slice(0, 6).join(", ")}${labels.length > 6 ? ` +${labels.length - 6} more` : ""}`,
      changes,
    });
    if (auditError) console.error("[business-settings] audit", auditError);
  }
  return { settings };
}

async function recordSettingsEvent(input: {
  actorUserId: string | null;
  actorEmail: string | null;
  summary: string;
  changes: InvoiceFieldChange[];
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("business_settings_events").insert({
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    summary: input.summary,
    changes: input.changes,
  });
  if (error) console.error("[business-settings] audit", error);
}

function safePdfName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `${base || "document"}.pdf`;
}

/** Uploads a new version; previous files are kept in storage for the audit trail. */
export async function uploadPaymentDocument(input: {
  bytes: Uint8Array;
  fileName: string;
  actorUserId: string | null;
  actorEmail: string | null;
}): Promise<{ settings: BusinessSettings } | { error: string }> {
  if (input.bytes.byteLength === 0) return { error: "The file is empty." };
  if (input.bytes.byteLength > MAX_PAYMENT_DOCUMENT_BYTES) return { error: "PDF must be 10 MB or smaller." };
  const header = new TextDecoder().decode(input.bytes.slice(0, 5));
  if (header !== "%PDF-") return { error: "Upload a PDF file." };

  const before = await getBusinessSettings();
  const fileName = safePdfName(input.fileName);
  const path = `payment-document/${Date.now()}-${fileName}`;
  const admin = createAdminSupabaseClient();
  const { error: uploadError } = await admin.storage
    .from(BILLING_DOCUMENTS_BUCKET)
    .upload(path, input.bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) {
    console.error("[business-settings] upload document", uploadError);
    return { error: "Could not upload the PDF." };
  }

  const uploadedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("business_settings")
    .update({
      payment_document_path: path,
      payment_document_name: input.fileName.slice(0, 200),
      payment_document_uploaded_at: uploadedAt,
      updated_by: input.actorUserId,
    })
    .eq("id", 1)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[business-settings] save document", error);
    return { error: "Uploaded, but could not save the setting." };
  }

  await recordSettingsEvent({
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    summary: before.payment_document_path
      ? `Payment document replaced: ${input.fileName}`
      : `Payment document uploaded: ${input.fileName}`,
    changes: [
      {
        field: "payment_document",
        label: "Payment document",
        from: before.payment_document_name
          ? `${before.payment_document_name} (${before.payment_document_path})`
          : null,
        to: `${input.fileName} (${path}, ${Math.round(input.bytes.byteLength / 1024)} KB)`,
      },
    ],
  });
  return { settings: normalizeSettings(data as Record<string, unknown>) };
}

/** Detaches the document from invoices; the file stays in storage for the audit trail. */
export async function removePaymentDocument(input: {
  actorUserId: string | null;
  actorEmail: string | null;
}): Promise<{ settings: BusinessSettings } | { error: string }> {
  const before = await getBusinessSettings();
  if (!before.payment_document_path) return { settings: before };
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_settings")
    .update({
      payment_document_path: null,
      payment_document_name: null,
      payment_document_uploaded_at: null,
      updated_by: input.actorUserId,
    })
    .eq("id", 1)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[business-settings] remove document", error);
    return { error: "Could not remove the document." };
  }
  await recordSettingsEvent({
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    summary: `Payment document removed: ${before.payment_document_name ?? before.payment_document_path}`,
    changes: [
      {
        field: "payment_document",
        label: "Payment document",
        from: `${before.payment_document_name ?? ""} (${before.payment_document_path})`,
        to: null,
      },
    ],
  });
  return { settings: normalizeSettings(data as Record<string, unknown>) };
}

export async function downloadPaymentDocument(path: string): Promise<Uint8Array | null> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.storage.from(BILLING_DOCUMENTS_BUCKET).download(path);
    if (error || !data) {
      console.error("[business-settings] download document", error);
      return null;
    }
    return new Uint8Array(await data.arrayBuffer());
  } catch (error) {
    console.error("[business-settings] download document failed", error);
    return null;
  }
}
