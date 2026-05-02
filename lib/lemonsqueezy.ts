const DEFAULT_PAYWALL_DURATION_DAYS = 30;

export const PAYWALL_COOKIE_NAME = "ama_paid_session";

export function getStripePaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim() ?? "";
}

export function assertPaymentLinkConfigured() {
  const paymentLink = getStripePaymentLink();

  if (!paymentLink) {
    throw new Error("NEXT_PUBLIC_STRIPE_PAYMENT_LINK is not configured");
  }

  return paymentLink;
}

export function getPaywallCookieOptions(maxAgeDays = DEFAULT_PAYWALL_DURATION_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60
  };
}

export function hasActivePaywallCookie(cookieValue: string | undefined | null) {
  return Boolean(cookieValue && cookieValue.length > 10);
}
