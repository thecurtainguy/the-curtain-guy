"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PencilLine, Sparkles } from "lucide-react";
import type { EventBuilderBrief } from "@/data/event-builder/brief";
import type { StudioDesignJson } from "@/data/studio";
import type { EventPlanStatus } from "@/data/event-plans";
import { EventBuilderFlow } from "@/components/event-builder/event-builder-flow";
import {
  EventPlanBriefView,
  type EventPlanBriefViewData,
} from "@/components/event-plans/event-plan-brief-view";
import { EventPlanStatusBadge } from "@/components/event-plans/event-plan-status-badge";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";

type EventPlanPortalDetailProps = {
  planId: string;
  reference: string;
  submittedAt: string;
  status: EventPlanStatus | string;
  audience: "admin" | "customer";
  planView: EventPlanBriefViewData;
  brief: EventBuilderBrief;
  design: StudioDesignJson;
  contactDefaults: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  backHref: string;
  backLabel: string;
};

export function EventPlanPortalDetail({
  planId,
  reference,
  submittedAt,
  status,
  audience,
  planView,
  brief,
  design,
  contactDefaults,
  backHref,
  backLabel,
}: EventPlanPortalDetailProps) {
  const t = useTranslations("eventBuilder.portalDetail");
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  function handleEditSaved() {
    setEditing(false);
    router.refresh();
  }

  function handleCancelEdit() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow={t("editingEyebrow")}
          title={t("editingTitle", { reference })}
          description={t("editingDescription")}
          icon={Sparkles}
          backLabel={t("cancelEdit")}
          onBack={handleCancelEdit}
          meta={<EventPlanStatusBadge status={status} />}
        />

        <div className="rounded-2xl border border-border/40 bg-card/20 p-4 sm:p-6">
          <EventBuilderFlow
            editPlanId={planId}
            portal={audience}
            embedded
            initialEditBrief={brief}
            initialEditContact={contactDefaults}
            onEditSaved={handleEditSaved}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow={t("eyebrow")}
        title={reference}
        description={t("submitted", { date: submittedAt })}
        icon={Sparkles}
        backHref={backHref}
        backLabel={backLabel}
        meta={<EventPlanStatusBadge status={status} />}
        actions={
          <Button type="button" onClick={() => setEditing(true)}>
            <PencilLine className="size-4" />
            {t("editPlan")}
          </Button>
        }
      />

      <EventPlanBriefView
        plan={planView}
        brief={brief}
        design={design}
        audience={audience}
      />
    </div>
  );
}
