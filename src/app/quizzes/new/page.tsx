import { redirect } from "next/navigation";
import { Button, CardShell, HighlighterMark, WorkspaceNavbar } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getViewer, hasPermission } from "@/lib/access";
import { getAcademicYear } from "@/lib/quizzes";
import { QuizCreateForm } from "./QuizCreateForm";

export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const canBuild =
    (await hasPermission(viewer.user, "build_quizzes")) ||
    (await hasPermission(viewer.user, "manage_questions")) ||
    viewer.user.role.name === "Admin";

  if (!canBuild) {
    redirect("/quizzes");
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

  const defaultAcademicYear = getAcademicYear(new Date());

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="yellow">Create</HighlighterMark> new quiz
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Set up event details and assign QMs before assembling the question running order.
            </p>
          </div>
          <Button as="a" href="/quizzes" variant="alt" className="text-xs">
            Back to quizzes
          </Button>
        </div>

      <CardShell tone="cream" className="p-6 md:p-8">
        <QuizCreateForm
          themes={themes}
          councilMembers={councilMembers}
          currentUserId={viewer.user.id}
          defaultAcademicYear={defaultAcademicYear}
        />
      </CardShell>
    </main>
  </div>
);
}
