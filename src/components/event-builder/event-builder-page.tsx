"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { StudioDesigner } from "@/components/studio/studio-designer";
import {
  readEventBuilderBrief,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";

const briefSnapshot: { key: string; brief: EventBuilderBrief | null } = { key: "", brief: null };

function subscribeToBrief(): () => void {
  return () => {};
}

/** Stable per stored value so `useSyncExternalStore` does not loop. */
function readBriefSnapshot(): EventBuilderBrief | null {
  const brief = readEventBuilderBrief();
  const key = brief ? JSON.stringify(brief) : "";
  if (key !== briefSnapshot.key) {
    briefSnapshot.key = key;
    briefSnapshot.brief = brief;
  }
  return briefSnapshot.brief;
}

/** `undefined` until the client has read session storage. */
function readServerBriefSnapshot(): EventBuilderBrief | null | undefined {
  return undefined;
}

type EventBuilderPageProps = {
  accessMode: "guest" | "customer" | "admin";
  apiBase?: string;
  createAccountHref?: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  className?: string;
};

export function EventBuilderPage({
  accessMode,
  apiBase,
  createAccountHref = "/account/signup",
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  className,
}: EventBuilderPageProps) {
  const router = useRouter();
  const stored = useSyncExternalStore<EventBuilderBrief | null | undefined>(
    subscribeToBrief,
    readBriefSnapshot,
    readServerBriefSnapshot
  );
  const brief = stored?.eventType ? stored : null;

  useEffect(() => {
    if (stored !== undefined && !stored?.eventType) {
      router.replace("/studio/build");
    }
  }, [stored, router]);

  const initialDesign = useMemo(
    () => (brief ? buildStarterDesignFromBrief(brief) : undefined),
    [brief]
  );

  if (!brief || !initialDesign) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading your event plan…
      </div>
    );
  }

  return (
    <div className={className ?? "flex min-h-0 flex-1 flex-col"}>
      <StudioDesigner
        mode="event"
        eventBrief={brief}
        initialDesign={initialDesign}
        initialTitle="Your event plan"
        accessMode={accessMode}
        apiBase={apiBase}
        createAccountHref={createAccountHref}
        eventContactDefaults={{
          name: defaultName,
          email: defaultEmail,
          phone: defaultPhone,
        }}
        className="min-h-0 flex-1"
      />
    </div>
  );
}