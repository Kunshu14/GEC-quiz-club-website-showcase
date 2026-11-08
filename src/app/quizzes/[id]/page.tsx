import { notFound, redirect } from "next/navigation";
import { Button, CardShell, Tag, type Tone, PencilIcon, CheckIcon, ExternalLinkIcon, CalendarIcon, MapPinIcon, CoinsIcon, WorkspaceNavbar } from "@/components/ui";
import { MediaDisplay } from "@/components/questions/MediaDisplay";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { LessonsLearnedEditor } from "./LessonsLearnedEditor";
import { DeleteQuizButton } from "./DeleteQuizButton";
import { ExportModal } from "@/components/quizzes/ExportModal";
import { ExportResultsButton } from "@/components/scoring/ExportResultsButton";
import { QuizWorkspaceTabs } from "@/components/quizzes/QuizWorkspaceTabs";
import { ManageScorekeepersModal } from "@/components/quizzes/ManageScorekeepersModal";

export const dynamic = "force-dynamic";

interface QuizPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; tab?: string }>;
}

const MODE_TONE: Record<string, Tone> = {
  IN_PERSON: "mint",
  ONLINE: "lavender",
  HYBRID: "yellow",
};

const DIFFICULTY_TONE: Record<string, Tone> = {
  EASY: "mint",
  MEDIUM: "yellow",
  HARD: "pink",
};

