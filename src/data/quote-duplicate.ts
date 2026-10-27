import type { CustomerCurrency } from "@/data/customers";
import type { CustomerLanguage } from "@/data/customer-language";

/** Optional parts of a quote; each one is copied unless turned off in the duplicate dialog. */
export const QUOTE_DUPLICATE_COPY_KEYS = [
  "paymentTerms",
  "terms",
  "customerNotes",
  "ownerNotes",
  "brief",
  "studioDesigns",
] as const;

export type QuoteDuplicateCopyKey = (typeof QUOTE_DUPLICATE_COPY_KEYS)[number];

export type QuoteDuplicateCopy = Record<QuoteDuplicateCopyKey, boolean>;

export const QUOTE_DUPLICATE_COPY_LABELS: Record<
  QuoteDuplicateCopyKey,
  { label: string; description: string }
> = {
  paymentTerms: {
    label: "Payment terms",
    description: "Deposit and balance schedule. Off uses the customer defaults.",
  },
  terms: {
    label: "Terms & conditions",
    description: "Off starts from the default terms for the language.",
  },
  customerNotes: {
    label: "Note to customer",
    description: "Shown on the proposal and PDF.",
  },
  ownerNotes: {
    label: "Internal notes",
    description: "Admin-only notes on the quote.",
  },
  brief: {
    label: "Opportunity brief",
    description: "Goals, measurements, fabric picks, cart, and internal notes.",
  },
  studioDesigns: {
    label: "Studio designs",
    description: "Room designs linked to this opportunity.",
  },
};

export function defaultQuoteDuplicateCopy(): QuoteDuplicateCopy {
  return Object.fromEntries(QUOTE_DUPLICATE_COPY_KEYS.map((key) => [key, true])) as QuoteDuplicateCopy;
}

/** One source line item; excluded lines are left out of the copy. */
export type QuoteDuplicateLine = {
  sourceId: string;
  include: boolean;
  quantity: number;
  unitPriceCents: number;
};

/** Quote fields editable before duplicating; anything untouched keeps the source value. */
export type QuoteDuplicateDetails = {
  customer_name: string | null;
  customer_email: string;
  event_type: string | null;
  event_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  customer_venue_id: string | null;
  city_area: string | null;
  valid_until: string | null;
  language: CustomerLanguage;
  currency: CustomerCurrency;
  event_start_time: string | null;
  event_end_time: string | null;
  install_date: string | null;
  install_start_time: string | null;
  install_end_time: string | null;
  teardown_date: string | null;
  teardown_start_time: string | null;
  teardown_end_time: string | null;
};

export type QuoteDuplicateRequest = {
  details: QuoteDuplicateDetails;
  lines: QuoteDuplicateLine[];
  copy: QuoteDuplicateCopy;
  /** Opportunity files to copy into the new opportunity. */
  fileIds: string[];
};
