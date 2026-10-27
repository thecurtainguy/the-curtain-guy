import {
  listDocumentViews,
  type DocumentTarget,
  type DocumentViewKind,
  type DocumentViewSource,
} from "@/lib/document-views";
import { isEmailTrackingConfigured, listEmailMessages } from "@/lib/email-tracking";

export type EngagementActivity = {
  id: string;
  kind: DocumentViewKind;
  source: DocumentViewSource;
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
  emails: EngagementEmail[];
  ownerCopies: number;
  trackingConfigured: boolean;
  activity: EngagementActivity[];
};

const isOwnerSource = (source: DocumentViewSource) =>
  source === "owner_copy" || source === "admin_session";

export async function getDocumentEngagement(target: DocumentTarget): Promise<DocumentEngagement> {
  const [rows, messages] = await Promise.all([listDocumentViews(target), listEmailMessages(target)]);

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
    .reverse();

  return {
    views: customerViews.length,
    readers: readers.size,
    activeSeconds: customerViews.reduce((sum, row) => sum + row.active_seconds, 0),
    pdfDownloads: rows.filter((row) => row.kind === "pdf" && !row.is_bot && !isOwnerSource(row.source)).length,
    firstViewedAt: viewTimes[0] ?? null,
    lastViewedAt: lastSeen.at(-1) ?? null,
    ownerOpens: rows.filter((row) => row.kind === "owner" || (row.kind === "pdf" && isOwnerSource(row.source))).length,
    unreadChecks: rows.filter((row) => row.kind === "link_hit").length,
    emails: messages
      .filter((message) => message.audience === "customer")
      .map((message) => ({
        id: message.id,
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
    activity,
  };
}
