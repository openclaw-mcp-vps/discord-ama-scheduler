import { AMAWorkspace } from "@/components/AMAWorkspace";
import { listAMAs } from "@/lib/database";
import { requireDiscordSession, requirePaidAccess } from "@/lib/session";

export default async function AMAsPage() {
  const session = await requireDiscordSession();
  await requirePaidAccess();

  const guildIds = new Set(session.guilds.map((guild) => guild.id));
  const amas = (await listAMAs()).filter((ama) => guildIds.has(ama.guildId));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">AMA workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Schedule upcoming sessions, keep your moderation team aligned, and move through community questions with a clear queue.
        </p>
      </div>

      <AMAWorkspace guilds={session.guilds} initialAMAs={amas} />
    </main>
  );
}
