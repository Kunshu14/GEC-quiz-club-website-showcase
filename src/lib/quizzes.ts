import { prisma } from "@/lib/prisma";

/**
 * Calculates academic year label (e.g. June-May academic calendar cycle -> "2026-27").
 */
export function getAcademicYear(date: Date = new Date()): string {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 5 = June
  const year = d.getFullYear();

  if (month >= 5) {
    // June to December
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    // January to May
    const currentYearShort = year.toString().slice(-2);
    return `${year - 1}-${currentYearShort}`;
  }
}

export interface RecentQuestionInfo {
  quizId: string;
  quizTitle: string;
  quizDate: Date;
}

/**
 * Section 7.3: "Soft warning when a question was also used in either of the last 2 quizzes."
 * Returns a map of questionId -> { quizId, quizTitle, quizDate } for questions
 * used in the 2 most recent quizzes before targetDate (excluding current quizId).
 */
export async function getRecentQuizQuestionsMap(
  currentQuizId?: string,
  targetDate: Date = new Date()
): Promise<Map<string, RecentQuestionInfo>> {
  const recentQuizzes = await prisma.quiz.findMany({
    where: {
      ...(currentQuizId ? { id: { not: currentQuizId } } : {}),
      date: { lte: targetDate },
    },
    orderBy: { date: "desc" },
    take: 2,
    select: {
      id: true,
      title: true,
      date: true,
      usageLogs: {
        select: {
          questionId: true,
        },
      },
    },
  });

  const map = new Map<string, RecentQuestionInfo>();
  for (const quiz of recentQuizzes) {
    for (const log of quiz.usageLogs) {
      if (!map.has(log.questionId)) {
        map.set(log.questionId, {
          quizId: quiz.id,
          quizTitle: quiz.title,
          quizDate: quiz.date,
        });
      }
    }
  }

  return map;
}

export interface DifficultyBalance {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  easyPct: number;
  mediumPct: number;
  hardPct: number;
  isBalanced: boolean;
  warning?: string;
}

/**
 * Section 7.4: "Live difficulty tally with soft warning if unbalanced"
 */
export function calculateDifficultyBalance(
  questions: { difficulty: string }[]
): DifficultyBalance {
  const total = questions.length;
  let easy = 0;
  let medium = 0;
  let hard = 0;

  for (const q of questions) {
    if (q.difficulty === "EASY") easy++;
    else if (q.difficulty === "MEDIUM") medium++;
    else if (q.difficulty === "HARD") hard++;
  }

  const easyPct = total > 0 ? Math.round((easy / total) * 100) : 0;
  const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
  const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;

  let isBalanced = true;
  let warning: string | undefined;

  if (total >= 5) {
    if (hard / total > 0.6) {
      isBalanced = false;
      warning = "Quiz is heavy on Hard questions (>60%). Consider adding more accessible questions.";
    } else if (easy === 0) {
      isBalanced = false;
      warning = "Quiz lacks Easy questions. Consider adding warm-up/accessible clues.";
    } else if (easy / total > 0.7) {
      isBalanced = false;
      warning = "Quiz is predominantly Easy (>70%). Consider adding more lateral/challenging questions.";
    }
  }

  return {
    total,
    easy,
    medium,
    hard,
    easyPct,
    mediumPct,
    hardPct,
    isBalanced,
    warning,
  };
}
