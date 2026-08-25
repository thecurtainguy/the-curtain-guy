"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EstimateStatusBadge } from "@/components/estimates/status-badge";

const STATUSES = ["new", "reviewed", "quoted", "closed", "spam"] as const;

export function AdminEstimateActions({
  estimateId,
  initialStatus,
  initialNotes,
  customerEmail,
  customerName,
}: {
  estimateId: string;
  initialStatus: string;
  initialNotes: string;
  customerEmail: string;
  customerName: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(next?: { status?: string; notes?: string }) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next?.status ?? status,
          internalNotes: next?.notes ?? notes,
          markViewed: true,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not save.");
        return;
      }
      if (next?.status) setStatus(next.status);
      if (next?.notes !== undefined) setNotes(next.notes);
      setMessage("Saved.");
      router.refresh();
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const mailto = `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(
    `Regarding your Curtain Guy estimate`
  )}&body=${encodeURIComponent(`Hi ${customerName},\n\n`)}`;

  return (
    <div className="space-y-6 rounded-3xl border border-border/40 bg-card/25 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <EstimateStatusBadge status={status} />
        <span className="text-xs text-muted-foreground">Change status</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "default" : "outline"}
            disabled={saving}
            onClick={() => void save({ status: value })}
            className="capitalize"
          >
            {value}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="internal-notes">Internal notes</Label>
        <Textarea
          id="internal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="min-h-28"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save notes
        </Button>
        <Button asChild variant="outline">
          <a href={mailto}>
            <Mail className="size-4" />
            Email customer
          </a>
        </Button>
      </div>

      {message && <p className="feedback-success">{message}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
