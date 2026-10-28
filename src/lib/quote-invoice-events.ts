import type { InvoiceStatus } from "@/data/invoices";

/** Fired in the browser when executing an agreement creates (or finds) its invoice, so sibling panels update before the page refresh lands. */
export const QUOTE_INVOICE_READY_EVENT = "tcg:quote-invoice-ready";

export type QuoteInvoiceReady = {
  quoteId: string;
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
};

export function announceQuoteInvoice(detail: QuoteInvoiceReady): void {
  window.dispatchEvent(new CustomEvent<QuoteInvoiceReady>(QUOTE_INVOICE_READY_EVENT, { detail }));
}
