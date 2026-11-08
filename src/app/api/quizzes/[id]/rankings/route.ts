import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { enqueueJob } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

async function verifyQuizAccess(quizId: string) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return { error: "Unauthorized", status: 401 };
  }

  const canBuild = await hasPermission(viewer.user, "build_quizzes");
  const canManage = await hasPermission(viewer.user, "manage_questions");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { qms: true, scorekeepers: true },
  });

  if (!quiz) {
    return { error: "Quiz not found", status: 404 };
  }

  const isQm = quiz.qms.some((q) => q.userId === viewer.user.id);
  const isScorekeeper = quiz.scorekeepers.some((s) => s.userId === viewer.user.id);
  if (!canBuild && !canManage && !isQm && !isScorekeeper) {
    return { error: "Forbidden: Only QMs, Scorekeepers, or council builders can record final ranks", status: 403 };
  }

  return { quiz, user: viewer.user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: quizId } = await params;
  const access = await verifyQuizAccess(quizId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const rankings = await prisma.finalRank.findMany({
    where: { quizId },
    orderBy: { rank: "asc" },
    include: {
      roster: {
        include: {
          teamMembers: {
            include: { participant: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ rankings });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: quizId } = await params;
  const access = await verifyQuizAccess(quizId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { rankings = [] } = body;

    if (!Array.isArray(rankings) || rankings.length === 0) {
      return NextResponse.json({ error: "Rankings array is required" }, { status: 400 });
    }

    // 1. Strict Uniqueness Check for Ranks (No Ties Allowed per Section 6)
    const rankValues = rankings.map((r) => parseInt(String(r.rank), 10));
    if (rankValues.some((r) => isNaN(r) || r < 1)) {
      return NextResponse.json({ error: "All ranks must be positive integers" }, { status: 400 });
    }

    if (new Set(rankValues).size !== rankValues.length) {
      return NextResponse.json(
        {
          error: "Ties are not allowed in final rankings. Please break all ties live before recording placements.",
        },
        { status: 400 },
      );
    }

    // 2. Strict Uniqueness Check for Teams/Seats
    const seatValues = rankings.map((r) => parseInt(String(r.seatNo), 10));
    if (new Set(seatValues).size !== seatValues.length) {
      return NextResponse.json({ error: "Each seat can only appear once in rankings" }, { status: 400 });
    }

    // Save rankings in transaction
    const saved = await prisma.$transaction(async (tx) => {
      // Clear previous final ranks for this quiz
      await tx.finalRank.deleteMany({
        where: { quizId },
      });

      const created = [];
      for (const item of rankings) {
        const { rosterId, seatNo, rank, totalPoints } = item;

        const rosterItem = await tx.quizRoster.findUnique({
          where: { id: rosterId, quizId },
        });

        if (!rosterItem) {
          throw new Error(`Roster ID ${rosterId} not found in this quiz`);
        }

        const entry = await tx.finalRank.create({
          data: {
            quizId,
            rosterId,
            seatNo: parseInt(String(seatNo), 10),
            rank: parseInt(String(rank), 10),
            totalPoints: totalPoints !== undefined && totalPoints !== null ? parseFloat(String(totalPoints)) : null,
          },
          include: {
            roster: {
              include: {
                teamMembers: { include: { participant: true } },
              },
            },
          },
        });

        created.push(entry);
      }

      return created;
    });

    // Phase 9: Recalculate winner leaderboard in background
    await enqueueJob("RECALCULATE_LEADERBOARD", {});

    return NextResponse.json({ ok: true, rankings: saved });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to record final rankings" },
      { status: 400 },
    );
  }
}
