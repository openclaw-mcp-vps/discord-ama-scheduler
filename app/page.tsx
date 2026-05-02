import Link from "next/link";
import { ArrowRight, CalendarClock, CircleHelp, MessageSquareHeart, ShieldCheck, Sparkles } from "lucide-react";
import { ClaimPurchaseForm } from "@/components/ClaimPurchaseForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentDiscordSession, hasPaidAccess } from "@/lib/session";

const faqs = [
  {
    question: "How is this different from running AMAs in a normal Discord channel?",
    answer:
      "You get a scheduling workflow, pre-session promotion checklist, ranked question queue, and live moderation controls so the AMA stays structured instead of chaotic."
  },
  {
    question: "Can moderators collaborate during an active AMA?",
    answer:
      "Yes. Multiple moderators can open the same AMA workspace, triage questions, upvote priorities, and mark answered prompts in real time."
  },
  {
    question: "Do I need a Discord bot?",
    answer:
      "You authenticate with Discord OAuth to access server context. Optional webhook integration can sync live question submissions from your bot workflows."
  },
  {
    question: "How does billing unlock the app?",
    answer:
      "After Stripe checkout succeeds, the webhook stores your purchase and your dashboard unlock is issued through a secure cookie claim flow."
  }
];

export default async function Home({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session, paid] = await Promise.all([searchParams, getCurrentDiscordSession(), hasPaidAccess()]);

  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const purchaseState = typeof params.purchase === "string" ? params.purchase : null;
  const sessionIdFromUrl = typeof params.session_id === "string" ? params.session_id : "";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <header className="mb-14 flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">community-tools</p>
          <h1 className="text-2xl font-semibold">Discord AMA Scheduler</h1>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Badge variant="default">Signed in as {session.username}</Badge>
          ) : (
            <a href="/api/auth/discord" className="text-sm font-medium text-blue-300 hover:text-blue-200">
              Connect Discord
            </a>
          )}
          {session && paid ? (
            <Link href="/dashboard">
              <Button>
                Open dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      <section className="mb-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Badge variant="success" className="mb-4">
            Schedule and manage Discord community AMAs
          </Badge>
          <h2 className="mb-4 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
            Run AMAs your community actually wants to attend and finish.
          </h2>
          <p className="mb-6 max-w-xl text-base text-slate-300 sm:text-lg">
            Plan sessions in advance, collect high-signal questions, and moderate live discussion without losing flow in fast-moving channels.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}>
              <Button size="lg" className="w-full sm:w-auto">
                Start for $12/mo
              </Button>
            </a>
            <a href="/api/auth/discord">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Connect Discord
              </Button>
            </a>
          </div>

          {!paymentLink ? (
            <p className="mt-4 text-sm text-amber-300">
              Billing is not configured yet. Add `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` to enable checkout.
            </p>
          ) : null}
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>What you control in one place</CardTitle>
            <CardDescription>Everything needed for reliable AMA operations from prep to wrap-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <CalendarClock className="mb-2 h-5 w-5 text-blue-300" />
              <p className="font-medium">Event scheduling by server</p>
              <p className="text-sm text-slate-400">Assign host, time window, and scope per Discord community.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <MessageSquareHeart className="mb-2 h-5 w-5 text-cyan-300" />
              <p className="font-medium">Ranked question queue</p>
              <p className="text-sm text-slate-400">Prioritize by upvotes and track answered vs pending in real time.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <ShieldCheck className="mb-2 h-5 w-5 text-emerald-300" />
              <p className="font-medium">Moderation workflow</p>
              <p className="text-sm text-slate-400">Dismiss off-topic prompts and keep speaker focus on useful questions.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>The problem</CardTitle>
            <CardDescription>Most Discord AMAs break down operationally, not because of audience interest.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>Question floods bury good prompts before hosts can see them.</p>
            <p>Promotion and scheduling happen in scattered channels and tools.</p>
            <p>Moderators cannot quickly show what is answered, pending, or off-topic.</p>
            <p>Post-event summaries are hard because no one tracked question state cleanly.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>The solution</CardTitle>
            <CardDescription>Discord AMA Scheduler gives your team one operating surface for the entire lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>Schedule AMAs with clear owners, timing, and channel-level context.</p>
            <p>Collect and sort questions before and during the session.</p>
            <p>Use live moderation controls to keep host attention on top-ranked prompts.</p>
            <p>Leave each AMA with structured records for recap and follow-up content.</p>
          </CardContent>
        </Card>
      </section>

      <section id="pricing" className="mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-300" />
              Simple pricing for community teams
            </CardTitle>
            <CardDescription>One plan. Full access. No per-seat confusion.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-4xl font-semibold">$12<span className="text-lg text-slate-400">/month</span></p>
              <p className="mt-2 text-sm text-slate-300">
                Includes AMA scheduling, question queue moderation, and Discord server integration.
              </p>
            </div>
            <a href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}>
              <Button size="lg">Buy now</Button>
            </a>
          </CardContent>
        </Card>
      </section>

      <section className="mb-12">
        <h3 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
          <CircleHelp className="h-5 w-5 text-blue-300" />
          FAQ
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {purchaseState === "not_verified" || purchaseState === "missing_session" ? (
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Complete your dashboard unlock</CardTitle>
              <CardDescription>
                Your payment may still be propagating through Stripe webhooks. Enter your Checkout Session ID to claim access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClaimPurchaseForm initialSessionId={sessionIdFromUrl} />
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
