import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { claimPaidSession } from "@/lib/database";
import { getPaywallCookieOptions, PAYWALL_COOKIE_NAME } from "@/lib/lemonsqueezy";

const claimSchema = z.object({
  sessionId: z.string().min(10)
});

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = claimSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const paidSession = await claimPaidSession(parsed.data.sessionId);

  if (!paidSession) {
    return NextResponse.json(
      {
        error: "Payment was not verified yet. Wait for Stripe webhook delivery, then retry."
      },
      { status: 404 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(PAYWALL_COOKIE_NAME, paidSession.id, getPaywallCookieOptions());

  return NextResponse.json({ ok: true, expiresAt: paidSession.expiresAt });
}
