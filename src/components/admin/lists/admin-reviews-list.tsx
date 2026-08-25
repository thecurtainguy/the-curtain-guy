"use client";

import Link from "next/link";
import { getReviewCategoryLabel, type ReviewCategory } from "@/data/reviews";
import {
  formatReviewSubmissionRef,
  getRecommendLabel,
  REVIEW_SUBMISSION_STATUSES,
  type ReviewRecommendAnswer,
  type ReviewSubmissionStatus,
} from "@/data/review-submissions";
import { ReviewSubmissionStatusBadge } from "@/components/reviews/review-submission-status-badge";
import { StarRating } from "@/components/reviews/star-rating";
import {
  PortalListSuspense,
  PortalListView,
  type PortalListColumn,
  type PortalStatusOption,
} from "@/components/portal/list";
import { Button } from "@/components/ui/button";

export type AdminReviewListRow = {
  id: string;
  status: ReviewSubmissionStatus;
  name: string;
  email: string;
  event_category: ReviewCategory | null;
  event_label: string | null;
  event_date: string | null;
  venue: string | null;
  location: string | null;
  rating: number;
  would_recommend: ReviewRecommendAnswer;
  publish_on_website: boolean;
  ok_to_contact: boolean;
  created_at: string;
};

const STATUS_OPTIONS: PortalStatusOption[] = REVIEW_SUBMISSION_STATUSES.map(
  (status) => ({
    value: status,
    label: status.replaceAll("_", " "),
  })
);

const columns: PortalListColumn<AdminReviewListRow>[] = [
  {
    id: "reference",
    label: "Reference",
    sortable: true,
    sortValue: (row) => formatReviewSubmissionRef(row.id),
    render: (row) => (
      <Link
        href={`/admin/reviews/${row.id}`}
        className="font-medium text-primary hover:underline"
      >
        {formatReviewSubmissionRef(row.id)}
      </Link>
    ),
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => <ReviewSubmissionStatusBadge status={row.status} />,
  },
  {
    id: "submitter",
    label: "Submitter",
    sortable: true,
    sortValue: (row) => row.name,
    render: (row) => (
      <div>
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
      </div>
    ),
  },
  {
    id: "rating",
    label: "Rating",
    sortable: true,
    sortType: "number",
    sortValue: (row) => row.rating,
    render: (row) => <StarRating rating={row.rating} />,
  },
  {
    id: "event",
    label: "Event",
    sortable: true,
    sortValue: (row) => row.event_category || "",
    render: (row) => (
      <div className="text-muted-foreground">
        <div>
          {row.event_category
            ? getReviewCategoryLabel(row.event_category as ReviewCategory)
            : "—"}
        </div>
        <div className="text-xs">
          {row.event_label || row.venue || row.location || "—"}
        </div>
      </div>
    ),
  },
  {
    id: "date",
    label: "Event date",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.event_date,
    render: (row) => (
      <span className="text-muted-foreground">{row.event_date || "—"}</span>
    ),
  },
  {
    id: "recommend",
    label: "Recommend",
    sortable: true,
    sortValue: (row) => row.would_recommend,
    render: (row) => (
      <span className="capitalize text-muted-foreground">
        {getRecommendLabel(row.would_recommend)}
      </span>
    ),
  },
  {
    id: "permissions",
    label: "Permissions",
    sortable: true,
    sortValue: (row) =>
      `${row.publish_on_website ? 1 : 0}${row.ok_to_contact ? 1 : 0}`,
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.publish_on_website ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            Publish
          </span>
        ) : null}
        {row.ok_to_contact ? (
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Contact
          </span>
        ) : null}
        {!row.publish_on_website && !row.ok_to_contact ? (
          <span className="text-muted-foreground">—</span>
        ) : null}
      </div>
    ),
  },
  {
    id: "submitted",
    label: "Submitted",
    sortable: true,
    sortType: "date",
    sortValue: (row) => row.created_at,
    render: (row) => (
      <span className="text-muted-foreground">
        {new Date(row.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    id: "actions",
    label: "",
    align: "right",
    render: (row) => (
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/reviews/${row.id}`}>Open</Link>
      </Button>
    ),
  },
];

function List({ rows }: { rows: AdminReviewListRow[] }) {
  return (
    <PortalListView
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      getSearchText={(row) =>
        [
          formatReviewSubmissionRef(row.id),
          row.name,
          row.email,
          row.event_label,
          row.venue,
          row.location,
          row.id,
        ]
          .filter(Boolean)
          .join(" ")
      }
      getStatus={(row) => row.status}
      statusOptions={STATUS_OPTIONS}
      searchLabel="Search reference, name, email, event"
      searchPlaceholder="REV-… or submitter details"
      empty="No review submissions match these filters."
    />
  );
}

export function AdminReviewsList({ rows }: { rows: AdminReviewListRow[] }) {
  return (
    <PortalListSuspense>
      <List rows={rows} />
    </PortalListSuspense>
  );
}
