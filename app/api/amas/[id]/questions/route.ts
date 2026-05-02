import { NextResponse } from "next/server";
import { z } from "zod";
import { createQuestion, getAMAById, listAMAQuestions, updateQuestion } from "@/lib/database";
import { getCurrentDiscordSession, hasPaidAccess } from "@/lib/session";

const addQuestionSchema = z.object({
  askedBy: z.string().min(2).max(80),
  content: z.string().min(12).max(500)
});

const patchQuestionSchema = z.object({
  questionId: z.string().uuid(),
  status: z.enum(["queued", "answered", "dismissed"]).optional(),
  action: z.enum(["upvote"]).optional()
});

async function authorizeForAma(amaId: string) {
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

  const hasGuildAccess = session.guilds.some((guild) => guild.id === ama.guildId);

  if (!hasGuildAccess) {
    return { error: NextResponse.json({ error: "You do not have access to this AMA" }, { status: 403 }) };
  }

  return { ama };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const authorization = await authorizeForAma(params.id);

  if ("error" in authorization) {
    return authorization.error;
  }

  const questions = await listAMAQuestions(params.id);
  return NextResponse.json({ questions });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const authorization = await authorizeForAma(params.id);

  if ("error" in authorization) {
    return authorization.error;
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = addQuestionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const question = await createQuestion(params.id, parsed.data);
  return NextResponse.json({ question }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const authorization = await authorizeForAma(params.id);

  if ("error" in authorization) {
    return authorization.error;
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = patchQuestionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  if (!parsed.data.status && !parsed.data.action) {
    return NextResponse.json({ error: "Provide either status or action" }, { status: 400 });
  }

  let upvotes: number | undefined;

  if (parsed.data.action === "upvote") {
    const existingQuestions = await listAMAQuestions(params.id);
    const current = existingQuestions.find((question) => question.id === parsed.data.questionId);

    if (!current) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    upvotes = current.upvotes + 1;
  }

  const question = await updateQuestion(params.id, parsed.data.questionId, {
    status: parsed.data.status,
    upvotes
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ question });
}
