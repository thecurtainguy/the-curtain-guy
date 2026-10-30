"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FilePlus2, Languages, PiggyBank, Receipt, Wallet } from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { EventTypeInput } from "@/components/ui/event-type-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { CUSTOMER_LANGUAGE_LABELS, type CustomerLanguage } from "@/data/customer-language";
import { CustomerPicker, type PickedCustomer } from "@/components/admin/customers/customer-picker";
import { CustomerPanel, ToggleTile } from "@/components/admin/customers/customer-panel";
import { readJson } from "@/components/admin/customers/customer-ui";

export type InvoiceableJob = { id: string; label: string; hasInvoice: boolean };

type Billing = { po_required: boolean; default_po_number: string | null };

export function AdminNewInvoiceButton({
  customer,
  billing,
  jobs = [],
  variant = "default",
  label = "New invoice",
}: {
  customer?: PickedCustomer;
  billing?: Billing;
  jobs?: InvoiceableJob[];
  variant?: "default" | "outline";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PickedCustomer | null>(customer ?? null);
  const openJobs = jobs.filter((j) => !j.hasInvoice);
  const [source, setSource] = useState<string>("direct");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [language, setLanguage] = useState<CustomerLanguage | null>(null);
  const [requestDeposit, setRequestDeposit] = useState(false);
  const [poNumber, setPoNumber] = useState(billing?.default_po_number ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveLanguage = language ?? picked?.preferred_language ?? "en";
  const fromJob = source !== "direct";

  function reset() {
    setPicked(customer ?? null);
    setSource("direct");
    setEventDate("");
    setEventType("");
    setVenueName("");
    setVenueAddress("");
    setLanguage(null);
    setRequestDeposit(false);
    setPoNumber(billing?.default_po_number ?? "");
    setError(null);
  }

  async function submit() {
    if (!picked) {
      setError("Pick a customer first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          fromJob
            ? { customerId: picked.id, jobId: source }
            : {
                customerId: picked.id,
                eventDate: eventDate || null,
                eventType: eventType || null,
                venueName: venueName || null,
                venueAddress: venueAddress || null,
                language: effectiveLanguage,
                requestDeposit,
                poNumber: poNumber || null,
              }
        ),
      });
      const json = await readJson<{ invoiceId?: string }>(response);
      if (!response.ok || !json.ok || !json.invoiceId) {
        const message = json.message ?? "Could not create the invoice.";
        setError(message);
        toast.error(message);
        return;
      }
      setOpen(false);
      toast.success(`Draft invoice created for ${picked.display_name}.`);
      router.push(`/admin/invoices/${json.invoiceId}`);
    } catch {
      setError("Could not create the invoice.");
      toast.error("Could not create the invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button variant={variant} onClick={() => setOpen(true)}>
        <FilePlus2 className="size-4" />
        {label}
      </Button>
      <BrandDialogContent
        eyebrow="Billing"
        title="New invoice"
        description="Bill a customer directly — rush orders, add-ons, damage fees, or bookings that skipped the quote."
        icon={Receipt}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton onClick={() => void submit()} isLoading={saving} loadingText="Creating…" disabled={!picked}>
              Create draft invoice
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-5">
          {!customer ? (
            <section className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Customer</p>
              <CustomerPicker value={picked} onChange={setPicked} />
            </section>
          ) : null}

          {openJobs.length ? (
            <section className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Invoice for</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <OptionCard
                  option={{
                    id: "direct",
                    label: "Direct invoice",
                    description: "Not tied to a booked job",
                    icon: Wallet,
                  }}
                  selected={source === "direct"}
                  onSelect={() => setSource("direct")}
                />
                {openJobs.map((job) => (
                  <OptionCard
                    key={job.id}
                    option={{
                      id: job.id,
                      label: job.label,
                      description: "Copies lines from the accepted quote",
                      icon: CalendarDays,
                    }}
                    selected={source === job.id}
                    onSelect={() => setSource(job.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {!fromJob ? (
            <>
              <CustomerPanel icon={CalendarDays} title="Event" description="Optional — shown on the invoice header.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ni-date">Event date</Label>
                    <DateInput id="ni-date" value={eventDate} onChange={setEventDate} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ni-type">Event type</Label>
                    <EventTypeInput id="ni-type" value={eventType} onChange={setEventType} allowCreate />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ni-venue">Venue</Label>
                    <Input id="ni-venue" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ni-venue-address">Venue address</Label>
                    <Input
                      id="ni-venue-address"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="Street, city, province, postal code"
                      maxLength={400}
                    />
                  </div>
                </div>
              </CustomerPanel>

              <section className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Invoice language</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["en", "fr"] as const).map((lang) => (
                    <OptionCard
                      key={lang}
                      option={{
                        id: lang,
                        label: CUSTOMER_LANGUAGE_LABELS[lang],
                        description: picked?.preferred_language === lang ? "Customer preference" : undefined,
                        icon: Languages,
                      }}
                      selected={effectiveLanguage === lang}
                      onSelect={() => setLanguage(lang)}
                    />
                  ))}
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <ToggleTile
                  checked={requestDeposit}
                  onChange={setRequestDeposit}
                  title="Request a deposit"
                  description="Uses the customer's deposit % (or the business default)."
                  icon={PiggyBank}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="ni-po">
                    PO number{" "}
                    {billing?.po_required ? <span className="text-primary">*required by this customer</span> : null}
                  </Label>
                  <Input id="ni-po" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The draft opens in the invoice editor so you can add line items before sending.
              </p>
            </>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}
