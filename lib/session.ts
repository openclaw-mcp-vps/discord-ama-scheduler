import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDiscordSession, getPaidSession } from "@/lib/database";
import { getPaywallCookieOptions, hasActivePaywallCookie, PAYWALL_COOKIE_NAME } from "@/lib/lemonsqueezy";

export const DISCORD_SESSION_COOKIE_NAME = "ama_discord_session";

export async function getCurrentDiscordSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(DISCORD_SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  return getDiscordSession(sessionCookie);
}

export async function requireDiscordSession() {
  const session = await getCurrentDiscordSession();

  if (!session) {
    redirect("/");
  }

  return session;
}

export async function hasPaidAccess() {
  const cookieStore = await cookies();
  const paidSessionId = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;

  if (!paidSessionId || !hasActivePaywallCookie(paidSessionId)) {
    return false;
  }

  const paidSession = await getPaidSession(paidSessionId);
  return Boolean(paidSession);
}

export async function requirePaidAccess() {
  const unlocked = await hasPaidAccess();

  if (!unlocked) {
    redirect("/");
  }
}

export function paidCookieOptions() {
  return getPaywallCookieOptions();
}
