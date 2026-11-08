import { notFound, redirect } from "next/navigation";
import { Button, CardShell, HighlighterMark, WorkspaceNavbar } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { QuizEditForm } from "./QuizEditForm";

export const dynamic = "force-dynamic";

interface EditQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuizPage({ params }: EditQuizPageProps) {
  const { id } = await params;

  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const canBuild =
    (await hasPermission(viewer.user, "build_quizzes")) ||
    (await hasPermission(viewer.user, "manage_questions")) ||
    viewer.user.role.name === "Admin";

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      theme: true,
      qms: true,
      scorekeepers: true,
    },
  });

  if (!quiz) {
    notFound();
  }

  const isQM = quiz.qms.some((qm) => qm.userId === viewer.user.id);
  if (!canBuild && !isQM) {
    redirect(`/quizzes/${id}`);
  }

  const [themes, councilMembers] = await Promise.all([
    prisma.quizTheme.findMany({
      orderBy: { name: "asc" },
      include: {
        themeCategories: {
          include: { category: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [{ role: { sortOrder: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="yellow">Edit</HighlighterMark> quiz details
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Update scheduling, venue, QMs, desk scorekeepers, budget, or combo theme.
            </p>
          </div>
          <Button as="a" href={`/quizzes/${id}`} variant="alt" className="text-xs">
            Back to quiz
          </Button>
        </div>

      <CardShell tone="cream" className="p-6 md:p-8">
        <QuizEditForm
          quiz={{
            id: quiz.id,
            title: quiz.title,
            date: quiz.date.toISOString().split("T")[0],
            academicYear: quiz.academicYear,
            format: quiz.format,
            mode: quiz.mode,
            themeId: quiz.themeId || "",
            venueOrPlatform: quiz.venueOrPlatform,
            timing: quiz.timing || "",
            budget: Number(quiz.budget),
            lessonsLearned: quiz.lessonsLearned || "",
            qmUserIds: quiz.qms.map((q) => q.userId),
            scorekeeperUserIds: quiz.scorekeepers.map((s) => s.userId),
          }}
          themes={themes}
          councilMembers={councilMembers}
        />
      </CardShell>
    </main>
  </div>
);
}
