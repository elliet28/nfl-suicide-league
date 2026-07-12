import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nowMs } from "@/lib/time";
import { RESULT_LABEL } from "@/lib/labels";

const STATUS_ORDER: Record<string, number> = {
  ACTIVE: 0,
  ELIMINATED_PENDING_BUYBACK: 1,
  OUT: 2,
  PENDING_PAYMENT: 3,
};

const RESULT_COLOR: Record<string, string> = {
  WIN: "text-green-700 dark:text-green-400",
  LOSS: "text-red-700 dark:text-red-400",
  TIE: "text-yellow-700 dark:text-yellow-400",
  PENDING: "text-zinc-500",
};

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      memberships: {
        include: {
          user: true,
          picks: { include: { game: true }, orderBy: { week: "asc" } },
        },
      },
    },
  });
  if (!league) notFound();

  const isMember = league.memberships.some((m) => m.userId === session.user!.id);
  if (!isMember) redirect("/dashboard");

  const latestGame = await prisma.game.findFirst({
    where: { season: league.seasonYear },
    orderBy: { week: "desc" },
  });
  const currentWeek = latestGame?.week ?? 0;
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);

  const now = nowMs();

  const sortedMemberships = [...league.memberships].sort((a, b) => {
    const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (orderDiff !== 0) return orderDiff;
    // Within the eliminated group, show most-recently-eliminated first.
    if (a.eliminatedWeek != null && b.eliminatedWeek != null) {
      return b.eliminatedWeek - a.eliminatedWeek;
    }
    return (a.user.name ?? a.user.email ?? "").localeCompare(
      b.user.name ?? b.user.email ?? "",
    );
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            {league.name} — standings &amp; history
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Picks are hidden from other players until that game kicks off.
          </p>
        </div>
        <Link href={`/league/${league.id}`} className="text-sm underline">
          ← Back
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="sticky left-0 bg-zinc-50 px-4 py-2 text-left dark:bg-black">
                Player
              </th>
              <th className="px-4 py-2 text-left">Status</th>
              {weeks.map((w) => (
                <th key={w} className="px-4 py-2 text-left">
                  Wk {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMemberships.map((m) => (
              <tr key={m.id} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                <td className="sticky left-0 bg-white px-4 py-2 font-medium text-black dark:bg-zinc-950 dark:text-zinc-50">
                  {m.user.name ?? m.user.email}
                  {m.buyBackUsed && (
                    <span className="ml-1 text-xs text-zinc-500">(bought back)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {m.status === "ACTIVE" && "Active"}
                  {m.status === "ELIMINATED_PENDING_BUYBACK" && "Eliminated"}
                  {m.status === "OUT" && "Out"}
                  {m.status === "PENDING_PAYMENT" && "Pending payment"}
                </td>
                {weeks.map((w) => {
                  const pick = m.picks.find((p) => p.week === w);
                  if (!pick) {
                    return (
                      <td key={w} className="px-4 py-2 text-zinc-400">
                        –
                      </td>
                    );
                  }
                  const isMe = m.userId === session.user!.id;
                  const visible = isMe || pick.game.kickoff.getTime() <= now;
                  return (
                    <td key={w} className="px-4 py-2">
                      {visible ? (
                        <span className={RESULT_COLOR[pick.result]}>
                          {pick.teamAbbr}
                          {pick.result !== "PENDING" && (
                            <span className="ml-1 text-xs">
                              ({RESULT_LABEL[pick.result]})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-400" title="Hidden until kickoff">
                          🔒
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
