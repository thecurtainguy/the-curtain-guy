"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarHeart,
  Crown,
  FileText,
  Mail,
  PenLine,
  Phone,
  Plus,
  Receipt,
  Trash2,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { OptionCard } from "@/components/estimate/option-card";
import { BrandDialogContent, useBrandConfirm } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_ROLES,
  CONTACT_ROLE_LABELS,
  type ContactRole,
  type CustomerContactRow,
} from "@/data/customers";
import { CustomerPanel, ToggleTile } from "@/components/admin/customers/customer-panel";
import { readJson } from "@/components/admin/customers/customer-ui";

const ROLE_ICONS: Record<ContactRole, LucideIcon> = {
  billing: Wallet,
  event_day: CalendarHeart,
  planner: BriefcaseBusiness,
  decision_maker: Crown,
  assistant: UserRound,
  other: Users,
};

const ROLE_DESCRIPTIONS: Record<ContactRole, string> = {
  billing: "AP, accounting, receives invoices",
  event_day: "On-site person for install and teardown",
  planner: "Coordinates the event for the client",
  decision_maker: "Approves quotes and budget",
  assistant: "Schedules and relays messages",
  other: "Anyone else worth keeping on file",
};

type Draft = {
  name: string;
  email: string;
  phone: string;
  title: string;
  role: ContactRole;
  cc_invoices: boolean;
  cc_quotes: boolean;
  notes: string;
};

const EMPTY: Draft = {
  name: "",
  email: "",
  phone: "",
  title: "",
  role: "billing",
  cc_invoices: true,
  cc_quotes: false,
  notes: "",
};

function toDraft(c: CustomerContactRow): Draft {
  return {
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    title: c.title ?? "",
    role: c.role,
    cc_invoices: c.cc_invoices,
    cc_quotes: c.cc_quotes,
    notes: c.notes ?? "",
  };
}

export function AdminCustomerContacts({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: CustomerContactRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CustomerContactRow | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useBrandConfirm();

  function openNew() {
    setDraft(EMPTY);
    setError(null);
    setEditing("new");
  }

  function openEdit(contact: CustomerContactRow) {
    setDraft(toDraft(contact));
    setError(null);
    setEditing(contact);
  }

  function setRole(role: ContactRole) {
    setDraft((d) => ({
      ...d,
      role,
      ...(editing === "new" ? { cc_invoices: role === "billing", cc_quotes: role === "planner" || role === "decision_maker" } : {}),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const isNew = editing === "new";
      const url = isNew
        ? `/api/admin/customers/${customerId}/contacts`
        : `/api/admin/customers/${customerId}/contacts/${(editing as CustomerContactRow).id}`;
      const response = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          email: draft.email || null,
          phone: draft.phone || null,
          title: draft.title || null,
          notes: draft.notes || null,
        }),
      });
      const json = await readJson(response);
      if (!response.ok || !json.ok) {
        const message = json.message ?? "Could not save contact.";
        setError(message);
        toast.error(message);
        return;
      }
      const label = draft.name.trim() || draft.email.trim();
      setEditing(null);
      toast.success(
        isNew ? (label ? `${label} added to contacts.` : "Contact added.") : label ? `${label} updated.` : "Contact updated."
      );
      router.refresh();
    } catch {
      setError("Could not save contact.");
      toast.error("Could not save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(contact: CustomerContactRow) {
    const ok = await confirm({
      title: `Remove ${contact.name || contact.email}?`,
      description: "They'll stop being copied on invoices and quotes. Past emails are not affected.",
      confirmLabel: "Remove contact",
      destructive: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/contacts/${contact.id}`, { method: "DELETE" });
      const json = await readJson(response);
      if (!response.ok || json.ok === false) {
        toast.error(json.message ?? "Could not remove contact.");
        return;
      }
      toast.success(`${contact.name || contact.email || "Contact"} removed.`);
      router.refresh();
    } catch {
      toast.error("Could not remove contact.");
    }
  }

  return (
    <CustomerPanel
      id="contacts"
      icon={Users}
      eyebrow="People"
      title="Contacts"
      description="Billing, planners and event-day people. Ticked contacts are Cc'd automatically when you send."
      actions={
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="size-4" />
          Add contact
        </Button>
      }
    >
      {confirmDialog}
      {contacts.length === 0 ? (
        <button
          type="button"
          onClick={openNew}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center hover:border-primary/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-4" />
          </span>
          <span className="text-sm font-medium">No extra contacts yet</span>
          <span className="max-w-sm text-xs text-muted-foreground">
            Add their accountant, planner or event-day contact so invoices and day-of calls go to the right person.
          </span>
        </button>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {contacts.map((contact) => {
            const Icon = ROLE_ICONS[contact.role] ?? Users;
            return (
              <div key={contact.id} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{contact.name || contact.email}</p>
                    <p className="text-xs text-primary">
                      {CONTACT_ROLE_LABELS[contact.role]}
                      {contact.title ? <span className="text-muted-foreground"> · {contact.title}</span> : null}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8" aria-label="Edit contact" onClick={() => openEdit(contact)}>
                      <PenLine className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remove contact"
                      onClick={() => void remove(contact)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Mail className="size-3.5 text-primary/70" />
                      {contact.email}
                    </a>
                  ) : null}
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                      <Phone className="size-3.5 text-primary/70" />
                      {contact.phone}
                    </a>
                  ) : null}
                </div>
                {contact.cc_invoices || contact.cc_quotes ? (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.cc_invoices ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px]">
                        <Receipt className="size-3 text-primary" /> Cc on invoices
                      </span>
                    ) : null}
                    {contact.cc_quotes ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px]">
                        <FileText className="size-3 text-primary" /> Cc on quotes
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {contact.notes ? <p className="text-xs text-muted-foreground">{contact.notes}</p> : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <BrandDialogContent
          eyebrow="Contacts"
          title={editing === "new" ? "Add contact" : "Edit contact"}
          icon={Users}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <LoadingButton onClick={() => void save()} isLoading={saving} loadingText="Saving…">
                Save contact
              </LoadingButton>
            </>
          }
        >
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {CONTACT_ROLES.map((role) => (
                <OptionCard
                  key={role}
                  option={{ id: role, label: CONTACT_ROLE_LABELS[role], description: ROLE_DESCRIPTIONS[role], icon: ROLE_ICONS[role] }}
                  selected={draft.role === role}
                  onSelect={() => setRole(role)}
                />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-title">Title</Label>
                <Input
                  id="contact-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Accounts payable, Mother of the bride…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleTile
                checked={draft.cc_invoices}
                onChange={(checked) => setDraft({ ...draft, cc_invoices: checked })}
                title="Cc on invoices"
                description="Pre-filled in the Cc field when you send an invoice."
                icon={Receipt}
              />
              <ToggleTile
                checked={draft.cc_quotes}
                onChange={(checked) => setDraft({ ...draft, cc_quotes: checked })}
                title="Cc on quotes"
                description="Pre-filled in the Cc field when you send a quote."
                icon={FileText}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            {error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        </BrandDialogContent>
      </Dialog>
    </CustomerPanel>
  );
}
