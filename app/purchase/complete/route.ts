import { NextResponse } from "next/server";
import { claimPaidSession } from "@/lib/database";
import { getPaywallCookieOptions, PAYWALL_COOKIE_NAME } from "@/lib/lemonsqueezy";

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/?purchase=missing_session", appUrl()));
  }

  const paidSession = await claimPaidSession(sessionId);

  if (!paidSession) {
    return NextResponse.redirect(new URL(`/?purchase=not_verified&session_id=${encodeURIComponent(sessionId)}`, appUrl()));
  }

  const response = NextResponse.redirect(new URL("/dashboard", appUrl()));
  response.cookies.set(PAYWALL_COOKIE_NAME, paidSession.id, getPaywallCookieOptions());
  return response;
}
