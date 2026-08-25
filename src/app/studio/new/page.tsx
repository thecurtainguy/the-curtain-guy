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
    <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background p-1.5 sm:p-2">
      <div className="mx-auto mb-1.5 flex w-full max-w-[1920px] shrink-0 items-center justify-between gap-3 px-1">
        <Link
          href={
            accessMode === "admin"
              ? "/admin/studio"
              : accessMode === "customer"
                ? "/account/studio"
                : "/studio"
          }
          className="inline-flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
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
        className="mx-auto min-h-0 w-full max-w-[1920px] flex-1"
      />
    </div>
  );
}
