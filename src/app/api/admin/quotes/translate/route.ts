import { NextResponse } from "next/server";
import { isCustomerLanguage } from "@/data/customer-language";
import { requireOwner } from "@/lib/auth";
import { quoteTermsNeedTranslation } from "@/lib/document-texts";

export const runtime = "nodejs";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";
const MAX_LINES = 200;
const MAX_TEXT = 8000;

type TranslateBody = {
  from?: unknown;
  lines?: Array<{ key?: unknown; text?: unknown }>;
  notes?: unknown;
  terms?: unknown;
};

type TranslatePayload = {
  lines: Array<{ key: string; text: string }>;
  notes: string | null;
  terms: string | null;
};

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, MAX_TEXT) : null;
}

/** Drafts the other-language text for owner review. Nothing is saved here. */
export async function POST(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ ok: false, message: "Owner access required." }, { status: 403 });
  }
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "AI translation is not configured (AI_GATEWAY_API_KEY). Type the translation instead." },
      { status: 503 }
    );
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

  if (source.lines.length === 0 && !source.notes && !source.terms) {
    return NextResponse.json({ ok: true, lines: [], notes: null, terms: null });
  }

  const target = to === "fr" ? "Québec French (fr-CA)" : "Canadian English (en-CA)";
  const system = [
    `You translate customer-facing text for The Curtain Guy, a luxury event drape rental company in Québec, into ${target}.`,
    "Translate faithfully and completely: same meaning, obligations, quantities, measurements, prices, dates and product names.",
    "Do not add, drop, soften or summarize anything. Keep line breaks and list structure. Keep proper nouns and codes as written.",
    "Reply with JSON only, in exactly the same shape as the input, translating every string value except the `key` fields.",
  ].join(" ");

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_TRANSLATE_MODEL || DEFAULT_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(source) },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error("[translate] gateway request failed", error);
    return NextResponse.json({ ok: false, message: "The translation service did not respond." }, { status: 502 });
  }
  if (!response.ok) {
    console.error("[translate] gateway error", response.status, await response.text().catch(() => ""));
    return NextResponse.json({ ok: false, message: "The translation service returned an error." }, { status: 502 });
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";
  let parsed: Partial<TranslatePayload>;
  try {
    parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Partial<TranslatePayload>;
  } catch {
    return NextResponse.json({ ok: false, message: "The translation could not be read. Try again." }, { status: 502 });
  }

  const known = new Set(source.lines.map((line) => line.key));
  return NextResponse.json({
    ok: true,
    lines: (Array.isArray(parsed.lines) ? parsed.lines : []).flatMap((line) => {
      const text = cleanText(line?.text);
      return typeof line?.key === "string" && known.has(line.key) && text ? [{ key: line.key, text }] : [];
    }),
    notes: source.notes ? cleanText(parsed.notes) : null,
    terms: source.terms ? cleanText(parsed.terms) : null,
  });
}
