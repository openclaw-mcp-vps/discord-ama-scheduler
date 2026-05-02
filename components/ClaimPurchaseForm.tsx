"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClaimPurchaseFormProps {
  initialSessionId?: string;
}

export function ClaimPurchaseForm({ initialSessionId = "" }: ClaimPurchaseFormProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/paywall/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not verify your purchase yet.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Network error while verifying purchase.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleClaim} className="mt-4 space-y-3 rounded-lg border border-slate-700 bg-slate-900/70 p-4">
      <label htmlFor="sessionId" className="block text-sm font-medium text-slate-200">
        Stripe Checkout Session ID
      </label>
      <Input
        id="sessionId"
        value={sessionId}
        onChange={(event) => setSessionId(event.target.value)}
        placeholder="cs_test_..."
        required
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" disabled={busy || sessionId.length < 10}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {busy ? "Verifying..." : "Unlock dashboard"}
      </Button>
    </form>
  );
}
