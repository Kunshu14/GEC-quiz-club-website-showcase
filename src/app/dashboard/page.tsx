import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Button,
  CardShell,
  Tag,
  type Tone,
  TrophyIcon,
  GraduationCapIcon,
  UploadIcon,
  AlertTriangleIcon,
  CalendarIcon,
  MapPinIcon,
  PencilIcon,
  SparklesIcon,
  SettingsIcon,
  SpreadsheetIcon,
  WorkspaceNavbar,
} from "@/components/ui";
import { getViewer, hasPermission } from "@/lib/access";
import { getMemberStanding } from "@/lib/leaderboards";
import { prisma } from "@/lib/prisma";
import { formatDisplayDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  ACTIVE: "mint",
  ALUMNI: "lavender",
  REVOKED: "orange",
} as const;

const ROLE_TONE_MAP: Record<string, Tone> = {
  Admin: "pink",
  President: "pink",
  "Vice President": "pink",
  "Head of Quizzing": "mint",
  Treasurer: "yellow",
  "PR Head": "lavender",
  "Creative Head": "lavender",
  Member: "ink",
};

export default async function DashboardPage() {
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const { user, name, email } = viewer;

  const isMember = user.role.name === "Member";

  // Permissions
  const [canManageUsers, canManageQuestions, canBuildQuizzes] = await Promise.all([
    hasPermission(user, "manage_users"),
    hasPermission(user, "manage_questions"),
    hasPermission(user, "build_quizzes"),
  ]);

  const bankWhere = isMember ? { submittedById: user.id } : {};

  // Parallel data fetching for high-density command dashboard
  const [standing, upcomingQuizzes, bankMetrics, recentNotifications] = await Promise.all([
    getMemberStanding(user.id),
    prisma.quiz.findMany({
      orderBy: { date: "desc" },
      take: 3,
      include: {
        theme: true,
        qms: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { usageLogs: true, roster: true } },
      },
    }),
    Promise.all([
      prisma.question.count({ where: bankWhere }),
      prisma.question.count({ where: { ...bankWhere, status: "APPROVED" } }),
      prisma.question.count({ where: { ...bankWhere, status: "PENDING" } }),
      prisma.question.count({ where: { ...bankWhere, status: "FLAGGED" } }),
    ]),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const [totalQuestions, approvedQuestions, pendingQuestions, flaggedDuplicates] = bankMetrics;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Persistent Global Header */}
      <WorkspaceNavbar />

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-6 md:py-8">
        {/* 1. Command Header Ribbon */}
        <div className="border-[3px] border-ink bg-white p-5 sm:p-6 shadow-[4px_4px_0_var(--ink)]">
          {/* Welcome greeting with full horizontal space */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-ink tracking-tight">
              Welcome back,
            </h1>
            <span className="inline-block font-display text-2xl sm:text-3xl lg:text-4xl font-black text-ink bg-mint border-[3px] border-ink px-4 py-1 shadow-[3px_3px_0_var(--ink)] -rotate-2">
              {name ?? email}
            </span>
          </div>

          {/* Sub-bar: Metadata on left, Quick Actions on right */}
          <div className="mt-5 pt-4 border-t-2 border-ink/15 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <Tag tone={ROLE_TONE_MAP[user.role.name] ?? "lavender"}>{user.role.name}</Tag>
              <Tag tone={STATUS_TONE[user.status as keyof typeof STATUS_TONE] ?? "ink"}>
                {user.status}
              </Tag>
              <span className="text-xs font-mono text-ink/70">· {email}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button as="a" href="/questions/new" variant="primary" className="text-xs font-bold h-9 px-3.5">
                <PencilIcon size={14} className="mr-1.5" /> + Submit Question
              </Button>
              {canBuildQuizzes && (
                <Button as="a" href="/quizzes/new" variant="alt" className="bg-yellow hover:bg-yellow/90 text-xs font-bold h-9 px-3.5 text-ink">
                  + Build Quiz
                </Button>
              )}
              {canManageQuestions && (
                <Button as="a" href="/questions/import" variant="alt" className="text-xs font-bold h-9 px-3.5">
                  <UploadIcon size={14} className="mr-1.5" /> Import Bank
                </Button>
              )}
              {canManageQuestions && flaggedDuplicates > 0 && (
                <Button as="a" href="/admin/duplicates" variant="alt" className="bg-pink hover:bg-pink/80 text-xs font-bold h-9 px-3.5">
                  <AlertTriangleIcon size={14} className="mr-1.5" /> {flaggedDuplicates} Flagged
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Standing & Question Bank Pulse Bento Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Standing Card */}
          <CardShell tone="yellow" shadow="md" className="flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div className="flex items-center gap-2">
                  <TrophyIcon size={18} className="text-ink" />
                  <h2 className="font-heading text-lg font-bold text-ink">Your Council Standing</h2>
                </div>
                <Link
                  href="/leaderboard"
                  className="font-heading text-xs font-bold uppercase underline text-ink hover:text-ink/70"
                >
                  Full Leaderboards →
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Submissions Rank */}
                <div className="border-2 border-ink bg-cream p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                    Submissions Rank
                  </div>
                  <div className="mt-1 font-heading text-2xl font-black text-ink">
                    {standing?.submissionRank ? `#${standing.submissionRank}` : "Unranked"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink/70 font-body">
                    {standing?.submissionPoints ?? 0} total points
                  </div>
                </div>

                {/* Bank Contributions */}
                <div className="border-2 border-ink bg-cream p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                    Used in Quizzes
                  </div>
                  <div className="mt-1 font-heading text-2xl font-black text-ink">
                    {standing?.usedQuestionsCount ?? 0}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink/70 font-body">
                    {standing?.approvedQuestionsCount ?? 0} approved · {standing?.totalSubmissions ?? 0} submitted
                  </div>
                </div>

                {/* Tournament Record */}
                <div className="border-2 border-ink bg-cream p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                    Tournament Record
                  </div>
                  <div className="mt-1 font-heading text-xl font-black text-ink truncate">
                    {standing?.linkedParticipant ? (
                      <span className="flex items-center gap-1">
                        {standing.linkedParticipant.wins} Wins <TrophyIcon size={14} className="text-yellow" />
                      </span>
                    ) : (
                      "Not Playing"
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink/70 font-body truncate">
                    {standing?.linkedParticipant
                      ? `#${standing.linkedParticipant.winnerRank ?? "—"} Rank · ${standing.linkedParticipant.quizzesPlayed} played`
                      : "Council-only account"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-ink/20 flex items-center justify-between text-xs text-ink/80 font-body">
              <span>Points rule: +1 for Approved, +5 for Quizzes</span>
              <Link href="/questions" className="font-bold underline hover:text-pink">
                Submit more questions →
              </Link>
            </div>
          </CardShell>

          {/* Question Bank Pulse */}
          <CardShell tone="cream" shadow="md" className="flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div className="flex items-center gap-2">
                  <SparklesIcon size={18} className="text-ink" />
                  <h2 className="font-heading text-lg font-bold text-ink">
                    {isMember ? "My Submissions Pulse" : "Question Bank Pulse"}
                  </h2>
                </div>
                <Link
                  href="/questions"
                  className="font-heading text-xs font-bold uppercase underline text-ink hover:text-ink/70"
                >
                  {isMember ? "View My Submissions →" : "Browse Bank →"}
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border-2 border-ink bg-white p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="font-heading text-[10px] font-bold uppercase text-ink/70">
                    {isMember ? "My Total" : "Total Pool"}
                  </div>
                  <div className="mt-1 font-heading text-2xl font-black text-ink">{totalQuestions}</div>
                  <div className="mt-0.5 text-[10px] text-ink/60">
                    {isMember ? "Questions submitted" : "Repository items"}
                  </div>
                </div>

                <div className="border-2 border-ink bg-white p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase text-ink">
                    <span className="inline-block w-2 h-2 rounded-none bg-mint border border-ink" />
                    <span>Approved</span>
                  </div>
                  <div className="mt-1 font-heading text-2xl font-black text-ink">{approvedQuestions}</div>
                  <div className="mt-0.5 text-[10px] text-ink/60">
                    {isMember ? "Cleared for quizzes" : "Ready for quizzes"}
                  </div>
                </div>

                <div className="border-2 border-ink bg-white p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase text-ink">
                    <span className="inline-block w-2 h-2 rounded-none bg-lavender border border-ink" />
                    <span>Pending</span>
                  </div>
                  <div className="mt-1 font-heading text-2xl font-black text-ink">{pendingQuestions}</div>
                  <div className="mt-0.5 text-[10px] text-ink/60">
                    {isMember ? "In review queue" : "Awaiting review"}
                  </div>
                </div>

                <div className="border-2 border-ink bg-white p-3 shadow-[2px_2px_0_var(--ink)]">
                  <div className="flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase text-ink">
                    <span className="inline-block w-2 h-2 rounded-none bg-pink border border-ink" />
                    <span>Flagged</span>
                  </div>
                  <div className="mt-1 font-heading text-2xl font-black text-ink">{flaggedDuplicates}</div>
                  <div className="mt-0.5 text-[10px] text-ink/60">
                    {isMember ? "Needs attention" : "Trigram duplicates"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-ink/20 flex flex-wrap items-center justify-between gap-2 text-xs font-body">
              {isMember ? (
                <>
                  <span className="text-ink/70">Track and manage your submitted questions:</span>
                  <div className="flex items-center gap-3 font-bold">
                    <Link href="/questions/new" className="underline hover:text-pink">
                      + Submit New Question →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-ink/70">Curate and maintain question quality:</span>
                  <div className="flex items-center gap-3 font-bold">
                    <Link href="/questions?status=PENDING" className="underline hover:text-pink">
                      Review Pending ({pendingQuestions})
                    </Link>
                    {canManageQuestions && flaggedDuplicates > 0 && (
                      <Link href="/admin/duplicates" className="text-pink underline hover:text-ink">
                        Resolve Duplicates ({flaggedDuplicates})
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardShell>
        </div>

        {/* 3. Upcoming & Active Tournaments Hub */}
        <div className="border-[3px] border-ink bg-white p-5 sm:p-6 shadow-[4px_4px_0_var(--ink)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon size={20} className="text-ink" />
                <h2 className="font-heading text-xl font-bold text-ink">Active & Upcoming Quizzes</h2>
              </div>
              <p className="font-body text-xs text-ink/70 mt-0.5">
                Current running orders, scheduled fixtures, and live scoreboards
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/quizzes"
                className="font-heading text-xs font-bold uppercase underline text-ink hover:text-pink"
              >
                View Full Quiz Archive →
              </Link>
              {canBuildQuizzes && (
                <Button as="a" href="/quizzes/new" variant="primary" className="text-xs py-1.5 px-3">
                  + Schedule Quiz
                </Button>
              )}
            </div>
          </div>

          {upcomingQuizzes.length === 0 ? (
            <div className="mt-5 border-2 border-dashed border-ink/40 bg-cream p-8 text-center">
              <CalendarIcon size={32} className="mx-auto mb-2 text-ink/60" />
              <p className="font-heading text-base font-bold text-ink">No upcoming tournaments scheduled</p>
              <p className="mt-1 font-body text-xs text-ink/70 max-w-md mx-auto">
                Ready to assemble the next event? Schedule a quiz date, select Quizmasters, and import questions from the bank.
              </p>
              {canBuildQuizzes && (
                <div className="mt-4">
                  <Button as="a" href="/quizzes/new" variant="primary">
                    + Build New Quiz
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {upcomingQuizzes.map((quiz, index) => {
                const isMember = user.role.name === "Member";
                const canAccessBuilder = canBuildQuizzes && !isMember;

                return (
                  <div
                    key={quiz.id}
                    className="relative flex flex-col justify-between border-2 border-ink bg-cream p-4 pb-5 shadow-[3px_3px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--ink)] transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Tag tone={new Date(quiz.date) >= new Date() ? "mint" : "lavender"}>
                          {new Date(quiz.date) >= new Date() ? "UPCOMING" : "PAST QUIZ"}
                        </Tag>
                        <Tag tone="ink">{quiz.academicYear}</Tag>
                      </div>

                      <h3 className="mt-2.5 font-heading text-base font-bold text-ink line-clamp-2">
                        <Link href={`/quizzes/${quiz.id}`} className="hover:underline hover:text-pink">
                          {quiz.title}
                        </Link>
                      </h3>

                      <div className="mt-2 flex flex-col gap-1 font-body text-xs text-ink/80">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon size={13} /> {formatDisplayDate(quiz.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <MapPinIcon size={13} /> {quiz.venueOrPlatform}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 font-mono text-xs text-ink/70">
                        {canAccessBuilder && (
                          <span className="border border-ink/40 bg-white px-2 py-0.5">
                            {quiz._count.usageLogs} Questions
                          </span>
                        )}
                        <span className="border border-ink/40 bg-white px-2 py-0.5">
                          {quiz._count.roster} Teams
                        </span>
                      </div>

                      {quiz.qms.length > 0 && (
                        <div className="mt-2.5 text-[11px] text-ink/60 truncate font-body">
                          QMs: {quiz.qms.map((qm) => qm.user.name ?? qm.user.email).join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink/20 flex flex-wrap items-center gap-2">
                      {canAccessBuilder && (
                        <Button as="a" href={`/quizzes/${quiz.id}/builder`} variant="primary" className="text-xs py-1 px-3">
                          Builder
                        </Button>
                      )}
                      <Button as="a" href={`/quizzes/${quiz.id}?tab=roster`} variant="alt" className="text-xs py-1 px-3">
                        Roster & Scores
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Recent Activity & Council Tools Grid (2 Columns) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notifications & Activity Stream */}
          <div className="border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_var(--ink)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div className="flex items-center gap-2">
                  <SpreadsheetIcon size={18} className="text-ink" />
                  <h2 className="font-heading text-lg font-bold text-ink">Recent Club Activity</h2>
                </div>
                <Link
                  href="/notifications"
                  className="font-heading text-xs font-bold uppercase underline text-ink hover:text-pink"
                >
                  View All ({recentNotifications.length}) →
                </Link>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink/60 font-body">
                  No recent notifications. You are all caught up!
                </div>
              ) : (
                <div className="mt-3 divide-y divide-ink/10">
                  {recentNotifications.map((notif) => (
                    <div key={notif.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-xs font-bold text-ink">{notif.title}</span>
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-pink border border-ink" title="Unread" />
                          )}
                        </div>
                        <p className="font-body text-xs text-ink/80 mt-0.5 line-clamp-1">{notif.message}</p>
                      </div>
                      {notif.linkUrl && (
                        <Link
                          href={notif.linkUrl}
                          className="font-heading text-[11px] font-bold text-ink underline shrink-0 hover:text-pink"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-ink/20 flex items-center justify-between text-xs text-ink/70 font-body">
              <span>Automated club notices & review dispatches</span>
              <Link href="/notifications" className="font-bold underline text-ink hover:text-pink">
                Manage notifications inbox →
              </Link>
            </div>
          </div>

          {/* Quick Council Navigation Deck */}
          <div className="border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_var(--ink)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div className="flex items-center gap-2">
                  <SettingsIcon size={18} className="text-ink" />
                  <h2 className="font-heading text-lg font-bold text-ink">Council Navigation Deck</h2>
                </div>
                <span className="font-body text-xs text-ink/60">Fast Workspace Shortcuts</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Link
                  href="/questions"
                  className="flex flex-col items-center justify-center p-3 border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] hover:bg-yellow transition-all text-center group"
                >
                  <SparklesIcon size={20} className="mb-1 text-ink group-hover:scale-110 transition-transform" />
                  <span className="font-heading text-xs font-bold text-ink">Question Pool</span>
                  <span className="text-[10px] text-ink/60 mt-0.5">Explore & Edit</span>
                </Link>

                <Link
                  href="/quizzes"
                  className="flex flex-col items-center justify-center p-3 border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] hover:bg-yellow transition-all text-center group"
                >
                  <CalendarIcon size={20} className="mb-1 text-ink group-hover:scale-110 transition-transform" />
                  <span className="font-heading text-xs font-bold text-ink">Quizzes</span>
                  <span className="text-[10px] text-ink/60 mt-0.5">History & Archive</span>
                </Link>

                <Link
                  href="/leaderboard"
                  className="flex flex-col items-center justify-center p-3 border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] hover:bg-yellow transition-all text-center group"
                >
                  <TrophyIcon size={20} className="mb-1 text-ink group-hover:scale-110 transition-transform" />
                  <span className="font-heading text-xs font-bold text-ink">Leaderboard</span>
                  <span className="text-[10px] text-ink/60 mt-0.5">Rankings & Stats</span>
                </Link>

                <Link
                  href="/alumni"
                  className="flex flex-col items-center justify-center p-3 border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] hover:bg-yellow transition-all text-center group"
                >
                  <GraduationCapIcon size={20} className="mb-1 text-ink group-hover:scale-110 transition-transform" />
                  <span className="font-heading text-xs font-bold text-ink">Alumni</span>
                  <span className="text-[10px] text-ink/60 mt-0.5">Hall of Fame</span>
                </Link>

                {canManageUsers && (
                  <Link
                    href="/admin"
                    className="flex flex-col items-center justify-center p-3 border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] hover:bg-yellow transition-all text-center group"
                  >
                    <SettingsIcon size={20} className="mb-1 text-ink group-hover:scale-110 transition-transform" />
                    <span className="font-heading text-xs font-bold text-ink">Admin Console</span>
                    <span className="text-[10px] text-ink/60 mt-0.5">Users & Access</span>
                  </Link>
                )}

                {canManageQuestions && (
                  <Link
                    href="/admin/duplicates"
                    className="flex flex-col items-center justify-center p-3 border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] hover:bg-yellow transition-all text-center group"
                  >
                    <AlertTriangleIcon size={20} className="mb-1 text-ink group-hover:scale-110 transition-transform" />
                    <span className="font-heading text-xs font-bold text-ink">Duplicate Queue</span>
                    <span className="text-[10px] text-ink/60 mt-0.5">{flaggedDuplicates} Flagged</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-ink/20 text-xs text-ink/70 font-body">
              Tip: The top navigation bar is accessible from all pages across the workspace.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}