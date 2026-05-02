import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createPaidSession } from "@/lib/database";

interface StripeCheckoutSessionCompleted {
  id: string;
  customer_details?: {
    email?: string | null;
  } | null;
  created?: number;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSessionCompleted;
  };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").map((entry) => entry.trim());
  const timestampPart = parts.find((entry) => entry.startsWith("t="));
  const signatures = parts.filter((entry) => entry.startsWith("v1=")).map((entry) => entry.replace("v1=", ""));

  if (!timestampPart || signatures.length === 0) {
    return false;
  }

  const timestamp = timestampPart.replace("t=", "");
  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");

  const validSignature = signatures.some((signature) => {
    const provided = Buffer.from(signature, "utf8");
    return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
  });

  if (!validSignature) {
    return false;
  }

  const eventTimestamp = Number(timestamp) * 1000;
  const ageMs = Math.abs(Date.now() - eventTimestamp);

  return Number.isFinite(eventTimestamp) && ageMs <= 5 * 60 * 1000;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");

  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  if (!verifyStripeSignature(payload, signatureHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    await createPaidSession({
      id: session.id,
      email: session.customer_details?.email ?? null,
      purchasedAt: session.created ? new Date(session.created * 1000).toISOString() : undefined,
      durationDays: 30
    });
  }

  return NextResponse.json({ received: true, id: event.id });
}
