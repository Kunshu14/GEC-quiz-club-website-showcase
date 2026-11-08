import { redirect } from "next/navigation";
import {
  Button,
  CardShell,
  DismissibleNotice,
  FramedPanel,
  HighlighterMark,
  Tag,
  type Tone,
  UploadIcon,
  PencilIcon,
  AlertTriangleIcon,
  WorkspaceNavbar,
} from "@/components/ui";
import { MediaDisplay } from "@/components/questions/MediaDisplay";
import { getViewer, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { QuestionFilters } from "./QuestionFilters";
import { approveQuestion, rejectQuestion } from "./actions";

export const dynamic = "force-dynamic";

const DIFFICULTY_TONE = { EASY: "mint", MEDIUM: "yellow", HARD: "orange" } as const;
const STATUS_TONE = { PENDING: "lavender", APPROVED: "mint", REJECTED: "orange", FLAGGED: "pink" } as const;

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string;
    updated?: string;
    flagged?: string;
    error?: string;
    q?: string;
    category?: string;
    subgenre?: string;
    difficulty?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  const {
    submitted,
    updated,
    flagged,
    error,
    q = "",
    category = "",
    subgenre = "",
    difficulty = "",
    status = "",
    sort = "",
  } = await searchParams;

  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");

  const isMember = viewer.user.role.name === "Member";
  const canViewFullPool = !isMember && (await hasPermission(viewer.user, "view_full_pool"));
  const canManageQuestions = !isMember && (await hasPermission(viewer.user, "manage_questions"));

  // Build dynamic where clause from filter params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Members always see only their own submissions
  if (!canViewFullPool) {
    where.submittedById = viewer.user.id;
  }

  // Text search — ILIKE against question text and answer
  if (q) {
    where.OR = [
      { text: { contains: q, mode: "insensitive" } },
      { answerText: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  // Category filter
  if (category) {
    where.questionCategories = {
      ...(where.questionCategories ?? {}),
      some: { categoryId: category },
    };
  }

  // Sub-genre filter (matches any category's sub-genre)
  if (subgenre) {
    where.questionCategories = {
      ...(where.questionCategories ?? {}),
      some: {
        ...(where.questionCategories?.some ?? {}),
        subGenre: { contains: subgenre, mode: "insensitive" },
      },
    };
  }

  // Difficulty filter
  if (difficulty) {
    where.difficulty = difficulty;
  }

  // Status filter
  if (status) {
    where.status = status;
  } else if (canViewFullPool) {
    // Hide REJECTED questions by default so the main pool does not get cluttered.
    // They remain accessible by explicitly selecting "Rejected" in the status filter.
    where.status = { not: "REJECTED" };
  }

  // Sort order
  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (sort === "difficulty") orderBy = { difficulty: "asc" };
  else if (sort === "status") orderBy = { status: "asc" };

  // Fetch questions + categories (for filter dropdowns) + flagged count in parallel
  const [questions, categoriesWithSubGenres, flaggedCount] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy,
      include: {
        submittedBy: { select: { name: true, email: true } },
        lastEditedBy: { select: { name: true, email: true } },
        questionCategories: { include: { category: true } },
        media: true,
        _count: { select: { usageLogs: true } },
        usageLogs: {
          orderBy: { usedOn: "desc" },
          take: 1,
          include: {
            quiz: { select: { title: true, date: true } },
          },
        },
      },
    }),
    // Distinct sub-genres grouped by category
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        questionCategories: {
          select: { subGenre: true },
          where: { subGenre: { not: null } },
        },
      },
    }),
    canManageQuestions
      ? prisma.question.count({ where: { status: "FLAGGED" } })
      : Promise.resolve(0),
  ]);

  // Submitter transparency: count questions modified by an admin
  const userModifiedCount = questions.filter(
    (q) => q.submittedById === viewer.user.id && q.lastEditedById && q.lastEditedById !== viewer.user.id
  ).length;

  // Build category data with distinct sub-genres
  const categories = categoriesWithSubGenres.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subGenres: [...new Set(cat.questionCategories.map((qc) => qc.subGenre!).filter(Boolean))].sort(),
  }));

  // Difficulty tally from filtered results
  const tally = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const q of questions) {
    tally[q.difficulty as keyof typeof tally]++;
  }

  const currentParams = { q, category, subgenre, difficulty, status, sort };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <WorkspaceNavbar />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              <HighlighterMark tone="yellow">
                {canViewFullPool ? "Question" : "My"}
              </HighlighterMark>{" "}
              {canViewFullPool ? "pool" : "Submissions"}
            </h1>
            <p className="mt-1 font-body text-xs text-ink/70">
              {canViewFullPool
                ? "Repository of all verified questions, difficulty balance, and media clues."
                : "Questions submitted by you. Track review status, council edits, and quiz usage."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {canManageQuestions && (
              <Button as="a" href="/questions/import" variant="alt" className="text-xs">
                <UploadIcon size={14} className="mr-1.5" /> Legacy Import
              </Button>
            )}
            {canManageQuestions && flaggedCount > 0 && (
              <Button as="a" href="/admin/duplicates" variant="alt" className="bg-pink hover:bg-pink/80 text-xs">
                <AlertTriangleIcon size={14} className="mr-1.5" /> {flaggedCount} Flagged
              </Button>
            )}
            <Button as="a" href="/questions/new" variant="primary" className="text-xs">
              <PencilIcon size={14} className="mr-1.5" /> Submit new
            </Button>
          </div>
        </div>

      {flagged && (
        <DismissibleNotice tone="yellow" paramToClear="flagged" className="max-w-2xl">
          Your question was submitted and flagged for council review.
        </DismissibleNotice>
      )}

      {submitted && (
        <DismissibleNotice tone="mint" paramToClear="submitted" className="max-w-2xl">
          Question submitted for review! Track its status below.
        </DismissibleNotice>
      )}

      {updated && (
        <DismissibleNotice tone="mint" paramToClear="updated" className="max-w-2xl">
          Question updated successfully.
        </DismissibleNotice>
      )}

      {error && (
        <DismissibleNotice tone="orange" paramToClear="error" className="max-w-2xl">
          {error}
        </DismissibleNotice>
      )}

      {/* Admin Quick Duplicate Review Banner */}
      {canManageQuestions && flaggedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-[3px] border-ink bg-yellow p-4 shadow-[4px_4px_0_var(--ink)]">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon size={24} className="text-ink" />
            <div>
              <p className="font-display text-base font-bold text-ink">
                {flaggedCount} duplicate question{flaggedCount === 1 ? "" : "s"} flagged for council review
              </p>
              <p className="font-body text-xs text-ink/80">
                New submissions matched existing bank questions. Inspect side-by-side and resolve.
              </p>
            </div>
          </div>
          <Button as="a" href="/admin/duplicates" variant="primary">
            Open Review Queue ({flaggedCount}) →
          </Button>
        </div>
      )}

      {/* Submitter Notification: Questions modified by admin */}
      {userModifiedCount > 0 && (
        <DismissibleNotice tone="lavender" storageKey="dismissed_council_admin_edit_notice" className="max-w-4xl">
          <div className="flex items-center gap-3">
            <PencilIcon size={20} className="text-ink shrink-0" />
            <p className="font-body text-sm text-ink">
              <strong>Council Notice:</strong> {userModifiedCount} of your submitted question{userModifiedCount === 1 ? " was" : "s were"} modified by an administrator. Check the &ldquo;Modified by admin&rdquo; tag below.
            </p>
          </div>
        </DismissibleNotice>
      )}

      {/* Filter bar */}
      <QuestionFilters
        categories={categories}
        canViewFullPool={canViewFullPool}
        currentParams={currentParams}
      />

      {/* Difficulty tally */}
      {questions.length > 0 && (
        <CardShell tone="cream" className="max-w-lg">
          <p className="font-body text-sm font-bold text-ink">
            {tally.EASY} Easy · {tally.MEDIUM} Medium · {tally.HARD} Hard
          </p>
          <p className="font-body text-xs text-ink opacity-70">
            {canViewFullPool ? "Full pool" : "Your submissions"} · {questions.length} question{questions.length === 1 ? "" : "s"}
          </p>
        </CardShell>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <FramedPanel tone="yellow" className="flex flex-col items-center justify-center p-12 text-center">
          <p className="font-heading text-xl text-ink">No questions found</p>
          <p className="mt-2 max-w-md font-body text-sm text-ink/80">
            {q || category || subgenre || difficulty || status
              ? "No questions match your current filter criteria. Clear filters to browse your submissions, or submit a new question."
              : canViewFullPool
                ? "No questions have been submitted to the bank yet. Start building the question bank by submitting your first clue."
                : "You have not submitted any questions yet. Start contributing to the club by submitting your first question!"}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {(q || category || subgenre || difficulty || status) && (
              <Button as="a" href="/questions" variant="alt">
                Clear all filters
              </Button>
            )}
            <Button as="a" href="/questions/new" variant="primary">
              Submit a question
            </Button>
          </div>
        </FramedPanel>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((question) => (
            <CardShell
              key={question.id}
              className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
            >
              <div className="flex-1">
                <p className="font-body text-base font-medium">{question.text}</p>
                <p className="mt-1 font-body text-sm text-ink opacity-70">
                  Answer: {question.answerText}
                </p>
                {question.notes && (
                  <p className="mt-1 font-body text-xs text-ink opacity-60">
                    Notes: {question.notes}
                  </p>
                )}
                {question.media && question.media.length > 0 && (
                  <div className="mt-2 max-w-md">
                    <MediaDisplay media={question.media} collapsible defaultExpanded={false} />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag tone={DIFFICULTY_TONE[question.difficulty as keyof typeof DIFFICULTY_TONE]}>
                    {question.difficulty}
                  </Tag>
                  <Tag tone={STATUS_TONE[question.status as keyof typeof STATUS_TONE]}>
                    {question.status}
                  </Tag>
                  {question.questionCategories.map((qc) => (
                    <Tag key={qc.categoryId} tone="ink">
                      {qc.category.name}
                      {qc.subGenre ? ` · ${qc.subGenre}` : ""}
                    </Tag>
                  ))}
                  {question._count.usageLogs > 0 ? (
                    <span className="border border-ink bg-white px-2 py-0.5 font-body text-xs font-semibold text-ink shadow-[1px_1px_0_var(--ink)]">
                      Used {question._count.usageLogs}×
                      {question.usageLogs[0]?.quiz &&
                        ` · last used in ${question.usageLogs[0].quiz.title}`}
                    </span>
                  ) : (
                    <span className="border border-dashed border-ink/40 px-2 py-0.5 font-body text-[11px] text-ink opacity-60">
                      Unused in quizzes
                    </span>
                  )}
                </div>
                {canViewFullPool && (
                  <p className="mt-1 font-body text-xs text-ink opacity-50">
                    by {question.submittedBy.name ?? question.submittedBy.email} · {question.createdAt.toLocaleDateString()}
                  </p>
                )}
                {question.lastEditedBy && question.lastEditedById !== question.submittedById && (
                  <p className="mt-1 inline-flex items-center gap-1 font-body text-xs font-semibold text-ink">
                    <span className="inline-flex items-center gap-1 border border-ink bg-lavender px-1.5 py-0.5 shadow-[2px_2px_0_var(--ink)]">
                      <PencilIcon size={12} className="text-ink" />
                      Modified by {question.lastEditedBy.name ?? question.lastEditedBy.email}
                      {question.lastEditedAt && ` on ${new Date(question.lastEditedAt).toLocaleDateString()}`}
                    </span>
                  </p>
                )}
                {question.isEditedAfterApproval && (
                  <p className="mt-1 inline-flex items-center gap-1 font-body text-xs font-semibold text-ink">
                    <span className="inline-flex items-center gap-1 border border-ink bg-yellow px-1.5 py-0.5 shadow-[2px_2px_0_var(--ink)]">
                      <AlertTriangleIcon size={12} className="text-ink" />
                      Edited post-approval
                      {question.editedAfterApprovalAt && ` on ${new Date(question.editedAfterApprovalAt).toLocaleDateString()}`}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {question.status === "FLAGGED" && canManageQuestions && (
                  <Button as="a" href="/admin/duplicates" variant="primary">
                    Review duplicate
                  </Button>
                )}
                {question.status === "PENDING" && canManageQuestions && (
                  <>
                    <form action={approveQuestion}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <Button type="submit" variant="primary" className="bg-mint hover:bg-mint/80 text-xs">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectQuestion}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <Button type="submit" variant="alt" className="text-xs text-orange hover:bg-orange/10">
                        Reject
                      </Button>
                    </form>
                  </>
                )}
                {(canManageQuestions || question.submittedById === viewer.user.id) && (
                  <Button as="a" href={`/questions/${question.id}/edit`} variant="alt">
                    Edit
                  </Button>
                )}
              </div>
            </CardShell>
          ))}
        </div>
      )}
    </main>
  </div>
);
}