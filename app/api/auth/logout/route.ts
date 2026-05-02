import { NextResponse } from "next/server";
import { DISCORD_SESSION_COOKIE_NAME } from "@/lib/session";
import { PAYWALL_COOKIE_NAME } from "@/lib/lemonsqueezy";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DISCORD_SESSION_COOKIE_NAME);
  response.cookies.delete(PAYWALL_COOKIE_NAME);
  return response;
}
