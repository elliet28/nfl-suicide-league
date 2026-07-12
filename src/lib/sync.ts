import { prisma } from "@/lib/prisma";
import { fetchCurrentWeekGames } from "@/lib/espn";
import { gradeGame } from "@/lib/grading";
import type { Prisma } from "@/generated/prisma/client";

// Syncs the current week's games from ESPN, then grades any game that just
// transitioned to FINAL (updating picks and membership status).
export async function syncGames() {
  const games = await fetchCurrentWeekGames();
  const justFinishedIds: string[] = [];

  for (const g of games) {
    const existing = await prisma.game.findUnique({
      where: { espnEventId: g.espnEventId },
    });

    const saved = await prisma.game.upsert({
      where: { espnEventId: g.espnEventId },
      create: {
        espnEventId: g.espnEventId,
        season: g.season,
        week: g.week,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        kickoff: g.kickoff,
        status: g.status,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        oddsSummary: (g.oddsSummary ?? undefined) as Prisma.InputJsonValue,
      },
      update: {
        status: g.status,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        oddsSummary: (g.oddsSummary ?? undefined) as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
      },
    });

    if (existing && existing.status !== "FINAL" && g.status === "FINAL") {
      justFinishedIds.push(saved.id);
    }
  }

  for (const gameId of justFinishedIds) {
    await gradeGame(gameId);
  }

  return { syncedCount: games.length, gradedCount: justFinishedIds.length };
}
