"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { QuestionDifficulty, QuestionStatus } from "@prisma/client";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { findSimilarQuestion } from "@/lib/duplicates";
import { enqueueJob } from "@/lib/jobs/queue";

const VALID_DIFFICULTIES: QuestionDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export type SubmitQuestionResult = { error: string } | { ok: true; questionId: string; flagged?: boolean };

/**
 * Phase 2 & 3: Any member can submit a question at any time.
 * Fields: categories (multi-select + optional sub-genre), difficulty,
 * question text, answer text, optional notes, optional question media and answer media.
 * Checks trigram similarity: if duplicate threshold is met, marks status as FLAGGED.
 */
export async function submitQuestion(
  _prev: SubmitQuestionResult | null,
  formData: FormData,
): Promise<SubmitQuestionResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") {
    return { error: "You must be signed in to submit a question." };
  }

  const text = String(formData.get("text") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "") as QuestionDifficulty;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!text) return { error: "Question text is required." };
  if (!answerText) return { error: "Answer text is required." };
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return { error: "Please select a difficulty level (Easy, Medium, or Hard)." };
  }

  // Collect category IDs from multi-select checkboxes
  const categoryIds = formData.getAll("categoryId").filter(Boolean).map(String);
  if (categoryIds.length === 0) {
    return { error: "Select at least one category." };
  }

  // Build category connections with optional sub-genre per category
  const categoryConnections = categoryIds.map((catId) => {
    const subGenre = String(formData.get(`subGenre_${catId}`) ?? "").trim();
    return {
      categoryId: catId,
      subGenre: subGenre.length > 0 ? subGenre : null,
    };
  });

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
            role: "QUESTION" as const,
            type: qm.type,
            url: qm.url,
            uploadedById: viewer.user.id,
          });
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  if (answerMediaRaw) {
    try {
      const parsed = JSON.parse(answerMediaRaw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const am of items) {
        if (am && am.url && am.type) {
          mediaCreates.push({
            role: "ANSWER" as const,
            type: am.type,
            url: am.url,
            uploadedById: viewer.user.id,
          });
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // Phase 3: Run composite pg_trgm similarity check (question + answer) for duplicate detection
  const duplicateMatch = await findSimilarQuestion(text, answerText);
  const isFlagged = duplicateMatch !== null;
  const status: QuestionStatus = isFlagged ? "FLAGGED" : "PENDING";

  const question = await prisma.question.create({
    data: {
      text,
      answerText,
      difficulty,
      notes: notes.length > 0 ? notes : null,
      status,
      duplicateOfId: duplicateMatch ? duplicateMatch.id : null,
      duplicateScore: duplicateMatch ? duplicateMatch.score : null,
      submittedById: viewer.user.id,
      questionCategories: {
        create: categoryConnections,
      },
      media: {
        create: mediaCreates,
      },
    },
  });

  // Phase 9: Enqueue notification for council reviewers
  await enqueueJob("DISPATCH_NOTIFICATION", {
    permissionKey: "manage_questions",
    excludeUserId: viewer.user.id,
    type: "SUBMISSION_AWAITING_REVIEW",
    title: isFlagged ? "Question Flagged for Review" : "New Question Submission",
    message: `${viewer.name || viewer.email} submitted a question: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`,
    linkUrl: isFlagged ? "/admin/duplicates" : "/questions",
  });

  revalidatePath("/questions");
  revalidatePath("/admin/duplicates");

  if (isFlagged) {
    redirect(`/questions?flagged=${question.id}`);
  } else {
    redirect(`/questions?submitted=${question.id}`);
  }
}