export default async function QuizDetailPage({ params, searchParams }: QuizPageProps) {
  const { id } = await params;
  const { updated, tab } = await searchParams;

  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const isMember = viewer.user.role.name === "Member";
  const canBuild =
    ((await hasPermission(viewer.user, "build_quizzes")) ||
    (await hasPermission(viewer.user, "manage_questions")) ||
    viewer.user.role.name === "Admin") &&
    !isMember;

  const [quiz, allCouncilMembers] = await Promise.all([
    prisma.quiz.findUnique({
      where: { id },
      include: {
        theme: true,
        createdBy: { select: { id: true, name: true, email: true } },
        qms: {
          include: {
            user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
          },
        },
        scorekeepers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
          },
        },
        usageLogs: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                questionCategories: { include: { category: true } },
                media: true,
              },
            },
          },
        },
        roster: {
          orderBy: [{ seatNo: "asc" }, { createdAt: "asc" }],
          include: {
            teamMembers: {
              include: { participant: true },
            },
            scores: true,
            finalRank: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, role: { select: { name: true } } },
    }),
  ]);

  if (!quiz) {
    notFound();
  }

  const isQM = quiz.qms.some((qm) => qm.userId === viewer.user.id);
  const isScorekeeper = quiz.scorekeepers.some((sk) => sk.userId === viewer.user.id);
  const canManageScorekeepers = isQM || canBuild;
  const canEdit = canBuild && !isMember;
  const canOperateDesk = canBuild || isQM || isScorekeeper;
  const canViewQuestions = canBuild && !isMember;

  // Tally breakdown
  const easyCount = quiz.usageLogs.filter((l) => l.question.difficulty === "EASY").length;
  const medCount = quiz.usageLogs.filter((l) => l.question.difficulty === "MEDIUM").length;
  const hardCount = quiz.usageLogs.filter((l) => l.question.difficulty === "HARD").length;

  const serializedRoster = (quiz.roster || []).map((r) => {
    const totalPoints = (r.scores || []).reduce(
      (sum, s) => sum + Number(s.points || 0),
      0,
    );
    return {
      id: r.id,
      quizId: r.quizId,
      teamName: r.teamName,
      seatNo: r.seatNo,
      status: r.status as "CONFIRMED" | "NO_SHOW",
      totalPoints,
      teamMembers: (r.teamMembers || []).map((tm) => ({
        id: tm.id,
        participantId: tm.participantId,
        seatNo: tm.seatNo,
        participant: {
          id: tm.participant.id,
          name: tm.participant.name,
          email: tm.participant.email,
          college: tm.participant.college,
        },
      })),
    };
  });

  const isMeetingLink =
    (quiz.mode === "ONLINE" || quiz.mode === "HYBRID") &&
    Boolean(quiz.venueOrPlatform) &&
    (/^https?:\/\//i.test(quiz.venueOrPlatform) ||
      quiz.venueOrPlatform.includes("meet.google.com") ||
      quiz.venueOrPlatform.includes("zoom.us") ||
      quiz.venueOrPlatform.includes("discord"));

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-3 border-ink pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 font-body text-xs font-bold uppercase tracking-wider text-ink opacity-70">
            <Tag tone={MODE_TONE[quiz.mode] ?? "mint"}>
              {quiz.mode.replace("_", " ")}
            </Tag>
            <Tag tone="ink">{quiz.academicYear}</Tag>
            {quiz.theme && <Tag tone="pink">{quiz.theme.name}</Tag>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-black text-ink md:text-4xl">
            {quiz.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-ink opacity-80">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon size={14} />
              {new Date(quiz.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {quiz.timing && <span>· {quiz.timing}</span>}
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={14} />
              {quiz.venueOrPlatform}
            </span>
            <span className="inline-flex items-center gap-1">
              <CoinsIcon size={14} />
              ₹{Number(quiz.budget).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isMeetingLink && (
            <Button
              as="a"
              href={quiz.venueOrPlatform}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              className="bg-yellow hover:bg-yellow/90 inline-flex items-center gap-1.5"
            >
              <ExternalLinkIcon size={14} /> Join Meeting
            </Button>
          )}
          {canViewQuestions && (
            <ExportModal
              quizId={quiz.id}
              quizTitle={quiz.title}
              questionCount={quiz.usageLogs.length}
            />
          )}
          <ExportResultsButton
            quizId={quiz.id}
            quizTitle={quiz.title}
          />
          {canEdit && (
            <>
              <Button as="a" href={`/quizzes/${quiz.id}/builder`} variant="primary">
                Open Builder ↗
              </Button>
              <Button as="a" href={`/quizzes/${quiz.id}/edit`} variant="alt" className="inline-flex items-center gap-1.5">
                <PencilIcon size={14} /> Edit Details
              </Button>
              <DeleteQuizButton quizId={quiz.id} quizTitle={quiz.title} />
            </>
          )}
          <Button as="a" href="/quizzes" variant="underline">
            ← Back to archive
          </Button>
        </div>
      </div>

      {updated && (
        <div className="border-3 border-ink bg-mint p-4 font-body font-bold text-ink shadow-[4px_4px_0_var(--ink)] flex items-center gap-2">
          <CheckIcon size={18} className="text-forest" /> Quiz details successfully updated!
        </div>
      )}

      {/* Main Workspace Navigation: Overview vs Roster vs Scoring */}
      <QuizWorkspaceTabs
        quizId={quiz.id}
        quizTitle={quiz.title}
        canEdit={canOperateDesk}
        initialRoster={serializedRoster}
        mode={quiz.mode as "IN_PERSON" | "ONLINE" | "HYBRID"}
        venueOrPlatform={quiz.venueOrPlatform}
        initialTab={
          tab === "roster" || tab === "scoring" || tab === "overview"
            ? tab
            : (!canViewQuestions ? "roster" : "overview")
        }
        overviewContent={
          <div className="flex flex-col gap-8">
            {/* Overview Metadata Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CardShell tone="cream" className="p-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-ink opacity-60">
            Format & Timing
          </h3>
          <p className="mt-2 font-body text-base font-bold">{quiz.format}</p>
          <p className="mt-1 font-body text-xs text-ink opacity-70">
            {quiz.timing ? `Scheduled: ${quiz.timing}` : "No specific time recorded"}
          </p>
          <p className="mt-1 font-body text-xs text-ink opacity-70">
            Location: {quiz.venueOrPlatform}
          </p>
        </CardShell>

        <CardShell tone="cream" className="p-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-ink opacity-60">
            Quizmasters (QMs)
          </h3>
          <div className="mt-2 flex flex-col gap-1.5 font-body text-xs">
            {quiz.qms.length === 0 ? (
              <span className="italic opacity-50">No QMs assigned</span>
            ) : (
              quiz.qms.map((qm) => (
                <div key={qm.userId} className="flex items-center justify-between">
                  <span className="font-bold">{qm.user.name ?? qm.user.email}</span>
                  <Tag tone="lavender" className="text-[10px]">
                    {qm.user.role.name}
                  </Tag>
                </div>
              ))
            )}
          </div>
        </CardShell>

        <CardShell tone="cream" className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-display text-sm uppercase tracking-wider text-ink opacity-60">
                Scorekeepers
              </h3>
              {canManageScorekeepers && (
                <ManageScorekeepersModal
                  quizId={quiz.id}
                  quizTitle={quiz.title}
                  currentScorekeeperIds={quiz.scorekeepers.map((s) => s.userId)}
                  councilMembers={allCouncilMembers}
                  canManage={canManageScorekeepers}
                />
              )}
            </div>
            <div className="mt-2 flex flex-col gap-1.5 font-body text-xs">
              {quiz.scorekeepers.length === 0 ? (
                <span className="italic opacity-50">No scorekeepers assigned yet</span>
              ) : (
                quiz.scorekeepers.map((sk) => (
                  <div key={sk.userId} className="flex items-center justify-between">
                    <span className="font-bold">{sk.user.name ?? sk.user.email}</span>
                    <Tag tone="mint" className="text-[10px]">
                      {sk.user.role.name}
                    </Tag>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardShell>

        <CardShell tone="cream" className="p-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-ink opacity-60">
            Question Count & Tally
          </h3>
          <p className="mt-1 font-display text-2xl">
            {canViewQuestions ? (
              <>
                {quiz.usageLogs.length}{" "}
                <span className="font-body text-xs font-normal text-ink opacity-70">questions</span>
              </>
            ) : (
              <span className="text-base font-body italic text-ink opacity-60">Restricted</span>
            )}
          </p>
          {canViewQuestions && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-body text-xs">
              <Tag tone="mint">{easyCount} Easy</Tag>
              <Tag tone="yellow">{medCount} Med</Tag>
              <Tag tone="pink">{hardCount} Hard</Tag>
            </div>
          )}
        </CardShell>
      </div>

      {/* Retrospective / Lessons Learned */}
      <CardShell tone="cream" className="p-6">
        <LessonsLearnedEditor
          quizId={quiz.id}
          initialLessonsLearned={quiz.lessonsLearned}
          canEdit={canEdit}
        />
      </CardShell>

      {/* Running Order Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Running Order</h2>
            <p className="font-body text-xs text-ink opacity-70">
              Questions in presentation sequence as assembled for this quiz.
            </p>
          </div>
          {canEdit && (
            <Button as="a" href={`/quizzes/${quiz.id}/builder`} variant="primary" className="text-xs">
              Reorder or Add Questions ↗
            </Button>
          )}
        </div>

        {!canViewQuestions ? (
          <CardShell tone="cream" className="border-3 border-dashed p-8 text-center font-body">
            <p className="font-display text-lg font-bold">🔒 Running Order Restricted</p>
            <p className="mt-2 text-sm text-ink opacity-70 max-w-md mx-auto">
              The quiz questions and presentation sequence are restricted to designated Quizmasters and Council Builders.
            </p>
          </CardShell>
        ) : quiz.usageLogs.length === 0 ? (
          <CardShell tone="cream" className="border-3 border-dashed p-10 text-center font-body text-sm opacity-60">
            <p className="font-bold">No questions added to this quiz yet.</p>
            {canEdit && (
              <div className="mt-3">
                <Button as="a" href={`/quizzes/${quiz.id}/builder`} variant="primary">
                  Open Question Builder ↗
                </Button>
              </div>
            )}
          </CardShell>
        ) : (
          <div className="flex flex-col gap-3">
            {quiz.usageLogs.map((log) => {
              const q = log.question;
              return (
                <CardShell key={log.id} tone="cream" className="border-3 p-4 shadow-[3px_3px_0_var(--ink)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-ink bg-yellow font-display text-sm shadow-[1px_1px_0_var(--ink)]">
                      #{log.orderIndex}
                    </span>

                    <div className="flex-1">
                      {log.roundName && (
                        <span className="mb-1 inline-block border border-ink bg-lavender px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider">
                          {log.roundName}
                        </span>
                      )}
                      <p className="font-body text-base font-medium">{q.text}</p>
                      <p className="mt-1 font-body text-sm font-semibold text-ink">
                        Answer: <span className="underline decoration-yellow decoration-3">{q.answerText}</span>
                      </p>
                      {q.notes && (
                        <p className="mt-1 font-body text-xs text-ink opacity-60">
                          Notes: {q.notes}
                        </p>
                      )}

                      {q.media && q.media.length > 0 && (
                        <div className="mt-2 max-w-md">
                          <MediaDisplay media={q.media} collapsible defaultExpanded={false} />
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Tag tone={DIFFICULTY_TONE[q.difficulty] ?? "ink"} className="text-xs">
                          {q.difficulty}
                        </Tag>
                        {q.questionCategories.map((qc) => (
                          <span
                            key={qc.category.id}
                            className="border border-ink bg-cream px-1.5 py-0.5 font-body text-xs font-semibold"
                          >
                            {qc.category.name}
                            {qc.subGenre ? ` · ${qc.subGenre}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardShell>
              );
            })}
          </div>
        )}
      </div>
    </div>
  }
/>
    </main>
  </div>
);
}
