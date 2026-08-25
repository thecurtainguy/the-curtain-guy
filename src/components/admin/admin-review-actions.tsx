"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import {
  REVIEW_SUBMISSION_STATUSES,
  getReviewSubmissionStatusLabel,
  type ReviewSubmissionStatus,
} from "@/data/review-submissions";
import { ReviewSubmissionStatusBadge } from "@/components/reviews/review-submission-status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminReviewActions({
  reviewId,
  initialStatus,
  initialNotes,
  customerEmail,
  customerName,
}: {
  reviewId: string;
  initialStatus: ReviewSubmissionStatus;
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

  async function save(next?: { status?: ReviewSubmissionStatus; notes?: string }) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
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
    "Regarding your Curtain Guy review"
  )}&body=${encodeURIComponent(`Hi ${customerName},\n\n`)}`;

  return (
    <div className="space-y-6 rounded-3xl border border-border/40 bg-card/25 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <ReviewSubmissionStatusBadge status={status} />
        <span className="text-xs text-muted-foreground">Change status</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {REVIEW_SUBMISSION_STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "default" : "outline"}
            disabled={saving}
            onClick={() => void save({ status: value })}
          >
            {getReviewSubmissionStatusLabel(value)}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-internal-notes">Internal notes</Label>
        <Textarea
          id="review-internal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Follow-up notes, publish edits, outreach history…"
          disabled={saving}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-10"
        >
          {saving ? "Saving…" : "Save notes"}
        </Button>
        <Button asChild type="button" variant="outline" className="min-h-10 gap-2">
          <a href={mailto}>
            <Mail className="size-4" />
            Email submitter
          </a>
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
