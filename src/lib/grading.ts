import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Grades every PENDING pick tied to a game that just went FINAL, updates the
// picking member's status (eliminated / bought-back-out), emails the result,
// and closes out any league that's down to one (or zero) active members.
export async function gradeGame(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  if (game.status !== "FINAL" || game.homeScore == null || game.awayScore == null) {
    return;
  }

  const winner =
    game.homeScore > game.awayScore
      ? game.homeTeam
      : game.awayScore > game.homeScore
        ? game.awayTeam
        : null; // null == tie

  const picks = await prisma.pick.findMany({
    where: { gameId: game.id, result: "PENDING" },
    include: { membership: { include: { league: true, user: true } } },
  });

  const affectedLeagueIds = new Set<string>();
  const scoreLine = `${game.awayTeam} ${game.awayScore}, ${game.homeTeam} ${game.homeScore}`;

  for (const pick of picks) {
    const { league, user } = pick.membership;
    affectedLeagueIds.add(league.id);

    const isTie = winner === null;
    const survivesTie = isTie && league.tieRule === "SURVIVES";
    const won = !isTie && pick.teamAbbr === winner;

    if (won || survivesTie) {
      await prisma.pick.update({
        where: { id: pick.id },
        data: { result: isTie ? "TIE" : "WIN" },
      });
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: won
            ? `You won! Week ${pick.week} — ${league.name}`
            : `Push: Week ${pick.week} — ${league.name}`,
          html: won
            ? `<p>${pick.teamAbbr} won (${scoreLine}). You're still alive in <strong>${league.name}</strong>.</p>`
            : `<p>${pick.teamAbbr}'s game ended in a tie (${scoreLine}). Per your league's rules, a tie doesn't eliminate you — you're still alive in <strong>${league.name}</strong>.</p>`,
        });
      }
      continue;
    }

    // Loss (or a tie counted as a loss per league settings).
    const nextStatus = pick.membership.buyBackUsed
      ? "OUT"
      : "ELIMINATED_PENDING_BUYBACK";

    await prisma.$transaction([
      prisma.pick.update({
        where: { id: pick.id },
        data: { result: isTie ? "TIE" : "LOSS" },
      }),
      prisma.membership.update({
        where: { id: pick.membership.id },
        data: {
          status: nextStatus,
          eliminatedWeek: pick.week,
        },
      }),
    ]);

    if (user.email) {
      const lossDescription = isTie
        ? `${pick.teamAbbr}'s game ended in a tie (${scoreLine}), which counts as a loss in this league`
        : `${pick.teamAbbr} lost (${scoreLine})`;

      await sendEmail({
        to: user.email,
        subject:
          nextStatus === "OUT"
            ? `You're out — Week ${pick.week}, ${league.name}`
            : `Eliminated — Week ${pick.week}, ${league.name}`,
        html:
          nextStatus === "OUT"
            ? `<p>${lossDescription}. You'd already used your buy-back, so you're out of <strong>${league.name}</strong> for good. Thanks for playing!</p>`
            : `<p>${lossDescription}. You're eliminated from <strong>${league.name}</strong> — but you can buy back in once for $${league.buyBackFee.toString()}. Contact your commissioner to pay and get reactivated.</p>`,
      });
    }
  }

  for (const leagueId of affectedLeagueIds) {
    const activeCount = await prisma.membership.count({
      where: { leagueId, status: "ACTIVE" },
    });
    if (activeCount <= 1) {
      await prisma.league.update({
        where: { id: leagueId },
        data: { status: "COMPLETED" },
      });
    }
  }
}
