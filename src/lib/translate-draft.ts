import { toast } from "@/components/ui/sonner";
import type { CustomerLanguage } from "@/data/customer-language";

export type TranslationDraft = {
  lines: Array<{ key: string; text: string }>;
  notes: string | null;
  terms: string | null;
};

export type TranslationDraftResult =
  | { ok: true; draft: TranslationDraft; engine: "chrome" | "deepl" | "none" }
  | { ok: false; message: string };

type ChromeTranslator = {
  translate(text: string): Promise<string>;
  destroy?: () => void;
};

type ChromeTranslatorFactory = {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (target: EventTarget) => void;
  }): Promise<ChromeTranslator>;
};

const ENDPOINT = "/api/admin/quotes/translate";
const DOWNLOAD_TOAST = "translator-download";
/** Bullets and numbering stay as typed; only the words after them are translated. */
const LIST_PREFIX = /^(\s*(?:[-*•–]|\d+[.)])\s+)/;

/** Some Chromium builds expose `Translator` but never settle its promises. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Browser translator timed out.")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

/**
 * Chrome's built-in Translator (on-device, free). Must start inside the click
 * handler: downloading the language pack the first time needs a user gesture.
 */
async function startChromeTranslator(
  from: CustomerLanguage,
  to: CustomerLanguage
): Promise<ChromeTranslator | null> {
  const factory = (globalThis as { Translator?: ChromeTranslatorFactory }).Translator;
  if (!factory || typeof factory.create !== "function") return null;
  try {
    const options = { sourceLanguage: from, targetLanguage: to };
    const availability = await withTimeout(factory.availability(options), 4_000);
    if (availability === "unavailable") return null;
    const needsDownload = availability !== "available";
    if (needsDownload) {
      toast.loading("Downloading the browser’s translation pack…", { id: DOWNLOAD_TOAST });
    }
    const translator = await withTimeout(
      factory.create({
        ...options,
        monitor(target) {
          target.addEventListener("downloadprogress", (event) => {
            const loaded = (event as ProgressEvent).loaded;
            toast.loading(`Downloading the browser’s translation pack… ${Math.round(loaded * 100)}%`, {
              id: DOWNLOAD_TOAST,
            });
          });
        },
      }),
      needsDownload ? 180_000 : 10_000
    );
    if (needsDownload) toast.dismiss(DOWNLOAD_TOAST);
    return translator;
  } catch (error) {
    toast.dismiss(DOWNLOAD_TOAST);
    console.warn("[translate] browser translator unavailable", error);
    return null;
  }
}

/** Line by line, so line breaks and list markers survive. */
async function translateBlock(translator: ChromeTranslator, text: string): Promise<string> {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    const prefix = line.match(LIST_PREFIX)?.[1] ?? "";
    const translated = await withTimeout(translator.translate(line.slice(prefix.length)), 15_000);
    out.push(prefix + translated.trim());
  }
  return out.join("\n").trim();
}

async function translateWithChrome(
  translator: ChromeTranslator,
  source: TranslationDraft
): Promise<TranslationDraft> {
  const lines: TranslationDraft["lines"] = [];
  for (const line of source.lines) {
    lines.push({ key: line.key, text: await translateBlock(translator, line.text) });
  }
  return {
    lines,
    notes: source.notes ? await translateBlock(translator, source.notes) : null,
    terms: source.terms ? await translateBlock(translator, source.terms) : null,
  };
}

async function post(body: Record<string, unknown>) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    source?: TranslationDraft;
  } & Partial<TranslationDraft>;
  return { ok: response.ok && Boolean(json.ok), json };
}

/**
 * Drafts the other-language version of the given texts for owner review.
 * Chrome's on-device translator first; DeepL on the server when the browser
 * has none. Call it straight from a click handler.
 */
export async function draftTranslation(input: {
  from: CustomerLanguage;
  lines: Array<{ key: string; text: string }>;
  notes: string | null;
  terms: string | null;
}): Promise<TranslationDraftResult> {
  const to: CustomerLanguage = input.from === "fr" ? "en" : "fr";
  const chrome = startChromeTranslator(input.from, to);

  const prepared = await post({ ...input, prepare: true });
  if (!prepared.ok || !prepared.json.source) {
    void chrome.then((translator) => translator?.destroy?.());
    return { ok: false, message: prepared.json.message || "Could not translate." };
  }
  const source = prepared.json.source;
  if (source.lines.length === 0 && !source.notes && !source.terms) {
    void chrome.then((translator) => translator?.destroy?.());
    return { ok: true, draft: { lines: [], notes: null, terms: null }, engine: "none" };
  }

  const translator = await chrome;
  if (translator) {
    try {
      return { ok: true, draft: await translateWithChrome(translator, source), engine: "chrome" };
    } catch (error) {
      console.warn("[translate] browser translation failed, trying DeepL", error);
    } finally {
      translator.destroy?.();
    }
  }

  const remote = await post({ ...input });
  if (!remote.ok) {
    return { ok: false, message: remote.json.message || "Could not translate." };
  }
  return {
    ok: true,
    draft: {
      lines: remote.json.lines ?? [],
      notes: remote.json.notes ?? null,
      terms: remote.json.terms ?? null,
    },
    engine: "deepl",
  };
}
