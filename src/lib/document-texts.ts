import {
  DOCUMENT_TEXT_DEFS,
  DOCUMENT_TEXT_SLUGS,
  MAX_DOCUMENT_TEXT_LENGTH,
  getDocumentTextDefault,
  isDocumentTextSlug,
  type DocumentTextSlug,
} from "@/data/document-texts";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type DocumentTextRow = {
  slug: DocumentTextSlug;
  body: string;
  updated_at: string | null;
  updated_by: string | null;
  isCustomized: boolean;
};

type StoredDocumentText = {
  slug: string;
  body: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

function emptyStoredMap(): Map<string, StoredDocumentText> {
  return new Map();
}

async function fetchStoredRows(): Promise<Map<string, StoredDocumentText>> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("document_texts")
      .select("slug, body, updated_at, updated_by");
    if (error) {
      console.error("[document-texts] list", error);
      return emptyStoredMap();
    }
    const map = emptyStoredMap();
    for (const row of data ?? []) {
      if (!row || typeof row.slug !== "string") continue;
      map.set(row.slug, row as StoredDocumentText);
    }
    return map;
  } catch (error) {
    console.error("[document-texts] list failed", error);
    return emptyStoredMap();
  }
}

function resolveBody(
  slug: DocumentTextSlug,
  stored: StoredDocumentText | undefined
): { body: string; isCustomized: boolean } {
  const fallback = getDocumentTextDefault(slug);
  const storedBody = typeof stored?.body === "string" ? stored.body : "";
  if (storedBody.trim()) {
    return { body: storedBody, isCustomized: storedBody !== fallback };
  }
  return { body: fallback, isCustomized: false };
}

export async function listDocumentTexts(): Promise<DocumentTextRow[]> {
  const stored = await fetchStoredRows();
  return DOCUMENT_TEXT_DEFS.map((def) => {
    const row = stored.get(def.slug);
    const resolved = resolveBody(def.slug, row);
    return {
      slug: def.slug,
      body: resolved.body,
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
      isCustomized: resolved.isCustomized,
    };
  });
}

export async function getDocumentTextsMap(): Promise<
  Record<DocumentTextSlug, string>
> {
  const stored = await fetchStoredRows();
  const result = {} as Record<DocumentTextSlug, string>;
  for (const slug of DOCUMENT_TEXT_SLUGS) {
    result[slug] = resolveBody(slug, stored.get(slug)).body;
  }
  return result;
}

export async function getDocumentText(
  slug: DocumentTextSlug
): Promise<string> {
  const map = await getDocumentTextsMap();
  return map[slug];
}

export async function resolveQuoteTerms(
  stored: string | null | undefined
): Promise<string> {
  if (stored?.trim()) return stored.trim();
  return getDocumentText("quote.terms");
}

export async function upsertDocumentText(input: {
  slug: string;
  body: string;
  updatedBy?: string | null;
  restoreDefault?: boolean;
}): Promise<{ row: DocumentTextRow } | { error: string }> {
  if (!isDocumentTextSlug(input.slug)) {
    return { error: "Unknown document text." };
  }

  const nextBody = input.restoreDefault
    ? getDocumentTextDefault(input.slug)
    : input.body;

  if (nextBody.length > MAX_DOCUMENT_TEXT_LENGTH) {
    return {
      error: `Text is too long (max ${MAX_DOCUMENT_TEXT_LENGTH.toLocaleString()} characters).`,
    };
  }

  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("document_texts")
      .upsert(
        {
          slug: input.slug,
          body: nextBody,
          updated_by: input.updatedBy || null,
        },
        { onConflict: "slug" }
      )
      .select("slug, body, updated_at, updated_by")
      .single();

    if (error || !data) {
      console.error("[document-texts] upsert", error);
      return { error: error?.message || "Failed to save document text." };
    }

    const resolved = resolveBody(input.slug, data as StoredDocumentText);
    return {
      row: {
        slug: input.slug,
        body: resolved.body,
        updated_at: data.updated_at ?? null,
        updated_by: data.updated_by ?? null,
        isCustomized: resolved.isCustomized,
      },
    };
  } catch (error) {
    console.error("[document-texts] upsert failed", error);
    return { error: "Failed to save document text." };
  }
}
