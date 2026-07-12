import { joinLeague } from "@/lib/actions/league";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Enter an invite code.",
  not_found: "No league found with that invite code.",
};

export default async function JoinLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Join a league
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Ask your commissioner for the league&apos;s invite code.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </p>
      )}

      <form action={joinLeague} className="mt-6 flex flex-col gap-4">
        <input
          name="inviteCode"
          required
          placeholder="Invite code"
          className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="h-11 rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Join
        </button>
      </form>
    </div>
  );
}
