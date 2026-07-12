import { createLeague } from "@/lib/actions/league";

export default function NewLeaguePage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Create a league
      </h1>
      <form action={createLeague} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          League name
          <input
            name="name"
            required
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Season
          <input
            type="number"
            name="seasonYear"
            defaultValue={currentYear}
            required
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Entry fee ($)
          <input
            type="number"
            step="0.01"
            min="0"
            name="entryFee"
            defaultValue="20"
            required
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Buy-back fee ($)
          <input
            type="number"
            step="0.01"
            min="0"
            name="buyBackFee"
            defaultValue="20"
            required
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          If a pick ties
          <select
            name="tieRule"
            defaultValue="ELIMINATES"
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="ELIMINATES">Counts as a loss (eliminated)</option>
            <option value="SURVIVES">Player survives (push)</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="joinAsPlayer" defaultChecked />
          I&apos;ll also be picking (join as a player)
        </label>

        <button
          type="submit"
          className="mt-2 h-11 rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Create league
        </button>
      </form>
    </div>
  );
}
