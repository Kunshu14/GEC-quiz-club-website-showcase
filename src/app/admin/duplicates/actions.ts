"use server";

import { revalidatePath } from "next/cache";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/jobs/queue";

export async function resolveDuplicateAsDifferent(formData: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || !(await hasPermission(viewer.user, "manage_questions"))) {
    throw new Error("Unauthorized: you do not have permission to manage questions.");
  }

  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) throw new Error("Missing questionId.");

  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      status: "APPROVED",
    },
    select: { id: true, text: true, submittedById: true },
  });

  // Phase 9: Async notify author and recalculate leaderboards without blocking request
  await Promise.all([
    enqueueJob("DISPATCH_NOTIFICATION", {
      userId: question.submittedById,
      type: "SUBMISSION_APPROVED",
      title: "Question Approved!",
      message: `Your question "${question.text.slice(0, 50)}..." was approved (+1 pt earned).`,
      linkUrl: "/questions",
    }),
    enqueueJob("RECALCULATE_LEADERBOARD", {}),
  ]);

  revalidatePath("/admin/duplicates");
  revalidatePath("/questions");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

export async function resolveDuplicateAsSame(formData: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || !(await hasPermission(viewer.user, "manage_questions"))) {
    throw new Error("Unauthorized: you do not have permission to manage questions.");
  }

  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) throw new Error("Missing questionId.");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { notes: true, duplicateOfId: true, text: true, submittedById: true },
  });

  const duplicateNote = question?.duplicateOfId
    ? ` [Marked as duplicate of #${question.duplicateOfId}]`
    : " [Marked as duplicate]";

  await prisma.question.update({
    where: { id: questionId },
    data: {
      status: "REJECTED",
      notes: (question?.notes ?? "") + duplicateNote,
    },
  });

  if (question?.submittedById) {
    await enqueueJob("DISPATCH_NOTIFICATION", {
      userId: question.submittedById,
      type: "SUBMISSION_REJECTED",
      title: "Question Resolved as Duplicate",
      message: `Your submission "${question.text.slice(0, 50)}..." was marked as a duplicate of an existing question.`,
      linkUrl: "/questions",
    });
  }

  revalidatePath("/admin/duplicates");
  revalidatePath("/questions");
  revalidatePath("/admin");
}
