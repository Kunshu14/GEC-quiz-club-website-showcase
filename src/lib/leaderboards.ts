import { prisma } from "@/lib/prisma";
import { getAcademicYear } from "@/lib/quizzes";

export interface SubmissionsLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  roleName: string;
  totalPoints: number;
  usedCount: number;
  approvedCount: number;
  totalSubmitted: number;
  acceptanceRate: number; // percentage (approved + used) / totalSubmitted
}

export interface WinnerLeaderboardEntry {
  rank: number;
  participantId: string;
  name: string;
  collegeOrOrg: string | null;
  wins: number;
  podiums: number; // rank <= 3
  quizzesPlayed: number;
  winRate: number; // percentage (wins / quizzesPlayed)
  isCouncilMember: boolean;
  councilRole?: string;
  linkedUserId?: string;
}

export interface HighRoundScore {
  scoreId: string;
  points: number;
  roundLabel: string;
  quizId: string;
  quizTitle: string;
  quizDate: string;
  academicYear: string;
  seatNo: number;
  teamName: string | null;
  teamMembers: Array<{ id: string; name: string }>;
}

export interface WinStreakRecord {
  participantId: string;
  name: string;
  collegeOrOrg: string | null;
  streakLength: number;
  quizzes: Array<{ id: string; title: string; date: string }>;
}

export interface SeasonMVP {
  academicYear: string;
  participantId: string;
  name: string;
  wins: number;
  totalPlayed: number;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  colorHex: string | null;
  totalQuestions: number;
  usedCount: number;
  usageRate: number;
}

export interface QuizmasterStat {
  userId: string;
  name: string;
  email: string;
  roleName: string;
  hostedCount: number;
}

export interface DerivedStats {
  topRoundScores: HighRoundScore[];
  longestWinStreaks: WinStreakRecord[];
  seasonMvps: SeasonMVP[];
  topCategories: CategoryStat[];
  topQuizmasters: QuizmasterStat[];
  totalQuizzesRecorded: number;
  totalParticipantsRecorded: number;
}

export interface MemberPersonalStanding {
  userId: string;
  submissionRank: number | null;
  submissionPoints: number;
  usedQuestionsCount: number;
  approvedQuestionsCount: number;
  totalSubmissions: number;
  linkedParticipant?: {
    participantId: string;
    winnerRank: number | null;
    wins: number;
    podiums: number;
    quizzesPlayed: number;
  };
}

/**
 * Returns semester name ("Autumn" or "Spring") based on date.
 * Autumn/Monsoon: July - December (months 6 - 11)
 * Spring/Winter: January - June (months 0 - 5)
 */
export function getSemester(date: Date = new Date()): "Autumn" | "Spring" {
  const month = new Date(date).getMonth();
  return month >= 6 ? "Autumn" : "Spring";
}

/**
 * Section 7.5: Submissions leaderboard (council)
 * - Keyed on `user_id`.
 * - Points: Approved = 1, Used = 5 (furthest-stage points, NOT stacked).
 * - Unreviewed / Pending / Rejected earn 0.
 * - Filterable by academic year and/or semester.
 */
