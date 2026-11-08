import { prisma } from "@/lib/prisma";

export interface QuestionItem {
  id: string;
  text: string;
  answerText: string;
  difficulty: string;
  orderIndex: number;
  roundName: string;
}

export interface TeamResultRow {
  rosterId: string;
  seatNo: number | null;
  teamName: string;
  members: string[];
  colleges: string[];
  emails: string[];
  roundScores: Record<string, number>;
  roundStatuses: Record<string, "ACTIVE" | "ELIMINATED" | "ADVANCED">;
  questionScores: Record<string, Record<string, number>>; // roundLabel -> { questionId: points }
  totalPoints: number;
  officialRank: number | null;
  displayRank: number | string;
  isNoShow: boolean;
  overallStatus: string;
}

export interface QuizResultsExportData {
  quizId: string;
  quizTitle: string;
  quizDate: string;
  academicYear: string;
  venueOrPlatform: string;
  rounds: string[];
  questionsByRound: Record<string, QuestionItem[]>;
  rows: TeamResultRow[];
}

export interface ResultsExportOptions {
  includeEmails?: boolean;
  includeColleges?: boolean;
  includeNoShows?: boolean;
  includeUnseated?: boolean;
  viewMode?: "ROUNDS" | "QUESTIONS";
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function escapeTsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  // Strip tabs and newlines for clean tab-separated clipboard pasting
  return String(value).replace(/[\t\r\n]+/g, " ").trim();
}

/**
 * Fetches and builds structured quiz results data,
 * with round-by-round and question-level scores, team rosters, and rankings.
 */
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

