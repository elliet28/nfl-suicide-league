import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { nowMs } from "@/lib/time";

const HOUR_MS = 60 * 60 * 1000;
const TIER_RANK = { "24H": 1, "2H": 2 } as const;
type Tier = keyof typeof TIER_RANK;

// Emails any ACTIVE member who hasn't picked this week, once when the week's
// earliest kickoff is within 24h and again within 2h. Dedup state lives on
// Membership (remindedWeek/remindedTier) so repeated cron runs don't spam.
export async function sendPickReminders() {
  const now = nowMs();

  const activeMemberships = await prisma.membership.findMany({
    where: { status: "ACTIVE" },
    include: { user: true, league: true, picks: true },
  });

  for (const m of activeMemberships) {
    if (!m.user.email) continue;

    const latestGame = await prisma.game.findFirst({
      where: { season: m.league.seasonYear },
      orderBy: { week: "desc" },
    });
    const currentWeek = latestGame?.week;
    if (!currentWeek) continue;

    const alreadyPicked = m.picks.some((p) => p.week === currentWeek);
    if (alreadyPicked) continue;

    const earliestGame = await prisma.game.findFirst({
      where: { season: m.league.seasonYear, week: currentWeek },
      orderBy: { kickoff: "asc" },
    });
    if (!earliestGame) continue;

    const hoursUntil = (earliestGame.kickoff.getTime() - now) / HOUR_MS;
    if (hoursUntil < 0) continue;

    let tier: Tier | null = null;
    if (hoursUntil <= 2) tier = "2H";
    else if (hoursUntil <= 24) tier = "24H";
    if (!tier) continue;

    const sentRank =
      m.remindedWeek === currentWeek && m.remindedTier
        ? TIER_RANK[m.remindedTier as Tier]
        : 0;
    if (sentRank >= TIER_RANK[tier]) continue;

    await sendEmail({
      to: m.user.email,
      subject: `Pick reminder: Week ${currentWeek} — ${m.league.name}`,
      html: `
        <p>You haven't picked yet for Week ${currentWeek} of <strong>${m.league.name}</strong>.</p>
        <p>First kickoff is ${earliestGame.kickoff.toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}. Submit your pick before your chosen game starts.</p>
      `,
    });

    await prisma.membership.update({
      where: { id: m.id },
      data: { remindedWeek: currentWeek, remindedTier: tier },
    });
  }
}
