import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { formatEstimateReference } from "@/data/estimate";
import { formatQuoteDisplayRef } from "@/data/quotes";

/** Public quote link tokens — 32 bytes hex, store hash only. */
export const QUOTE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

export function hashQuoteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createQuoteToken(): {
  token: string;
  hash: string;
  expiresAt: string;
} {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: hashQuoteToken(token),
    expiresAt: new Date(Date.now() + QUOTE_TOKEN_TTL_MS).toISOString(),
  };
}

export function verifyQuoteToken(
  token: string,
  storedHash: string | null | undefined
): boolean {
  if (!token || !storedHash) return false;
  const incoming = Buffer.from(hashQuoteToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (incoming.length !== stored.length) return false;
  return timingSafeEqual(incoming, stored);
}

export function buildPublicQuotePath(token: string): string {
  return `/quote/${token}`;
}

export function buildPublicQuoteUrl(siteUrl: string, token: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}${buildPublicQuotePath(token)}`;
}

/**
 * Display helpers for opportunity / quote refs.
 * Prefer opportunity_ref; fall back to legacy TCG-{uuid8} estimate ref.
 */
export function resolveOpportunityDisplayRef(input: {
  opportunity_ref?: string | null;
  estimate_id?: string | null;
}): string {
  if (input.opportunity_ref && input.opportunity_ref.trim()) {
    return input.opportunity_ref.trim();
  }
  if (input.estimate_id) {
    return formatEstimateReference(input.estimate_id);
  }
  return "TCG-PENDING";
}

export function buildQuoteDisplayRef(
  opportunityRef: string,
  revisionNumber: number
): string {
  return formatQuoteDisplayRef(opportunityRef, revisionNumber);
}

export function dollarsToCents(dollars: number | string): number {
  const n =
    typeof dollars === "string" ? Number.parseFloat(dollars) : Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollarInput(cents: number): string {
  return ((Number(cents) || 0) / 100).toFixed(2);
}