export async function buildQuizResultsExportData(
  quizId: string,
): Promise<QuizResultsExportData | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      roster: {
        include: {
          teamMembers: {
            include: {
              participant: true,
            },
          },
          scores: true,
          finalRank: true,
        },
      },
      usageLogs: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: true,
        },
      },
    },
  });

  if (!quiz) return null;

  // 1. Group questions by round and determine rounds in chronological running order
  const canonicalMap = new Map<string, string>();
  const questionsByRound: Record<string, QuestionItem[]> = {};
  const roundsFromLogs: string[] = [];

  for (const log of quiz.usageLogs) {
    const raw = log.roundName?.trim() || "Round 1";
    const canonical = canonicalizeRoundName(raw);
    const lower = canonical.toLowerCase();

    if (!canonicalMap.has(lower)) {
      canonicalMap.set(lower, canonical);
      roundsFromLogs.push(canonical);
    }
    const round = canonicalMap.get(lower)!;

    if (!questionsByRound[round]) {
      questionsByRound[round] = [];
    }
    questionsByRound[round].push({
      id: log.question.id,
      text: log.question.text,
      answerText: log.question.answerText,
      difficulty: log.question.difficulty,
      orderIndex: log.orderIndex,
      roundName: round,
    });
  }

  // Also discover any rounds recorded directly in scores that actually have meaningful data
  const scoreRoundsList: string[] = [];
  for (const rosterItem of quiz.roster) {
    for (const score of rosterItem.scores) {
      const hasMeaningfulScore =
        Number(score.points) !== 0 ||
        score.status === "ELIMINATED" ||
        (score.questionScores &&
          typeof score.questionScores === "object" &&
          Object.keys(score.questionScores as object).length > 0);

      if (hasMeaningfulScore && score.roundLabel) {
        const raw = score.roundLabel.trim();
        const canonical = canonicalizeRoundName(raw);
        const lower = canonical.toLowerCase();
        if (!canonicalMap.has(lower)) {
          canonicalMap.set(lower, canonical);
          scoreRoundsList.push(canonical);
        }
      }
    }
  }

  const allRounds = [...roundsFromLogs, ...scoreRoundsList];
  if (allRounds.length === 0) {
    allRounds.push("Round 1");
  }

  // 2. Build rows for each team
  const rawRows: TeamResultRow[] = quiz.roster.map((team) => {
    const roundScores: Record<string, number> = {};
    const roundStatuses: Record<string, "ACTIVE" | "ELIMINATED" | "ADVANCED"> = {};
    const questionScoresMap: Record<string, Record<string, number>> = {};

    let calculatedTotal = 0;
    let hasElimination = false;

    for (const score of team.scores) {
      const raw = score.roundLabel?.trim() || "Round 1";
      const resolvedRound = canonicalMap.get(raw.toLowerCase()) || canonicalizeRoundName(raw);
      const pts = Number(score.points ?? 0);
      roundScores[resolvedRound] = pts;
      roundStatuses[resolvedRound] = score.status as "ACTIVE" | "ELIMINATED" | "ADVANCED";
      calculatedTotal += pts;
      if (score.status === "ELIMINATED") {
        hasElimination = true;
      }

      // Parse questionScores if present
      if (score.questionScores && typeof score.questionScores === "object") {
        const qMap: Record<string, number> = {};
        const rawQs = score.questionScores as Record<string, unknown>;
        for (const [qId, val] of Object.entries(rawQs)) {
          if (typeof val === "number") {
            qMap[qId] = val;
          } else if (val && typeof val === "object" && "points" in val) {
            qMap[qId] = Number((val as { points: unknown }).points ?? 0);
          }
        }
        questionScoresMap[resolvedRound] = qMap;
      }
    }

    // Default missing rounds to 0
    for (const round of allRounds) {
      if (roundScores[round] === undefined) {
        roundScores[round] = 0;
      }
    }

    const totalPoints =
      team.finalRank?.totalPoints !== null && team.finalRank?.totalPoints !== undefined
        ? Number(team.finalRank.totalPoints)
        : calculatedTotal;

    const members = team.teamMembers
      .map((tm) => tm.participant.name?.trim())
      .filter((n): n is string => Boolean(n && n.length > 0));

    const colleges = Array.from(
      new Set(
        team.teamMembers
          .map((tm) => tm.participant.college?.trim())
          .filter((c): c is string => Boolean(c && c.length > 0)),
      ),
    );

    const emails = Array.from(
      new Set(
        team.teamMembers
          .map((tm) => tm.participant.email?.trim())
          .filter((e): e is string => Boolean(e && e.length > 0)),
      ),
    );

    let overallStatus = "Active";
    if (team.status === "NO_SHOW") {
      overallStatus = "No Show";
    } else if (hasElimination) {
      overallStatus = "Eliminated";
    }

    return {
      rosterId: team.id,
      seatNo: team.seatNo,
      teamName: team.teamName,
      members,
      colleges,
      emails,
      roundScores,
      roundStatuses,
      questionScores: questionScoresMap,
      totalPoints,
      officialRank: team.finalRank?.rank ?? null,
      displayRank: team.finalRank?.rank ?? "-",
      isNoShow: team.status === "NO_SHOW",
      overallStatus,
    };
  });

  // 3. Calculate ranks for seated teams
  const seatedRows = rawRows.filter((r) => r.seatNo !== null && !r.isNoShow);
  const unseatedOrNoShowRows = rawRows.filter((r) => r.seatNo === null || r.isNoShow);

  const allHaveOfficialRanks = seatedRows.length > 0 && seatedRows.every((r) => r.officialRank !== null);

  if (allHaveOfficialRanks) {
    seatedRows.sort((a, b) => (a.officialRank || 9999) - (b.officialRank || 9999));
  } else {
    seatedRows.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (a.seatNo || 0) - (b.seatNo || 0);
    });

    let currentRank = 1;
    for (let i = 0; i < seatedRows.length; i++) {
      if (seatedRows[i].officialRank !== null) {
        seatedRows[i].displayRank = seatedRows[i].officialRank!;
      } else {
        if (i > 0 && seatedRows[i].totalPoints === seatedRows[i - 1].totalPoints) {
          seatedRows[i].displayRank = seatedRows[i - 1].displayRank;
        } else {
          seatedRows[i].displayRank = currentRank;
        }
      }
      currentRank++;
    }
  }

  const sortedRows = [...seatedRows, ...unseatedOrNoShowRows];

  return {
    quizId: quiz.id,
    quizTitle: quiz.title,
    quizDate: quiz.date.toISOString().split("T")[0],
    academicYear: quiz.academicYear,
    venueOrPlatform: quiz.venueOrPlatform,
    rounds: allRounds,
    questionsByRound,
    rows: sortedRows,
  };
}

/**
 * Generates an RFC 4180 CSV string with UTF-8 BOM,
 * cleanly divided either by round or by question matrix per round.
 */
