"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QuizMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { getAcademicYear } from "@/lib/quizzes";
import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Checks if current user is authorized to build/manage quizzes
 */
async function requireQuizBuilder() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    throw new Error("Unauthorized: You must be logged in as an active council member.");
  }

  const canBuild =
    (await hasPermission(viewer.user, "build_quizzes")) ||
    (await hasPermission(viewer.user, "manage_questions"));

  if (!canBuild && viewer.user.role.name !== "Admin") {
    throw new Error("Unauthorized: You do not have permission to build quizzes.");
  }

  return viewer;
}

export interface CreateQuizState {
  error?: string;
}

export async function createQuiz(
  _prevState: CreateQuizState | null,
  formData: FormData
): Promise<CreateQuizState> {
  const viewer = await requireQuizBuilder();

  const title = (formData.get("title") as string)?.trim();
  const dateStr = formData.get("date") as string;
  const modeStr = (formData.get("mode") as string) || "IN_PERSON";
  const format = (formData.get("format") as string)?.trim() || "Written Prelims + On-Stage Finals";
  const venueOrPlatform = (formData.get("venueOrPlatform") as string)?.trim();
  const timing = (formData.get("timing") as string)?.trim() || null;
  const budgetStr = formData.get("budget") as string;
  const themeId = (formData.get("themeId") as string)?.trim() || null;
  const lessonsLearned = (formData.get("lessonsLearned") as string)?.trim() || null;

  // Selected QMs and Scorekeepers
  const qmUserIds = formData.getAll("qmUserIds") as string[];
  const scorekeeperUserIds = (formData.getAll("scorekeeperUserIds") as string[]).filter(Boolean);

  if (!title) {
    return { error: "Quiz title is required." };
  }
  if (!dateStr) {
    return { error: "Quiz date is required." };
  }
  if (!venueOrPlatform) {
    return { error: "Venue or platform/meeting link is required." };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { error: "Invalid quiz date format." };
  }

  const budget = budgetStr ? parseFloat(budgetStr) : 0;
  const mode = (Object.values(QuizMode).includes(modeStr as QuizMode)
    ? modeStr
    : QuizMode.IN_PERSON) as QuizMode;

  const academicYear = getAcademicYear(date);

  // Ensure current user is in QMs if none selected
  const finalQmUserIds = qmUserIds.length > 0 ? qmUserIds : [viewer.user.id];

  let quizId: string;
  try {
    const quiz = await prisma.quiz.create({
      data: {
        title,
        date,
        academicYear,
        format,
        mode,
        themeId: themeId || null,
        venueOrPlatform,
        timing,
        budget: isNaN(budget) ? 0 : budget,
        lessonsLearned,
        createdById: viewer.user.id,
        qms: {
          create: finalQmUserIds.map((userId) => ({ userId })),
        },
        ...(scorekeeperUserIds.length > 0
          ? {
              scorekeepers: {
                create: scorekeeperUserIds.map((userId) => ({ userId })),
              },
            }
          : {}),
      },
    });
    quizId = quiz.id;

    // Phase 9: Enqueue notification to assigned QMs
    await enqueueJob("DISPATCH_NOTIFICATION", {
      userIds: finalQmUserIds,
      type: "QUIZ_SCHEDULED",
      title: "Assigned as Quizmaster",
      message: `You are assigned as Quizmaster for "${title}" on ${dateStr}.`,
      linkUrl: `/quizzes/${quizId}`,
    });

    if (scorekeeperUserIds.length > 0) {
      await enqueueJob("DISPATCH_NOTIFICATION", {
        userIds: scorekeeperUserIds,
        type: "SCOREKEEPER_ASSIGNED",
        title: "Assigned as Scorekeeper",
        message: `You are assigned as Scorekeeper for "${title}" on ${dateStr}.`,
        linkUrl: `/quizzes/${quizId}?tab=scoring`,
      });
    }
  } catch (err) {
    console.error("Error creating quiz:", err);
    return { error: "Failed to create quiz. Please check your inputs and try again." };
  }

  revalidatePath("/quizzes");
  revalidatePath("/dashboard");
  redirect(`/quizzes/${quizId}/builder?created=true`);
}

export async function updateQuiz(
  quizId: string,
  _prevState: CreateQuizState | null,
  formData: FormData
): Promise<CreateQuizState> {
  await requireQuizBuilder();

  const title = (formData.get("title") as string)?.trim();
  const dateStr = formData.get("date") as string;
  const modeStr = (formData.get("mode") as string) || "IN_PERSON";
  const format = (formData.get("format") as string)?.trim() || "Written Prelims + On-Stage Finals";
  const venueOrPlatform = (formData.get("venueOrPlatform") as string)?.trim();
  const timing = (formData.get("timing") as string)?.trim() || null;
  const budgetStr = formData.get("budget") as string;
  const themeId = (formData.get("themeId") as string)?.trim() || null;
  const lessonsLearned = (formData.get("lessonsLearned") as string)?.trim() || null;
  const qmUserIds = formData.getAll("qmUserIds") as string[];
  const scorekeeperUserIds = (formData.getAll("scorekeeperUserIds") as string[]).filter(Boolean);

  if (!title) return { error: "Quiz title is required." };
  if (!dateStr) return { error: "Quiz date is required." };
  if (!venueOrPlatform) return { error: "Venue or platform link is required." };

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: "Invalid quiz date format." };

  const budget = budgetStr ? parseFloat(budgetStr) : 0;
  const mode = (Object.values(QuizMode).includes(modeStr as QuizMode)
    ? modeStr
    : QuizMode.IN_PERSON) as QuizMode;
  const academicYear = getAcademicYear(date);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          title,
          date,
          academicYear,
          format,
          mode,
          themeId: themeId || null,
          venueOrPlatform,
          timing,
          budget: isNaN(budget) ? 0 : budget,
          lessonsLearned,
        },
      });

      // Synchronize QMs if provided
      if (qmUserIds.length > 0) {
        await tx.quizQm.deleteMany({ where: { quizId } });
        await tx.quizQm.createMany({
          data: qmUserIds.map((userId) => ({ quizId, userId })),
          skipDuplicates: true,
        });
      }

      // Synchronize Scorekeepers
      await tx.quizScorekeeper.deleteMany({ where: { quizId } });
      if (scorekeeperUserIds.length > 0) {
        await tx.quizScorekeeper.createMany({
          data: scorekeeperUserIds.map((userId) => ({ quizId, userId })),
          skipDuplicates: true,
        });
      }
    });
  } catch (err) {
    console.error("Error updating quiz:", err);
    return { error: "Failed to update quiz." };
  }

  revalidatePath("/quizzes");
  revalidatePath(`/quizzes/${quizId}`);
  revalidatePath(`/quizzes/${quizId}/builder`);
  redirect(`/quizzes/${quizId}?updated=true`);
}

