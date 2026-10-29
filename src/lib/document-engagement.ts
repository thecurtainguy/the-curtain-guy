import {
  listDocumentViews,
  type DocumentTarget,
  type DocumentViewChannel,
  type DocumentViewKind,
  type DocumentViewSource,
} from "@/lib/document-views";
import { isEmailTrackingConfigured, listEmailMessages } from "@/lib/email-tracking";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Opens logged before this moment came from the old page-load tracking and cannot be verified. */
export const ENGAGEMENT_TRACKING_STARTED_AT = "2026-10-27T23:00:00Z";

export type EngagementActivityKind = DocumentViewKind | "legacy_open" | "legacy_pdf";

export type EngagementActivity = {
  id: string;
  kind: EngagementActivityKind;
  source: DocumentViewSource;
  /** Which link brought them; null before channel tracking. */
  channel: DocumentViewChannel | null;
  at: string;
  activeSeconds: number;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  isBot: boolean;
  /** Same browser seen before on this document. */
  returning: boolean;
};

export type EngagementEmail = {
  id: string;
  /** False for sends recorded before delivery tracking existed. */
  tracked: boolean;
  to: string[];
  cc: string[];
  subject: string | null;
  sentAt: string;
  deliveredAt: string | null;
  delayedAt: string | null;
  bouncedAt: string | null;
  bounceMessage: string | null;
  complainedAt: string | null;
  failedAt: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
  clickCount: number;
};

export type DocumentEngagement = {
  views: number;
  readers: number;
  activeSeconds: number;
  pdfDownloads: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  ownerOpens: number;
  unreadChecks: number;
  /** Most recent open logged by the old page-load tracking (unverified). */
  legacyLastOpenedAt: string | null;
  emails: EngagementEmail[];
  ownerCopies: number;
  trackingConfigured: boolean;
  /** Customer reads and PDF downloads per channel, most used first. */
  channels: Array<{ channel: DocumentViewChannel; count: number }>;
  activity: EngagementActivity[];
};

const isOwnerSource = (source: DocumentViewSource) =>
  source === "owner_copy" || source === "admin_session";

async function listLegacyActivity(target: DocumentTarget): Promise<EngagementActivity[]> {
  const admin = createAdminSupabaseClient();
  const isQuote = "quoteId" in target;
  const { data, error } = await admin
    .from(isQuote ? "quote_events" : "invoice_events")
    .select("id, event_type, actor_type, created_at")
    .eq(isQuote ? "quote_id" : "invoice_id", isQuote ? target.quoteId : target.invoiceId)
    .in("event_type", [isQuote ? "quote_viewed" : "invoice_viewed", "pdf_downloaded"])
    .in("actor_type", ["public_link", "customer"])
    .lt("created_at", ENGAGEMENT_TRACKING_STARTED_AT)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[engagement] legacy events", error);
    return [];
  }
  return (data ?? []).map((event) => ({
    id: `legacy-${event.id as string}`,
    kind: event.event_type === "pdf_downloaded" ? "legacy_pdf" : "legacy_open",
    source: event.actor_type === "customer" ? "account" : "public_link",
    channel: null,
    at: event.created_at as string,
    activeSeconds: 0,
    device: null,
    browser: null,
    os: null,
    location: null,
    isBot: false,
    returning: false,
  }));
}

export async function getDocumentEngagement(target: DocumentTarget): Promise<DocumentEngagement> {
  const [rows, messages, legacy] = await Promise.all([
    listDocumentViews(target),
    listEmailMessages(target),
    listLegacyActivity(target),
  ]);

  const customerViews = rows.filter((row) => row.kind === "view" && !row.is_bot);
  const readers = new Set(customerViews.map((row) => row.visitor_id ?? row.id));
  const viewTimes = customerViews.map((row) => row.confirmed_at ?? row.created_at).sort();
  const lastSeen = customerViews
    .map((row) => row.last_seen_at ?? row.confirmed_at ?? row.created_at)
    .sort();

  const seenVisitors = new Set<string>();
  const activity = [...rows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((row): EngagementActivity => {
      const returning = row.kind === "view" && row.visitor_id ? seenVisitors.has(row.visitor_id) : false;
      if (row.kind === "view" && row.visitor_id) seenVisitors.add(row.visitor_id);
      return {
        id: row.id,
        kind: row.kind,
        source: row.source,
        channel: row.channel,
        at: row.created_at,
        activeSeconds: row.active_seconds,
        device: row.device,
        browser: row.browser,
        os: row.os,
        location: [row.city, row.region, row.country].filter(Boolean).join(", ") || null,
        isBot: row.is_bot,
        returning,
      };
    })
    .reverse()
    .concat(legacy);

  const channelCounts = new Map<DocumentViewChannel, number>();
  for (const row of rows) {
    const customer = (row.kind === "view" || row.kind === "pdf") && !row.is_bot && !isOwnerSource(row.source);
    if (customer && row.channel) channelCounts.set(row.channel, (channelCounts.get(row.channel) ?? 0) + 1);
  }

  return {
    views: customerViews.length,
    readers: readers.size,
    activeSeconds: customerViews.reduce((sum, row) => sum + row.active_seconds, 0),
    pdfDownloads: rows.filter((row) => row.kind === "pdf" && !row.is_bot && !isOwnerSource(row.source)).length,
    firstViewedAt: viewTimes[0] ?? null,
    lastViewedAt: lastSeen.at(-1) ?? null,
    ownerOpens: rows.filter((row) => row.kind === "owner" || (row.kind === "pdf" && isOwnerSource(row.source))).length,
    unreadChecks: rows.filter((row) => row.kind === "link_hit").length,
    legacyLastOpenedAt: legacy.find((item) => item.kind === "legacy_open")?.at ?? null,
    emails: messages
      .filter((message) => message.audience === "customer")
      .map((message) => ({
        id: message.id,
        tracked: Boolean(message.resend_id),
        to: message.to_emails,
        cc: message.cc_emails,
        subject: message.subject,
        sentAt: message.sent_at,
        deliveredAt: message.delivered_at,
        delayedAt: message.delayed_at,
        bouncedAt: message.bounced_at,
        bounceMessage: message.bounce_message,
        complainedAt: message.complained_at,
        failedAt: message.failed_at,
        firstOpenedAt: message.first_opened_at,
        lastOpenedAt: message.last_opened_at,
        openCount: message.open_count,
        clickCount: message.click_count,
      })),
    ownerCopies: messages.filter((message) => message.audience === "owner_copy").length,
    trackingConfigured: isEmailTrackingConfigured(),
    channels: [...channelCounts]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    activity,
  };
}
