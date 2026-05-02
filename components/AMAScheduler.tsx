"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { CalendarClock, Loader2 } from "lucide-react";
import { DiscordServerSelect } from "@/components/DiscordServerSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AMARecord, DiscordGuildSummary } from "@/lib/database";

const createAmaSchema = z.object({
  guildId: z.string().min(1, "Select a server"),
  title: z.string().min(8, "Title should be at least 8 characters").max(120),
  description: z.string().min(20, "Add context so members know what to ask").max(600),
  host: z.string().min(2, "Host name is required").max(80),
  startsAt: z.string().min(1, "Start time is required"),
  durationMinutes: z.coerce.number().int().min(15).max(240)
});

interface AMASchedulerProps {
  guilds: DiscordGuildSummary[];
  onCreated: (ama: AMARecord) => void;
}

export function AMAScheduler({ guilds, onCreated }: AMASchedulerProps) {
  const defaultStartTime = useMemo(() => format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"), []);

  const [form, setForm] = useState({
    guildId: "",
    title: "",
    description: "",
    host: "",
    startsAt: defaultStartTime,
    durationMinutes: 60
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = createAmaSchema.safeParse(form);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review your inputs.");
      return;
    }

    const selectedGuild = guilds.find((guild) => guild.id === parsed.data.guildId);

    if (!selectedGuild) {
      setError("The selected server is not available anymore.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/amas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsed.data,
          guildName: selectedGuild.name,
          startsAt: new Date(parsed.data.startsAt).toISOString()
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not create AMA");
        return;
      }

      const result = (await response.json()) as { ama: AMARecord };
      onCreated(result.ama);
      setForm((previous) => ({
        ...previous,
        title: "",
        description: "",
        startsAt: defaultStartTime
      }));
    } catch {
      setError("Network error while creating AMA");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-400" />
          Schedule a New AMA
        </CardTitle>
        <CardDescription>
          Plan a structured live session, assign a host, and set a precise time window for your community.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DiscordServerSelect
            servers={guilds.map((guild) => ({ id: guild.id, name: guild.name }))}
            value={form.guildId}
            onChange={(guildId) => setForm((previous) => ({ ...previous, guildId }))}
          />

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-200">
              AMA title
            </label>
            <Input
              id="title"
              value={form.title}
              placeholder="Example: Product Roadmap AMA with the Founder"
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-200">
              Description
            </label>
            <Textarea
              id="description"
              value={form.description}
              placeholder="Set expectations, topics, and response format so participants ask better questions."
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="host" className="text-sm font-medium text-slate-200">
                Host name
              </label>
              <Input
                id="host"
                value={form.host}
                placeholder="Host person or team"
                onChange={(event) => setForm((previous) => ({ ...previous, host: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="startsAt" className="text-sm font-medium text-slate-200">
                Start time
              </label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((previous) => ({ ...previous, startsAt: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="durationMinutes" className="text-sm font-medium text-slate-200">
              Session length (minutes)
            </label>
            <Input
              id="durationMinutes"
              type="number"
              min={15}
              max={240}
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  durationMinutes: Number(event.target.value)
                }))
              }
              required
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? "Scheduling..." : "Create AMA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