export async function getSubmissionsLeaderboard(filters?: {
  academicYear?: string;
  semester?: "Autumn" | "Spring" | string;
}): Promise<{
  entries: SubmissionsLeaderboardEntry[];
  availableYears: string[];
  totalContributors: number;
}> {
  // Fetch all non-revoked council users with their submitted questions and question usages
  const users = await prisma.user.findMany({
    where: {
      status: { not: "REVOKED" },
    },
    include: {
      role: { select: { name: true } },
      submittedQuestions: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          usageLogs: {
            select: {
              quizId: true,
              quiz: {
                select: {
                  id: true,
                  date: true,
                  academicYear: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Extract all distinct academic years across all questions and quizzes for filter dropdowns
  const yearSet = new Set<string>();
  yearSet.add(getAcademicYear(new Date()));

  const computed = users.map((u) => {
    let usedCount = 0;
    let approvedCount = 0;
    let totalSubmitted = 0;

    for (const q of u.submittedQuestions) {
      const qYear = getAcademicYear(q.createdAt);
      const qSem = getSemester(q.createdAt);
      yearSet.add(qYear);

      // Collect quiz academic years if used
      for (const ul of q.usageLogs) {
        if (ul.quiz.academicYear) yearSet.add(ul.quiz.academicYear);
      }

      // Filter check
      if (filters?.academicYear && filters.academicYear !== "ALL") {
        const matchesSubYear = qYear === filters.academicYear;
        const matchesQuizYear = q.usageLogs.some(
          (ul) => ul.quiz.academicYear === filters.academicYear
        );
        if (!matchesSubYear && !matchesQuizYear) continue;
      }

      if (filters?.semester && filters.semester !== "ALL") {
        if (qSem !== filters.semester) continue;
      }

      totalSubmitted++;

      // Furthest-stage scoring rule:
      // If used in ANY quiz running order -> 5 points (not stacked with approved)
      // Else if status is APPROVED -> 1 point
      // Otherwise -> 0 points
      const isUsedInQuiz = q.usageLogs.length > 0;
      if (isUsedInQuiz) {
        usedCount++;
      } else if (q.status === "APPROVED") {
        approvedCount++;
      }
    }

    const totalPoints = usedCount * 5 + approvedCount * 1;
    const acceptedCount = usedCount + approvedCount;
    const acceptanceRate =
      totalSubmitted > 0 ? Math.round((acceptedCount / totalSubmitted) * 100) : 0;

    return {
      userId: u.id,
      name: u.name || u.email.split("@")[0],
      email: u.email,
      roleName: u.role.name,
      totalPoints,
      usedCount,
      approvedCount,
      totalSubmitted,
      acceptanceRate,
      firstSubmissionDate: u.submittedQuestions[0]?.createdAt ?? u.createdAt,
    };
  });

  // Sort by: totalPoints (desc) -> usedCount (desc) -> approvedCount (desc) -> earlier submission
  computed.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
    if (b.approvedCount !== a.approvedCount) return b.approvedCount - a.approvedCount;
    return a.firstSubmissionDate.getTime() - b.firstSubmissionDate.getTime();
  });

  // Assign ranks (with identical ranks for true ties)
  let currentRank = 1;
  const entries: SubmissionsLeaderboardEntry[] = computed.map((item, idx) => {
    if (idx > 0) {
      const prev = computed[idx - 1];
      if (
        item.totalPoints === prev.totalPoints &&
        item.usedCount === prev.usedCount &&
        item.approvedCount === prev.approvedCount
      ) {
        // Keep currentRank
      } else {
        currentRank = idx + 1;
      }
    }
    return {
      rank: currentRank,
      userId: item.userId,
      name: item.name,
      email: item.email,
      roleName: item.roleName,
      totalPoints: item.totalPoints,
      usedCount: item.usedCount,
      approvedCount: item.approvedCount,
      totalSubmitted: item.totalSubmitted,
      acceptanceRate: item.acceptanceRate,
    };
  });

  return {
    entries,
    availableYears: Array.from(yearSet).sort().reverse(),
    totalContributors: entries.filter((e) => e.totalSubmitted > 0).length,
  };
}

/**
 * Section 7.6: Winner leaderboard (participants)
 * - Keyed on `participant_id`.
 * - Ranked by win count (`final_rank = 1`) within selected academic year.
 * - Wins aren't weighted by team size: solo win & 5-person win both = 1 full win.
 * - Council members with `linked_participant_id` see council tag and link.
 */
export async function getWinnerLeaderboard(filters?: {
  academicYear?: string;
}): Promise<{
  entries: WinnerLeaderboardEntry[];
  availableYears: string[];
  totalChampions: number;
}> {
  // Fetch all participants with their team memberships and linked council user
  const participants = await prisma.participant.findMany({
    include: {
      users: {
        select: {
          id: true,
          role: { select: { name: true } },
        },
      },
      teamMembers: {
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              date: true,
              academicYear: true,
            },
          },
          roster: {
            select: {
              id: true,
              seatNo: true,
              finalRank: {
                select: {
                  rank: true,
                  totalPoints: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const yearSet = new Set<string>();
  yearSet.add(getAcademicYear(new Date()));

  const computed = participants.map((p) => {
    let wins = 0;
    let podiums = 0;
    const playedQuizIds = new Set<string>();

    for (const tm of p.teamMembers) {
      const qYear = tm.quiz.academicYear || getAcademicYear(tm.quiz.date);
      yearSet.add(qYear);

      if (filters?.academicYear && filters.academicYear !== "ALL") {
        if (qYear !== filters.academicYear) continue;
      }

      playedQuizIds.add(tm.quiz.id);

      const rank = tm.roster.finalRank?.rank;
      if (rank === 1) {
        wins++;
      }
      if (rank && rank <= 3) {
        podiums++;
      }
    }

    const quizzesPlayed = playedQuizIds.size;
    const winRate = quizzesPlayed > 0 ? Math.round((wins / quizzesPlayed) * 100) : 0;
    const linkedUser = p.users[0];

    return {
      participantId: p.id,
      name: p.name,
      collegeOrOrg: p.college,
      wins,
      podiums,
      quizzesPlayed,
      winRate,
      isCouncilMember: Boolean(linkedUser),
      councilRole: linkedUser?.role.name,
      linkedUserId: linkedUser?.id,
    };
  });

  // Filter to participants who have played at least 1 quiz in the scope
  const activeParticipants = computed.filter((p) => p.quizzesPlayed > 0);

  // Sort by: wins (desc) -> podiums (desc) -> winRate (desc) -> quizzesPlayed (desc)
  activeParticipants.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.quizzesPlayed - a.quizzesPlayed;
  });

  let currentRank = 1;
  const entries: WinnerLeaderboardEntry[] = activeParticipants.map((item, idx) => {
    if (idx > 0) {
      const prev = activeParticipants[idx - 1];
      if (item.wins === prev.wins && item.podiums === prev.podiums && item.winRate === prev.winRate) {
        // Keep current rank
      } else {
        currentRank = idx + 1;
      }
    }
    return {
      rank: currentRank,
      ...item,
    };
  });

  return {
    entries,
    availableYears: Array.from(yearSet).sort().reverse(),
    totalChampions: entries.filter((e) => e.wins > 0).length,
  };
}

/**
 * Section 7.7: Fun & derived trivia stats
 * - Highest single-round score
 * - Most wins / played per academic year (Season MVPs)
 * - Longest consecutive win streak (consecutive `final_rank = 1`, ordered by date)
 * - Top Question Categories
 * - Quizmaster Hall of Fame
 */
export async function getDerivedStats(): Promise<DerivedStats> {
  // 1. Highest single-round scores
  const topScoresRaw = await prisma.score.findMany({
    take: 5,
    orderBy: { points: "desc" },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          date: true,
          academicYear: true,
        },
      },
      roster: {
        select: {
          teamName: true,
          seatNo: true,
          teamMembers: {
            select: {
              participant: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  const topRoundScores: HighRoundScore[] = topScoresRaw.map((s) => ({
    scoreId: s.id,
    points: Number(s.points),
    roundLabel: s.roundLabel,
    quizId: s.quiz.id,
    quizTitle: s.quiz.title,
    quizDate: s.quiz.date.toISOString(),
    academicYear: s.quiz.academicYear || getAcademicYear(s.quiz.date),
    seatNo: s.seatNo,
    teamName: s.roster.teamName,
    teamMembers: s.roster.teamMembers.map((tm) => ({
      id: tm.participant.id,
      name: tm.participant.name,
    })),
  }));

  // 2. Longest consecutive win streaks
  const participants = await prisma.participant.findMany({
    include: {
      teamMembers: {
        include: {
          quiz: {
            select: { id: true, title: true, date: true },
          },
          roster: {
            select: {
              finalRank: {
                select: { rank: true },
              },
            },
          },
        },
      },
    },
  });

  const streaks: WinStreakRecord[] = [];

  for (const p of participants) {
    if (p.teamMembers.length === 0) continue;

    // Sort by quiz date ascending
    const sorted = [...p.teamMembers].sort(
      (a, b) => a.quiz.date.getTime() - b.quiz.date.getTime()
    );

    let maxStreak = 0;
    let currentStreak = 0;
    let currentQuizList: Array<{ id: string; title: string; date: string }> = [];
    let bestQuizList: Array<{ id: string; title: string; date: string }> = [];

    for (const m of sorted) {
      const isWin = m.roster.finalRank?.rank === 1;
      if (isWin) {
        currentStreak++;
        currentQuizList.push({
          id: m.quiz.id,
          title: m.quiz.title,
          date: m.quiz.date.toISOString(),
        });
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          bestQuizList = [...currentQuizList];
        }
      } else {
        currentStreak = 0;
        currentQuizList = [];
      }
    }

    if (maxStreak > 0) {
      streaks.push({
        participantId: p.id,
        name: p.name,
        collegeOrOrg: p.college,
        streakLength: maxStreak,
        quizzes: bestQuizList,
      });
    }
  }

  streaks.sort((a, b) => b.streakLength - a.streakLength);
  const longestWinStreaks = streaks.slice(0, 5);

  // 3. Season MVPs (Most wins in a single academic year)
  const mvpMap = new Map<string, { participant: any; year: string; wins: number; played: number }>();

  for (const p of participants) {
    for (const m of p.teamMembers) {
      const year = getAcademicYear(m.quiz.date);
      const key = `${p.id}_${year}`;
      if (!mvpMap.has(key)) {
        mvpMap.set(key, { participant: p, year, wins: 0, played: 0 });
      }
      const entry = mvpMap.get(key)!;
      entry.played++;
      if (m.roster.finalRank?.rank === 1) {
        entry.wins++;
      }
    }
  }

  const yearMvpMap = new Map<string, SeasonMVP>();
  for (const item of mvpMap.values()) {
    if (item.wins === 0) continue;
    const currentYearMvp = yearMvpMap.get(item.year);
    if (!currentYearMvp || item.wins > currentYearMvp.wins) {
      yearMvpMap.set(item.year, {
        academicYear: item.year,
        participantId: item.participant.id,
        name: item.participant.name,
        wins: item.wins,
        totalPlayed: item.played,
      });
    }
  }

  const seasonMvps = Array.from(yearMvpMap.values()).sort((a, b) =>
    b.academicYear.localeCompare(a.academicYear)
  );

  // 4. Top question categories
  const categories = await prisma.category.findMany({
    include: {
      questionCategories: {
        select: {
          question: {
            select: {
              id: true,
              usageLogs: { select: { quizId: true } },
            },
          },
        },
      },
    },
  });

  const topCategories: CategoryStat[] = categories
    .map((c) => {
      const totalQuestions = c.questionCategories.length;
      const usedCount = c.questionCategories.filter(
        (qc) => qc.question.usageLogs.length > 0
      ).length;
      const usageRate =
        totalQuestions > 0 ? Math.round((usedCount / totalQuestions) * 100) : 0;
      return {
        categoryId: c.id,
        categoryName: c.name,
        colorHex: null,
        totalQuestions,
        usedCount,
        usageRate,
      };
    })
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 6);

  // 5. Quizmaster Hall of Fame
  const qmUsers = await prisma.quizQm.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  const qmCounts = new Map<string, { user: any; count: number }>();
  for (const qm of qmUsers) {
    const uid = qm.userId;
    if (!qmCounts.has(uid)) {
      qmCounts.set(uid, { user: qm.user, count: 0 });
    }
    qmCounts.get(uid)!.count++;
  }

  const topQuizmasters: QuizmasterStat[] = Array.from(qmCounts.values())
    .map((v) => ({
      userId: v.user.id,
      name: v.user.name || v.user.email.split("@")[0],
      email: v.user.email,
      roleName: v.user.role.name,
      hostedCount: v.count,
    }))
    .sort((a, b) => b.hostedCount - a.hostedCount)
    .slice(0, 5);

  const totalQuizzesRecorded = await prisma.quiz.count();
  const totalParticipantsRecorded = await prisma.participant.count();

  return {
    topRoundScores,
    longestWinStreaks,
    seasonMvps,
    topCategories,
    topQuizmasters,
    totalQuizzesRecorded,
    totalParticipantsRecorded,
  };
}

/**
 * Section 7.6: Personal standing helper for user profile / dashboard widget.
 * Shows council submissions rank + participant wins rank (if linked).
 */
export async function getMemberStanding(userId: string): Promise<MemberPersonalStanding | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      linkedParticipantId: true,
    },
  });

  if (!user) return null;

  // Submissions standing
  const submissionsData = await getSubmissionsLeaderboard();
  const subEntry = submissionsData.entries.find((e) => e.userId === userId);

  let linkedParticipantData: MemberPersonalStanding["linkedParticipant"] = undefined;

  if (user.linkedParticipantId) {
    const winnerData = await getWinnerLeaderboard();
    const winEntry = winnerData.entries.find(
      (e) => e.participantId === user.linkedParticipantId
    );
    if (winEntry) {
      linkedParticipantData = {
        participantId: user.linkedParticipantId,
        winnerRank: winEntry.rank,
        wins: winEntry.wins,
        podiums: winEntry.podiums,
        quizzesPlayed: winEntry.quizzesPlayed,
      };
    }
  }

  return {
    userId,
    submissionRank: subEntry?.rank ?? null,
    submissionPoints: subEntry?.totalPoints ?? 0,
    usedQuestionsCount: subEntry?.usedCount ?? 0,
    approvedQuestionsCount: subEntry?.approvedCount ?? 0,
    totalSubmissions: subEntry?.totalSubmitted ?? 0,
    linkedParticipant: linkedParticipantData,
  };
}
