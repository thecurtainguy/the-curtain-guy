"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Sparkles } from "lucide-react";
import { EventBuilderFlow } from "@/components/event-builder/event-builder-flow";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { Button } from "@/components/ui/button";

type EventPlanPortalContactDefaults = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const EventPlanPortalBuildNewContext = createContext<(() => void) | null>(null);

export function useEventPlanPortalBuildNew() {
  return useContext(EventPlanPortalBuildNewContext);
}

type EventPlanPortalListShellProps = {
  audience: "admin" | "customer";
  contactDefaults: EventPlanPortalContactDefaults;
  description: string;
  children: ReactNode;
};

export function EventPlanPortalListShell({
  audience,
  contactDefaults,
  description,
  children,
}: EventPlanPortalListShellProps) {
  const t = useTranslations("eventBuilder.portalList");
  const router = useRouter();
  const [building, setBuilding] = useState(false);

  const listHref =
    audience === "admin" ? "/admin/event-plans" : "/account/event-plans";

  function handleSubmitSaved(planId: string) {
    router.push(`${listHref}/${planId}`);
  }

  if (building) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow={t("buildingEyebrow")}
          title={t("buildingTitle")}
          description={t("buildingDescription")}
          icon={Sparkles}
          backLabel={t("cancelBuild")}
          onBack={() => setBuilding(false)}
        />

        <div className="rounded-2xl border border-border/40 bg-card/20 p-4 sm:p-6">
          <EventBuilderFlow
            portal={audience}
            embedded
            startFresh
            initialPortalContact={contactDefaults}
            onCancelEdit={() => setBuilding(false)}
            onSubmitSaved={handleSubmitSaved}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={description}
        icon={Sparkles}
        actions={
          <Button type="button" onClick={() => setBuilding(true)}>
            <Plus className="size-4" />
            {t("buildNew")}
          </Button>
        }
      />
      <EventPlanPortalBuildNewContext.Provider value={() => setBuilding(true)}>
        {children}
      </EventPlanPortalBuildNewContext.Provider>
    </div>
  );
}
