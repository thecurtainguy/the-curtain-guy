"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages, UserPlus } from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { CUSTOMER_LANGUAGE_LABELS, type CustomerLanguage } from "@/data/customer-language";
import type { CustomerKind } from "@/data/customers";
import { CUSTOMER_KIND_OPTIONS, readJson } from "@/components/admin/customers/customer-ui";

const LANGUAGE_OPTIONS = (["en", "fr"] as const).map((lang) => ({
  id: lang,
  label: CUSTOMER_LANGUAGE_LABELS[lang],
  description: lang === "en" ? "Quotes, invoices and emails in English" : "Soumissions, factures et courriels en français",
  icon: Languages,
}));

export function AdminCustomerCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CustomerKind>("individual");
  const [language, setLanguage] = useState<CustomerLanguage>("en");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  function reset() {
    setKind("individual");
    setLanguage("en");
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setError(null);
    setExistingId(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setExistingId(null);
    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          preferred_language: language,
          display_name: name,
          company_name: company || null,
          primary_email: email,
          phone: phone || null,
          source: "admin",
        }),
      });
      const json = await readJson<{ customer?: { id: string }; existingId?: string | null }>(response);
      if (!response.ok || !json.ok || !json.customer) {
        setError(json.message ?? "Could not create the customer.");
        setExistingId(json.existingId ?? null);
        return;
      }
      setOpen(false);
      reset();
      router.push(`/admin/customers/${json.customer.id}`);
    } finally {
      setSaving(false);
    }
  }

  const needsCompany = kind !== "individual";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        New customer
      </Button>
      <BrandDialogContent
        eyebrow="Customers"
        title="New customer"
        description="Create the account first, then add contacts, billing defaults and venues on their profile."
        icon={UserPlus}
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton type="submit" form="create-customer-form" isLoading={saving} loadingText="Creating…">
              Create customer
            </LoadingButton>
          </>
        }
      >
        <form id="create-customer-form" onSubmit={submit} className="space-y-6">
          <section className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Type of customer</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CUSTOMER_KIND_OPTIONS.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  selected={kind === option.id}
                  onSelect={() => setKind(option.id as CustomerKind)}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-name">{needsCompany ? "Main contact name" : "Full name"}</Label>
              <Input
                id="new-customer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-company">
                Company {needsCompany ? "" : <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id="new-customer-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={kind === "venue" ? "Château Royal" : "Company name"}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-email">Email</Label>
              <Input
                id="new-customer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-customer-phone">
                Phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="new-customer-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="514-555-0100"
                autoComplete="off"
              />
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Preferred language</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  selected={language === option.id}
                  onSelect={() => setLanguage(option.id)}
                />
              ))}
            </div>
          </section>

          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
              {existingId ? (
                <>
                  {" "}
                  <Link href={`/admin/customers/${existingId}`} className="font-medium underline">
                    Open the existing customer
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}
        </form>
      </BrandDialogContent>
    </Dialog>
  );
}
