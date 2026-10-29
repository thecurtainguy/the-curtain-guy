import { NextResponse } from "next/server";
import { isCustomerLanguage, type CustomerLanguage } from "@/data/customer-language";
import { requireOwner } from "@/lib/auth";
import { quoteTermsNeedTranslation } from "@/lib/document-texts";

export const runtime = "nodejs";

const MAX_LINES = 200;
const MAX_TEXT = 8000;
/** DeepL accepts at most 50 texts per request. */
const DEEPL_BATCH = 50;

type TranslateBody = {
  from?: unknown;
  lines?: Array<{ key?: unknown; text?: unknown }>;
  notes?: unknown;
  terms?: unknown;
  /** Only return what needs translating; the browser translates it on-device. */
  prepare?: unknown;
};

type TranslatePayload = {
  lines: Array<{ key: string; text: string }>;
  notes: string | null;
  terms: string | null;
};

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, MAX_TEXT) : null;
}

async function deeplTranslate(
  apiKey: string,
  texts: string[],
  from: CustomerLanguage,
  to: CustomerLanguage
): Promise<string[]> {
  const host = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const out: string[] = [];
  for (let start = 0; start < texts.length; start += DEEPL_BATCH) {
    const response = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts.slice(start, start + DEEPL_BATCH),
        source_lang: from.toUpperCase(),
        target_lang: to === "fr" ? "FR" : "EN-US",
        preserve_formatting: true,
        ...(to === "fr" ? { formality: "prefer_more" } : {}),
        context: "Event drape and backdrop rental quote from a company in Montréal, Québec.",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`DeepL ${response.status}: ${await response.text().catch(() => "")}`);
    }
    const json = (await response.json()) as { translations?: Array<{ text?: string }> };
    out.push(...(json.translations ?? []).map((item) => item.text ?? ""));
  }
  return out;
}

/**
 * Drafts the other-language text for owner review. Nothing is saved here.
 * `prepare` returns the texts that need translating so the browser can use its
 * on-device translator; otherwise DeepL translates them (DEEPL_API_KEY).
 */
export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as TranslateBody;
  if (!isCustomerLanguage(body.from)) {
    return NextResponse.json({ ok: false, message: "Unknown source language." }, { status: 400 });
  }
  const from = body.from;
  const to = from === "fr" ? "en" : "fr";
  const source: TranslatePayload = {
    lines: (Array.isArray(body.lines) ? body.lines : [])
      .slice(0, MAX_LINES)
      .flatMap((line) => {
        const text = cleanText(line?.text);
        return typeof line?.key === "string" && text ? [{ key: line.key, text }] : [];
      }),
    notes: cleanText(body.notes),
    terms: null,
  };
  const terms = cleanText(body.terms);
  if (terms && (await quoteTermsNeedTranslation(terms, null, from))) source.terms = terms;

  if (body.prepare === true) {
    return NextResponse.json({ ok: true, source });
  }
  if (source.lines.length === 0 && !source.notes && !source.terms) {
    return NextResponse.json({ ok: true, lines: [], notes: null, terms: null });
  }

  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "not_configured",
        message:
          "No translator available: this browser has no built-in translator and DeepL is not set up (DEEPL_API_KEY). Use Chrome, or type the translation.",
      },
      { status: 503 }
    );
  }

  const texts = [
    ...source.lines.map((line) => line.text),
    ...(source.notes ? [source.notes] : []),
    ...(source.terms ? [source.terms] : []),
  ];
  let translated: string[];
  try {
    translated = await deeplTranslate(apiKey, texts, from, to);
  } catch (error) {
    console.error("[translate] DeepL request failed", error);
    return NextResponse.json(
      { ok: false, message: "The translation service returned an error. Try again." },
      { status: 502 }
    );
  }

  let index = source.lines.length;
  const notes = source.notes ? cleanText(translated[index++]) : null;
  const termsOut = source.terms ? cleanText(translated[index++]) : null;
  return NextResponse.json({
    ok: true,
    lines: source.lines.flatMap((line, i) => {
      const text = cleanText(translated[i]);
      return text ? [{ key: line.key, text }] : [];
    }),
    notes,
    terms: termsOut,
  });
}
