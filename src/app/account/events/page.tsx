import type { Metadata } from "next";
import Link from "next/link";
import {
  isEmailVerified,
  requireAccountPage,
} from "@/lib/account-page";
import {
  AccountPageFrame,
  EmailVerificationBanner,
} from "@/components/account/account-page-frame";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { formatJobRef } from "@/data/jobs";
import { formatDisplayDate, parseISODate } from "@/lib/date";
import { listCustomerJobs } from "@/lib/jobs";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your events",
  robots: { index: false, follow: false },
};

function formatEventDate(value: string | null): string {
  if (!value) return "—";
  const parsed = parseISODate(value.slice(0, 10));
  if (parsed) return formatDisplayDate(parsed);
  return value;
}

export default async function AccountEventsPage() {
  const current = await requireAccountPage();
  const verified = isEmailVerified(current.user);
  const jobs = await listCustomerJobs(current.user);

  return (
    <AccountPageFrame email={current.profile.email}>
      <EmailVerificationBanner verified={verified} />
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Events
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">
            Your booked events
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Track install and teardown scheduling, view your accepted proposal,
            and send updates to our team.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-3xl border border-border/40 bg-card/20 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No booked events yet. When a quote is accepted and confirmed, your
              event will appear here.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/account/quotes">View your quotes</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="flex flex-col rounded-3xl border border-border/40 bg-card/25 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary">
                      {job.opportunity_ref}
                    </p>
                    <h2 className="mt-1 font-heading text-xl font-semibold">
                      {formatJobRef(job.opportunity_ref)}
                    </h2>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Event date</dt>
                    <dd className="font-medium">{formatEventDate(job.event_date)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Venue</dt>
                    <dd className="text-right font-medium">{job.venue_name || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Install</dt>
                    <dd className="text-right font-medium">
                      {job.install_date
                        ? `${formatEventDate(job.install_date)}${job.install_start_time ? ` · ${job.install_start_time}` : ""}`
                        : "Scheduling in progress"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Teardown</dt>
                    <dd className="text-right font-medium">
                      {job.teardown_date
                        ? `${formatEventDate(job.teardown_date)}${job.teardown_start_time ? ` · ${job.teardown_start_time}` : ""}`
                        : "Scheduling in progress"}
                    </dd>
                  </div>
                </dl>
                <Button asChild className="mt-5 w-full">
                  <Link href={`/account/events/${job.id}`}>Open event</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </AccountPageFrame>
  );
}
