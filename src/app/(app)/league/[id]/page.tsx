import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/espn";
import { submitPick } from "@/lib/actions/pick";
import { nowMs } from "@/lib/time";
import { GameCard } from "@/components/GameCard";
import { STATUS_LABEL, RESULT_LABEL } from "@/lib/labels";

export default async function LeaguePage({
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

  const myMembership = league.memberships.find(
    (m) => m.userId === session.user!.id,
  );
  if (!myMembership) redirect("/dashboard");

  const now = nowMs();

  const myPicks = await prisma.pick.findMany({
    where: { membershipId: myMembership.id },
    include: { game: true },
    orderBy: { week: "asc" },
  });

  const latestGame = await prisma.game.findFirst({
    where: { season: league.seasonYear },
    orderBy: { week: "desc" },
  });
  const currentWeek = latestGame?.week ?? null;

  const weekGames = currentWeek
    ? await prisma.game.findMany({
        where: { season: league.seasonYear, week: currentWeek },
        orderBy: { kickoff: "asc" },
      })
    : [];

  const pickForCurrentWeek = myPicks.find((p) => p.week === currentWeek);
  const pickLocked = Boolean(
    pickForCurrentWeek && pickForCurrentWeek.game.kickoff.getTime() <= now,
  );
  // Teams used in OTHER weeks are permanently unavailable. This week's own
  // pick doesn't count as "used" yet, since it can still be changed.
  const usedTeamsOtherWeeks = new Set(
    myPicks.filter((p) => p.week !== currentWeek).map((p) => p.teamAbbr),
  );

  const news = await fetchNews().catch(() => []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            {league.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {STATUS_LABEL[myMembership.status]}
          </p>
        </div>
        <div className="flex gap-4">
          <Link href={`/league/${league.id}/standings`} className="text-sm underline">
            Standings &amp; history
          </Link>
          {league.commissionerId === session.user.id && (
            <Link
              href={`/league/${league.id}/commissioner`}
              className="text-sm underline"
            >
              Commissioner settings
            </Link>
          )}
        </div>
      </div>

      {league.status === "COMPLETED" && (
        <p className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {(() => {
            const winners = league.memberships.filter(
              (m) => m.status === "ACTIVE",
            );
            if (winners.length === 1) {
              return (
                <>
                  🏆 Season over — <strong>{winners[0].user.name ?? winners[0].user.email}</strong> wins!
                </>
              );
            }
            if (winners.length > 1) {
              return (
                <>
                  🏆 Season over — co-winners:{" "}
                  <strong>
                    {winners.map((w) => w.user.name ?? w.user.email).join(", ")}
                  </strong>
                </>
              );
            }
            return "Season over — everyone was eliminated the same week. Ask your commissioner to sort out the winner.";
          })()}
        </p>
      )}

      {myMembership.status === "ACTIVE" && currentWeek && (
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Week {currentWeek} pick
          </h2>

          {pickLocked && pickForCurrentWeek ? (
            <p className="mt-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
              You picked <strong>{pickForCurrentWeek.teamAbbr}</strong> —{" "}
              {RESULT_LABEL[pickForCurrentWeek.result]}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {pickForCurrentWeek && (
                <li className="text-sm text-zinc-600 dark:text-zinc-400">
                  Current pick: <strong>{pickForCurrentWeek.teamAbbr}</strong>{" "}
                  — you can change it until that game starts.
                </li>
              )}
              {weekGames.map((game) => (
                <GameCard
                  key={game.id}
                  gameId={game.id}
                  leagueId={league.id}
                  awayTeam={game.awayTeam}
                  homeTeam={game.homeTeam}
                  kickoff={game.kickoff}
                  oddsSummary={game.oddsSummary}
                  started={game.kickoff.getTime() <= now}
                  currentPickTeam={pickForCurrentWeek?.teamAbbr ?? null}
                  usedTeamsOtherWeeks={[...usedTeamsOtherWeeks]}
                  submitPickAction={submitPick}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {news.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            NFL news
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {news.map((n) => (
              <li key={n.id} className="text-sm">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {n.headline}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {myPicks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Your pick history
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {myPicks.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <span>
                  Week {p.week}: {p.teamAbbr}
                </span>
                <span className="text-zinc-500">{RESULT_LABEL[p.result]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Standings
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {league.memberships.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
            >
              <span>{m.user.name ?? m.user.email}</span>
              <span className="text-zinc-500">
                {m.status.replace(/_/g, " ").toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
