export function formatKickoff(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(date);
}

export function formatOdds(oddsSummary: unknown) {
  if (!Array.isArray(oddsSummary) || oddsSummary.length === 0) return null;
  const primary = oddsSummary[0] as {
    details?: string;
    overUnder?: number;
  };
  if (!primary?.details) return null;
  return primary.overUnder
    ? `${primary.details} · O/U ${primary.overUnder}`
    : primary.details;
}
