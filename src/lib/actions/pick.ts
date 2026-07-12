"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function submitPick(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const leagueId = String(formData.get("leagueId"));
  const gameId = String(formData.get("gameId"));
  const teamAbbr = String(formData.get("teamAbbr"));

  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId, leagueId } },
    include: { picks: { include: { game: true } } },
  });
  if (!membership) throw new Error("You're not a member of this league.");
  if (membership.status !== "ACTIVE") {
    throw new Error("You can't submit a pick right now.");
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("That game doesn't exist.");
  if (game.kickoff.getTime() <= Date.now()) {
    throw new Error("That game has already started.");
  }
  if (teamAbbr !== game.homeTeam && teamAbbr !== game.awayTeam) {
    throw new Error("That team isn't playing in that game.");
  }

  const existingPickThisWeek = membership.picks.find(
    (p) => p.week === game.week,
  );
  if (existingPickThisWeek) {
    if (existingPickThisWeek.game.kickoff.getTime() <= Date.now()) {
      throw new Error(
        "Your pick for this week is locked in — that game has already started.",
      );
    }
  }

  const alreadyUsedTeam = membership.picks.some(
    (p) => p.teamAbbr === teamAbbr && p.week !== game.week,
  );
  if (alreadyUsedTeam) {
    throw new Error("You've already used that team.");
  }

  await prisma.pick.upsert({
    where: { membershipId_week: { membershipId: membership.id, week: game.week } },
    create: {
      membershipId: membership.id,
      week: game.week,
      gameId: game.id,
      teamAbbr,
    },
    update: {
      gameId: game.id,
      teamAbbr,
    },
  });

  revalidatePath(`/league/${leagueId}`);
}
