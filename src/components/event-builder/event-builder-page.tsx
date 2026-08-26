"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioDesigner } from "@/components/studio/studio-designer";
import {
  readEventBuilderBrief,
  type EventBuilderBrief,
} from "@/data/event-builder/brief";
import { buildStarterDesignFromBrief } from "@/lib/event-builder/build-starter-design";

type EventBuilderPageProps = {
  accessMode: "guest" | "customer" | "admin";
  apiBase?: string;
  signInHref?: string;
  createAccountHref?: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  className?: string;
};

export function EventBuilderPage({
  accessMode,
  apiBase,
  signInHref = "/account/login",
  createAccountHref = "/account/signup",
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  className,
}: EventBuilderPageProps) {
  const router = useRouter();
  const [brief, setBrief] = useState<EventBuilderBrief | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readEventBuilderBrief();
    if (!stored?.eventType) {
      router.replace("/studio/build");
      return;
    }
    setBrief(stored);
    setReady(true);
  }, [router]);

  const initialDesign = useMemo(
    () => (brief ? buildStarterDesignFromBrief(brief) : undefined),
    [brief]
  );

  if (!ready || !brief || !initialDesign) {
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
        signInHref={signInHref}
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