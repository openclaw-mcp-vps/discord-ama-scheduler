"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, CalendarRange, Users } from "lucide-react";
import { AMAScheduler } from "@/components/AMAScheduler";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AMARecord, DiscordGuildSummary } from "@/lib/database";

interface AMAWorkspaceProps {
  guilds: DiscordGuildSummary[];
  initialAMAs: AMARecord[];
}

function statusVariant(status: AMARecord["status"]) {
  if (status === "completed") {
    return "muted" as const;
  }

  if (status === "live") {
    return "success" as const;
  }

  return "default" as const;
}

export function AMAWorkspace({ guilds, initialAMAs }: AMAWorkspaceProps) {
  const sortedInitial = [...initialAMAs].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <AMAScheduler guilds={guilds} onCreated={() => window.location.reload()} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Upcoming and Active AMAs
          </CardTitle>
          <CardDescription>
            Jump into each AMA workspace to moderate questions, handle flow, and close the session cleanly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedInitial.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              No AMAs yet. Schedule one to start collecting questions.
            </p>
          ) : null}

          {sortedInitial.map((ama) => (
            <article key={ama.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{ama.title}</h3>
                  <p className="text-xs text-slate-400">{ama.guildName}</p>
                </div>
                <Badge variant={statusVariant(ama.status)}>{ama.status}</Badge>
              </div>

              <p className="mb-3 text-sm text-slate-300">{ama.description}</p>

              <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                <CalendarRange className="h-4 w-4" />
                {format(parseISO(ama.startsAt), "EEE, MMM d • HH:mm")} ({ama.durationMinutes} min)
              </div>

              <Link
                href={`/dashboard/amas/${ama.id}`}
                className="inline-flex items-center text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
              >
                Open AMA workspace
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
