import { NextResponse } from "next/server";
import { createQuestion, updateAMAStatus } from "@/lib/database";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.DISCORD_WEBHOOK_SECRET;

  if (expectedSecret) {
    const providedSecret = request.headers.get("x-discord-webhook-secret");

    if (!providedSecret || providedSecret !== expectedSecret) {
      return unauthorizedResponse();
    }
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        event?: "QUESTION_SUBMITTED" | "AMA_STATUS_CHANGED";
        amaId?: string;
        askedBy?: string;
        content?: string;
        status?: "scheduled" | "live" | "completed";
      }
    | null;

  if (!payload?.event || !payload.amaId) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  if (payload.event === "QUESTION_SUBMITTED") {
    if (!payload.askedBy || !payload.content) {
      return NextResponse.json({ error: "Question payload missing fields" }, { status: 400 });
    }

    const question = await createQuestion(payload.amaId, {
      askedBy: payload.askedBy,
      content: payload.content
    });

    return NextResponse.json({ ok: true, question });
  }

  if (payload.event === "AMA_STATUS_CHANGED") {
    if (!payload.status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const ama = await updateAMAStatus(payload.amaId, payload.status);

    if (!ama) {
      return NextResponse.json({ error: "AMA not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ama });
  }

  return NextResponse.json({ error: "Unsupported event type" }, { status: 400 });
}
