"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { QuestionDifficulty, QuestionStatus, QuestionAuditAction } from "@prisma/client";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { findSimilarQuestion } from "@/lib/duplicates";
import { enqueueJob } from "@/lib/jobs/queue";

export type UpdateQuestionResult = { error: string } | { ok: true };

const VALID_DIFFICULTIES: QuestionDifficulty[] = ["EASY", "MEDIUM", "HARD"];
const VALID_STATUSES: QuestionStatus[] = ["PENDING", "APPROVED", "REJECTED", "FLAGGED"];

/**
 * In-place question update (Section 6: "Editing a question overwrites in
 * place — no versioning, no new row on edit").
 *
 * Members can edit their own PENDING or FLAGGED questions.
 * Users with manage_questions permission can edit any question.
 */
export async function updateQuestion(
  _prev: UpdateQuestionResult | null,
  formData: FormData,
): Promise<UpdateQuestionResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return { error: "You must be signed in." };
  }

  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) return { error: "Invalid question ID." };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      questionCategories: true,
      media: true,
    },
  });
  if (!question) return { error: "Question not found." };

  const canManage = await hasPermission(viewer.user, "manage_questions");
  const isOwn = question.submittedById === viewer.user.id;

  if (!canManage && !isOwn) {
    return { error: "You can only edit your own questions." };
  }

  const text = String(formData.get("text") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "") as QuestionDifficulty;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!text) return { error: "Question text is required." };
  if (!answerText) return { error: "Answer text is required." };
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return { error: "Please select a difficulty level." };
  }

  // Status change only allowed by users with manage_questions permission
  let status: QuestionStatus = question.status;
  if (canManage) {
    const newStatus = String(formData.get("status") ?? "") as QuestionStatus;
    if (VALID_STATUSES.includes(newStatus)) {
      status = newStatus;
    }
  }

  // Collect and replace categories
  const categoryIds = formData.getAll("categoryId").filter(Boolean).map(String);
  if (categoryIds.length === 0) {
    return { error: "Select at least one category." };
  }

  // Extract optional media slots (single object or array of objects)
  const questionMediaRaw = formData.get("questionMedia") as string;
  const answerMediaRaw = formData.get("answerMedia") as string;

  const mediaCreates = [];
  if (questionMediaRaw) {
    try {
      const parsed = JSON.parse(questionMediaRaw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const qm of items) {
        if (qm && qm.url && qm.type) {
          mediaCreates.push({
            questionId,
            role: "QUESTION" as const,
            type: qm.type,
            url: qm.url,
            uploadedById: viewer.user.id,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  if (answerMediaRaw) {
    try {
      const parsed = JSON.parse(answerMediaRaw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const am of items) {
        if (am && am.url && am.type) {
          mediaCreates.push({
            questionId,
            role: "ANSWER" as const,
            type: am.type,
            url: am.url,
            uploadedById: viewer.user.id,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // If text or answer changed, re-run similarity check
  let duplicateOfId = question.duplicateOfId;
  let duplicateScore = question.duplicateScore;

  if (text !== question.text || answerText !== question.answerText) {
    const duplicateMatch = await findSimilarQuestion(text, answerText, questionId);
    if (duplicateMatch) {
      duplicateOfId = duplicateMatch.id;
      duplicateScore = duplicateMatch.score;
      status = "FLAGGED";
    } else {
      duplicateOfId = null;
      duplicateScore = null;
      if (status === "FLAGGED") {
        status = canManage ? "APPROVED" : "PENDING";
      }
    }
  }

  // Determine whether content was actually modified (as opposed to just reviewing/changing status)
  const newCatMap = new Map(
    categoryIds.map((catId) => {
      const subGenre = String(formData.get(`subGenre_${catId}`) ?? "").trim();
      return [catId, subGenre.length > 0 ? subGenre : null];
    }),
  );
  const oldCatMap = new Map(
    question.questionCategories.map((qc) => [qc.categoryId, qc.subGenre]),
  );
  let categoriesChanged = newCatMap.size !== oldCatMap.size;
  if (!categoriesChanged) {
    for (const [catId, sub] of newCatMap.entries()) {
      if (!oldCatMap.has(catId) || oldCatMap.get(catId) !== sub) {
        categoriesChanged = true;
        break;
      }
    }
  }

  let mediaChanged = mediaCreates.length !== question.media.length;
  if (!mediaChanged) {
    for (const mc of mediaCreates) {
      const match = question.media.find(
        (m) => m.role === mc.role && m.type === mc.type && m.url === mc.url,
      );
      if (!match) {
        mediaChanged = true;
        break;
      }
    }
  }

  const normalizedNotes = notes.length > 0 ? notes : null;
  const isContentModified =
    text !== question.text ||
    answerText !== question.answerText ||
    difficulty !== question.difficulty ||
    normalizedNotes !== (question.notes ?? null) ||
    categoriesChanged ||
    mediaChanged;

  let lastEditedById = question.lastEditedById;
  let lastEditedAt = question.lastEditedAt;
  let isEditedAfterApproval = question.isEditedAfterApproval;
  let editedAfterApprovalAt = question.editedAfterApprovalAt;
  let auditAction: QuestionAuditAction | null = null;
  let auditNotes: string | null = null;
  const isAuthorPostApprovalEdit =
    isContentModified &&
    viewer.user.id === question.submittedById &&
    question.status === "APPROVED";
  const isAuthorRejectedEdit =
    isContentModified &&
    viewer.user.id === question.submittedById &&
    question.status === "REJECTED";

  if (isContentModified) {
    if (viewer.user.id !== question.submittedById) {
      // Content modified by another council member / manager
      lastEditedById = viewer.user.id;
      lastEditedAt = new Date();
      isEditedAfterApproval = false;
      editedAfterApprovalAt = null;
      auditAction = "EDITED_BY_ADMIN";
      auditNotes = `Modified by ${viewer.user.name ?? viewer.user.email}.`;
    } else {
      // Author updated their own submission; reset admin edit stamp
      lastEditedById = null;
      lastEditedAt = null;
      if (question.status === "APPROVED") {
        isEditedAfterApproval = true;
        editedAfterApprovalAt = new Date();
        auditAction = "EDITED_BY_AUTHOR";
        auditNotes = "Author revised question post-approval.";
      } else if (question.status === "REJECTED") {
        if (!canManage) {
          status = "PENDING";
        }
        auditAction = "EDITED_BY_AUTHOR";
        auditNotes = "Author revised rejected question for re-review.";
      } else {
        auditAction = "EDITED_BY_AUTHOR";
        auditNotes = "Author revised submission.";
      }
    }
  } else if (status !== question.status) {
    if (status === "APPROVED") {
      auditAction = "APPROVED";
      isEditedAfterApproval = false;
      editedAfterApprovalAt = null;
    } else if (status === "REJECTED") {
      auditAction = "REJECTED";
    }
  }

  await prisma.$transaction([
    prisma.question.update({
      where: { id: questionId },
      data: {
        text,
        answerText,
        difficulty,
        notes: normalizedNotes,
        status,
        duplicateOfId,
        duplicateScore,
        lastEditedById,
        lastEditedAt,
        isEditedAfterApproval,
        editedAfterApprovalAt,
      },
    }),
    // Delete existing category links, re-create fresh
    prisma.questionCategory.deleteMany({ where: { questionId } }),
    prisma.questionCategory.createMany({
      data: categoryIds.map((catId) => {
        const subGenre = String(formData.get(`subGenre_${catId}`) ?? "").trim();
        return { questionId, categoryId: catId, subGenre: subGenre.length > 0 ? subGenre : null };
      }),
    }),
    // Replace media records
    prisma.questionMedia.deleteMany({ where: { questionId } }),
    ...(mediaCreates.length > 0
      ? [prisma.questionMedia.createMany({ data: mediaCreates })]
      : []),
    ...(auditAction
      ? [
          prisma.questionAuditLog.create({
            data: {
              questionId,
              actorId: viewer.user.id,
              action: auditAction,
              notes: auditNotes,
              previousStatus: question.status,
              newStatus: status,
            },
          }),
        ]
      : []),
  ]);

  // If status transitioned to APPROVED, notify author and recalculate leaderboards
  if (question.status !== "APPROVED" && status === "APPROVED") {
    await Promise.all([
      enqueueJob("DISPATCH_NOTIFICATION", {
        userId: question.submittedById,
        type: "SUBMISSION_APPROVED",
        title: "Question Approved!",
        message: `Your question "${text.slice(0, 50)}..." was approved (+1 pt earned).`,
        linkUrl: "/questions",
      }),
      enqueueJob("RECALCULATE_LEADERBOARD", {}),
    ]);
  } else if (question.status !== "REJECTED" && status === "REJECTED") {
    await enqueueJob("DISPATCH_NOTIFICATION", {
      userId: question.submittedById,
      type: "SUBMISSION_REJECTED",
      title: "Question Rejected",
      message: `Your submission "${text.slice(0, 50)}..." was rejected by council review.`,
      linkUrl: "/questions",
    });
  }

  // If author edited an already-approved question, alert question managers for re-review
  if (isAuthorPostApprovalEdit) {
    const managers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: {
          rolePermissions: {
            some: { permission: { key: "manage_questions" } },
          },
        },
        id: { not: viewer.user.id },
      },
      select: { id: true },
    });
    for (const mgr of managers) {
      await enqueueJob("DISPATCH_NOTIFICATION", {
        userId: mgr.id,
        type: "SYSTEM",
        title: "Approved Question Edited",
        message: `${viewer.user.name ?? "Author"} edited approved question: "${text.slice(0, 45)}..."`,
        linkUrl: `/questions/${questionId}/edit`,
      });
    }
  }

  // If author edited a previously rejected question, alert question managers for re-review
  if (isAuthorRejectedEdit) {
    const managers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: {
          rolePermissions: {
            some: { permission: { key: "manage_questions" } },
          },
        },
        id: { not: viewer.user.id },
      },
      select: { id: true },
    });
    for (const mgr of managers) {
      await enqueueJob("DISPATCH_NOTIFICATION", {
        userId: mgr.id,
        type: "SYSTEM",
        title: "Rejected Question Revised",
        message: `${viewer.user.name ?? "Author"} revised previously rejected question: "${text.slice(0, 45)}..." (pending re-review).`,
        linkUrl: `/questions/${questionId}/edit`,
      });
    }
  }

  revalidatePath("/questions");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  revalidatePath("/admin/duplicates");
  revalidatePath(`/questions/${questionId}/edit`);
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  redirect(`/questions?updated=${questionId}`);
}

/**
 * 1-Click Server Action: Approve a submission without modifying its content.
 */
export async function approveQuestion(formData: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || !(await hasPermission(viewer.user, "manage_questions"))) {
    throw new Error("Unauthorized: you do not have permission to manage questions.");
  }

  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) throw new Error("Missing questionId.");

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, text: true, submittedById: true, status: true, isEditedAfterApproval: true },
  });
  if (!existing) throw new Error("Question not found.");

  await prisma.$transaction([
    prisma.question.update({
      where: { id: questionId },
      data: {
        status: "APPROVED",
        isEditedAfterApproval: false,
        editedAfterApprovalAt: null,
      },
    }),
    prisma.questionAuditLog.create({
      data: {
        questionId,
        actorId: viewer.user.id,
        action: "APPROVED",
        previousStatus: existing.status,
        newStatus: "APPROVED",
        notes: existing.isEditedAfterApproval ? "Re-approved after author post-approval edits." : null,
      },
    }),
  ]);

  await Promise.all([
    enqueueJob("DISPATCH_NOTIFICATION", {
      userId: existing.submittedById,
      type: "SUBMISSION_APPROVED",
      title: "Question Approved!",
      message: `Your question "${existing.text.slice(0, 50)}..." was approved (+1 pt earned).`,
      linkUrl: "/questions",
    }),
    enqueueJob("RECALCULATE_LEADERBOARD", {}),
  ]);

  revalidatePath("/questions");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  revalidatePath("/admin/duplicates");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
}

/**
 * 1-Click Server Action: Reject a pending submission.
 */
export async function rejectQuestion(formData: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member" || !(await hasPermission(viewer.user, "manage_questions"))) {
    throw new Error("Unauthorized: you do not have permission to manage questions.");
  }

  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) throw new Error("Missing questionId.");

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, text: true, submittedById: true, status: true },
  });
  if (!existing) throw new Error("Question not found.");

  await prisma.$transaction([
    prisma.question.update({
      where: { id: questionId },
      data: { status: "REJECTED" },
    }),
    prisma.questionAuditLog.create({
      data: {
        questionId,
        actorId: viewer.user.id,
        action: "REJECTED",
        previousStatus: existing.status,
        newStatus: "REJECTED",
      },
    }),
  ]);

  await enqueueJob("DISPATCH_NOTIFICATION", {
    userId: existing.submittedById,
    type: "SUBMISSION_REJECTED",
    title: "Question Rejected",
    message: `Your submission "${existing.text.slice(0, 50)}..." was rejected by council review.`,
    linkUrl: "/questions",
  });

  revalidatePath("/questions");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  revalidatePath("/admin/duplicates");
}