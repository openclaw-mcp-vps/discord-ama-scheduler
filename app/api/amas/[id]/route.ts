import { NextResponse } from "next/server";
import { z } from "zod";
import { getAMAById, updateAMAStatus } from "@/lib/database";
import { getCurrentDiscordSession, hasPaidAccess } from "@/lib/session";

const updateStatusSchema = z.object({
  status: z.enum(["scheduled", "live", "completed"])
});

async function authorize(amaId: string) {
  const [session, unlocked, ama] = await Promise.all([getCurrentDiscordSession(), hasPaidAccess(), getAMAById(amaId)]);

  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  if (!unlocked) {
    return { error: NextResponse.json({ error: "Paid access required" }, { status: 403 }) };
  }

  if (!ama) {
    return { error: NextResponse.json({ error: "AMA not found" }, { status: 404 }) };
  }

  const allowed = session.guilds.some((guild) => guild.id === ama.guildId);

  if (!allowed) {
    return { error: NextResponse.json({ error: "No access to this AMA" }, { status: 403 }) };
  }

  return { ama };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const result = await authorize(params.id);

  if ("error" in result) {
    return result.error;
  }

  return NextResponse.json({ ama: result.ama });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const result = await authorize(params.id);

  if ("error" in result) {
    return result.error;
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = updateStatusSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
  }

  const ama = await updateAMAStatus(params.id, parsed.data.status);

  if (!ama) {
    return NextResponse.json({ error: "AMA not found" }, { status: 404 });
  }

  return NextResponse.json({ ama });
}
