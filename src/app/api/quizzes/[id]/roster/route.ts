import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";

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
    return { error: "Forbidden: Only QMs, Scorekeepers, or council builders can manage rosters", status: 403 };
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

  const roster = await prisma.quizRoster.findMany({
    where: { quizId },
    orderBy: [
      { seatNo: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      teamMembers: {
        include: {
          participant: true,
        },
      },
      scores: {
        orderBy: { roundLabel: "asc" },
      },
      finalRank: true,
    },
  });

  // Calculate running total scores per team
  const enrichedRoster = roster.map((item) => {
    const totalPoints = item.scores.reduce((sum, s) => sum + Number(s.points || 0), 0);
    return {
      ...item,
      totalPoints,
    };
  });

  return NextResponse.json({ roster: enrichedRoster });
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
    const { teamName, seatNo = null, members = [] } = body;

    if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const trimmedTeamName = teamName.trim();
    const parsedSeatNo = seatNo !== null && seatNo !== undefined && seatNo !== ""
      ? parseInt(String(seatNo), 10)
      : null;

    if (parsedSeatNo !== null) {
      if (isNaN(parsedSeatNo) || parsedSeatNo < 1) {
        return NextResponse.json({ error: "Seat number must be a positive integer" }, { status: 400 });
      }

      // Check seat collision
      const existingSeat = await prisma.quizRoster.findFirst({
        where: { quizId, seatNo: parsedSeatNo },
      });
      if (existingSeat) {
        return NextResponse.json(
          { error: `Seat #${parsedSeatNo} is already assigned to "${existingSeat.teamName}"` },
          { status: 400 },
        );
      }
    }

    // Process members
    const cleanMembers: { name: string; email?: string | null; college?: string | null }[] = [];
    if (Array.isArray(members)) {
      for (const m of members) {
        if (m && typeof m.name === "string" && m.name.trim()) {
          cleanMembers.push({
            name: m.name.trim(),
            email: m.email && typeof m.email === "string" && m.email.trim() ? m.email.trim().toLowerCase() : null,
            college: m.college && typeof m.college === "string" && m.college.trim() ? m.college.trim() : null,
          });
        }
      }
    }

    // Create participants & roster entry inside transaction
    const newEntry = await prisma.$transaction(async (tx) => {
      // 1. Create QuizRoster
      const rosterItem = await tx.quizRoster.create({
        data: {
          quizId,
          teamName: trimmedTeamName,
          seatNo: parsedSeatNo,
          status: "CONFIRMED",
        },
      });

      // 2. Link or create participants
      for (const m of cleanMembers) {
        let participant = null;
        if (m.email) {
          participant = await tx.participant.findFirst({
            where: { email: m.email },
          });
        }
        if (!participant) {
          participant = await tx.participant.findFirst({
            where: { name: { equals: m.name, mode: "insensitive" } },
          });
        }
        if (!participant) {
          participant = await tx.participant.create({
            data: {
              name: m.name,
              email: m.email,
              college: m.college,
            },
          });
        }

        // Check if participant already in this quiz
        const alreadyInQuiz = await tx.teamMember.findUnique({
          where: {
            quizId_participantId: {
              quizId,
              participantId: participant.id,
            },
          },
        });

        if (alreadyInQuiz) {
          throw new Error(`Participant "${m.name}" is already registered on another team for this quiz.`);
        }

        await tx.teamMember.create({
          data: {
            quizId,
            rosterId: rosterItem.id,
            participantId: participant.id,
            seatNo: parsedSeatNo,
          },
        });
      }

      return tx.quizRoster.findUnique({
        where: { id: rosterItem.id },
        include: {
          teamMembers: { include: { participant: true } },
          scores: true,
          finalRank: true,
        },
      });
    });

    return NextResponse.json({ rosterItem: newEntry }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to create roster entry" },
      { status: 400 },
    );
  }
}

