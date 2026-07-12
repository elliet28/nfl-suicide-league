"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function createLeague(formData: FormData) {
  const userId = await requireUserId();

  const name = String(formData.get("name") ?? "").trim();
  const entryFee = String(formData.get("entryFee") ?? "");
  const buyBackFee = String(formData.get("buyBackFee") ?? "");
  const seasonYear = Number(formData.get("seasonYear"));
  const tieRule = formData.get("tieRule") === "SURVIVES" ? "SURVIVES" : "ELIMINATES";
  const joinAsPlayer = formData.get("joinAsPlayer") === "on";

  if (!name || !entryFee || !buyBackFee || !seasonYear) {
    throw new Error("All fields are required.");
  }

  const league = await prisma.league.create({
    data: {
      name,
      entryFee,
      buyBackFee,
      seasonYear,
      tieRule,
      commissionerId: userId,
      ...(joinAsPlayer
        ? { memberships: { create: { userId } } }
        : {}),
    },
  });

  redirect(`/league/${league.id}/commissioner`);
}

export async function joinLeague(formData: FormData) {
  const userId = await requireUserId();
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();

  if (!inviteCode) {
    redirect("/dashboard/join?error=missing_code");
  }

  const league = await prisma.league.findUnique({ where: { inviteCode } });
  if (!league) {
    redirect("/dashboard/join?error=not_found");
  }

  const existing = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId, leagueId: league.id } },
  });
  if (existing) {
    redirect(`/league/${league.id}`);
  }

  await prisma.membership.create({
    data: { userId, leagueId: league.id },
  });

  redirect(`/league/${league.id}`);
}

async function requireCommissioner(leagueId: string) {
  const userId = await requireUserId();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league || league.commissionerId !== userId) {
    throw new Error("Only the commissioner can do that.");
  }
  return { userId, league };
}

export async function approveEntry(formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
  });
  const { userId } = await requireCommissioner(membership.leagueId);

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membershipId },
      data: { entryApproved: true, status: "ACTIVE" },
    }),
    prisma.paymentNote.create({
      data: {
        membershipId,
        kind: "ENTRY",
        markedByUserId: userId,
      },
    }),
  ]);

  revalidatePath(`/league/${membership.leagueId}/commissioner`);
  revalidatePath(`/league/${membership.leagueId}`);
  revalidatePath("/dashboard");
}

export async function updateLeagueSettings(formData: FormData) {
  const leagueId = String(formData.get("leagueId"));
  await requireCommissioner(leagueId);

  const entryFee = String(formData.get("entryFee") ?? "");
  const buyBackFee = String(formData.get("buyBackFee") ?? "");
  const tieRule = formData.get("tieRule") === "SURVIVES" ? "SURVIVES" : "ELIMINATES";

  await prisma.league.update({
    where: { id: leagueId },
    data: { entryFee, buyBackFee, tieRule },
  });

  redirect("/dashboard");
}

export async function approveBuyBack(formData: FormData) {
  const membershipId = String(formData.get("membershipId"));
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
  });
  const { userId } = await requireCommissioner(membership.leagueId);

  if (membership.status !== "ELIMINATED_PENDING_BUYBACK") {
    throw new Error("This player isn't eligible for a buy-back right now.");
  }

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membershipId },
      data: { buyBackUsed: true, status: "ACTIVE", eliminatedWeek: null },
    }),
    prisma.paymentNote.create({
      data: {
        membershipId,
        kind: "BUYBACK",
        markedByUserId: userId,
      },
    }),
  ]);

  // Buying back in can revive a league that auto-completed because this was
  // the last active player standing.
  await prisma.league.updateMany({
    where: { id: membership.leagueId, status: "COMPLETED" },
    data: { status: "ACTIVE" },
  });

  revalidatePath(`/league/${membership.leagueId}/commissioner`);
  revalidatePath(`/league/${membership.leagueId}`);
  revalidatePath("/dashboard");
}
