import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [memberships, commissioned] = await Promise.all([
    prisma.membership.findMany({
      where: { userId },
      include: { league: true },
    }),
    prisma.league.findMany({
      where: { commissionerId: userId },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Your leagues
          </h2>
          <div className="flex gap-3 text-sm">
            <Link href="/dashboard/join" className="underline">
              Join a league
            </Link>
            <Link href="/dashboard/new" className="underline">
              Create a league
            </Link>
          </div>
        </div>

        {memberships.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            You haven&apos;t joined any leagues yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/league/${m.leagueId}`}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium text-black dark:text-zinc-50">
                    {m.league.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {m.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {commissioned.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            You commission
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {commissioned.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/league/${l.id}/commissioner`}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium text-black dark:text-zinc-50">
                    {l.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    commissioner
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
