import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createDiscordSession } from "@/lib/database";
import {
  createDiscordOAuthState,
  exchangeDiscordCodeForToken,
  fetchDiscordIdentity,
  getDiscordAuthUrl,
  verifyDiscordOAuthState
} from "@/lib/discord";
import { DISCORD_SESSION_COOKIE_NAME } from "@/lib/session";

const OAUTH_STATE_COOKIE = "ama_discord_oauth_state";

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    const oauthState = createDiscordOAuthState();
    const redirectToDiscord = NextResponse.redirect(getDiscordAuthUrl(oauthState));

    redirectToDiscord.cookies.set(OAUTH_STATE_COOKIE, oauthState, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60
    });

    return redirectToDiscord;
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!state || !savedState || state !== savedState || !verifyDiscordOAuthState(state)) {
    return NextResponse.redirect(new URL("/?error=oauth_state_invalid", getAppUrl()));
  }

  try {
    const tokenResponse = await exchangeDiscordCodeForToken(code);
    const identity = await fetchDiscordIdentity(tokenResponse.access_token);

    const session = await createDiscordSession({
      discordUserId: identity.user.id,
      username: identity.user.username,
      avatarUrl: identity.user.avatarUrl,
      accessToken: tokenResponse.access_token,
      guilds: identity.guilds
    });

    const response = NextResponse.redirect(new URL("/dashboard", getAppUrl()));

    response.cookies.set(DISCORD_SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    response.cookies.delete(OAUTH_STATE_COOKIE);

    return response;
  } catch {
    return NextResponse.redirect(new URL("/?error=discord_auth_failed", getAppUrl()));
  }
}
