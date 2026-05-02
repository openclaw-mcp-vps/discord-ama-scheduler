"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AMAStatus } from "@/lib/database";

interface AMAStatusControlsProps {
  amaId: string;
  initialStatus: AMAStatus;
}

const statusOrder: AMAStatus[] = ["scheduled", "live", "completed"];

export function AMAStatusControls({ amaId, initialStatus }: AMAStatusControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: AMAStatus) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/amas/${amaId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not update status");
        return;
      }

      setStatus(nextStatus);
    } catch {
      setError("Network error while updating status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-medium text-slate-200">Session status</p>
      <div className="flex flex-wrap gap-2">
        {statusOrder.map((option) => (
          <Button
            key={option}
            variant={status === option ? "default" : "outline"}
            size="sm"
            onClick={() => updateStatus(option)}
            disabled={busy || status === option}
            className={cn("capitalize")}
          >
            {option}
          </Button>
        ))}
      </div>
      {busy ? (
        <p className="flex items-center text-xs text-slate-400">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Saving status...
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