export async function PATCH(
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

    // Batch auto-assign seats/breakouts to all unseated confirmed teams
    if (body.autoAssignAll) {
      const allRoster = await prisma.quizRoster.findMany({
        where: { quizId },
        orderBy: { createdAt: "asc" },
      });

      const occupiedSeats = new Set<number>();
      for (const r of allRoster) {
        if (r.seatNo !== null) occupiedSeats.add(r.seatNo);
      }

      let nextSeat = 1;
      const updates: { id: string; seatNo: number }[] = [];
      for (const r of allRoster) {
        if (r.seatNo === null && r.status !== "NO_SHOW") {
          while (occupiedSeats.has(nextSeat)) nextSeat++;
          occupiedSeats.add(nextSeat);
          updates.push({ id: r.id, seatNo: nextSeat });
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const u of updates) {
          await tx.quizRoster.update({
            where: { id: u.id },
            data: { seatNo: u.seatNo },
          });
          await tx.teamMember.updateMany({
            where: { rosterId: u.id },
            data: { seatNo: u.seatNo },
          });
          await tx.score.updateMany({
            where: { rosterId: u.id },
            data: { seatNo: u.seatNo },
          });
          await tx.finalRank.updateMany({
            where: { rosterId: u.id },
            data: { seatNo: u.seatNo },
          });
        }
      });

      return NextResponse.json({ ok: true, assignedCount: updates.length });
    }

    const { rosterId, seatNo, teamName, status } = body;

    if (!rosterId) {
      return NextResponse.json({ error: "Roster ID is required" }, { status: 400 });
    }

    const currentRoster = await prisma.quizRoster.findUnique({
      where: { id: rosterId, quizId },
    });

    if (!currentRoster) {
      return NextResponse.json({ error: "Roster entry not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (teamName !== undefined && typeof teamName === "string" && teamName.trim()) {
      updateData.teamName = teamName.trim();
    }

    if (status !== undefined) {
      if (status === "CONFIRMED" || status === "NO_SHOW") {
        updateData.status = status;
      }
    }

    if (seatNo !== undefined) {
      const parsedSeatNo = seatNo !== null && seatNo !== "" ? parseInt(String(seatNo), 10) : null;
      if (parsedSeatNo !== null && (isNaN(parsedSeatNo) || parsedSeatNo < 1)) {
        return NextResponse.json({ error: "Seat number must be a positive integer" }, { status: 400 });
      }

      if (parsedSeatNo !== null && parsedSeatNo !== currentRoster.seatNo) {
        const conflict = await prisma.quizRoster.findFirst({
          where: { quizId, seatNo: parsedSeatNo, id: { not: rosterId } },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `Seat #${parsedSeatNo} is already assigned to "${conflict.teamName}"` },
            { status: 400 },
          );
        }
      }

      updateData.seatNo = parsedSeatNo;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.quizRoster.update({
        where: { id: rosterId },
        data: updateData,
        include: {
          teamMembers: { include: { participant: true } },
          scores: true,
          finalRank: true,
        },
      });

      // Synchronize seatNo across child records if seatNo changed
      if (updateData.seatNo !== undefined) {
        await tx.teamMember.updateMany({
          where: { rosterId },
          data: { seatNo: updateData.seatNo },
        });

        if (updateData.seatNo !== null) {
          await tx.score.updateMany({
            where: { rosterId },
            data: { seatNo: updateData.seatNo },
          });

          await tx.finalRank.updateMany({
            where: { rosterId },
            data: { seatNo: updateData.seatNo },
          });
        }
      }

      return res;
    });

    return NextResponse.json({ rosterItem: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to update roster entry" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: quizId } = await params;
  const access = await verifyQuizAccess(quizId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rosterId = searchParams.get("rosterId");

    if (!rosterId) {
      return NextResponse.json({ error: "Roster ID is required" }, { status: 400 });
    }

    // Check if team has scores recorded
    const scoreCount = await prisma.score.count({
      where: { rosterId },
    });

    if (scoreCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete team after scores have been recorded. Mark as 'NO_SHOW' or 'ELIMINATED' instead.",
        },
        { status: 400 },
      );
    }

    await prisma.quizRoster.delete({
      where: { id: rosterId, quizId },
    });

    return NextResponse.json({ ok: true, deletedRosterId: rosterId });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to delete roster entry" },
      { status: 400 },
    );
  }
}