export function generateResultsCsv(
  data: QuizResultsExportData,
  options: ResultsExportOptions = {},
): string {
  const {
    includeEmails = true,
    includeColleges = true,
    includeNoShows = true,
    includeUnseated = true,
    viewMode = "ROUNDS",
  } = options;

  const filteredRows = data.rows.filter((row) => {
    if (!includeNoShows && row.isNoShow) return false;
    if (!includeUnseated && row.seatNo === null) return false;
    return true;
  });

  const headers: string[] = ["Rank", "Seat #", "Team Name", "Members"];
  if (includeColleges) headers.push("College");
  if (includeEmails) headers.push("Member Emails");

  if (viewMode === "QUESTIONS") {
    for (const round of data.rounds) {
      const qList = data.questionsByRound[round] || [];
      if (qList.length > 0) {
        qList.forEach((_, idx) => {
          headers.push(`${round} - Q${idx + 1}`);
        });
        headers.push(`${round} Total`);
      } else {
        headers.push(`${round} Total`);
      }
    }
    headers.push("Grand Total", "Status");
  } else {
    for (const round of data.rounds) {
      headers.push(round);
    }
    headers.push("Total Points", "Status");
  }

  const lines: string[] = [headers.map(escapeCsvValue).join(",")];

  for (const row of filteredRows) {
    const lineValues: (string | number)[] = [
      row.displayRank,
      row.seatNo !== null ? row.seatNo : "Unassigned",
      row.teamName,
      row.members.join(", "),
    ];

    if (includeColleges) lineValues.push(row.colleges.join(", "));
    if (includeEmails) lineValues.push(row.emails.join(", "));

    if (viewMode === "QUESTIONS") {
      for (const round of data.rounds) {
        const qList = data.questionsByRound[round] || [];
        const roundPoints = row.roundScores[round] ?? 0;
        const qScores = row.questionScores[round] || {};

        if (qList.length > 0) {
          qList.forEach((q) => {
            const pts = qScores[q.id] ?? 0;
            lineValues.push(pts);
          });
          lineValues.push(roundPoints);
        } else {
          lineValues.push(roundPoints);
        }
      }
      lineValues.push(row.totalPoints, row.overallStatus);
    } else {
      for (const round of data.rounds) {
        const score = row.roundScores[round] ?? 0;
        lineValues.push(score);
      }
      lineValues.push(row.totalPoints, row.overallStatus);
    }

    lines.push(lineValues.map(escapeCsvValue).join(","));
  }

  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Generates a TSV string formatted for direct copy-paste into Google Sheets / Excel.
 */
export function generateResultsTsv(
  data: QuizResultsExportData,
  options: ResultsExportOptions = {},
): string {
  const {
    includeEmails = false,
    includeColleges = true,
    includeNoShows = true,
    includeUnseated = true,
    viewMode = "ROUNDS",
  } = options;

  const filteredRows = data.rows.filter((row) => {
    if (!includeNoShows && row.isNoShow) return false;
    if (!includeUnseated && row.seatNo === null) return false;
    return true;
  });

  const headers: string[] = ["Rank", "Seat #", "Team Name", "Members"];
  if (includeColleges) headers.push("College");
  if (includeEmails) headers.push("Member Emails");

  if (viewMode === "QUESTIONS") {
    for (const round of data.rounds) {
      const qList = data.questionsByRound[round] || [];
      if (qList.length > 0) {
        qList.forEach((_, idx) => {
          headers.push(`${round} - Q${idx + 1}`);
        });
        headers.push(`${round} Total`);
      } else {
        headers.push(`${round} Total`);
      }
    }
    headers.push("Grand Total", "Status");
  } else {
    for (const round of data.rounds) {
      headers.push(round);
    }
    headers.push("Total Points", "Status");
  }

  const lines: string[] = [headers.map(escapeTsvValue).join("\t")];

  for (const row of filteredRows) {
    const lineValues: (string | number)[] = [
      row.displayRank,
      row.seatNo !== null ? row.seatNo : "Unassigned",
      row.teamName,
      row.members.join(", "),
    ];

    if (includeColleges) lineValues.push(row.colleges.join(", "));
    if (includeEmails) lineValues.push(row.emails.join(", "));

    if (viewMode === "QUESTIONS") {
      for (const round of data.rounds) {
        const qList = data.questionsByRound[round] || [];
        const roundPoints = row.roundScores[round] ?? 0;
        const qScores = row.questionScores[round] || {};

        if (qList.length > 0) {
          qList.forEach((q) => {
            const pts = qScores[q.id] ?? 0;
            lineValues.push(pts);
          });
          lineValues.push(roundPoints);
        } else {
          lineValues.push(roundPoints);
        }
      }
      lineValues.push(row.totalPoints, row.overallStatus);
    } else {
      for (const round of data.rounds) {
        const score = row.roundScores[round] ?? 0;
        lineValues.push(score);
      }
      lineValues.push(row.totalPoints, row.overallStatus);
    }

    lines.push(lineValues.map(escapeTsvValue).join("\t"));
  }

  return lines.join("\n");
}
