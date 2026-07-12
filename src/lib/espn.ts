const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

export type EspnGameStatus = "SCHEDULED" | "IN_PROGRESS" | "FINAL";

export type EspnGame = {
  espnEventId: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  status: EspnGameStatus;
  homeScore: number | null;
  awayScore: number | null;
  oddsSummary: unknown;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team: { abbreviation: string };
};

type EspnEvent = {
  id: string;
  date: string;
  competitions: Array<{
    competitors: EspnCompetitor[];
    status?: { type?: { completed?: boolean; state?: string } };
    odds?: unknown[];
  }>;
};

type EspnScoreboardResponse = {
  season?: { year: number };
  week?: { number: number };
  events?: EspnEvent[];
};

// Fetches the schedule/scores/odds for whatever regular-season week ESPN
// currently considers "current" (seasontype=2 excludes preseason/playoffs) —
// avoids us having to independently compute the NFL week number.
export async function fetchCurrentWeekGames(): Promise<EspnGame[]> {
  const res = await fetch(`${BASE}/scoreboard?seasontype=2`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`ESPN scoreboard fetch failed: ${res.status}`);
  }
  const data: EspnScoreboardResponse = await res.json();

  const season = data.season?.year;
  const week = data.week?.number;
  if (!season || !week) {
    throw new Error("ESPN scoreboard response missing season/week");
  }

  return (data.events ?? []).map((event) => {
    const competition = event.competitions[0];
    const home = competition.competitors.find((c) => c.homeAway === "home");
    const away = competition.competitors.find((c) => c.homeAway === "away");
    if (!home || !away) {
      throw new Error(`ESPN event ${event.id} missing home/away competitor`);
    }

    const statusType = competition.status?.type;
    let status: EspnGameStatus = "SCHEDULED";
    if (statusType?.completed) status = "FINAL";
    else if (statusType?.state === "in") status = "IN_PROGRESS";

    return {
      espnEventId: event.id,
      season,
      week,
      homeTeam: home.team.abbreviation,
      awayTeam: away.team.abbreviation,
      kickoff: new Date(event.date),
      status,
      homeScore: home.score != null ? Number(home.score) : null,
      awayScore: away.score != null ? Number(away.score) : null,
      oddsSummary: competition.odds ?? null,
    };
  });
}

export type EspnNewsItem = {
  id: number;
  headline: string;
  description: string;
  published: string;
  url: string;
};

type EspnNewsResponse = {
  articles?: Array<{
    id: number;
    headline: string;
    description?: string;
    published: string;
    links?: { web?: { href?: string } };
  }>;
};

export async function fetchNews(
  limit = 6,
  teamAbbr?: string,
): Promise<EspnNewsItem[]> {
  const url = teamAbbr
    ? `${BASE}/news?team=${teamAbbr.toLowerCase()}`
    : `${BASE}/news`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ESPN news fetch failed: ${res.status}`);
  }
  const data: EspnNewsResponse = await res.json();

  return (data.articles ?? [])
    .filter((a) => a.links?.web?.href)
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      headline: a.headline,
      description: a.description ?? "",
      published: a.published,
      url: a.links!.web!.href!,
    }));
}
