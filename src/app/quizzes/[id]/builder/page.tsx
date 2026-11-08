import { notFound, redirect } from "next/navigation";
import { Button, CheckCircleIcon, CalendarIcon, MapPinIcon, WorkspaceNavbar } from "@/components/ui";
import { ExportModal } from "@/components/quizzes/ExportModal";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { getRecentQuizQuestionsMap } from "@/lib/quizzes";
import { formatDisplayDate } from "@/lib/dates";
import { QuizBuilder } from "./QuizBuilder";

export const dynamic = "force-dynamic";

interface BuilderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export default async function QuizBuilderPage({ params, searchParams }: BuilderPageProps) {
  const { id } = await params;
  const { created } = await searchParams;

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

  if (!canBuild) {
    redirect(`/quizzes/${id}?tab=roster`);
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      theme: {
        include: {
          themeCategories: {
            include: { category: true },
          },
        },
      },
      qms: {
        include: {
          user: { select: { id: true, name: true, email: true } },
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
    },
  });

  if (!quiz) {
    notFound();
  }

  // Fetch all approved questions in the database
  const [approvedQuestions, allCategories, recentMap] = await Promise.all([
    prisma.question.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: {
        questionCategories: { include: { category: true } },
        media: true,
        submittedBy: { select: { name: true, email: true } },
        usageLogs: {
          orderBy: { usedOn: "desc" },
          take: 1,
          include: {
            quiz: { select: { id: true, title: true, date: true } },
          },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getRecentQuizQuestionsMap(quiz.id, quiz.date),
  ]);

  // Transform recent map for client serialization
  const recentQuestionsRecord: Record<string, { quizTitle: string; quizDate: string }> = {};
  for (const [qId, info] of recentMap.entries()) {
    recentQuestionsRecord[qId] = {
      quizTitle: info.quizTitle,
      quizDate: info.quizDate.toISOString(),
    };
  }

  // Calculate usage counts for each approved question
  const usageCountMap = await prisma.usageLog.groupBy({
    by: ["questionId"],
    _count: { id: true },
  });
  const usageCounts: Record<string, number> = {};
  for (const item of usageCountMap) {
    usageCounts[item.questionId] = item._count.id;
  }

  // Serialized initial running order
  const initialRunningOrder = quiz.usageLogs.map((log) => ({
    questionId: log.question.id,
    orderIndex: log.orderIndex,
    roundName: log.roundName || "",
    text: log.question.text,
    answerText: log.question.answerText,
    difficulty: log.question.difficulty,
    notes: log.question.notes,
    categories: log.question.questionCategories.map((qc) => ({
      id: qc.category.id,
      name: qc.category.name,
      subGenre: qc.subGenre,
    })),
    mediaCount: log.question.media.length,
  }));

  // Theme category IDs for default filtering
  const themeCategoryIds = quiz.theme?.themeCategories.map((tc) => tc.categoryId) || [];

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-3 border-ink pb-6">
        <div>
          <div className="flex items-center gap-2 font-body text-xs font-bold uppercase tracking-wider text-ink opacity-70">
            <span>Quiz Builder</span>
            <span>·</span>
            <span>{quiz.academicYear}</span>
            <span>·</span>
            <span>{quiz.mode.replace("_", " ")}</span>
            {quiz.theme && (
              <>
                <span>·</span>
                <span className="text-pink font-extrabold">{quiz.theme.name} Theme</span>
              </>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-black text-ink md:text-3xl">
            {quiz.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-ink opacity-80">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon size={14} />
              {formatDisplayDate(quiz.date)}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={14} />
              {quiz.venueOrPlatform}
            </span>
            <span>·</span>
            <span>
              QMs: {quiz.qms.map((q) => q.user.name ?? q.user.email).join(", ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportModal
            quizId={quiz.id}
            quizTitle={quiz.title}
            questionCount={quiz.usageLogs.length}
          />
          <Button as="a" href={`/quizzes/${quiz.id}`} variant="alt">
            View Quiz Page
          </Button>
          <Button as="a" href="/quizzes" variant="underline">
            Quizzes Archive
          </Button>
        </div>
      </div>

      {created && (
        <div className="border-3 border-ink bg-mint p-4 font-body font-bold text-ink shadow-[4px_4px_0_var(--ink)] flex items-center gap-2">
          <CheckCircleIcon size={18} className="text-forest" />
          <span>Quiz details created! Now drag or add questions below to assemble your running order.</span>
        </div>
      )}

      {/* Quiz Builder Workspace */}
      <QuizBuilder
        quizId={quiz.id}
        initialRunningOrder={initialRunningOrder}
        approvedQuestions={approvedQuestions.map((q) => ({
          id: q.id,
          text: q.text,
          answerText: q.answerText,
          difficulty: q.difficulty,
          notes: q.notes,
          createdAt: q.createdAt.toISOString(),
          categories: q.questionCategories.map((qc) => ({
            id: qc.category.id,
            name: qc.category.name,
            subGenre: qc.subGenre,
          })),
          mediaCount: q.media.length,
          usageCount: usageCounts[q.id] ?? 0,
          lastUsedQuiz: q.usageLogs[0]?.quiz?.title,
        }))}
        categories={allCategories}
        themeCategoryIds={themeCategoryIds}
        themeName={quiz.theme?.name}
        recentQuestionsRecord={recentQuestionsRecord}
        initialRoundSettings={quiz.roundSettings}
      />
    </main>
  </div>
);
}
