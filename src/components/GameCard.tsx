"use client";

import { useState } from "react";
import { formatKickoff, formatOdds } from "@/lib/format";

type NewsItem = { id: number; headline: string; url: string };
type NewsPayload = { awayNews: NewsItem[]; homeNews: NewsItem[] };

function NewsColumn({ team, items }: { team: string; items: NewsItem[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-black dark:text-zinc-50">
        {team} news
      </h3>
      <ul className="mt-1 flex flex-col gap-1">
        {items.length === 0 && (
          <li className="text-xs text-zinc-500">Nothing recent.</li>
        )}
        {items.map((n) => (
          <li key={n.id} className="text-xs">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {n.headline}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GameCard({
  gameId,
  leagueId,
  awayTeam,
  homeTeam,
  kickoff,
  oddsSummary,
  started,
  currentPickTeam,
  usedTeamsOtherWeeks,
  submitPickAction,
}: {
  gameId: string;
  leagueId: string;
  awayTeam: string;
  homeTeam: string;
  kickoff: Date;
  oddsSummary: unknown;
  started: boolean;
  currentPickTeam: string | null;
  usedTeamsOtherWeeks: string[];
  submitPickAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState<NewsPayload | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !news && !loading) {
      setLoading(true);
      try {
        const res = await fetch(`/api/games/${gameId}/news`);
        if (res.ok) setNews(await res.json());
      } finally {
        setLoading(false);
      }
    }
  }

  const usedSet = new Set(usedTeamsOtherWeeks);
  const oddsText = formatOdds(oddsSummary);

  return (
    <li className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
      >
        <span>
          {awayTeam} @ {homeTeam}
          {oddsText && (
            <span className="ml-2 text-xs text-zinc-500">{oddsText}</span>
          )}
        </span>
        <span className="flex items-center gap-2 text-zinc-500">
          {formatKickoff(kickoff)}
          <span
            className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}
          >
            ⌄
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {loading && (
            <p className="text-sm text-zinc-500">Loading news…</p>
          )}
          {news && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NewsColumn team={awayTeam} items={news.awayNews} />
              <NewsColumn team={homeTeam} items={news.homeNews} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 px-4 pb-3">
        {[awayTeam, homeTeam].map((team) => {
          const isCurrentPick = currentPickTeam === team;
          const disabled = started || (usedSet.has(team) && !isCurrentPick);
          return (
            <form action={submitPickAction} key={team}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="teamAbbr" value={team} />
              <button
                type="submit"
                disabled={disabled}
                title={
                  usedSet.has(team) && !isCurrentPick
                    ? "Already used"
                    : started
                      ? "Game already started"
                      : undefined
                }
                className={`rounded-full border px-4 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  isCurrentPick
                    ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {team}
                {usedSet.has(team) && !isCurrentPick
                  ? " (used)"
                  : isCurrentPick
                    ? " (your pick)"
                    : ""}
              </button>
            </form>
          );
        })}
      </div>
    </li>
  );
}
