"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountProfileForm({
  email,
  initialFullName,
  initialPhone,
}: {
  email: string;
  initialFullName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not update profile.");
        return;
      }
      setMessage("Profile updated.");
      router.refresh();
    } catch {
      setError("Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly disabled />
        <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-phone">Phone</Label>
        <Input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save profile
      </Button>
      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
