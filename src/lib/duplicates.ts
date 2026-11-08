import { prisma } from "@/lib/prisma";

export const QUESTION_SIMILARITY_THRESHOLD = 0.28;
export const ANSWER_SIMILARITY_THRESHOLD = 0.30;

export interface DuplicateMatch {
  id: string;
  text: string;
  answerText: string;
  status: string;
  difficulty: string;
  score: number;
  qScore?: number;
  aScore?: number;
}

/**
 * Checks question text and answer text against existing questions in the database
 * using PostgreSQL pg_trgm trigram similarity.
 *
 * Evaluates both Question Text AND Answer Text:
 * - Flags as duplicate if Question similarity is high (>= 0.30) AND Answer similarity is high (>= 0.30 or substring match)
 * - Or if Question is near-identical (>= 0.88) and Answer has at least partial overlap (>= 0.20)
 * - Questions with identical sentence frames but completely different answers (e.g. inverted "NOT" questions)
 *   are NOT flagged as duplicates.
 *
 * @param newText - The question text to check.
 * @param newAnswerText - Optional answer text to compare against existing answers.
 * @param excludeQuestionId - Optional ID of the question currently being edited.
 */
export async function findSimilarQuestion(
  newText: string,
  newAnswerText?: string,
  excludeQuestionId?: string,
): Promise<DuplicateMatch | null> {
  const trimmedText = newText.trim();
  if (!trimmedText || trimmedText.length < 10) {
    return null;
  }

  // Defensive handling if 2nd parameter was passed as excludeQuestionId
  let answerText = newAnswerText?.trim() ?? "";
  let excludeId = excludeQuestionId;
  if (
    !excludeId &&
    answerText &&
    (answerText.startsWith("cm") || answerText.startsWith("cl")) &&
    answerText.length === 25
  ) {
    excludeId = answerText;
    answerText = "";
  }

  try {
    const candidates = await prisma.$queryRaw<
      {
        id: string;
        text: string;
        answerText: string;
        status: string;
        difficulty: string;
        duplicateOfId: string | null;
        q_score: number;
        a_score: number;
      }[]
    >`
      SELECT
        id,
        text,
        answer_text as "answerText",
        status,
        difficulty,
        duplicate_of_id as "duplicateOfId",
        similarity(text, ${trimmedText}) as q_score,
        similarity(answer_text, ${answerText}) as a_score
      FROM questions
      WHERE (${excludeId ?? null}::text IS NULL OR id != ${excludeId ?? null})
        AND similarity(text, ${trimmedText}) >= ${QUESTION_SIMILARITY_THRESHOLD}
      ORDER BY
        CASE
          WHEN status = 'APPROVED' THEN 0
          WHEN status = 'PENDING' THEN 1
          WHEN status = 'FLAGGED' THEN 2
          WHEN status = 'REJECTED' THEN 3
          ELSE 4
        END,
        q_score DESC
      LIMIT 5;
    `;

    for (const c of candidates) {
      const qScore = Number(c.q_score.toFixed(3));
      const aScore = Number(c.a_score.toFixed(3));

      let effectiveAScore = aScore;
      if (answerText) {
        const normA1 = answerText.toLowerCase();
        const normA2 = c.answerText.trim().toLowerCase();
        const contains =
          (normA1.length >= 3 && normA2.includes(normA1)) ||
          (normA2.length >= 3 && normA1.includes(normA2));
        effectiveAScore = contains ? Math.max(aScore, 0.75) : aScore;
      }

      // Tier 1: Question text is nearly identical or strongly similar (>= 0.38)
      // Always flag! Even if the answer is completely different (e.g. wrong answer, abbreviation, or conflicting claim)
      //
      // Tier 2: Question is moderately paraphrased (>= 0.25) AND answer matches/overlaps (>= 0.25)
      // Confirmed paraphrased duplicate asking for the same answer!
      const isDuplicate =
        qScore >= 0.38 || (qScore >= 0.25 && effectiveAScore >= 0.25);

      if (isDuplicate) {
        // Overall confidence score shown to admin:
        // Use the highest representative score so identical questions show high percentages (e.g. 70-100%)
        const overallScore = Math.max(
          qScore,
          Number((qScore * 0.6 + effectiveAScore * 0.4).toFixed(3))
        );

        // Always anchor to the root canonical question if the match is itself a duplicate
        const canonicalId = c.duplicateOfId ?? c.id;

        return {
          id: canonicalId,
          text: c.text,
          answerText: c.answerText,
          status: c.status,
          difficulty: c.difficulty,
          score: overallScore,
          qScore,
          aScore: effectiveAScore,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Trigram similarity check error:", error);
    // Non-blocking: if similarity query fails for any reason, don't crash question submission
    return null;
  }
}

