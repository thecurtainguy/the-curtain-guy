import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudioDesigner } from "@/components/studio/studio-designer";
import {
  cloneStudioTemplate,
  type StudioTemplateKey,
} from "@/data/studio";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New room design",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  template?: string;
  estimateId?: string;
  quoteId?: string;
  jobId?: string;
  opportunityRef?: string;
  resume?: string;
}>;

function resolveTemplate(value: string | undefined): StudioTemplateKey {
  if (value === "l_shape" || value === "custom") return value;
  return "rectangle";
}

export default async function NewStudioDesignPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [current, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);
  const accessMode =
    current?.profile.role === "owner"
      ? "admin"
      : current?.profile.role === "customer"
        ? "customer"
        : "guest";
  const apiBase =
    accessMode === "admin"
      ? "/api/admin/studio"
      : accessMode === "customer"
        ? "/api/account/studio"
        : undefined;

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3">
      <div className="mx-auto mb-2 flex max-w-[1900px] items-center justify-between gap-3 px-1 py-1">
        <Link
          href={
            accessMode === "admin"
              ? "/admin/studio"
              : accessMode === "customer"
                ? "/account/studio"
                : "/studio"
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Studio
        </Link>
        <p className="hidden text-xs text-muted-foreground sm:block">
          2D plan and 3D preview share one room design
        </p>
      </div>
      <StudioDesigner
        initialDesign={cloneStudioTemplate(resolveTemplate(params.template))}
        accessMode={accessMode}
        apiBase={apiBase}
        signInHref="/account/login"
        createAccountHref="/account/signup"
        resumeSessionDraft={params.resume === "1"}
        linkContext={{
          estimateRequestId: params.estimateId,
          quoteId: params.quoteId,
          jobId: params.jobId,
          opportunityRef: params.opportunityRef,
        }}
        className="mx-auto max-w-[1900px] lg:h-[calc(100svh-3.75rem)]"
      />
    </div>
  );
}