/**
 * On-the-spot lightweight scorekeeper update for live event desks.
 * Allows QMs and Builders to quickly add/remove desk scorekeepers right from the quiz overview.
 */
export async function updateQuizScorekeepers(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return { ok: false, error: "You must be signed in." };
  }

  const quizId = String(formData.get("quizId") ?? "").trim();
  if (!quizId) return { ok: false, error: "Missing quiz ID." };

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { qms: true },
  });
  if (!quiz) return { ok: false, error: "Quiz not found." };

  const canBuild =
    (await hasPermission(viewer.user, "build_quizzes")) ||
    (await hasPermission(viewer.user, "manage_questions")) ||
    viewer.user.role.name === "Admin";
  const isQm = quiz.qms.some((q) => q.userId === viewer.user.id);

  if (!canBuild && !isQm) {
    return { ok: false, error: "Unauthorized: Only QMs or council builders can manage scorekeepers." };
  }

  const scorekeeperUserIds = (formData.getAll("scorekeeperUserIds") as string[]).filter(Boolean);

  try {
    await prisma.$transaction([
      prisma.quizScorekeeper.deleteMany({ where: { quizId } }),
      ...(scorekeeperUserIds.length > 0
        ? [
            prisma.quizScorekeeper.createMany({
              data: scorekeeperUserIds.map((userId) => ({ quizId, userId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    if (scorekeeperUserIds.length > 0) {
      await enqueueJob("DISPATCH_NOTIFICATION", {
        userIds: scorekeeperUserIds,
        type: "SCOREKEEPER_ASSIGNED",
        title: "Assigned as Scorekeeper",
        message: `You have been assigned as Scorekeeper for "${quiz.title}".`,
        linkUrl: `/quizzes/${quizId}?tab=scoring`,
      });
    }

    revalidatePath(`/quizzes/${quizId}`);
    revalidatePath(`/quizzes/${quizId}/edit`);
    return { ok: true };
  } catch (err) {
    console.error("Error updating scorekeepers:", err);
    return { ok: false, error: "Failed to update scorekeepers." };
  }
}

export interface RunningOrderItem {
  questionId: string;
  orderIndex: number;
  roundName?: string;
}

export async function saveRunningOrder(
  quizId: string,
  items: RunningOrderItem[],
  roundSettings?: unknown,
): Promise<{ ok: boolean; error?: string }> {
  await requireQuizBuilder();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, date: true },
  });

  if (!quiz) {
    return { ok: false, error: "Quiz not found." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete previous running order items for this quiz
      await tx.usageLog.deleteMany({ where: { quizId } });

      // 2. Insert new running order sequence
      if (items.length > 0) {
        await tx.usageLog.createMany({
          data: items.map((item, idx) => ({
            quizId,
            questionId: item.questionId,
            orderIndex: idx + 1,
            roundName: item.roundName?.trim() || null,
            usedOn: quiz.date,
          })),
        });
      }

      // 3. Update roundSettings if provided
      if (roundSettings !== undefined) {
        await tx.quiz.update({
          where: { id: quizId },
          data: {
            roundSettings: roundSettings === null ? Prisma.JsonNull : (roundSettings as Prisma.InputJsonValue),
          },
        });
      }
    });

    revalidatePath("/quizzes");
    revalidatePath(`/quizzes/${quizId}`);
    revalidatePath(`/quizzes/${quizId}/builder`);
    revalidatePath("/questions");

    return { ok: true };
  } catch (err) {
    console.error("Error saving running order:", err);
    return { ok: false, error: "Failed to save running order." };
  }
}

export async function updateLessonsLearned(
  quizId: string,
  lessonsLearned: string
): Promise<{ ok: boolean; error?: string }> {
  await requireQuizBuilder();

  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { lessonsLearned: lessonsLearned.trim() || null },
    });

    revalidatePath("/quizzes");
    revalidatePath(`/quizzes/${quizId}`);
    return { ok: true };
  } catch (err) {
    console.error("Error updating lessons learned:", err);
    return { ok: false, error: "Failed to update lessons learned." };
  }
}

export async function deleteQuiz(quizId: string): Promise<{ ok: boolean; error?: string }> {
  await requireQuizBuilder();

  try {
    await prisma.quiz.delete({ where: { id: quizId } });

    revalidatePath("/quizzes");
    revalidatePath("/dashboard");
    revalidatePath("/questions");
    redirect("/quizzes?deleted=true");
  } catch (err) {
    console.error("Error deleting quiz:", err);
    return { ok: false, error: "Failed to delete quiz." };
  }
}
