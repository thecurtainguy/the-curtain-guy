"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PenLine } from "lucide-react";
import { EstimateBuilder } from "@/components/estimate/estimate-builder";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import type { UserProfile } from "@/lib/auth";

export type PortalProfileContact = Pick<
  UserProfile,
  "full_name" | "email" | "phone"
>;

type PortalEstimateEmbedContextValue = {
  start: () => void;
  building: boolean;
  cancel: () => void;
  audience: "admin" | "customer";
  profile?: PortalProfileContact | null;
};

const PortalEstimateEmbedContext =
  createContext<PortalEstimateEmbedContextValue | null>(null);

export function usePortalStartEstimate() {
  const ctx = useContext(PortalEstimateEmbedContext);
  return ctx?.start ?? (() => {});
}

type PortalEstimateEmbedProviderProps = {
  audience: "admin" | "customer";
  profile?: PortalProfileContact | null;
  children: ReactNode;
};

export function PortalEstimateEmbedProvider({
  audience,
  profile,
  children,
}: PortalEstimateEmbedProviderProps) {
  const [building, setBuilding] = useState(false);

  const value = useMemo(
    () => ({
      start: () => setBuilding(true),
      building,
      cancel: () => setBuilding(false),
      audience,
      profile,
    }),
    [building, audience, profile]
  );

  return (
    <PortalEstimateEmbedContext.Provider value={value}>
      {children}
    </PortalEstimateEmbedContext.Provider>
  );
}

export function PortalEstimateEmbedSlot({ children }: { children: ReactNode }) {
  const ctx = useContext(PortalEstimateEmbedContext);
  const t = useTranslations("estimate.portalEmbed");
  const router = useRouter();

  if (!ctx) {
    return children;
  }

  const detailBase =
    ctx.audience === "admin" ? "/admin/estimates" : "/account/estimates";

  const defaultContact = {
    name: ctx.profile?.full_name ?? "",
    email: ctx.profile?.email ?? "",
    phone: ctx.profile?.phone ?? "",
  };

  function handleSubmitSaved(requestId: string) {
    ctx?.cancel();
    router.push(`${detailBase}/${requestId}`);
    router.refresh();
  }

  if (ctx.building) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          icon={PenLine}
          backLabel={t("cancelBuild")}
          onBack={ctx.cancel}
        />

        <div className="rounded-2xl border border-border/40 bg-card/20 p-4 sm:p-6 lg:p-8">
          <EstimateBuilder
            embedded
            portal={ctx.audience}
            defaultContact={defaultContact}
            onSubmitSaved={handleSubmitSaved}
            onCancel={ctx.cancel}
          />
        </div>
      </div>
    );
  }

  return children;
}
