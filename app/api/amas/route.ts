import { NextResponse } from "next/server";
import { z } from "zod";
import { createAMA, listAMAs } from "@/lib/database";
import { getCurrentDiscordSession, hasPaidAccess } from "@/lib/session";

const createAmaPayloadSchema = z.object({
  guildId: z.string().min(1),
  guildName: z.string().min(1),
  title: z.string().min(8).max(120),
  description: z.string().min(20).max(600),
  host: z.string().min(2).max(80),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(240)
});

export async function GET() {
  const [session, unlocked] = await Promise.all([getCurrentDiscordSession(), hasPaidAccess()]);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!unlocked) {
    return NextResponse.json({ error: "Paid access required" }, { status: 403 });
  }

  const guildIds = new Set(session.guilds.map((guild) => guild.id));
  const amas = (await listAMAs()).filter((ama) => guildIds.has(ama.guildId));

  return NextResponse.json({ amas });
}

export async function POST(request: Request) {
  const [session, unlocked] = await Promise.all([getCurrentDiscordSession(), hasPaidAccess()]);

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!unlocked) {
    return NextResponse.json({ error: "Paid access required" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = createAmaPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const allowedGuild = session.guilds.find((guild) => guild.id === parsed.data.guildId);

  if (!allowedGuild) {
    return NextResponse.json({ error: "Selected server is not available for your account" }, { status: 400 });
  }

  const ama = await createAMA({
    guildId: allowedGuild.id,
    guildName: allowedGuild.name,
    title: parsed.data.title,
    description: parsed.data.description,
    host: parsed.data.host,
    startsAt: parsed.data.startsAt,
    durationMinutes: parsed.data.durationMinutes
  });

  return NextResponse.json({ ama }, { status: 201 });
}
