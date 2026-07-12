import { NextRequest, NextResponse } from "next/server";
import { syncGames } from "@/lib/sync";
import { sendPickReminders } from "@/lib/reminders";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncGames();
  await sendPickReminders();
  return NextResponse.json(result);
}
