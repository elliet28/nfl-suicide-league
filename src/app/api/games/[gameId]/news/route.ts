import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchNews } from "@/lib/espn";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [awayNews, homeNews] = await Promise.all([
    fetchNews(4, game.awayTeam).catch(() => []),
    fetchNews(4, game.homeTeam).catch(() => []),
  ]);

  return NextResponse.json({ awayNews, homeNews });
}
