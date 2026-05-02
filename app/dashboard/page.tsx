import Link from "next/link";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ArrowRight, CalendarDays, MessageSquare, RadioTower, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAMAs, listAMAQuestions } from "@/lib/database";
import { requireDiscordSession, requirePaidAccess } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireDiscordSession();
  await requirePaidAccess();

  const guildIds = new Set(session.guilds.map((guild) => guild.id));
  const amas = (await listAMAs()).filter((ama) => guildIds.has(ama.guildId));

  const now = Date.now();
  const upcomingCount = amas.filter((ama) => Date.parse(ama.startsAt) > now && ama.status === "scheduled").length;
  const liveCount = amas.filter((ama) => ama.status === "live").length;
  const completedCount = amas.filter((ama) => ama.status === "completed").length;

  const questionTotals = await Promise.all(amas.map((ama) => listAMAQuestions(ama.id).then((questions) => questions.length)));
  const totalQuestions = questionTotals.reduce((sum, current) => sum + current, 0);

  const nextAma = amas
    .filter((ama) => Date.parse(ama.startsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-400">Welcome back,</p>
          <h1 className="text-3xl font-semibold">{session.username}</h1>
        </div>
        <Link href="/dashboard/amas">
          <Button>
            Open AMA workspace
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Managed servers</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Server className="h-6 w-6 text-blue-300" />
              {session.guilds.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Upcoming AMAs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <CalendarDays className="h-6 w-6 text-cyan-300" />
              {upcomingCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Live right now</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <RadioTower className="h-6 w-6 text-emerald-300" />
              {liveCount}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Total questions captured</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <MessageSquare className="h-6 w-6 text-amber-300" />
              {totalQuestions}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session pipeline</CardTitle>
            <CardDescription>Current status across all AMAs tied to your managed servers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <span>Scheduled</span>
              <Badge>{upcomingCount}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <span>Live</span>
              <Badge variant="success">{liveCount}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <span>Completed</span>
              <Badge variant="muted">{completedCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next AMA</CardTitle>
            <CardDescription>What your moderation team should prepare for next.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextAma ? (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-lg font-semibold">{nextAma.title}</p>
                <p className="text-sm text-slate-400">{nextAma.guildName}</p>
                <p className="text-sm text-slate-300">{nextAma.description}</p>
                <p className="text-sm text-blue-300">
                  Starts {formatDistanceToNow(parseISO(nextAma.startsAt), { addSuffix: true })} • {format(parseISO(nextAma.startsAt), "EEE, MMM d HH:mm")}
                </p>
                <Link href={`/dashboard/amas/${nextAma.id}`} className="inline-flex items-center text-sm text-blue-300 hover:text-blue-200">
                  Open queue and prep checklist
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No upcoming AMAs yet. Create your first one in the workspace to start collecting questions.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
