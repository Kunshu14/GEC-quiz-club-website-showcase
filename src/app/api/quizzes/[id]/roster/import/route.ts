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
    include: { qms: true },
  });

  if (!quiz) {
    return { error: "Quiz not found", status: 404 };
  }

  const isQm = quiz.qms.some((q) => q.userId === viewer.user.id);
  if (!canBuild && !canManage && !isQm) {
    return { error: "Forbidden: Only QMs or council builders can manage rosters", status: 403 };
  }

  return { quiz, user: viewer.user };
}

interface ImportMemberPayload {
  name: string;
  email?: string | null;
  college?: string | null;
}

interface ImportTeamPayload {
  teamName: string;
  members: ImportMemberPayload[];
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
    const {
      teams = [],
      mode = "append",
      autoAssignSeats = false,
    } = body as {
      teams: ImportTeamPayload[];
      mode?: "append" | "replace";
      autoAssignSeats?: boolean;
    };

    if (!Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json(
        { error: "No teams provided for import." },
        { status: 400 },
      );
    }

    if (teams.length > 300) {
      return NextResponse.json(
        { error: "Import batch size exceeds maximum of 300 teams." },
        { status: 400 },
      );
    }

    // If replace mode, verify no scores exist
    if (mode === "replace") {
      const scoreCount = await prisma.score.count({
        where: { quizId },
      });
      if (scoreCount > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot replace roster because scores have already been recorded for this quiz. Please use 'Append' mode or clear scores first.",
          },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // If replace mode, delete all existing roster records for this quiz
        if (mode === "replace") {
          await tx.teamMember.deleteMany({ where: { quizId } });
          await tx.finalRank.deleteMany({ where: { quizId } });
          await tx.quizRoster.deleteMany({ where: { quizId } });
        }

        // Determine existing assigned seat numbers
        const existingRoster = await tx.quizRoster.findMany({
          where: { quizId },
          select: { seatNo: true, teamName: true },
        });
        const occupiedSeats = new Set<number>();
        for (const r of existingRoster) {
          if (r.seatNo !== null) occupiedSeats.add(r.seatNo);
        }

        let nextAvailableSeat = 1;
        function getNextSeat(): number {
          while (occupiedSeats.has(nextAvailableSeat)) {
            nextAvailableSeat++;
          }
          occupiedSeats.add(nextAvailableSeat);
          return nextAvailableSeat;
        }

        const warnings: string[] = [];
        let importedTeamsCount = 0;
        let importedParticipantsCount = 0;
        let reusedParticipantsCount = 0;

        // Keep track of participant IDs already assigned to any team in this quiz
        const assignedParticipantIds = new Set<string>();
        const existingMembers = await tx.teamMember.findMany({
          where: { quizId },
          select: { participantId: true },
        });
        for (const em of existingMembers) {
          assignedParticipantIds.add(em.participantId);
        }

        for (let tIdx = 0; tIdx < teams.length; tIdx++) {
          const t = teams[tIdx];
          const rawName = t.teamName?.trim();
          const teamName = rawName || `Team ${tIdx + 1}`;
          const seatNo = autoAssignSeats ? getNextSeat() : null;

          // Create the roster entry
          const roster = await tx.quizRoster.create({
            data: {
              quizId,
              teamName,
              seatNo,
              status: "CONFIRMED",
            },
          });
          importedTeamsCount++;

          // Process each member
          const rawMembers = Array.isArray(t.members) ? t.members : [];
          for (const m of rawMembers) {
            const memberName = m?.name?.trim();
            if (!memberName) continue;

            const memberEmail = m.email?.trim() ? m.email.trim().toLowerCase() : null;
            const memberCollege = m.college?.trim() || null;

            // 1. Participant lookup / reuse
            let participant = null;
            if (memberEmail) {
              participant = await tx.participant.findFirst({
                where: {
                  email: {
                    equals: memberEmail,
                    mode: "insensitive",
                  },
                },
              });
            }

            if (!participant && memberCollege) {
              participant = await tx.participant.findFirst({
                where: {
                  name: { equals: memberName, mode: "insensitive" },
                  college: { equals: memberCollege, mode: "insensitive" },
                },
              });
            }

            if (!participant) {
              participant = await tx.participant.findFirst({
                where: {
                  name: { equals: memberName, mode: "insensitive" },
                },
              });
            }

            if (participant) {
              reusedParticipantsCount++;
              // Update college if participant didn't have one and this form provides one
              if (!participant.college && memberCollege) {
                await tx.participant.update({
                  where: { id: participant.id },
                  data: { college: memberCollege },
                });
              }
              // Update email if participant didn't have one and this form provides one
              if (!participant.email && memberEmail) {
                await tx.participant.update({
                  where: { id: participant.id },
                  data: { email: memberEmail },
                });
              }
            } else {
              participant = await tx.participant.create({
                data: {
                  name: memberName,
                  email: memberEmail,
                  college: memberCollege,
                },
              });
              importedParticipantsCount++;
            }

            // Check if participant is already on a team in this quiz
            if (assignedParticipantIds.has(participant.id)) {
              warnings.push(
                `Participant "${memberName}" is already registered on another team for this quiz. Skipped adding them twice.`,
              );
              continue;
            }

            // Link member to roster and quiz
            await tx.teamMember.create({
              data: {
                quizId,
                rosterId: roster.id,
                participantId: participant.id,
                seatNo,
              },
            });
            assignedParticipantIds.add(participant.id);
          }
        }

        return {
          importedTeamsCount,
          importedParticipantsCount,
          reusedParticipantsCount,
          warnings,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Failed to import roster:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to import roster." },
      { status: 500 },
    );
  }
}
