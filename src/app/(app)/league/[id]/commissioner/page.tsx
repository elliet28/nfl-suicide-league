import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  approveBuyBack,
  approveEntry,
  updateLeagueSettings,
} from "@/lib/actions/league";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Waiting on entry payment",
  ACTIVE: "Active",
  ELIMINATED_PENDING_BUYBACK: "Eliminated — buy-back available",
  OUT: "Out",
};

export default async function CommissionerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!league) notFound();
  if (league.commissionerId !== session.user.id) {
    redirect(`/league/${id}`);
  }

  const pendingEntry = league.memberships.filter(
    (m) => m.status === "PENDING_PAYMENT",
  );
  const pendingBuyBack = league.memberships.filter(
    (m) => m.status === "ELIMINATED_PENDING_BUYBACK",
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          {league.name} &mdash; commissioner
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Invite code:{" "}
          <span className="rounded bg-zinc-200 px-2 py-0.5 font-mono dark:bg-zinc-800">
            {league.inviteCode}
          </span>
        </p>
      </div>

      {(pendingEntry.length > 0 || pendingBuyBack.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Pending approvals
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pendingEntry.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <span>
                  {m.user.email} &mdash; entry fee (${league.entryFee.toString()})
                </span>
                <form action={approveEntry}>
                  <input type="hidden" name="membershipId" value={m.id} />
                  <button type="submit" className="text-sm underline">
                    Mark paid &amp; approve
                  </button>
                </form>
              </li>
            ))}
            {pendingBuyBack.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <span>
                  {m.user.email} &mdash; buy-back (${league.buyBackFee.toString()})
                </span>
                <form action={approveBuyBack}>
                  <input type="hidden" name="membershipId" value={m.id} />
                  <button type="submit" className="text-sm underline">
                    Mark paid &amp; approve
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Members
        </h2>
        {league.memberships.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No one has joined yet. Share the invite code above.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {league.memberships.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <span>{m.user.email}</span>
                <span className="text-zinc-500">
                  {STATUS_LABEL[m.status]}
                  {m.buyBackUsed ? " (used buy-back)" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Settings
        </h2>
        <form
          key={league.updatedAt.toISOString()}
          action={updateLeagueSettings}
          className="mt-3 flex flex-col gap-4"
        >
          <input type="hidden" name="leagueId" value={league.id} />
          <label className="flex flex-col gap-1 text-sm">
            Entry fee ($)
            <input
              type="number"
              step="0.01"
              min="0"
              name="entryFee"
              defaultValue={league.entryFee.toString()}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Buy-back fee ($)
            <input
              type="number"
              step="0.01"
              min="0"
              name="buyBackFee"
              defaultValue={league.buyBackFee.toString()}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            If a pick ties
            <select
              name="tieRule"
              defaultValue={league.tieRule}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="ELIMINATES">Counts as a loss (eliminated)</option>
              <option value="SURVIVES">Player survives (push)</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Save settings
          </button>
        </form>
      </section>
    </div>
  );
}
