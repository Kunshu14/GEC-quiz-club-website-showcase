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
    return { error: "Forbidden: Only QMs, Scorekeepers, or council builders can manage scores", status: 403 };
  }

  return { quiz, user: viewer.user };
}

function canonicalizeRoundName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Round 1";
  if (/^round\s*\d+$/i.test(trimmed)) {
    return `Round ${trimmed.replace(/\D/g, "")}`;
  }
  if (/^finals?$/i.test(trimmed)) return "Finals";
  if (/^prelims?$/i.test(trimmed)) return "Prelims";
  if (/^tie\s*breaker$/i.test(trimmed)) return "Tiebreaker";
  return trimmed;
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

  const [scores, roster, usageLogs] = await Promise.all([
    prisma.score.findMany({
      where: { quizId },
      orderBy: [{ roundLabel: "asc" }, { seatNo: "asc" }],
      include: {
        roster: {
          select: { id: true, teamName: true, seatNo: true, status: true },
        },
      },
    }),
    prisma.quizRoster.findMany({
      where: { quizId },
      orderBy: [{ seatNo: "asc" }, { createdAt: "asc" }],
      include: {
        teamMembers: { include: { participant: true } },
      },
    }),
    prisma.usageLog.findMany({
      where: { quizId },
      orderBy: { orderIndex: "asc" },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            answerText: true,
            difficulty: true,
          },
        },
      },
    }),
  ]);

  // Canonical mapping for round names (lowercase -> canonical name)
  const canonicalMap = new Map<string, string>();
  const quizRounds: string[] = [];

  // Group questions by round using canonical names
  const questionsByRound: Record<
    string,
    Array<{ id: string; text: string; answerText: string; difficulty: string; orderIndex: number }>
  > = {};

  for (const log of usageLogs) {
    const raw = log.roundName?.trim() || "Round 1";
    const canonical = canonicalizeRoundName(raw);
    const lower = canonical.toLowerCase();

    if (!canonicalMap.has(lower)) {
      canonicalMap.set(lower, canonical);
      quizRounds.push(canonical);
    }
    const resolvedRound = canonicalMap.get(lower)!;

    if (!questionsByRound[resolvedRound]) {
      questionsByRound[resolvedRound] = [];
    }
    questionsByRound[resolvedRound].push({
      id: log.question.id,
      text: log.question.text,
      answerText: log.question.answerText,
      difficulty: log.question.difficulty,
      orderIndex: log.orderIndex,
    });
  }

  // Collect rounds from scores that actually have meaningful data (points != 0, eliminated, or question scores)
  const scoreRoundsWithData = new Set<string>();
  for (const s of scores) {
    const hasMeaningfulScore =
      Number(s.points) !== 0 ||
      s.status === "ELIMINATED" ||
      (s.questionScores && typeof s.questionScores === "object" && Object.keys(s.questionScores as object).length > 0);
    if (hasMeaningfulScore && s.roundLabel) {
      const raw = s.roundLabel.trim();
      const canonical = canonicalizeRoundName(raw);
      scoreRoundsWithData.add(canonical.toLowerCase());
    }
  }

  // Map scores to canonical round names and collect distinct rounds
  const allRounds = [...quizRounds];
  const normalizedScores = scores.map((s) => {
    const raw = s.roundLabel?.trim() || "Round 1";
    const canonical = canonicalizeRoundName(raw);
    const lower = canonical.toLowerCase();

    if (!canonicalMap.has(lower)) {
      canonicalMap.set(lower, canonical);
      // Only include a round without questions if it actually has score data
      if (scoreRoundsWithData.has(lower)) {
        allRounds.push(canonical);
      }
    }
    const resolvedRound = canonicalMap.get(lower)!;
    return {
      ...s,
      roundLabel: resolvedRound,
    };
  });

  if (allRounds.length === 0) {
    allRounds.push("Prelims", "Round 1");
  }

  return NextResponse.json({
    scores: normalizedScores,
    roster,
    rounds: allRounds,
    questionsByRound,
    roundSettings: access.quiz.roundSettings ?? null,
  });
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
    const { roundLabel, scores = [] } = body;

    if (!roundLabel || typeof roundLabel !== "string" || !roundLabel.trim()) {
      return NextResponse.json({ error: "Round label is required" }, { status: 400 });
    }

    const trimmedRound = canonicalizeRoundName(roundLabel.trim());

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ error: "Scores array is required" }, { status: 400 });
    }

    // Validate each score entry
    const validScoresToSave = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const entry of scores) {
        const { rosterId, seatNo, points, status = "ACTIVE", questionScores } = entry;

        if (!rosterId) {
          throw new Error("Each score must include a rosterId");
        }

        const rosterItem = await tx.quizRoster.findUnique({
          where: { id: rosterId, quizId },
        });

        if (!rosterItem) {
          throw new Error(`Team roster ID ${rosterId} not found in this quiz`);
        }

        // Enforce rule: Unseated teams CANNOT have scores
        if (rosterItem.seatNo === null || rosterItem.seatNo === undefined) {
          throw new Error(
            `Score entry blocked: Team "${rosterItem.teamName}" has not been assigned a seat yet. Assign a seat in the checklist first.`,
          );
        }

        const targetSeatNo = seatNo !== undefined ? parseInt(String(seatNo), 10) : rosterItem.seatNo;
        if (targetSeatNo !== rosterItem.seatNo) {
          throw new Error(
            `Seat number mismatch for team "${rosterItem.teamName}". Expected seat #${rosterItem.seatNo}, got #${targetSeatNo}.`,
          );
        }

        const parsedPoints = points !== undefined && points !== null && points !== ""
          ? parseFloat(String(points))
          : 0;

        if (isNaN(parsedPoints)) {
          throw new Error(`Invalid points value for team "${rosterItem.teamName}"`);
        }

        const savedScore = await tx.score.upsert({
          where: {
            quizId_seatNo_roundLabel: {
              quizId,
              seatNo: targetSeatNo,
              roundLabel: trimmedRound,
            },
          },
          update: {
            points: parsedPoints,
            status: status === "ELIMINATED" || status === "ADVANCED" ? status : "ACTIVE",
            ...(questionScores !== undefined ? { questionScores: questionScores || null } : {}),
          },
          create: {
            quizId,
            rosterId: rosterItem.id,
            seatNo: targetSeatNo,
            roundLabel: trimmedRound,
            points: parsedPoints,
            questionScores: questionScores || null,
            status: status === "ELIMINATED" || status === "ADVANCED" ? status : "ACTIVE",
          },
        });

        results.push(savedScore);
      }

      return results;
    });

    return NextResponse.json({ ok: true, savedCount: validScoresToSave.length, scores: validScoresToSave });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to save scores" },
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
    const roundLabel = searchParams.get("roundLabel");
    const seatNoParam = searchParams.get("seatNo");

    if (!roundLabel) {
      return NextResponse.json({ error: "roundLabel parameter is required" }, { status: 400 });
    }

    if (seatNoParam) {
      const seatNo = parseInt(seatNoParam, 10);
      await prisma.score.deleteMany({
        where: { quizId, roundLabel, seatNo },
      });
      return NextResponse.json({ ok: true, message: `Deleted score for seat #${seatNo} in ${roundLabel}` });
    } else {
      const canonical = canonicalizeRoundName(roundLabel.trim());
      await prisma.score.deleteMany({
        where: {
          quizId,
          roundLabel: {
            in: [
              roundLabel,
              roundLabel.trim(),
              roundLabel.toLowerCase(),
              roundLabel.toUpperCase(),
              canonical,
            ],
          },
        },
      });
      return NextResponse.json({ ok: true, message: `Deleted all scores for round ${roundLabel}` });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to delete score" },
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
    const { roundSettings } = body;

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        roundSettings: roundSettings ?? undefined,
      },
      select: { id: true, roundSettings: true },
    });

    return NextResponse.json({ ok: true, roundSettings: updated.roundSettings });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to update round settings" },
      { status: 500 },
    );
  }
}

