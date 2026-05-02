import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { DiscordGuildSummary } from "@/lib/database";

const DISCORD_OAUTH_URL = "https://discord.com/oauth2/authorize";
const DISCORD_API_BASE = "https://discord.com/api/v10";
const MANAGE_GUILD_PERMISSION = 0x20n;

interface DiscordUserApiResponse {
  id: string;
  username: string;
  avatar: string | null;
}

interface DiscordGuildApiResponse {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signStatePayload(payload: string) {
  const secret = requireEnv("DISCORD_CLIENT_SECRET");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createDiscordOAuthState() {
  const payload = JSON.stringify({
    nonce: randomBytes(12).toString("hex"),
    createdAt: Date.now()
  });

  const encodedPayload = base64UrlEncode(payload);
  const signature = signStatePayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyDiscordOAuthState(state: string) {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signStatePayload(encodedPayload);

  try {
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length) {
      return false;
    }

    if (!timingSafeEqual(provided, expected)) {
      return false;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as { createdAt: number };
    const ageMs = Date.now() - payload.createdAt;

    return ageMs > 0 && ageMs <= 10 * 60 * 1000;
  } catch {
    return false;
  }
}

export function getDiscordAuthUrl(state: string) {
  const clientId = requireEnv("DISCORD_CLIENT_ID");
  const redirectUri = requireEnv("DISCORD_REDIRECT_URI");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify guilds",
    prompt: "consent",
    state
  });

  return `${DISCORD_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeDiscordCodeForToken(code: string) {
  const body = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: requireEnv("DISCORD_REDIRECT_URI")
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Discord token exchange failed: ${details}`);
  }

  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  };
}

export async function fetchDiscordIdentity(accessToken: string) {
  const [userResponse, guildsResponse] = await Promise.all([
    fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    }),
    fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    })
  ]);

  if (!userResponse.ok || !guildsResponse.ok) {
    throw new Error("Failed to fetch Discord identity");
  }

  const [user, guilds] = (await Promise.all([userResponse.json(), guildsResponse.json()])) as [
    DiscordUserApiResponse,
    DiscordGuildApiResponse[]
  ];

  const availableGuilds: DiscordGuildSummary[] = guilds
    .filter((guild) => (BigInt(guild.permissions) & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION)
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
      permissions: guild.permissions
    }));

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : null;

  return {
    user: {
      id: user.id,
      username: user.username,
      avatarUrl
    },
    guilds: availableGuilds
  };
}
