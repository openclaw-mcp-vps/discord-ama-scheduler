import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type AMAStatus = "scheduled" | "live" | "completed";
export type QuestionStatus = "queued" | "answered" | "dismissed";

export interface AMARecord {
  id: string;
  guildId: string;
  guildName: string;
  title: string;
  description: string;
  host: string;
  startsAt: string;
  durationMinutes: number;
  status: AMAStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRecord {
  id: string;
  amaId: string;
  askedBy: string;
  content: string;
  upvotes: number;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiscordGuildSummary {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordSessionRecord {
  id: string;
  discordUserId: string;
  username: string;
  avatarUrl: string | null;
  accessToken: string;
  guilds: DiscordGuildSummary[];
  createdAt: string;
  expiresAt: string;
}

export interface PaidSessionRecord {
  id: string;
  email: string | null;
  purchasedAt: string;
  claimedAt: string | null;
  expiresAt: string;
}

interface DataStore {
  amas: AMARecord[];
  questions: Record<string, QuestionRecord[]>;
  discordSessions: Record<string, DiscordSessionRecord>;
  paidSessions: Record<string, PaidSessionRecord>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "ama-data.json");

const EMPTY_STORE: DataStore = {
  amas: [],
  questions: {},
  discordSessions: {},
  paidSessions: {}
};

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<DataStore> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<DataStore>;

    return {
      amas: parsed.amas ?? [],
      questions: parsed.questions ?? {},
      discordSessions: parsed.discordSessions ?? {},
      paidSessions: parsed.paidSessions ?? {}
    };
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store: DataStore) {
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function withWriteLock<T>(operation: (store: DataStore) => Promise<T>): Promise<T> {
  const task = writeQueue.then(async () => {
    const store = await readStore();
    const result = await operation(store);
    await writeStore(store);
    return result;
  });

  writeQueue = task.catch(() => undefined);
  return task;
}

export async function listAMAs(): Promise<AMARecord[]> {
  const store = await readStore();
  return [...store.amas].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getAMAById(id: string): Promise<AMARecord | null> {
  const store = await readStore();
  return store.amas.find((ama) => ama.id === id) ?? null;
}

export async function createAMA(
  input: Omit<AMARecord, "id" | "createdAt" | "updatedAt" | "status"> & { status?: AMAStatus }
): Promise<AMARecord> {
  return withWriteLock(async (store) => {
    const now = new Date().toISOString();
    const next: AMARecord = {
      id: randomUUID(),
      status: input.status ?? "scheduled",
      createdAt: now,
      updatedAt: now,
      ...input
    };

    store.amas.push(next);
    return next;
  });
}

export async function updateAMAStatus(id: string, status: AMAStatus): Promise<AMARecord | null> {
  return withWriteLock(async (store) => {
    const ama = store.amas.find((entry) => entry.id === id);

    if (!ama) {
      return null;
    }

    ama.status = status;
    ama.updatedAt = new Date().toISOString();
    return ama;
  });
}

export async function listAMAQuestions(amaId: string): Promise<QuestionRecord[]> {
  const store = await readStore();
  return [...(store.questions[amaId] ?? [])].sort((a, b) => b.upvotes - a.upvotes || a.createdAt.localeCompare(b.createdAt));
}

export async function createQuestion(
  amaId: string,
  input: Omit<QuestionRecord, "id" | "amaId" | "createdAt" | "updatedAt" | "status" | "upvotes"> & {
    upvotes?: number;
    status?: QuestionStatus;
  }
): Promise<QuestionRecord> {
  return withWriteLock(async (store) => {
    const now = new Date().toISOString();
    const question: QuestionRecord = {
      id: randomUUID(),
      amaId,
      askedBy: input.askedBy,
      content: input.content,
      upvotes: input.upvotes ?? 1,
      status: input.status ?? "queued",
      createdAt: now,
      updatedAt: now
    };

    store.questions[amaId] = store.questions[amaId] ?? [];
    store.questions[amaId].push(question);
    return question;
  });
}

export async function updateQuestion(
  amaId: string,
  questionId: string,
  input: Partial<Pick<QuestionRecord, "status" | "upvotes">>
): Promise<QuestionRecord | null> {
  return withWriteLock(async (store) => {
    const questions = store.questions[amaId] ?? [];
    const question = questions.find((entry) => entry.id === questionId);

    if (!question) {
      return null;
    }

    if (typeof input.status !== "undefined") {
      question.status = input.status;
    }

    if (typeof input.upvotes === "number") {
      question.upvotes = input.upvotes;
    }

    question.updatedAt = new Date().toISOString();
    return question;
  });
}

export async function createDiscordSession(
  input: Omit<DiscordSessionRecord, "id" | "createdAt" | "expiresAt">
): Promise<DiscordSessionRecord> {
  return withWriteLock(async (store) => {
    const now = new Date();
    const session: DiscordSessionRecord = {
      id: randomUUID(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...input
    };

    store.discordSessions[session.id] = session;
    return session;
  });
}

export async function getDiscordSession(id: string): Promise<DiscordSessionRecord | null> {
  const store = await readStore();
  const session = store.discordSessions[id];

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await withWriteLock(async (mutableStore) => {
      delete mutableStore.discordSessions[id];
      return null;
    });

    return null;
  }

  return session;
}

export async function createPaidSession(input: {
  id: string;
  email: string | null;
  purchasedAt?: string;
  durationDays?: number;
}): Promise<PaidSessionRecord> {
  return withWriteLock(async (store) => {
    const purchasedAt = input.purchasedAt ?? new Date().toISOString();
    const expiresAt = new Date(Date.parse(purchasedAt) + (input.durationDays ?? 30) * 24 * 60 * 60 * 1000).toISOString();

    const record: PaidSessionRecord = {
      id: input.id,
      email: input.email,
      purchasedAt,
      claimedAt: null,
      expiresAt
    };

    store.paidSessions[input.id] = record;
    return record;
  });
}

export async function claimPaidSession(id: string): Promise<PaidSessionRecord | null> {
  return withWriteLock(async (store) => {
    const session = store.paidSessions[id];

    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete store.paidSessions[id];
      return null;
    }

    session.claimedAt = new Date().toISOString();
    return session;
  });
}

export async function getPaidSession(id: string): Promise<PaidSessionRecord | null> {
  const store = await readStore();
  const session = store.paidSessions[id];

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await withWriteLock(async (mutableStore) => {
      delete mutableStore.paidSessions[id];
      return null;
    });

    return null;
  }

  return session;
}
