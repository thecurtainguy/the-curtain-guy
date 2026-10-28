"use client";

import { useMemo, useState } from "react";
import { BellOff, BellRing, Check } from "lucide-react";
import { todayIsoDate, type InvoiceWithRelations } from "@/data/invoices";
import {
  lastInvoiceEmailRecipients,
  matchReminderPreset,
  REMINDER_PRESETS,
  reminderDueFor,
  reminderScheduleOf,
  reminderTimeline,
  resolveReminderRecipients,
  sentReminderStages,
  type ReminderPresetId,
  type ReminderStep,
} from "@/data/invoice-reminders";
import type { CustomerContactOption } from "@/data/customers";
import {
  PRESET_ICONS,
  ReminderRecipientsChoice,
  ReminderStepToggles,
  ReminderTimelineList,
  toggleReminderStep,
} from "@/components/admin/admin-invoice-reminder-parts";
import { splitRecipientEmails } from "@/components/admin/recipient-input";
import { OptionCard } from "@/components/estimate/option-card";
import { Dialog } from "@/components/ui/dialog";
import { BrandDialogContent } from "@/components/ui/brand-dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";

export function AdminInvoiceReminderSettingsDialog({
  invoice,
  contacts = [],
  open,
  onOpenChange,
  onSaved,
}: {
  invoice: InvoiceWithRelations;
  contacts?: CustomerContactOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (invoice: InvoiceWithRelations, message: string) => void;
}) {
  const events = useMemo(() => invoice.events ?? [], [invoice.events]);
  const lastSent = useMemo(() => lastInvoiceEmailRecipients(events), [events]);
  const invoiceRecipients = resolveReminderRecipients(
    { reminder_to: null, reminder_cc: null, customer_email: invoice.customer_email },
    lastSent
  );
  const initial = reminderScheduleOf(invoice);
  const hasCustom = Boolean(invoice.reminder_to?.length);

  const [enabled, setEnabled] = useState(invoice.reminders_enabled !== false);
  const [steps, setSteps] = useState<ReminderStep[]>([...initial.steps]);
  const [repeatWeekly, setRepeatWeekly] = useState(initial.repeatWeekly);
  const [custom, setCustom] = useState(hasCustom);
  const [to, setTo] = useState((hasCustom ? invoice.reminder_to ?? [] : invoiceRecipients.to).join(", "));
  const [cc, setCc] = useState((hasCustom ? invoice.reminder_cc ?? [] : invoiceRecipients.cc).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = matchReminderPreset(steps, repeatWeekly);
  const due = reminderDueFor(invoice);
  const today = todayIsoDate();
  const timeline = due
    ? reminderTimeline({
        due,
        schedule: { steps, repeatWeekly },
        sentStages: sentReminderStages(events, due),
        today,
        enabled,
      })
    : [];

  function applyPreset(id: ReminderPresetId) {
    const next = REMINDER_PRESETS.find((p) => p.id === id);
    if (!next) return;
    setSteps([...next.steps]);
    setRepeatWeekly(next.repeatWeekly);
  }

  async function save() {
    if (custom && splitRecipientEmails(to).length === 0) {
      setError("Add at least one recipient, or switch back to the invoice email recipients.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/reminders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          steps,
          repeatWeekly,
          to: custom ? to : null,
          cc: custom ? cc : null,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; invoice?: InvoiceWithRelations };
      if (!response.ok || !json.ok || !json.invoice) {
        setError(json.message ?? "Could not save reminder settings.");
        return;
      }
      onSaved(json.invoice, json.message ?? "Reminder settings saved.");
      onOpenChange(false);
    } catch {
      setError("Could not save reminder settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BrandDialogContent
        size="lg"
        icon={BellRing}
        eyebrow="Automatic reminders"
        title={`Reminders for ${invoice.invoice_number}`}
        description="How often the system nudges this client about this invoice, and who gets it. Changes are logged."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              isLoading={saving}
              loadingText="Saving"
              icon={<Check className="size-4" />}
              onClick={() => void save()}
            >
              Save reminder settings
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-6">
          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Status</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard
                option={{ id: "on", label: "On", description: "Emails go out on the schedule below", icon: BellRing }}
                selected={enabled}
                onSelect={() => setEnabled(true)}
                className="p-3"
              />
              <OptionCard
                option={{
                  id: "paused",
                  label: "Paused",
                  description: "Nothing automatic. You can still send one yourself",
                  icon: BellOff,
                }}
                selected={!enabled}
                onSelect={() => setEnabled(false)}
                className="p-3"
              />
            </div>
          </section>

          <section className={cn("space-y-3 transition-opacity", !enabled && "opacity-60")}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Schedule</p>
              {preset === null ? (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Custom
                </span>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {REMINDER_PRESETS.map((item) => (
                <OptionCard
                  key={item.id}
                  option={{ id: item.id, label: item.label, description: item.description, icon: PRESET_ICONS[item.id] }}
                  selected={preset === item.id}
                  onSelect={() => applyPreset(item.id)}
                  className="p-3"
                />
              ))}
            </div>
            <ReminderStepToggles
              steps={steps}
              repeatWeekly={repeatWeekly}
              due={due}
              timeline={timeline}
              onToggleStep={(step) => setSteps((prev) => toggleReminderStep(prev, step))}
              onToggleWeekly={() => setRepeatWeekly((v) => !v)}
            />
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Who gets them</p>
            <ReminderRecipientsChoice
              idPrefix="inv-reminder"
              sameLabel="Same people as the invoice email"
              sameEmails={[...invoiceRecipients.to, ...invoiceRecipients.cc]}
              custom={custom}
              onCustomChange={setCustom}
              to={to}
              cc={cc}
              onToChange={setTo}
              onCcChange={setCc}
              contacts={contacts}
            />
          </section>

          {due ? (
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                What happens for this invoice
              </p>
              <ReminderTimelineList timeline={timeline} due={due} enabled={enabled} />
            </section>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </BrandDialogContent>
    </Dialog>
  );
}
