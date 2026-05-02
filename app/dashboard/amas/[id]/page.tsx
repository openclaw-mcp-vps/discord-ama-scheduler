import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { AMAStatusControls } from "@/components/AMAStatusControls";
import { QuestionQueue } from "@/components/QuestionQueue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAMAById, listAMAQuestions } from "@/lib/database";
import { requireDiscordSession, requirePaidAccess } from "@/lib/session";

function statusVariant(status: "scheduled" | "live" | "completed") {
  if (status === "live") {
    return "success" as const;
  }

  if (status === "completed") {
    return "muted" as const;
  }

  return "default" as const;
}

export default async function AMADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, requireDiscordSession()]);
  await requirePaidAccess();

  const ama = await getAMAById(id);

  if (!ama) {
    notFound();
  }

  const hasAccess = session.guilds.some((guild) => guild.id === ama.guildId);

  if (!hasAccess) {
    redirect("/dashboard/amas");
  }

  const questions = await listAMAQuestions(ama.id);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/amas" className="mb-4 inline-flex items-center text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to all AMAs
      </Link>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(ama.status)}>{ama.status}</Badge>
              <Badge variant="muted">{ama.guildName}</Badge>
            </div>
            <CardTitle>{ama.title}</CardTitle>
            <CardDescription>{ama.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>
              Host: <span className="font-medium text-slate-100">{ama.host}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-300" />
              {format(parseISO(ama.startsAt), "EEEE, MMMM d, yyyy 'at' HH:mm")} ({ama.durationMinutes} minutes)
            </p>
          </CardContent>
        </Card>

        <AMAStatusControls amaId={ama.id} initialStatus={ama.status} />
      </div>

      <QuestionQueue amaId={ama.id} initialQuestions={questions} />
    </main>
  );
}
