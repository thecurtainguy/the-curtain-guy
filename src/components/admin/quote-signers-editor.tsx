"use client";

import { Check, PenLine, Plus, Trash2, UserRound } from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerContactOption } from "@/data/customers";
import { normalizeAuthorizedSigners } from "@/data/quote-signers";

export type QuoteSignerDraft = {
  key: string;
  name: string;
  title: string;
  email: string;
};

export function signerDraftsFromStored(value: unknown): QuoteSignerDraft[] {
  return normalizeAuthorizedSigners(value).map((signer) => ({
    key: signer.email,
    name: signer.name,
    title: signer.title ?? "",
    email: signer.email,
  }));
}

export function QuoteSignersEditor({
  primaryName,
  primaryEmail,
  signers,
  contacts,
  onChange,
}: {
  primaryName: string;
  primaryEmail: string;
  signers: QuoteSignerDraft[];
  contacts: CustomerContactOption[];
  onChange: (signers: QuoteSignerDraft[]) => void;
}) {
  const primary = primaryEmail.trim().toLowerCase();
  const listed = new Set(signers.map((signer) => signer.email.trim().toLowerCase()).filter(Boolean));
  const otherContacts = contacts.filter((contact) => contact.email.trim().toLowerCase() !== primary);
  const contactEmails = new Set(otherContacts.map((contact) => contact.email.trim().toLowerCase()));
  const manualSigners = signers.filter(
    (signer) => !contactEmails.has(signer.email.trim().toLowerCase())
  );

  function update(key: string, patch: Partial<QuoteSignerDraft>) {
    onChange(signers.map((signer) => (signer.key === key ? { ...signer, ...patch } : signer)));
  }

  function addContact(contact: CustomerContactOption) {
    const email = contact.email.trim().toLowerCase();
    if (listed.has(email)) {
      onChange(signers.filter((signer) => signer.email.trim().toLowerCase() !== email));
      return;
    }
    onChange([
      ...signers,
      {
        key: email,
        name: contact.name,
        title: contact.title ?? "",
        email,
      },
    ]);
  }

  function addBlank() {
    onChange([...signers, { key: crypto.randomUUID(), name: "", title: "", email: "" }]);
  }

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-border/40 bg-background/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <PenLine className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-base font-semibold">Who can sign</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The quote contact can always sign. Add anyone else who should appear when the customer clicks Review & sign.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <UserRound className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{primaryName.trim() || "Quote contact"}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {primaryEmail || "Add an email above"} · Quote contact
          </span>
        </span>
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
      </div>

      {otherContacts.length > 0 ? (
        <div className="@container">
          <div className="grid grid-cols-1 gap-2 @[34rem]:grid-cols-2">
            {otherContacts.map((contact) => {
              const email = contact.email.trim().toLowerCase();
              return (
                <OptionCard
                  key={contact.id}
                  className="p-3"
                  mode="multi"
                  option={{
                    id: contact.id,
                    label: contact.name,
                    description: [contact.email, contact.title].filter(Boolean).join(" · "),
                    icon: UserRound,
                  }}
                  selected={listed.has(email)}
                  onSelect={() => addContact(contact)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {manualSigners.length > 0 ? (
        <div className="space-y-2">
          {manualSigners.map((signer, index) => (
            <div key={signer.key} className="grid gap-2 rounded-xl border border-border/40 bg-card/30 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto] sm:items-end">
              <div className="space-y-1.5">
                {index === 0 ? <Label htmlFor={`signer-name-${signer.key}`}>Name</Label> : null}
                <Input
                  id={`signer-name-${signer.key}`}
                  value={signer.name}
                  placeholder="Full name"
                  aria-label="Signer name"
                  onChange={(event) => update(signer.key, { name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                {index === 0 ? <Label htmlFor={`signer-title-${signer.key}`}>Title</Label> : null}
                <Input
                  id={`signer-title-${signer.key}`}
                  value={signer.title}
                  placeholder="Optional"
                  aria-label="Signer title"
                  onChange={(event) => update(signer.key, { title: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                {index === 0 ? <Label htmlFor={`signer-email-${signer.key}`}>Email</Label> : null}
                <Input
                  id={`signer-email-${signer.key}`}
                  type="email"
                  value={signer.email}
                  placeholder="name@company.com"
                  aria-label="Signer email"
                  onChange={(event) => update(signer.key, { email: event.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label={`Remove ${signer.name || "signer"}`}
                onClick={() => onChange(signers.filter((item) => item.key !== signer.key))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Button type="button" variant="outline" className="rounded-full" onClick={addBlank}>
        <Plus className="size-4" />
        Add another signer
      </Button>
    </div>
  );
}
