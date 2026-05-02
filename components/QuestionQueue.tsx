"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowBigUp, CheckCircle2, Loader2, MessageSquarePlus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionRecord } from "@/lib/database";

const addQuestionSchema = z.object({
  askedBy: z.string().min(2, "Name is required").max(80),
  content: z.string().min(12, "Ask a fuller question to keep the AMA useful").max(500)
});

interface QuestionQueueProps {
  amaId: string;
  initialQuestions: QuestionRecord[];
}

function statusBadgeVariant(status: QuestionRecord["status"]) {
  if (status === "answered") {
    return "success" as const;
  }

  if (status === "dismissed") {
    return "muted" as const;
  }

  return "warning" as const;
}

export function QuestionQueue({ amaId, initialQuestions }: QuestionQueueProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [form, setForm] = useState({ askedBy: "", content: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => b.upvotes - a.upvotes || a.createdAt.localeCompare(b.createdAt)),
    [questions]
  );

  async function createQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = addQuestionSchema.safeParse(form);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please review your question.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/amas/${amaId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed.data)
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not submit question");
        return;
      }

      const payload = (await response.json()) as { question: QuestionRecord };
      setQuestions((previous) => [payload.question, ...previous]);
      setForm({ askedBy: "", content: "" });
    } catch {
      setError("Network error while submitting question");
    } finally {
      setSaving(false);
    }
  }

  async function patchQuestion(questionId: string, patch: { status?: QuestionRecord["status"]; action?: "upvote" }) {
    setBusyQuestionId(questionId);
    setError(null);

    try {
      const response = await fetch(`/api/amas/${amaId}/questions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ questionId, ...patch })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not update question");
        return;
      }

      const payload = (await response.json()) as { question: QuestionRecord };
      setQuestions((previous) => previous.map((entry) => (entry.id === payload.question.id ? payload.question : entry)));
    } catch {
      setError("Network error while updating question");
    } finally {
      setBusyQuestionId(null);
    }
  }

  const queuedCount = questions.filter((question) => question.status === "queued").length;
  const answeredCount = questions.filter((question) => question.status === "answered").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>Question Queue</span>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Queued: {queuedCount}</Badge>
            <Badge variant="success">Answered: {answeredCount}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Collect strong audience questions, sort by momentum, and mark progress while hosting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={createQuestion} className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="space-y-2">
            <label htmlFor="askedBy" className="text-sm font-medium text-slate-200">
              Display name
            </label>
            <Input
              id="askedBy"
              value={form.askedBy}
              onChange={(event) => setForm((previous) => ({ ...previous, askedBy: event.target.value }))}
              placeholder="Community member"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium text-slate-200">
              Question
            </label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(event) => setForm((previous) => ({ ...previous, content: event.target.value }))}
              placeholder="What should this AMA answer clearly?"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquarePlus className="mr-2 h-4 w-4" />}
            Add to queue
          </Button>
        </form>

        <div className="space-y-3">
          {orderedQuestions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              No questions yet. Start by adding seed questions before promotion to guide your community.
            </p>
          ) : null}

          {orderedQuestions.map((question) => (
            <article key={question.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{question.askedBy}</p>
                  <p className="text-xs text-slate-400">Submitted for this AMA</p>
                </div>
                <Badge variant={statusBadgeVariant(question.status)}>{question.status}</Badge>
              </div>

              <p className="mb-4 text-sm text-slate-200">{question.content}</p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => patchQuestion(question.id, { action: "upvote" })}
                  disabled={busyQuestionId === question.id}
                >
                  <ArrowBigUp className="mr-1 h-4 w-4" />
                  Upvote ({question.upvotes})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => patchQuestion(question.id, { status: "answered" })}
                  disabled={busyQuestionId === question.id}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Mark answered
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => patchQuestion(question.id, { status: "dismissed" })}
                  disabled={busyQuestionId === question.id}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Dismiss
                </Button>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
