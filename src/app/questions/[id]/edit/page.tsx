import { notFound, redirect } from "next/navigation";
import { Button, CardShell, HighlighterMark, Tag, WorkspaceNavbar } from "@/components/ui";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getSubGenresByCategory } from "@/lib/subgenres";
import { QuestionEditForm } from "./QuestionEditForm";

export const dynamic = "force-dynamic";

const DIFFICULTY_TONE = { EASY: "mint", MEDIUM: "yellow", HARD: "orange" } as const;
const STATUS_TONE = { PENDING: "lavender", APPROVED: "mint", REJECTED: "orange", FLAGGED: "pink" } as const;

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      questionCategories: { include: { category: true } },
      submittedBy: { select: { name: true, email: true } },
      media: true,
    },
  });

  if (!question) notFound();

  const canManage = await hasPermission(viewer.user, "manage_questions");
  const isOwn = question.submittedById === viewer.user.id;

  if (!canManage && !isOwn) {
    notFound();
  }

  const [allCategories, subGenresByCategory] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    getSubGenresByCategory(),
  ]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[800px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="yellow">Edit</HighlighterMark> question
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              Update question wording, answer keys, difficulty, or media clues.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button as="a" href="/questions" variant="alt" className="text-xs">
              Back to pool
            </Button>
          </div>
        </div>

        {/* Question meta */}
        <CardShell tone="cream" className="max-w-2xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <Tag tone={DIFFICULTY_TONE[question.difficulty as keyof typeof DIFFICULTY_TONE]}>
              {question.difficulty}
            </Tag>
            <Tag tone={STATUS_TONE[question.status as keyof typeof STATUS_TONE]}>
              {question.status}
            </Tag>
          </div>
          <p className="mb-1 font-body text-xs opacity-70">
            Submitted by {question.submittedBy.name ?? question.submittedBy.email} on{" "}
            {question.createdAt.toLocaleDateString()}
          </p>
        </CardShell>

        <CardShell tone="cream" className="max-w-2xl">
          <QuestionEditForm
            question={question}
            questionCategories={question.questionCategories}
            allCategories={allCategories}
            subGenresByCategory={subGenresByCategory}
            media={question.media}
            canManage={canManage}
          />
        </CardShell>
      </main>
    </div>
  );
}