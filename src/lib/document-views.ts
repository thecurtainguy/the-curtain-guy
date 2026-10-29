import { headers } from "next/headers";
import { linkChannelFrom } from "@/data/link-channel";
import { requireOwner } from "@/lib/auth";
import { logInvoiceClientAccess, markInvoiceViewed } from "@/lib/invoices";
import { markQuoteViewed } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type DocumentTarget = { quoteId: string } | { invoiceId: string };

export type DocumentViewKind = "link_hit" | "view" | "owner" | "pdf";
export type DocumentViewSource = "public_link" | "account" | "owner_copy" | "admin_session";
export type DocumentViewChannel = "email" | "pdf" | "portal" | "direct";

export type DocumentViewRow = {
  id: string;
  quote_id: string | null;
  invoice_id: string | null;
  kind: DocumentViewKind;
  source: DocumentViewSource;
  visitor_id: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  is_bot: boolean;
  /** Null for rows logged before channel tracking. */
  channel: DocumentViewChannel | null;
  active_seconds: number;
  created_at: string;
  confirmed_at: string | null;
  last_seen_at: string | null;
};

/** `?src=owner` marks links in The Curtain Guy's own archive copy of an email. */
export const OWNER_COPY_PARAM = "src";
export const OWNER_COPY_VALUE = "owner";

export function withOwnerCopySource(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set(OWNER_COPY_PARAM, OWNER_COPY_VALUE);
  return parsed.toString();
}

export function isOwnerCopySource(value: string | string[] | undefined | null): boolean {
  return (Array.isArray(value) ? value[0] : value) === OWNER_COPY_VALUE;
}
const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|preview|headless|phantom|python|curl|wget|httpclient|okhttp|java\/|go-http|libwww|axios|node-fetch|scan|safelinks|proofpoint|mimecast|barracuda|ironport|symantec|forcepoint|trendmicro|fireeye|ms-office|microsoft office|googleimageproxy|yahoomailproxy/i;

export function isBotUserAgent(userAgent: string | null): boolean {
  return !userAgent || BOT_USER_AGENT.test(userAgent);
}

export function describeUserAgent(userAgent: string | null): {
  browser: string | null;
  os: string | null;
  device: string | null;
} {
  if (!userAgent) return { browser: null, os: null, device: null };
  const ua = userAgent;
  const browser = /Edg(A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /FxiOS|Firefox\//.test(ua)
          ? "Firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  const os = /iPad/.test(ua)
    ? "iPadOS"
    : /iPhone|iPod/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Mac OS X|Macintosh/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null;
  const device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
    ? "tablet"
    : /Mobi|iPhone|iPod|Android/.test(ua)
      ? "mobile"
      : "desktop";
  return { browser, os, device };
}

function headerText(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim() || null;
  }
}

function targetColumns(target: DocumentTarget) {
  return "quoteId" in target
    ? { quote_id: target.quoteId, invoice_id: null }
    : { quote_id: null, invoice_id: target.invoiceId };
}

/**
 * Logs a request for a quote/invoice page or PDF. Customer page loads start as
 * `link_hit` and only become a view once the browser beacon confirms a person
 * is reading; returns the id the beacon should confirm (null for the owner).
 */
export async function recordDocumentOpen(input: {
  target: DocumentTarget;
  source: "public_link" | "account";
  ownerCopy?: boolean;
  pdf?: boolean;
  /** Value of `?via=`; missing means portal for account pages, direct otherwise. */
  via?: string | string[] | null;
}): Promise<{ viewId: string | null; owner: boolean }> {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const owner = Boolean(input.ownerCopy) || Boolean(await requireOwner().catch(() => null));
  const kind: DocumentViewKind = input.pdf ? "pdf" : owner ? "owner" : "link_hit";
  const source: DocumentViewSource = input.ownerCopy
    ? "owner_copy"
    : owner
      ? "admin_session"
      : input.source;
  const channel: DocumentViewChannel =
    linkChannelFrom(input.via) ?? (input.source === "account" ? "portal" : "direct");

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("document_views")
    .insert({
      ...targetColumns(input.target),
      kind,
      source,
      channel,
      user_agent: userAgent?.slice(0, 500) ?? null,
      ...describeUserAgent(userAgent),
      city: headerText(requestHeaders.get("x-vercel-ip-city")),
      region: headerText(requestHeaders.get("x-vercel-ip-country-region")),
      country: headerText(requestHeaders.get("x-vercel-ip-country")),
      is_bot: isBotUserAgent(userAgent),
    })
    .select("id")
    .single();
  if (error) {
    console.error("[document-views] record open", error);
    return { viewId: null, owner };
  }
  return { viewId: kind === "link_hit" ? (data.id as string) : null, owner };
}

/** Called by the page beacon once a real person is reading; side effects run on the first confirmation only. */
export async function confirmDocumentView(input: {
  viewId: string;
  activeSeconds: number;
  visitorId: string | null;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: result, error } = await admin.rpc("tcg_confirm_document_view", {
    p_view_id: input.viewId,
    p_active_seconds: Math.max(0, Math.round(input.activeSeconds)),
  });
  if (error) {
    console.error("[document-views] confirm", error);
    return;
  }
  if (result === "ignored") return;
  if (input.visitorId) {
    await admin
      .from("document_views")
      .update({ visitor_id: input.visitorId.slice(0, 64) })
      .eq("id", input.viewId)
      .is("visitor_id", null);
  }
  if (result !== "confirmed") return;

  const { data: row } = await admin
    .from("document_views")
    .select("quote_id, invoice_id, source")
    .eq("id", input.viewId)
    .maybeSingle();
  if (!row) return;
  if (row.quote_id) {
    await markQuoteViewed(row.quote_id as string);
  } else if (row.invoice_id) {
    await markInvoiceViewed(row.invoice_id as string);
    await logInvoiceClientAccess({
      invoiceId: row.invoice_id as string,
      actorType: row.source === "account" ? "customer" : "public_link",
      eventType: "invoice_viewed",
      summary: row.source === "account" ? "Client read the invoice (portal)" : "Client read the invoice (secure link)",
    });
  }
}

export async function listDocumentViews(target: DocumentTarget, limit = 300): Promise<DocumentViewRow[]> {
  const admin = createAdminSupabaseClient();
  const column = "quoteId" in target ? "quote_id" : "invoice_id";
  const value = "quoteId" in target ? target.quoteId : target.invoiceId;
  const { data, error } = await admin
    .from("document_views")
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[document-views] list", error);
    return [];
  }
  return (data ?? []) as DocumentViewRow[];
}
