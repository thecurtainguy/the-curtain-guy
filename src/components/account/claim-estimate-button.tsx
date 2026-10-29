"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

export function ClaimEstimateButton({ estimateId }: { estimateId: string }) {
  const router = useRouter();
  const t = useTranslations("account-auth.portal.toasts");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function claim() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/account/estimates/${estimateId}/claim`,
        { method: "POST" }
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        const errorMessage = payload.message ?? t("estimateClaimFailed");
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }
      setDone(true);
      toast.success(t("estimateClaimed"));
      router.refresh();
    } catch {
      setError(t("estimateClaimFailed"));
      toast.error(t("estimateClaimFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="feedback-success">Saved to your account.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={() => void claim()} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Save this estimate to my account
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
