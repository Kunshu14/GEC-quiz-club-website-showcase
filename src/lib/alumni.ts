import { prisma } from "@/lib/prisma";

export interface AlumnusProfile {
  id: string;
  name: string;
  email: string;
  graduatingYear: number | null;
  wasAdmin: boolean;
  status: string;
  roleName: string;
  joinedAt: Date;
  stats: {
    questionsSubmitted: number;
    questionsApproved: number;
    questionsUsed: number;
    quizzesHosted: number;
    tournamentWins: number;
    tournamentPodiums: number;
    tournamentsPlayed: number;
  };
  quizzesHostedList: Array<{ id: string; title: string; date: Date }>;
}

export interface AlumniYearGroup {
  year: number | null;
  displayYear: string;
  members: AlumnusProfile[];
}

/**
 * Fetch and aggregate all alumni records and their all-time statistics.
 * Grouped by graduating year in descending order.
 */
export async function getAlumniDirectory(): Promise<{
  groups: AlumniYearGroup[];
  totalAlumni: number;
  totalQuestionsWritten: number;
  totalQuizzesHosted: number;
  totalChampionships: number;
}> {
  // Query users who have status = 'ALUMNI'
  const alumniUsers = await prisma.user.findMany({
    where: {
      status: "ALUMNI",
    },
    include: {
      role: true,
      submittedQuestions: {
        select: {
          id: true,
          status: true,
          usageLogs: {
            select: { id: true },
          },
        },
      },
      quizzesQm: {
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              date: true,
            },
          },
        },
      },
      linkedParticipant: {
        include: {
          teamMembers: {
            select: {
              quizId: true,
            },
          },
        },
      },
    },
    orderBy: [
      { graduatingYear: "desc" },
      { name: "asc" },
      { email: "asc" },
    ],
  });

  // Collect participant IDs to compute tournament rankings
  const participantIds = alumniUsers
    .map((u) => u.linkedParticipantId)
    .filter((id): id is string => Boolean(id));

  // Query final rankings for linked participants
  const rankings: Array<{
    participantId: string;
    finalRank: number;
  }> = [];

  if (participantIds.length > 0) {
    try {
      const allRanks = await prisma.finalRank.findMany({
        where: {
          roster: {
            teamMembers: {
              some: {
                participantId: { in: participantIds },
              },
            },
          },
        },
        include: {
          roster: {
            include: {
              teamMembers: true,
            },
          },
        },
      });

      for (const fr of allRanks) {
        for (const tm of fr.roster.teamMembers) {
          if (tm.participantId && participantIds.includes(tm.participantId)) {
            rankings.push({
              participantId: tm.participantId,
              finalRank: fr.rank,
            });
          }
        }
      }
    } catch {
      // Graceful fallback if rankings query fails
    }
  }

  // Aggregate stats per alumnus
  let totalQuestionsWritten = 0;
  let totalQuizzesHosted = 0;
  let totalChampionships = 0;

  const profiles: AlumnusProfile[] = alumniUsers.map((user) => {
    const totalSubmitted = user.submittedQuestions.length;
    const approvedCount = user.submittedQuestions.filter(
      (q) => q.status === "APPROVED"
    ).length;
    const usedCount = user.submittedQuestions.filter(
      (q) => q.usageLogs.length > 0
    ).length;

    totalQuestionsWritten += totalSubmitted;

    const quizzesHosted = user.quizzesQm.length;
    totalQuizzesHosted += quizzesHosted;

    const quizzesHostedList = user.quizzesQm.map((qm) => ({
      id: qm.quiz.id,
      title: qm.quiz.title,
      date: qm.quiz.date,
    }));

    let wins = 0;
    let podiums = 0;
    let played = 0;

    if (user.linkedParticipant) {
      played = user.linkedParticipant.teamMembers.length;
      const pRanks = rankings.filter(
        (r) => r.participantId === user.linkedParticipantId
      );
      wins = pRanks.filter((r) => r.finalRank === 1).length;
      podiums = pRanks.filter((r) => r.finalRank <= 3).length;
    }

    totalChampionships += wins;

    return {
      id: user.id,
      name: user.name ?? user.email.split("@")[0],
      email: user.email,
      graduatingYear: user.graduatingYear,
      wasAdmin: user.wasAdmin,
      status: user.status,
      roleName: user.role.name,
      joinedAt: user.createdAt,
      stats: {
        questionsSubmitted: totalSubmitted,
        questionsApproved: approvedCount,
        questionsUsed: usedCount,
        quizzesHosted,
        tournamentWins: wins,
        tournamentPodiums: podiums,
        tournamentsPlayed: played,
      },
      quizzesHostedList,
    };
  });

  // Group by graduatingYear
  const groupMap = new Map<number | null, AlumnusProfile[]>();

  for (const profile of profiles) {
    const key = profile.graduatingYear;
    const list = groupMap.get(key) ?? [];
    list.push(profile);
    groupMap.set(key, list);
  }

  // Sort groups: numbered years descending, null at the end
  const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });

  const groups: AlumniYearGroup[] = sortedKeys.map((yearKey) => ({
    year: yearKey,
    displayYear: yearKey ? `Class of ${yearKey}` : "Founding Council / Class Year Unspecified",
    members: groupMap.get(yearKey) ?? [],
  }));

  return {
    groups,
    totalAlumni: profiles.length,
    totalQuestionsWritten,
    totalQuizzesHosted,
    totalChampionships,
  };
}
